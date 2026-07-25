import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend.models import Job, Candidate
from backend.schemas import JobCreate, JobResponse

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

@router.get("", response_model=List[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    """Lists all job descriptions with their candidate counts."""
    # Subquery to count candidates per job
    counts = db.query(
        Candidate.job_id, 
        func.count(Candidate.candidate_id).label("count")
    ).group_by(Candidate.job_id).all()
    
    count_map = {job_id: cnt for job_id, cnt in counts}
    
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    
    response = []
    for job in jobs:
        response.append(JobResponse(
            id=job.id,
            title=job.title,
            description=job.description,
            created_at=job.created_at,
            candidate_count=count_map.get(job.id, 0)
        ))
    return response

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(job_in: JobCreate, db: Session = Depends(get_db)):
    """Creates a new job description."""
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    db_job = Job(
        id=job_id,
        title=job_in.title,
        description=job_in.description
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return JobResponse(
        id=db_job.id,
        title=db_job.title,
        description=db_job.description,
        created_at=db_job.created_at,
        candidate_count=0
    )
