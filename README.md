# 🤖 AI Resume Analyzer

> A full-stack intelligent resume screening system that automatically parses resumes, scores them against job descriptions, generates hiring recommendations, and drafts candidate emails — powered by **Azure OpenAI** (or a built-in **Mock Analyzer** when no API key is available).

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack & Architecture](#-tech-stack--architecture)
3. [Project Structure](#-project-structure)
4. [Complete Model Flow (Step-by-Step)](#-complete-model-flow-step-by-step)
5. [How It Works Without an API Key (Mock Mode)](#-how-it-works-without-an-api-key-mock-mode)
6. [Tools & Techniques Used](#-tools--techniques-used)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [Database Schema](#-database-schema)
9. [Environment Configuration (.env)](#-environment-configuration-env)
10. [Running Locally on Your Machine](#-running-locally-on-your-machine)

---

## 🎯 Project Overview

The AI Resume Analyzer is a **recruitment automation platform** that helps HR teams screen large volumes of resumes efficiently.

### ✅ Core Capabilities

| Feature | Description |
|---|---|
| **Resume Parsing** | Extracts raw text from PDF, DOCX, and TXT files |
| **AI Scoring** | Scores candidates on 7 criteria (100-point scale) |
| **Auto-Recommendation** | Assigns one of: Strong Shortlist / Shortlist / Needs HR Review / Reject |
| **Email Drafting** | AI generates personalized candidate emails automatically |
| **Email Dispatch** | Sends emails via SMTP or logs them as mock output |
| **Job Management** | Create and manage multiple job descriptions |
| **Dashboard** | Visual leaderboard of candidates sorted by score |
| **Mock Mode** | Fully functional offline mode — no API key required |

---

## 🏗️ Tech Stack & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│         HTML5 + Vanilla CSS + Vanilla JavaScript            │
│         Served as static files from FastAPI                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP REST (JSON)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│                  Python 3.10+ / FastAPI                     │
│                                                             │
│   Routes         │   Services          │   Models           │
│  ─────────────   │  ───────────────    │  ──────────────    │
│  jobs.py         │  ai_service.py      │  Job               │
│  candidates.py   │  resume_parser.py   │  Candidate         │
│  emails.py       │  scoring.py         │                    │
│                  │  email_service.py   │                    │
└──────────────────┬──────────────────────────────────────────┘
                   │ SQLAlchemy ORM
          ┌────────┴────────┐
          ▼                 ▼
   ┌─────────────┐   ┌───────────────┐
   │ PostgreSQL  │   │ SQLite (auto  │
   │ (primary)   │   │  fallback)    │
   └─────────────┘   └───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │ Azure OpenAI GPT     │  ◄── Optional (falls back to Mock)
   │ (GPT-4 / GPT-3.5)   │
   └──────────────────────┘
```

---

## 📁 Project Structure

```
website/
├── backend/
│   ├── main.py                    # FastAPI app entry point, CORS, router registration
│   ├── database.py                # DB engine setup, PostgreSQL → SQLite fallback
│   ├── models.py                  # SQLAlchemy ORM models (Job, Candidate)
│   ├── schemas.py                 # Pydantic request/response schemas
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables (API keys, DB URL)
│   ├── test_pipeline.py           # CLI test script for local pipeline testing
│   ├── uploads/                   # Temporary directory for uploaded resumes
│   ├── routes/
│   │   ├── jobs.py                # GET /api/jobs, POST /api/jobs
│   │   ├── candidates.py          # POST /api/jobs/{id}/resume, GET candidates, PUT recommendation
│   │   └── emails.py              # PUT email draft, POST send email
│   └── services/
│       ├── ai_service.py          # Core AI logic: Azure OpenAI call + Mock Analyzer
│       ├── resume_parser.py       # Text extraction from PDF / DOCX / TXT
│       ├── scoring.py             # Score normalization, capping, recommendation engine
│       └── email_service.py       # SMTP email dispatch or mock console output
│
├── frontend/
│   ├── index.html                 # Single-page app shell
│   ├── style.css                  # All UI styles (dark mode, glassmorphism)
│   └── script.js                  # Full frontend logic (API calls, rendering, events)
│
├── database/
│   ├── schema.sql                 # PostgreSQL schema definition (reference)
│   └── db.sql                     # Sample seed data (optional)
│
├── sample_resume_john.txt         # Sample resume for testing (John)
├── sample_resume_jane.txt         # Sample resume for testing (Jane)
├── resume_analyzer.db             # SQLite database file (auto-created as fallback)
└── README.md                      # This file
```

---

## 🔄 Complete Model Flow (Step-by-Step)

This section explains exactly what happens when you upload a resume, from click to result.

---

### Step 1 — HR Creates a Job Description

```
Frontend (script.js)
  └── User fills in Job Title + Job Description
  └── Clicks "Create Job" button
  └── POST /api/jobs  →  { title, description }

Backend (routes/jobs.py)
  └── Generates unique job_id: "job_<8-char-hex>"
  └── Saves Job record to database
  └── Returns JSON: { id, title, description, created_at, candidate_count: 0 }

Frontend
  └── Adds new job card to the sidebar
  └── Selects the new job automatically
```

---

### Step 2 — Resume Upload

```
Frontend (script.js)
  └── User drags or selects resume file (PDF / DOCX / TXT)
  └── POST /api/jobs/{job_id}/resume  with multipart/form-data

Backend (routes/candidates.py)  →  upload_and_process_resume()
  └── Verifies job exists in DB (404 if not found)
  └── Saves file to backend/uploads/<uuid>_filename.pdf (temporary)
```

---

### Step 3 — Resume Text Extraction

```
Backend (services/resume_parser.py)  →  extract_text()

  ┌─── File Extension Detection ───────────────────────────────┐
  │  .pdf   → PyMuPDF (fitz): iterates pages, calls page.get_text()
  │  .docx  → python-docx: reads all paragraphs, joins text
  │  .txt   → Plain file read with UTF-8 encoding
  └────────────────────────────────────────────────────────────┘

  └── Returns: raw resume_text (string)
  └── Validates: must be at least 30 characters (else 422 error)
  └── Deletes temp file from disk (in finally block)
```

---

### Step 4 — AI Analysis

```
Backend (services/ai_service.py)  →  analyze_resume_with_ai()

  ┌── API Key Check ────────────────────────────────────────────┐
  │  Checks settings.azure_openai_api_key for placeholders:    │
  │    - "YOUR_API_KEY"                                         │
  │    - Empty string                                           │
  │    - Endpoint contains "YOUR-RESOURCE"                      │
  │                                                             │
  │  YES Real Key?  →  Call Azure OpenAI API                    │
  │  NO Key?        →  Fall back to Mock Analyzer               │
  └─────────────────────────────────────────────────────────────┘

  PATH A: Azure OpenAI
  │
  │  PROMPT_TEMPLATE is filled with:
  │    - Job Description (from DB)
  │    - Resume Text (max 12,000 characters)
  │
  │  System Role: "You are a professional technical recruiter."
  │  Temperature: 0.1  (deterministic, low creativity)
  │
  │  Azure OpenAI returns a JSON blob with:
  │    - candidate_information: { name, email, phone, applied_position }
  │    - resume_summary
  │    - skills[], missing_skills[]
  │    - education, experience_years
  │    - projects[], certifications[]
  │    - score_breakdown: { technical_skills, experience, education,
  │                          projects, certifications, resume_quality,
  │                          bonus_skills }
  │    - total_score, strengths[], weaknesses[]
  │    - recommendation, recommendation_reason
  │    - email: { subject, body }
  │
  │  Markdown wrapper cleaned (```json ... ```)
  │  JSON parsed → Python dict returned
  │
  PATH B: Mock Analyzer (No API Key)
  │
  │  generate_mock_analysis(resume_text, job_title)
  │
  │  Keyword scanning logic on resume_text:
  │    - Name:   Regex r"([A-Z][a-z]+)\s+([A-Z][a-z]+)"
  │    - Email:  Regex r"[\w\.-]+@[\w\.-]+\.\w+"
  │    - Phone:  Phone number regex
  │
  │  Score rules (deterministic keyword-based):
  │    technical_skills: 35 if "python"/"javascript" found, else 25
  │    experience:       16 if "experience"/"developer" found, else 12
  │    education:         8 if "bachelor"/"master"/"degree" found, else 6
  │    projects:         12 if "project"/"portfolio" found, else 9
  │    certifications:    4 if "certif" found, else 0
  │    resume_quality:    4 (always)
  │    bonus_skills:      4 if "git"/"docker" found, else 2
  │
  │  Returns identical dict structure to Azure OpenAI path
```

---

### Step 5 — Score Normalization & Recommendation

```
Backend (routes/candidates.py)
  └── Extracts raw scores from AI result score_breakdown

Backend (services/scoring.py)  →  process_scoring()
  └── Validates each score category
  └── Caps scores to max limits:
        technical_skills  → max 40
        experience        → max 20
        education         → max 10
        projects          → max 15
        certifications    → max  5
        resume_quality    → max  5
        bonus_skills      → max  5
        ─────────────────────────
        TOTAL             → max 100

  └── calculate_recommendation(total_score):
        Score >= 85  →  category: "Shortlist",  label: "Strong Shortlist"
        Score >= 70  →  category: "Shortlist",  label: "Shortlist"
        Score >= 60  →  category: "Review",     label: "Needs HR Review"
        Score < 60   →  category: "Reject",     label: "Reject"
```

---

### Step 6 — Save to Database

```
Backend (routes/candidates.py)
  └── Creates Candidate ORM object with all fields:
        - Personal info (name, email, phone, applied_position)
        - All 7 category scores + reasons
        - Total score, recommendation, recommendation_label
        - Strengths list, missing_skills list
        - Resume summary
        - Email subject + body (AI-generated)
        - email_sent: False
        - upload_date: current UTC timestamp
  └── db.add() → db.commit() → db.refresh()
  └── Returns full CandidateResponse JSON
```

---

### Step 7 — Frontend Renders Results

```
Frontend (script.js)
  └── Receives CandidateResponse from API
  └── Renders candidate card with:
        - Score badge (color-coded by recommendation)
        - Score breakdown bar chart (7 categories)
        - Strengths / Missing Skills sections
        - AI-generated email draft (editable)
        - "Send Email" button
        - "Override Recommendation" dropdown
```

---

### Step 8 — Email Workflow

```
HR edits draft email in UI
  └── PUT /api/candidates/{id}/email  →  saves updated subject + body

HR clicks "Send Email"
  └── POST /api/candidates/{id}/email/send

Backend (routes/emails.py)  →  dispatch_email()
  └── Validates candidate email is not empty/"Not found"

Backend (services/email_service.py)  →  send_candidate_email()

  ┌── SMTP Config Check ────────────────────────────────────────┐
  │  Checks SMTP_USER, SMTP_PASSWORD env vars                   │
  │                                                             │
  │  Configured?    → Sends via smtplib + STARTTLS              │
  │  Not set?       → Prints "MOCK EMAIL SENT" to console       │
  └─────────────────────────────────────────────────────────────┘

  └── Sets candidate.email_sent = True in DB
  └── Returns updated CandidateResponse
```

---

### Step 9 — Database Auto-Fallback

```
Backend (database.py)  →  On startup

  └── Reads DATABASE_URL from .env
      Default: postgresql://postgres:postgres@localhost:5432/resume_analyzer

  └── Attempts psycopg2 connection to PostgreSQL (timeout: 3 seconds)
      Connected  → Uses PostgreSQL as ORM engine
      Failed     → Prints warning, falls back to SQLite

  └── SQLite file: ./resume_analyzer.db  (created automatically)
  └── SQLAlchemy creates all tables automatically on startup:
        Base.metadata.create_all(bind=engine)
```

---

## 🧪 How It Works Without an API Key (Mock Mode)

**You do NOT need an API key to run or test this project.** The system has a full built-in **Mock Analyzer** that activates automatically.

### Trigger Condition

The mock analyzer is triggered when any of these are true in your `.env`:

```env
AZURE_OPENAI_API_KEY=YOUR_API_KEY        ← placeholder detected
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/  ← placeholder detected
AZURE_OPENAI_API_KEY=                    ← empty string
```

### What Mock Mode Does

The `generate_mock_analysis()` function in `backend/services/ai_service.py`:

1. **Extracts candidate info** using regular expressions (name, email, phone)
2. **Scans keywords** in the resume text to assign scores:
   - Detects: Python, JavaScript, experience, developer, bachelor, master, project, certifications, git, docker
3. **Returns the same data structure** as the Azure OpenAI response — so the rest of the pipeline works identically
4. **Generates email drafts** based on the computed score tier

### Console Output in Mock Mode

When you upload a resume without an API key, you will see in the terminal:
```
INFO: Azure OpenAI API keys not configured. Falling back to local Mock Analyzer.
```

### Database in Mock Mode

Without PostgreSQL, the app automatically uses **SQLite** (`resume_analyzer.db`):
```
WARNING: PostgreSQL connection failed or auth error. Falling back to local SQLite database.
```

### Result: Fully functional system without any API key or database server!

---

## 🛠️ Tools & Techniques Used

### Backend

| Tool / Library | Version | Purpose |
|---|---|---|
| **Python** | 3.10+ | Core programming language |
| **FastAPI** | >= 0.100.0 | REST API framework with async support |
| **Uvicorn** | >= 0.22.0 | ASGI server to run FastAPI |
| **SQLAlchemy** | >= 2.0.0 | ORM for database models and queries |
| **psycopg2-binary** | >= 2.9.6 | PostgreSQL adapter for Python |
| **PyMuPDF (fitz)** | >= 1.22.0 | PDF text extraction |
| **python-docx** | >= 0.8.11 | DOCX text extraction |
| **python-multipart** | >= 0.0.6 | Multipart form/file upload handling |
| **openai** | >= 1.0.0 | Azure OpenAI API client |
| **pydantic-settings** | >= 2.0.0 | Settings management from .env file |

### Frontend

| Tool | Purpose |
|---|---|
| **HTML5** | Semantic structure of the single-page app |
| **Vanilla CSS** | All styling including dark mode, glassmorphism |
| **Vanilla JavaScript** | API communication, DOM rendering, event handling |
| **Fetch API** | HTTP calls to the FastAPI backend |
| **CSS Grid / Flexbox** | Responsive layout system |

### AI & NLP Techniques

| Technique | Where Used |
|---|---|
| **Large Language Model (LLM) Prompting** | Azure OpenAI structured prompt with JSON schema output |
| **Zero-shot Prompting** | No examples given; LLM reasons from instruction alone |
| **Structured Output Parsing** | JSON response parsing with markdown wrapper cleanup |
| **Keyword-Based Scoring (Mock)** | Regex + string matching for offline analysis |
| **Score Normalization & Capping** | Clamps each category to defined max values |
| **Rule-based Recommendation** | Threshold scoring rules (>=85, >=70, >=60, <60) |

### Database Techniques

| Technique | Details |
|---|---|
| **ORM Mapping** | SQLAlchemy declarative models |
| **Custom TypeDecorator** | ArrayLike type stores lists as JSON on SQLite, native ARRAY on PostgreSQL |
| **Auto Database Creation** | Base.metadata.create_all() creates tables at startup |
| **Graceful Fallback** | PostgreSQL → SQLite automatic switch on connection failure |
| **Cascade Deletes** | Deleting a job deletes all associated candidates |

### Architecture Patterns

| Pattern | Details |
|---|---|
| **Layered Architecture** | Routes → Services → Models (separation of concerns) |
| **Dependency Injection** | FastAPI Depends(get_db) for DB session management |
| **Graceful Degradation** | Mock mode for AI, SQLite fallback for DB, console mock for email |
| **Adapter Pattern** | ArrayLike TypeDecorator abstracts PostgreSQL vs SQLite list storage |
| **Repository Pattern** | ORM queries abstracted inside route handlers |

---

## 📡 API Endpoints Reference

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs` | List all jobs with candidate counts |
| `POST` | `/api/jobs` | Create a new job description |

### Candidates

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/jobs/{job_id}/resume` | Upload and analyze a resume |
| `GET` | `/api/jobs/{job_id}/candidates` | List all candidates for a job (sorted by score) |
| `PUT` | `/api/candidates/{id}/recommendation` | Override candidate recommendation |

### Emails

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/candidates/{id}/email` | Update email subject and body |
| `POST` | `/api/candidates/{id}/email/send` | Send email to candidate |

### Interactive API Docs (Auto-generated by FastAPI)

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🗄️ Database Schema

### `jobs` Table

| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR(50) | PK, format: job_<8hex> |
| `title` | VARCHAR(255) | Job title |
| `description` | TEXT | Full job description |
| `created_at` | TIMESTAMP | Auto-set to UTC now |

### `candidates` Table

| Column | Type | Notes |
|---|---|---|
| `candidate_id` | INTEGER | PK, auto-increment |
| `job_id` | VARCHAR(50) | FK → jobs.id (CASCADE DELETE) |
| `file_name` | VARCHAR | Original uploaded filename |
| `full_name` | VARCHAR | Extracted from resume |
| `email` | VARCHAR | Extracted from resume |
| `phone` | VARCHAR | Extracted from resume |
| `applied_position` | VARCHAR | Job title applied for |
| `years_experience` | VARCHAR | Extracted from AI |
| `top_skills` | ArrayLike | JSON array of skill strings |
| `technical_skills_score` | INTEGER | Max 40 |
| `experience_score` | INTEGER | Max 20 |
| `education_score` | INTEGER | Max 10 |
| `projects_score` | INTEGER | Max 15 |
| `certifications_score` | INTEGER | Max 5 |
| `resume_quality_score` | INTEGER | Max 5 |
| `bonus_skills_score` | INTEGER | Max 5 |
| `resume_total_score` | INTEGER | Sum of above (max 100) |
| `recommendation` | VARCHAR | Shortlist / Review / Reject |
| `recommendation_label` | VARCHAR | Human-readable label |
| `strengths` | ArrayLike | JSON array |
| `missing_skills` | ArrayLike | JSON array |
| `summary` | TEXT | AI resume summary |
| `email_subject` | TEXT | AI-generated email subject |
| `email_body` | TEXT | AI-generated email body |
| `email_sent` | BOOLEAN | False by default |
| `upload_date` | TIMESTAMP | Auto-set to UTC now |

---

## ⚙️ Environment Configuration (.env)

File located at: `backend/.env`

```env
# ─── DATABASE ──────────────────────────────────────────────────
# Primary database. If PostgreSQL is unavailable, SQLite is used automatically.
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_analyzer

# ─── AZURE OPENAI ──────────────────────────────────────────────
# Leave as placeholders to use Mock Analyzer (no API key needed)
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
AZURE_OPENAI_API_KEY=YOUR_API_KEY
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# ─── SMTP (Optional for real email sending) ────────────────────
# Leave blank/placeholder to use Mock Email (prints to console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

Tip: For Gmail SMTP, generate an App Password at https://myaccount.google.com/apppasswords (requires 2FA enabled).

---

## 🚀 Running Locally on Your Machine

### Prerequisites

Make sure you have these installed:
- **Python 3.10 or higher** — https://www.python.org/downloads/
- **Git** (optional) — https://git-scm.com/
- **PostgreSQL** (optional) — if not installed, the app uses SQLite automatically

---

### Step 1 — Clone the Repository

```bash
git clone <your-repository-url>
cd "resume analyzer/website"
```

---

### Step 2 — Create a Python Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

---

### Step 3 — Install Dependencies

```bash
pip install -r backend/requirements.txt
```

---

### Step 4 — Configure Environment Variables

The `.env` file is already at `backend/.env`.
Open it with your editor and fill in your values, or leave as-is for **Mock Mode** (no API key needed).

**For quick start (Mock Mode — no API key needed):**
Leave `backend/.env` exactly as-is. The system will automatically use:
- Mock AI Analyzer (keyword-based scoring)
- SQLite database (if PostgreSQL is not running)
- Console mock emails (if SMTP is not configured)

---

### Step 5 — Run the Application

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Or on Windows using Python directly:

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

---

### Step 6 — Open the Application

Open your browser and go to:

```
http://localhost:8000
```

The frontend is automatically served by FastAPI from the `/frontend` directory.

---

### Step 7 — Test with Sample Resumes

Two sample resumes are included in the project root:

```
sample_resume_john.txt   ← More detailed, higher expected score
sample_resume_jane.txt   ← Shorter, lower expected score
```

**To test:**
1. Go to http://localhost:8000
2. Click **"+ New Job"** → Enter a job title and description → Save
3. Click **"Upload Resume"** → Select `sample_resume_john.txt`
4. View the score card, breakdown, and email draft

---

### Step 8 — Run the CLI Pipeline Test

A standalone test script is included at `backend/test_pipeline.py`:

```bash
python backend/test_pipeline.py
```

This tests the full resume processing pipeline from the command line without running the web server.

---

### Optional: Run with PostgreSQL

1. Install PostgreSQL and create a user `postgres` with password `postgres`
2. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_analyzer
   ```
3. The app will create the `resume_analyzer` database automatically on first startup

---

### Optional: Run with Real Azure OpenAI

1. Create an Azure OpenAI resource in Azure Portal (https://portal.azure.com)
2. Deploy a GPT-4 or GPT-3.5-turbo model
3. Update `backend/.env`:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-actual-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-actual-api-key
   AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
   ```
4. Restart the server — AI analysis will use the real LLM

---

### Verify Installation

After starting the server, you should see:

```
SUCCESS: Connected to PostgreSQL database at postgresql://...
  (or)
WARNING: PostgreSQL connection failed. Falling back to local SQLite database.

INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Visit http://localhost:8000/docs to confirm the API is running.

---

## 📊 Scoring Rubric Reference

| Category | Max Points | What's Evaluated |
|---|---|---|
| Technical Skills | 40 | Match of required tech stack skills |
| Experience | 20 | Years of relevant experience |
| Education | 10 | Degree and field of study |
| Projects & Portfolio | 15 | Relevance and complexity of projects |
| Certifications | 5 | Relevant professional certifications |
| Resume Quality | 5 | Formatting, clarity, organization |
| Bonus Skills | 5 | Git, Docker, Azure, soft skills |
| **TOTAL** | **100** | |

| Score Range | Recommendation |
|---|---|
| 85 – 100 | Strong Shortlist |
| 70 – 84 | Shortlist |
| 60 – 69 | Needs HR Review |
| Below 60 | Reject |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is for educational and demonstration purposes.

---

*Built with FastAPI, SQLAlchemy, Azure OpenAI, and Vanilla JS.*
