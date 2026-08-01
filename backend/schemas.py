from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

def to_camel(string: str) -> str:
    """Converts snake_case to camelCase."""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

# --- Job Schemas ---
class JobCreate(BaseSchema):
    title: str
    description: str

class JobUpdate(BaseSchema):
    title: str
    description: str

class JobResponse(BaseSchema):
    id: str
    title: str
    description: str
    created_at: datetime
    candidate_count: Optional[int] = 0

# --- Candidate Score Breakdown ---
class ScoreBreakdownSchema(BaseSchema):
    technical_skills: int
    experience: int
    education: int
    projects: int
    certifications: int
    resume_quality: int
    bonus_skills: int

# --- Candidate Schemas ---
class CandidateResponse(BaseSchema):
    # New database-aligned fields
    candidate_id: int
    full_name: str
    applied_position: str
    resume_total_score: int
    email_sent: bool
    upload_date: datetime
    
    # Original frontend compatibility fields (populated by properties)
    id: int
    name: str
    current_title: str
    score: int
    sent: bool
    analyzed_at: datetime
    
    # General details
    job_id: str
    file_name: str
    email: str
    phone: str
    years_experience: str
    top_skills: List[str]
    
    # Score breakdown details
    score_breakdown: ScoreBreakdownSchema
    recommendation: str
    recommendation_label: str
    
    # Qualitative summaries
    strengths: List[str]
    missing_skills: List[str]
    summary: str
    
    # Email drafting
    email_subject: str
    email_body: str

class CandidateRecommendationUpdate(BaseSchema):
    recommendation: str

class CandidateEmailUpdate(BaseSchema):
    email_subject: str
    email_body: str

# --- Candidate Summary Schema (Only key candidate fields) ---
class CandidateSummaryResponse(BaseSchema):
    job_id: str
    full_name: str
    email: str
    phone: str
    applied_position: str
    years_experience: str
    resume_total_score: int
    recommendation: str

