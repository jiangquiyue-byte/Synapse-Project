from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./synapse.db")
    ENCRYPTION_KEY: str = "ghszRjI0495ouFAPRF-V_GahG3nSc8tlmeM_KKCzDCE="
    TAVILY_API_KEY: str = ""
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    # Default OpenAI-compatible credentials for synthesizer / embeddings.
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Retrieval tuning
    MEMORY_TOP_K: int = 6
    PGVECTOR_DIMENSION: int = 1536

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
