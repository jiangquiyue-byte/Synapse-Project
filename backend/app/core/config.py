from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./synapse.db"
    ENCRYPTION_KEY: str = "ghszRjI0495ouFAPRF-V_GahG3nSc8tlmeM_KKCzDCE="
    TAVILY_API_KEY: str = ""
    CORS_ORIGINS: list[str] = ["*"]
    # Default OpenAI API key for the synthesizer (from env OPENAI_API_KEY)
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
