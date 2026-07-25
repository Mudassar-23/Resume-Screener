import os
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def verify_api_key(api_key: str = Security(api_key_header)):
    expected_key = os.getenv("API_KEY", "").strip()
    
    # If API_KEY is set in environment (e.g. production), enforce authentication
    if expected_key:
        if not api_key or api_key != expected_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: Missing or invalid API Key."
            )
    return api_key
