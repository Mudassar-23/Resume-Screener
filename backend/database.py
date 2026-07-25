import os
from urllib.parse import urlparse
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default database connection string
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/resume_analyzer")

def verify_and_create_postgres_db(db_url: str) -> bool:
    """
    Attempts to connect to PostgreSQL server. Creates target database if not exists.
    Returns True if connection succeeded, False if it failed (e.g. invalid password).
    """
    if db_url.startswith("sqlite"):
        return True

    try:
        url = urlparse(db_url)
        db_name = url.path.lstrip('/')
        
        username = url.username or "postgres"
        password = url.password or "postgres"
        host = url.hostname or "localhost"
        port = url.port or 5432
        
        conn_str = f"postgresql://{username}:{password}@{host}:{port}/postgres"
        
        conn = psycopg2.connect(conn_str, connect_timeout=3)
        conn.autocommit = True
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_database WHERE datname=%s", (db_name,))
            if not cursor.fetchone():
                from psycopg2 import sql
                cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
                print(f"Database '{db_name}' created successfully.")
        conn.close()
        return True
    except Exception as e:
        print(f"PostgreSQL Connection Error: {e}")
        return False

# Check PostgreSQL connection availability
db_connected = verify_and_create_postgres_db(DATABASE_URL)

if not db_connected:
    print("WARNING: PostgreSQL connection failed or auth error. Falling back to local SQLite database.")
    DATABASE_URL = "sqlite:///./resume_analyzer.db"
else:
    print(f"SUCCESS: Connected to PostgreSQL database at {DATABASE_URL}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# DB Dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
