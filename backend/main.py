import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.database import engine, Base
from backend.routes import jobs, candidates, emails

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Resume Analyzer API",
    description="Backend API for parsing, scoring, and triaging candidate resumes against job descriptions.",
    version="1.0.0"
)

# Configure CORS securely
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_raw == "*":
    origins = ["*"]
    allow_credentials = False  # Wildcard origins cannot be used with credentials
else:
    origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.auth import security, verify_api_key

# Register API Routers
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(emails.router)

@app.get("/profile")
def profile(credentials=Depends(security), authenticated_token: str = Depends(verify_api_key)):
    """Protected profile endpoint demonstrating HTTPBearer security checks."""
    return {"message": "Authenticated", "credentials": credentials.credentials if credentials else "public"}

# Mount Frontend static files
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
os.makedirs(FRONTEND_DIR, exist_ok=True)

# Mount static files at / so index.html is served automatically at root
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
