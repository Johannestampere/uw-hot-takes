from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/hottakes"
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str = "sec"
    debug: bool = False

    class Config:
        env_file = ".env"


@lru_cache # Create the Settings object once, then reuse it forever.
def get_settings() -> Settings:
    return Settings()
