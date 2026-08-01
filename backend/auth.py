import os
from fastapi import Depends, Security, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from pydantic_settings import BaseSettings

class AuthSettings(BaseSettings):
    api_key: str = ""

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        env_file_encoding = 'utf-8'
        extra = 'ignore'

auth_settings = AuthSettings()

# HTTPBearer Security Scheme
security = HTTPBearer(auto_error=False)

# Alternative API Key Header Scheme
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    api_key: str = Security(api_key_header)
):
    """
    Validates HTTPBearer token or X-API-Key header against the API_KEY set in backend/.env.
    If no API_KEY is set in .env, requests pass freely.
    """
    expected_key = (auth_settings.api_key or os.getenv("API_KEY", "")).strip()
    
    # If API_KEY is set in .env or environment, enforce authentication
    if expected_key and expected_key.upper() not in ("YOUR_API_KEY", "YOUR_KEY", "YOUR-API-KEY", "XXX"):
        token = None
        if credentials and credentials.credentials:
            token = credentials.credentials
        elif api_key:
            token = api_key

        if not token or token != expected_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: Missing or invalid authentication token/key.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return token
    return credentials or api_key

