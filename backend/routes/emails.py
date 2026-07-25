from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Candidate
from backend.schemas import CandidateResponse, CandidateEmailUpdate
from backend.services.email_service import send_candidate_email

router = APIRouter(prefix="/api/candidates", tags=["Emails"])

@router.put("/{candidate_id}/email", response_model=CandidateResponse)
def update_email_draft(
    candidate_id: int, 
    update: CandidateEmailUpdate, 
    db: Session = Depends(get_db)
):
    """Updates the candidate's email draft subject and body."""
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    cand.email_subject = update.email_subject
    cand.email_body = update.email_body
    db.commit()
    db.refresh(cand)
    return cand

@router.post("/{candidate_id}/email/send", response_model=CandidateResponse)
def dispatch_email(candidate_id: int, db: Session = Depends(get_db)):
    """Dispatches the draft email to the candidate's email address and updates sent status."""
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Standardize recipient address
    recipient = cand.email
    if not recipient or recipient == "Not found":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot send email: candidate email address is missing or invalid."
        )
        
    # Dispatch email
    success = send_candidate_email(recipient, cand.email_subject, cand.email_body)

    cand.email_sent = True
    db.commit()
    db.refresh(cand)
    return cand
