-- Drop tables if they exist
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS jobs;

-- Jobs Table (Used to store position configurations and descriptions)
CREATE TABLE jobs (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Candidates Table (Single database table storing all candidate evaluations)
CREATE TABLE candidates (
    candidate_id SERIAL PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    applied_position VARCHAR(255) NOT NULL,
    years_experience VARCHAR(100),
    top_skills TEXT[],
    
    -- Score breakdown fields
    technical_skills_score INTEGER DEFAULT 0,
    technical_skills_reason TEXT,
    experience_score INTEGER DEFAULT 0,
    experience_reason TEXT,
    education_score INTEGER DEFAULT 0,
    education_reason TEXT,
    projects_score INTEGER DEFAULT 0,
    projects_reason TEXT,
    certifications_score INTEGER DEFAULT 0,
    certifications_reason TEXT,
    resume_quality_score INTEGER DEFAULT 0,
    resume_quality_reason TEXT,
    bonus_skills_score INTEGER DEFAULT 0,
    bonus_skills_reason TEXT,
    
    -- Aggregates and hiring decisions
    resume_total_score INTEGER DEFAULT 0,
    recommendation VARCHAR(50),
    recommendation_label VARCHAR(100),
    email_sent BOOLEAN DEFAULT FALSE,
    
    -- Qualitative evaluations
    strengths TEXT[],
    missing_skills TEXT[],
    summary TEXT,
    
    -- Email templates and drafts
    email_subject TEXT,
    email_body TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast search and dashboard filters
CREATE INDEX idx_candidates_job_id ON candidates(job_id);
CREATE INDEX idx_candidates_search ON candidates(full_name, email, applied_position);
CREATE INDEX idx_candidates_recommendation ON candidates(recommendation);
CREATE INDEX idx_candidates_score ON candidates(resume_total_score DESC);
