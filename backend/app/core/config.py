from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./synapse.db"
    ENCRYPTION_KEY: str = "placeholder-key"
    TAVILY_API_KEY: str = ""
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
