from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/hottakes"
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str = "sec"
    debug: bool = False

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # Frontend URL (for redirecting after OAuth)
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


@lru_cache # Create the Settings object once, then reuse it forever.
def get_settings() -> Settings:
    return Settings()
