import os
import sys

def main():
    print("="*60)
    print("AI RESUME ANALYZER PIPELINE TESTER (UPDATED SCHEMA)")
    print("="*60)
    
    # 1. Test Package Imports
    print("\n1. Testing module imports...")
    modules = ["fastapi", "sqlalchemy", "psycopg2", "fitz", "docx", "openai", "pydantic_settings"]
    all_imported = True
    for module in modules:
        try:
            __import__(module)
            print(f"  [OK] Successfully imported '{module}'")
        except ImportError as e:
            print(f"  [FAILED] Could not import '{module}': {e}")
            all_imported = False
            
    if not all_imported:
        print("\n[ERROR] Missing required dependencies. Run pip install again.")
        sys.exit(1)
        
    # 2. Test Scoring Logic
    print("\n2. Testing scoring logic...")
    try:
        from backend.services.scoring import process_scoring
        test_scores = {
            "technical_skills": 38,
            "experience": 18,
            "education": 9,
            "projects": 14,
            "certifications": 4,
            "resume_quality": 4,
            "bonus_skills": 4
        }
        scores, total, rec, rec_label = process_scoring(test_scores)
        print(f"  [OK] Processed score data: Total={total}, Rec={rec}, Label={rec_label}")
        assert total == 91
        assert rec == "Shortlist"
        assert rec_label == "Strong Shortlist"
        
        # Test Reject
        test_low_scores = {k: 0 for k in test_scores.keys()}
        _, low_total, low_rec, _ = process_scoring(test_low_scores)
        print(f"  [OK] Processed reject data: Total={low_total}, Rec={low_rec}")
        assert low_total == 0
        assert low_rec == "Reject"
    except Exception as e:
        print(f"  [FAILED] Scoring logic error: {e}")
        sys.exit(1)

    # 3. Test Database Connection and Operations
    print("\n3. Testing Database Connection & Schema compliance...")
    try:
        from sqlalchemy import text
        from backend.database import SessionLocal, engine, Base
        
        # Test engine connectivity
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("  [OK] Direct engine database query succeeded.")
            
        from backend.models import Job, Candidate
        
        # Test table creation
        Base.metadata.create_all(bind=engine)
        print("  [OK] Base metadata schema tables created successfully.")
        
        # Test session operation
        db = SessionLocal()
        try:
            import uuid
            
            # Insert a dummy job
            job_id = f"test_job_{uuid.uuid4().hex[:8]}"
            dummy_job = Job(
                id=job_id,
                title="Test Software Engineer",
                description="Needs Python, Postgres, and FastAPI experience."
            )
            db.add(dummy_job)
            db.commit()
            print(f"  [OK] Database insert Job record succeeded (ID: {job_id})")
            
            # Insert a dummy candidate linked to the job
            dummy_cand = Candidate(
                job_id=job_id,
                file_name="test_resume.pdf",
                full_name="John Doe",
                email="john.doe@example.com",
                phone="123-456-7890",
                applied_position="Python Developer",
                years_experience="3 years",
                top_skills=["Python", "PostgreSQL"],
                technical_skills_score=35,
                experience_score=15,
                resume_total_score=50,
                recommendation="Review",
                recommendation_label="Needs HR Review",
                strengths=["Good database skills"],
                missing_skills=["FastAPI"],
                email_subject="Your application",
                email_body="Thanks for applying",
                email_sent=False
            )
            db.add(dummy_cand)
            db.commit()
            print(f"  [OK] Database insert Candidate record succeeded (Generated Candidate ID: {dummy_cand.candidate_id})")
            
            # Verify candidate property access
            print(f"  [OK] Property access 'id' -> {dummy_cand.id}")
            print(f"  [OK] Property access 'name' -> {dummy_cand.name}")
            print(f"  [OK] Property access 'score' -> {dummy_cand.score}")
            print(f"  [OK] Property access 'sent' -> {dummy_cand.sent}")
            
            # Clean up dummy records
            db.delete(dummy_cand)
            db.delete(dummy_job)
            db.commit()
            print("  [OK] Dummy database records cleaned up.")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"  [FAILED] Database connection / operation error: {e}")
        sys.exit(1)
        
    print("\n" + "="*60)
    print("ALL TESTS PASSED SUCCESSFULLY! Ready to run the application.")
    print("="*60)

if __name__ == "__main__":
    main()
