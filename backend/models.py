import json
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, TypeDecorator
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from backend.database import Base

# Custom portable list type for PostgreSQL native array or SQLite JSON text
class ArrayLike(TypeDecorator):
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(ARRAY(String))
        else:
            return dialect.type_descriptor(Text)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            return value
        else:
            return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        if dialect.name == 'postgresql':
            return value
        else:
            try:
                if isinstance(value, str):
                    return json.loads(value)
                return value
            except Exception:
                return []


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(50), primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationship to candidates
    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(50), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255))
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50))
    applied_position = Column(String(255), nullable=False)
    years_experience = Column(String(100))
    top_skills = Column(ArrayLike)
    
    # Score breakdown fields
    technical_skills_score = Column(Integer, default=0)
    technical_skills_reason = Column(Text)
    experience_score = Column(Integer, default=0)
    experience_reason = Column(Text)
    education_score = Column(Integer, default=0)
    education_reason = Column(Text)
    projects_score = Column(Integer, default=0)
    projects_reason = Column(Text)
    certifications_score = Column(Integer, default=0)
    certifications_reason = Column(Text)
    resume_quality_score = Column(Integer, default=0)
    resume_quality_reason = Column(Text)
    bonus_skills_score = Column(Integer, default=0)
    bonus_skills_reason = Column(Text)
    
    # Aggregates and decisions
    resume_total_score = Column(Integer, default=0)
    recommendation = Column(String(50))
    recommendation_label = Column(String(100))
    
    # Qualitative breakdown
    strengths = Column(ArrayLike)
    missing_skills = Column(ArrayLike)
    summary = Column(Text)
    
    # Email communication
    email_subject = Column(Text)
    email_body = Column(Text)
    email_sent = Column(Boolean, default=False)
    
    upload_date = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationship to job
    job = relationship("Job", back_populates="candidates")

    # --- Compatibility properties to align with frontend camelCase schema ---
    @property
    def id(self) -> int:
        return self.candidate_id

    @property
    def name(self) -> str:
        return self.full_name

    @property
    def current_title(self) -> str:
        return self.applied_position

    @property
    def score(self) -> int:
        return self.resume_total_score

    @property
    def sent(self) -> bool:
        return self.email_sent

    @property
    def analyzed_at(self) -> datetime:
        return self.upload_date

    @property
    def score_breakdown(self):
        return {
            "technical_skills": self.technical_skills_score or 0,
            "experience": self.experience_score or 0,
            "education": self.education_score or 0,
            "projects": self.projects_score or 0,
            "certifications": self.certifications_score or 0,
            "resume_quality": self.resume_quality_score or 0,
            "bonus_skills": self.bonus_skills_score or 0
        }
