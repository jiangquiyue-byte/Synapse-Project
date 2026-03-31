from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./synapse.db")
    ENCRYPTION_KEY: str = "ghszRjI0495ouFAPRF-V_GahG3nSc8tlmeM_KKCzDCE="
    TAVILY_API_KEY: str = ""
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    # Default OpenAI-compatible credentials for synthesis / chat.
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""

    # Free semantic memory defaults to Hugging Face.
    HF_TOKEN: str = ""
    HF_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_BACKEND: str = "huggingface"
    LOCAL_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Single-user auth
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "synapse2025"
    JWT_SECRET: str = "synapse-jwt-secret-key-2025-change-in-prod"

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
