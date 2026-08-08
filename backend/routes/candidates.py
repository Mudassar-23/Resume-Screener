import os
import shutil
import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Job, Candidate
from backend.schemas import (
    CandidateResponse, 
    CandidateRecommendationUpdate, 
    CandidateEmailUpdate
)
from backend.services.resume_parser import extract_text
from backend.services.ai_service import analyze_resume_with_ai
from backend.services.scoring import process_scoring, calculate_recommendation

router = APIRouter(prefix="/api", tags=["Candidates"])


# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/jobs/{job_id}/resume", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def upload_and_process_resume(
    job_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Accepts a single resume file upload, extracts text, calls AI service, 
    calculates scores and recommendation, and saves the candidate record.
    """
    # 1. Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job position not found")
        
    # 2. Validate file extension and sanitize filename
    original_filename = os.path.basename(file.filename)  # Prevent directory traversal
    _, ext = os.path.splitext(original_filename.lower())
    if ext not in [".pdf", ".docx", ".txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF, DOCX, and TXT are allowed."
        )

    # Validate Magic Bytes / File Signature to prevent extension spoofing
    header = await file.read(4)
    await file.seek(0)
    magic_headers = {
        ".pdf": b"%PDF",
        ".docx": b"PK\x03\x04",
    }
    if ext in magic_headers and not header.startswith(magic_headers[ext]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content signature does not match declared file extension."
        )

    file_id = uuid.uuid4().hex[:8]
    temp_file_name = f"{file_id}_{original_filename}"
    temp_file_path = os.path.join(UPLOAD_DIR, temp_file_name)
    
    # Enforce 10 MB maximum file size limit (prevent DoS)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    file_size = 0

    try:
        with open(temp_file_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File size exceeds maximum allowed threshold of 10 MB."
                    )
                buffer.write(chunk)
            
        # 3. Extract text
        resume_text = extract_text(temp_file_path)
        if not resume_text or len(resume_text.strip()) < 30:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
                detail="Resume file contains insufficient or unreadable text"
            )
            
        # 4. Analyze with AI
        ai_result = analyze_resume_with_ai(resume_text, job.title, job.description)
        
        # 5. Process scores and recommendations
        raw_score_data = {}
        ai_sb = ai_result.get("score_breakdown", {})
        for key in ["technical_skills", "experience", "education", "projects", "certifications", "resume_quality", "bonus_skills"]:
            item = ai_sb.get(key) or ai_sb.get("".join(x.title() if i > 0 else x for i, x in enumerate(key.split("_"))))
            if isinstance(item, dict):
                raw_score_data[key] = item.get("score", 0)
            elif isinstance(item, (int, float)):
                raw_score_data[key] = int(item)
            else:
                raw_score_data[key] = 0
                
        normalized_scores, total_score, rec, rec_label = process_scoring(raw_score_data)
        
        # 6. Gather score reasons
        reasons = {}
        for key in ["technical_skills", "experience", "education", "projects", "certifications", "resume_quality", "bonus_skills"]:
            item = ai_sb.get(key) or ai_sb.get("".join(x.title() if i > 0 else x for i, x in enumerate(key.split("_"))))
            if isinstance(item, dict):
                reasons[key] = item.get("reason", "")
            else:
                reasons[key] = ""
        
        # Merge strengths and weaknesses
        strengths = ai_result.get("strengths", [])
        missing_skills = ai_result.get("missing_skills", []) or ai_result.get("weaknesses", [])
        
        # Parse basic candidate details
        cand_info = ai_result.get("candidate_information", {})
        cand_name = (
            cand_info.get("name") 
            or ai_result.get("candidate_name") 
            or ai_result.get("full_name") 
            or ai_result.get("name") 
            or "Not found"
        )
        cand_email = (
            cand_info.get("email") 
            or ai_result.get("email") 
            or "Not found"
        )
        cand_phone = (
            cand_info.get("phone") 
            or ai_result.get("phone") 
            or "Not found"
        )
        
        # Parse applied position
        applied_pos = (
            cand_info.get("applied_position") 
            or ai_result.get("applied_position") 
            or ai_result.get("target_position") 
            or ai_result.get("currentTitle") 
            or job.title 
            or "Not found"
        )

        # Allow total score from normalize_ai_response if present
        if "total_score" in ai_result and isinstance(ai_result["total_score"], int):
            total_score = ai_result["total_score"]

        # Enforce strict score-based recommendation calculation
        rec, rec_label = calculate_recommendation(total_score)
        
        # Parse email draft
        email_data = ai_result.get("email", {})
        email_subj = email_data.get("subject") or ai_result.get("emailSubject") or f"Regarding your application - {job.title}"
        email_body = email_data.get("body") or ai_result.get("emailBody") or ""

        
        # Create candidate record
        db_cand = Candidate(
            job_id=job.id,
            file_name=file.filename,
            full_name=cand_name,
            email=cand_email,
            phone=cand_phone,
            applied_position=applied_pos,
            years_experience=ai_result.get("experience_years") or ai_result.get("yearsExperience") or "Not found",
            top_skills=ai_result.get("skills") or ai_result.get("topSkills") or [],
            
            # Scores & Reasons
            technical_skills_score=normalized_scores["technical_skills"],
            technical_skills_reason=reasons["technical_skills"],
            experience_score=normalized_scores["experience"],
            experience_reason=reasons["experience"],
            education_score=normalized_scores["education"],
            education_reason=reasons["education"],
            projects_score=normalized_scores["projects"],
            projects_reason=reasons["projects"],
            certifications_score=normalized_scores["certifications"],
            certifications_reason=reasons["certifications"],
            resume_quality_score=normalized_scores["resume_quality"],
            resume_quality_reason=reasons["resume_quality"],
            bonus_skills_score=normalized_scores["bonus_skills"],
            bonus_skills_reason=reasons["bonus_skills"],
            
            resume_total_score=total_score,
            recommendation=rec,
            recommendation_label=rec_label,
            
            strengths=strengths,
            missing_skills=missing_skills,
            summary=ai_result.get("resume_summary") or ai_result.get("summary") or "",
            email_subject=email_subj,
            email_body=email_body,
            email_sent=False
        )
        
        db.add(db_cand)
        db.commit()
        db.refresh(db_cand)
        return db_cand
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process resume: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@router.get("/jobs/{job_id}/candidates", response_model=List[CandidateResponse])
def get_candidates_for_job(job_id: str, db: Session = Depends(get_db)):
    """Lists all candidates for a specific job position, sorted by total score descending."""
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job position not found")
        
    candidates = db.query(Candidate).filter(Candidate.job_id == job_id).order_by(Candidate.resume_total_score.desc()).all()
    
    # Auto-sanitize any legacy candidate records where recommendation conflicts with score
    modified = False
    for cand in candidates:
        exp_rec, exp_label = calculate_recommendation(cand.resume_total_score or 0)
        # Fix invalid Shortlist recommendations on low scoring candidates
        if cand.resume_total_score < 60 and cand.recommendation == "Shortlist":
            cand.recommendation = exp_rec
            cand.recommendation_label = exp_label
            modified = True
    if modified:
        db.commit()

    return candidates


@router.put("/candidates/{candidate_id}/recommendation", response_model=CandidateResponse)
def update_candidate_recommendation(
    candidate_id: int, 
    update: CandidateRecommendationUpdate, 
    db: Session = Depends(get_db)
):
    """Overrides the recommendation value of a candidate."""
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    cand.recommendation = update.recommendation
    # Set custom label or default
    label_map = {
        "Shortlist": "Shortlist",
        "Review": "Needs HR Review",
        "Reject": "Reject"
    }
    cand.recommendation_label = label_map.get(update.recommendation, update.recommendation)
    db.commit()
    db.refresh(cand)
    return cand

@router.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Permanently deletes a candidate record from the database."""
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(cand)
    db.commit()
    return {"deleted": True, "candidate_id": candidate_id}
