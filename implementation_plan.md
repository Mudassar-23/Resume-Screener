# Implementation Plan - AI Resume Analyzer

We will build a complete AI Resume Analyzer application based on the user's requirements. The system will parse candidate resumes, analyze them against a selected job description using Azure OpenAI, score qualifications using a standard 100-point rubric, and determine recommendations in the FastAPI backend. It stores all data in a local PostgreSQL database and provides a premium, responsive frontend.

## User Review Required

> [!IMPORTANT]
> - **PostgreSQL Database**: The application assumes a local PostgreSQL instance is running (detected service `postgresql-x64-18`). We will default the connection string to `postgresql://postgres:postgres@localhost:5432/resume_analyzer`, but this can be adjusted in the `.env` file.
> - **Azure OpenAI Credentials**: To perform the AI analysis, the user needs to populate the `.env` file with their Azure OpenAI Endpoint, API Key, and Deployment Name.
> - **Database Initialization**: A schema file `database/schema.sql` will be provided, and the backend will automatically run migrations or create tables on startup if they don't exist.

## Proposed Changes

We will create a new directory structure `ai-resume-analyzer` directly in the workspace containing `frontend`, `backend`, and `database` directories.

```
ai-resume-analyzer/
├── frontend/
│   ├── index.html           # Refactored markup and structure
│   ├── style.css            # Premium responsive CSS styling with micro-animations
│   └── script.js            # Frontend logic interacting with FastAPI backend APIs
│
├── backend/
│   ├── main.py              # FastAPI app setup, static mount, CORS
│   ├── database.py          # SQLAlchemy engine and session management
│   ├── models.py            # SQLAlchemy database models for Job and Candidate
│   ├── schemas.py           # Pydantic schemas for request/response validation
│   ├── routes/
│   │   ├── candidates.py    # Candidate creation (upload/parse/score), list, updates
│   │   ├── jobs.py          # Job creation, listing, details
│   │   └── emails.py        # Email draft retrieval, update, send/mock logs
│   ├── services/
│   │   ├── resume_parser.py # Text extraction using PyMuPDF and python-docx
│   │   ├── ai_service.py    # Azure OpenAI response extractor
│   │   ├── scoring.py       # Rubric calculation & hiring decision rules
│   │   └── email_service.py # Send email via SMTP (optional setup)
│   ├── uploads/             # Temporary uploads folder
│   └── requirements.txt     # Python backend dependencies
│
└── database/
    └── schema.sql           # Database schema definition
```

---

### [Database Layer]

#### [NEW] [schema.sql](file:///d:/resume%20analyzer/website/database/schema.sql)
- Creates database schema with `jobs` and `candidates` tables.
- Establishes relationships and indexes on frequently queried fields like `job_id` and `score`.

---

### [Backend Layer]

#### [NEW] [requirements.txt](file:///d:/resume%20analyzer/website/backend/requirements.txt)
- Specifies FastAPI, Uvicorn, SQLAlchemy, psycopg2-binary, PyMuPDF (fitz), python-docx, PyJWT, python-multipart, openai, pydantic-settings, and related dependencies.

#### [NEW] [database.py](file:///d:/resume%20analyzer/website/backend/database.py)
- Configures SQLAlchemy engine, base class, and session maker.
- Includes a utility dependency `get_db` to yield session transactions.

#### [NEW] [models.py](file:///d:/resume%20analyzer/website/backend/models.py)
- Defines the `Job` model containing `id`, `title`, `description`, `created_at`.
- Defines the `Candidate` model containing candidate personal details, score breakdown breakdown items, strengths, gaps, email template subject/body, status/sent flag, and the foreign key link to the job.

#### [NEW] [schemas.py](file:///d:/resume%20analyzer/website/backend/schemas.py)
- Pydantic representations of request and response payloads.
- Includes validators and formatting logic to match client expectations.

#### [NEW] [scoring.py](file:///d:/resume%20analyzer/website/backend/services/scoring.py)
- Decouples hiring thresholds from the LLM prompt.
- Computes `total_score` based on category items.
- Determines hiring status labels (`Strong Shortlist`, `Shortlist`, `Needs HR Review`, `Reject`) based on the rules:
  - Score >= 85: "Strong Shortlist"
  - Score >= 70: "Shortlist"
  - Score >= 60: "Needs HR Review"
  - Score < 60: "Reject"

#### [NEW] [resume_parser.py](file:///d:/resume%20analyzer/website/backend/services/resume_parser.py)
- Extracts plain text from `.pdf`, `.docx`, and `.txt` files.
- Handles edge cases and returns clean text blocks.

#### [NEW] [ai_service.py](file:///d:/resume%20analyzer/website/backend/services/ai_service.py)
- Configures connection to Azure OpenAI using Pydantic Settings.
- Sends the resume text and job description to the model using the provided system prompts.
- Parses the returned JSON structure.

#### [NEW] [email_service.py](file:///d:/resume%20analyzer/website/backend/services/email_service.py)
- Handles email logging and optional SMTP routing.

#### [NEW] [jobs.py](file:///d:/resume%20analyzer/website/backend/routes/jobs.py)
- API endpoint handlers:
  - `GET /api/jobs`: List all jobs
  - `POST /api/jobs`: Create new job position

#### [NEW] [candidates.py](file:///d:/resume%20analyzer/website/backend/routes/candidates.py)
- API endpoint handlers:
  - `POST /api/jobs/{job_id}/resumes`: Accepts multiple file uploads, processes them asynchronously or sequentially, extracts text, analyzes with Azure OpenAI, computes scores, drafts email templates, and commits records to PostgreSQL.
  - `GET /api/jobs/{job_id}/candidates`: Retrieve candidates sorted by score.
  - `PUT /api/candidates/{candidate_id}/recommendation`: Overrides recommendations.
  - `PUT /api/candidates/{candidate_id}/email`: Updates the drafted email body/subject.
  - `POST /api/candidates/{candidate_id}/email/send`: Triggers delivery/logs.

#### [NEW] [main.py](file:///d:/resume%20analyzer/website/backend/main.py)
- Sets up FastAPI instance, configures CORS, registers API routers, mounts frontend directory, and creates tables on startup.

---

### [Frontend Layer]

#### [NEW] [index.html](file:///d:/resume%20analyzer/website/frontend/index.html)
- Clean, semantic HTML refactored from `resume-screener (1).html`.
- Includes viewport meta, fonts preconnects, and scripts linked at the end.

#### [NEW] [style.css](file:///d:/resume%20analyzer/website/frontend/style.css)
- Premium look and feel: glassmorphism, curated dark/light modern styling (e.g. HSL tailored color schemes, subtle shadows).
- Seamless micro-animations for list items, file drops, and active buttons.

#### [NEW] [script.js](file:///d:/resume%20analyzer/website/frontend/script.js)
- Rewritten state-handling logic that makes AJAX calls to the FastAPI backend instead of the local mock storage API.
- Implements dropzone dragging, real-time candidates list updates, and modal/drawer views.

---

## Verification Plan

### Automated Tests
- Create a test script `backend/test_pipeline.py` that mocks the Azure OpenAI API response, tests text extraction, saves a dummy candidate to the local database, and asserts scoring rules.

### Manual Verification
- Launch the FastAPI development server: `uvicorn backend.main:app --reload`
- Navigate to the frontend page in the browser.
- Perform the following user flows:
  1. Add a job description.
  2. Drag and drop multiple resume files.
  3. Verify the status updates in the processing queue.
  4. Select a candidate, review the detailed score breakdown, strengths, and missing skills.
  5. Edit the invitation/rejection email template, click "Send email", and check the console logs / mailto action.
