# 🤖 AI Resume Analyzer

> A production-ready, full-stack intelligent resume screening system that automatically parses resumes, scores them against job descriptions, generates hiring recommendations, and drafts candidate emails — powered by **Azure AI Foundry / Azure OpenAI** (GPT-4o, Claude, Kimi, DeepSeek, etc.) with an offline **Job-Specific Mock Analyzer** fallback.
---
## Demo Video
![Dashboard](frontend/demo video.mp4)

---
## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack & Architecture](#-tech-stack--architecture)
3. [Project Structure](#-project-structure)
4. [Job-Specific Keyword Profiles (11 Roles)](#-job-specific-keyword-profiles-11-roles)
5. [Complete Model Flow (Step-by-Step)](#-complete-model-flow-step-by-step)
6. [How It Works Without an API Key (Mock Mode)](#-how-it-works-without-an-api-key-mock-mode)
7. [Security & Authentication (HTTPBearer)](#-security--authentication-httpbearer)
8. [API Endpoints Reference](#-api-endpoints-reference)
9. [Database Schema](#-database-schema)
10. [Environment Configuration (.env)](#-environment-configuration-env)
11. [Running Locally on Your Machine](#-running-locally-on-your-machine)

---

## 🎯 Project Overview

The AI Resume Analyzer is a **recruitment automation platform** that helps HR teams screen large volumes of resumes efficiently.

### ✅ Core Capabilities

| Feature | Description |
|---|---|
| **Multi-Format Parsing** | Extracts raw text from PDF (PyMuPDF), DOCX (python-docx), and TXT files |
| **Multi-Model Support** | Works with Azure OpenAI (GPT-4o/4/3.5) and Azure AI Foundry Serverless (Claude, Kimi, DeepSeek, Llama) |
| **11 Role Profiles** | Tailored keyword dictionaries and regex experience extraction for 11 technical & ops roles |
| **7-Criteria Scoring** | Evaluates candidates on a 100-point rubric with normalized breakdown scores |
| **Auto Recommendation** | Assigns: `Strong Shortlist` (85-100), `Shortlist` (70-84), `Needs HR Review` (60-69), or `Reject` (<60) |
| **Email Drafting & Dispatch** | Generates personalized emails automatically and dispatches via SMTP or mailto links |
| **HTTPBearer Security** | Enforces optional `HTTPBearer` token (`Authorization: Bearer <token>`) & `X-API-Key` headers |
| **Mock Mode Fallback** | 100% functional offline mode — no API key required |

---

## 🏗️ Tech Stack & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│         HTML5 + Vanilla CSS + Vanilla JavaScript            │
│         Served statically by FastAPI at root (/)            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP REST (JSON)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│                  Python 3.10+ / FastAPI                     │
│                                                             │
│   Routes         │   Services          │   Security / ORM   │
│  ─────────────   │  ───────────────    │  ───────────────   │
│  jobs.py         │  ai_service.py      │  auth.py           │
│  candidates.py   │  resume_parser.py   │  models.py         │
│  emails.py       │  scoring.py         │  schemas.py        │
│                  │  email_service.py   │  database.py       │
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
   ┌─────────────────────────────────────────┐
   │ Azure AI Foundry / Azure OpenAI         │
   │ (GPT-4o, Claude 3.5, Kimi, DeepSeek R1) │ ◄── Optional (falls back to Mock)
   └─────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
website/
├── backend/
│   ├── main.py                    # FastAPI app entry point, CORS, routers, /profile route
│   ├── auth.py                    # HTTPBearer & X-API-Key security header verification
│   ├── database.py                # DB engine setup, PostgreSQL → SQLite fallback
│   ├── models.py                  # SQLAlchemy ORM models (Job, Candidate)
│   ├── schemas.py                 # Pydantic request/response schemas & CandidateSummaryResponse
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables (API keys, DB URL - gitignored)
│   ├── .env.example               # Clean environment variables template
│   ├── test_pipeline.py           # CLI test script for local pipeline testing
│   ├── uploads/                   # Temporary directory for uploaded resumes
│   ├── routes/
│   │   ├── jobs.py                # GET /api/jobs, POST /api/jobs
│   │   ├── candidates.py          # POST /api/jobs/{id}/resume, GET candidates, PUT recommendation, DELETE candidate
│   │   └── emails.py              # PUT email draft, POST send email
│   └── services/
│       ├── ai_service.py          # Core AI logic: Azure AI Foundry client + 11-role Mock Analyzer
│       ├── resume_parser.py       # Text extraction from PDF / DOCX / TXT
│       ├── scoring.py             # Score normalization, capping, recommendation engine
│       └── email_service.py       # SMTP email dispatch or mock console output
│
├── frontend/
│   ├── index.html                 # Single-page app shell
│   ├── style.css                  # All UI styles (dark mode, glassmorphism)
│   └── script.js                  # Full frontend logic (API calls, dashboard, events)
│
├── database/
│   ├── schema.sql                 # PostgreSQL schema definition (reference)
│   └── db.sql                     # Sample seed data (optional)
│
├── .gitignore                     # Git ignore rules (.env, *.key, build artifacts, etc.)
├── sample_resume_john.txt         # Sample resume for testing (John)
├── sample_resume_jane.txt         # Sample resume for testing (Jane)
└── README.md                      # Project documentation
```

---

## 🎯 Job-Specific Keyword Profiles (11 Roles)

The system includes pre-configured keyword dictionaries for **11 Key Technical & Operations Roles**:

1. **`Technical Delivery Lead - .NET`**: `.net`, `c#`, `asp.net`, `azure`, `microservices`, `system design`, `agile`, `project management`, `stakeholder management`, `mentoring`
2. **`Technical Lead - .NET`**: `.net core`, `c#`, `sql server`, `entity framework`, `azure`, `rest api`, `code review`, `migration`, `modernization`, `refactoring`
3. **`Software Architect - .NET & Azure`**: `software architect`, `system design`, `azure functions`, `docker`, `kubernetes`, `domain driven design`, `clean architecture`
4. **`Senior Business Analyst`**: `business systems analyst`, `requirements gathering`, `process mapping`, `gap analysis`, `acceptance criteria`, `user stories`, `sql`
5. **`Full Stack Java/React Developer`**: `java`, `spring boot`, `react`, `typescript`, `hibernate`, `maven`, `git`, `docker`, `kubernetes`, `postgresql`
6. **`Senior Databricks Architect`**: `databricks`, `apache spark`, `spark sql`, `delta lake`, `data pipeline`, `python`, `lakehouse`, `power bi`
7. **`Team Lead - Data Center Network Operations SME`**: `cisco`, `switching`, `routing`, `firewall`, `vpn`, `bgp`, `ospf`, `incident management`, `vmware`
8. **`Tools / Endpoint Systems Engineer`**: `windows`, `linux`, `active directory`, `intune`, `sccm`, `powershell`, `azure ad`, `office 365`, `group policy`
9. **`Senior AI Engineer`**: `python`, `machine learning`, `deep learning`, `tensorflow`, `pytorch`, `llm`, `rag`, `langchain`, `huggingface`, `vector database`, `fastapi`
10. **`WebMethods Developer`**: `webmethods`, `integration server`, `trading networks`, `broker`, `designer`, `api gateway`, `soap`, `rest`, `xml`, `json`
11. **`System Engineer II - Server Services`**: `windows server`, `linux`, `vmware`, `hyper-v`, `active directory`, `powershell`, `virtualization`, `storage`

---

## 🔄 Complete Model Flow (Step-by-Step)

```
1. HR Creates Job  ──►  POST /api/jobs (saves Job record with job_id)
2. Resume Upload   ──►  POST /api/jobs/{id}/resume (validates file signature & 10MB limit)
3. Text Extract    ──►  PyMuPDF / python-docx parses raw resume text
4. AI Evaluation   ──►  Checks .env credentials:
                          - Valid Key: Calls Azure AI Foundry / OpenAI model API
                          - Blank Key: Executes 11-role Mock Analyzer with regex experience
5. Normalization   ──►  Caps scores to 100-pt rubric (Tech 40, Exp 20, Edu 10, Proj 15, Cert 5, Quality 5, Bonus 5)
6. Save & Render   ──►  Stores Candidate record in DB & updates Frontend UI dashboard
7. Email Dispatch  ──►  Sends candidate email via SMTP or opens local mail client
```

---

## 🧪 How It Works Without an API Key (Mock Mode)

You do **NOT** need an API key to run or test this project.

### Trigger Condition
When `AZURE_OPENAI_API_KEY` in `backend/.env` is blank or unconfigured, the system automatically runs the local **Job-Specific Mock Analyzer**:

```python
INFO: Azure AI Foundry / OpenAI API key not set in .env. Falling back to local Mock Analyzer.
```

### Mock Features
- **Regex Experience Extraction**: Extracts years of experience using patterns (`r'(\d+)\+?\s*years?'`, `r'over\s*(\d+)\s*years?'`, `r'(\d+)\s*yrs?'`).
- **Dynamic Role Matching**: Selects the matching keyword profile out of 11 roles based on `job_title`.
- **Matched (`✔`) & Missing (`✘`) Keywords**: Returns matched keywords in `skills`/`strengths` and missing keywords in `missing_skills`/`weaknesses`.

---

## 🔒 Security & Authentication (HTTPBearer)

The backend provides optional **HTTPBearer** and **API Key Header** security checks:

- **Bearer Token**: `Authorization: Bearer <your_api_key>`
- **API Key Header**: `X-API-Key: <your_api_key>`
- **Protected Endpoint**: `GET /profile` returns `200 OK` with valid credentials or `401 Unauthorized` if `API_KEY` is configured in `backend/.env`.

---

## 📡 API Endpoints Reference

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs` | List all jobs with candidate counts |
| `POST` | `/api/jobs` | Create a new job position |

### Candidates
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/jobs/{job_id}/resume` | Upload and analyze a resume file |
| `GET` | `/api/jobs/{job_id}/candidates` | List all candidates for a job (sorted by score) |
| `PUT` | `/api/candidates/{id}/recommendation` | Override candidate hiring recommendation |
| `DELETE` | `/api/candidates/{id}` | Permanently delete a candidate record |

### Emails & Profile
| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/candidates/{id}/email` | Update email draft subject & body |
| `POST` | `/api/candidates/{id}/email/send` | Dispatch email to candidate |
| `GET` | `/profile` | Check HTTPBearer security status |

---

## 🗄️ Database Schema

### Key Summary Schema (`CandidateSummaryResponse`)
For lightweight payloads, the backend exposes:
```python
class CandidateSummaryResponse(BaseSchema):
    job_id: str
    full_name: str
    email: str
    phone: str
    applied_position: str
    years_experience: str
    resume_total_score: int
    recommendation: str
```

---

## ⚙️ Environment Configuration (.env)

Edit `backend/.env` to configure your environment:

```env
# Security / API Authentication Key (Optional)
API_KEY=

# Database configuration (PostgreSQL with SQLite fallback)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_analyzer

# Azure AI Foundry / Azure OpenAI configuration
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=
```

---

## 🐳 Running with Docker & Docker Compose

You can launch the full application (Frontend, Backend, and PostgreSQL database) using Docker Compose with a single command:

### Quickstart

```bash
docker compose up --build
```

### Container Services

| Service | Port | Description |
|---|---|---|
| **Frontend (Nginx)** | `http://localhost:80` | Serves web app & reverse-proxies `/api` to backend |
| **Backend (FastAPI)** | `http://localhost:8000` | FastAPI server & interactive `/docs` |
| **Database (PostgreSQL)** | `localhost:5432` | PostgreSQL database storing jobs & candidate evaluations |

### Useful Docker Commands

```bash
# Run in background (detached mode)
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop all containers
docker compose down

# Stop containers and wipe PostgreSQL database volume
docker compose down -v
```

---

## 🚀 Running Locally on Your Machine

### Step 1 — Clone & Activate Virtual Environment
```bash
git clone <your-repository-url>
cd "AI-Resume-Analyzer"
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # macOS/Linux
```

### Step 2 — Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### Step 3 — Run Application Server
```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Open your browser at **http://localhost:8000**. Visit **http://localhost:8000/docs** for Swagger API documentation.

