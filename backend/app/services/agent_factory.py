"""Multi-provider LLM factory for creating agent instances.
Supports OpenAI, Gemini, and Claude via LangChain.
"""
import os
from app.core.security import decrypt_api_key


def create_llm(agent_config: dict):
    """Create LLM instance based on provider configuration.
    
    Tries to decrypt the API key first; if decryption fails,
    uses the key as-is (for dev/testing with plaintext keys).
    Falls back to system OPENAI_API_KEY env var for OpenAI provider.
    """
    provider = agent_config["provider"]
    api_key = agent_config.get("api_key_encrypted", "")

    # Try to decrypt; if it fails, use as-is (for dev/testing)
    if api_key and api_key != "***":
        try:
            api_key = decrypt_api_key(api_key)
        except Exception:
            pass  # Use as-is (plaintext key)

    # Fallback to system env var if no key provided
    if not api_key or api_key == "***":
        if provider == "openai":
            api_key = os.environ.get("OPENAI_API_KEY", "")
        elif provider == "gemini":
            api_key = os.environ.get("GOOGLE_API_KEY", "")
        elif provider == "claude":
            api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    model = agent_config["model"]
    temp = agent_config.get("temperature", 0.7)

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            temperature=temp,
            streaming=False,
        )
    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=temp,
        )
    elif provider == "claude":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model,
            anthropic_api_key=api_key,
            temperature=temp,
        )
    else:
        raise ValueError(f"不支持的 LLM 供应商: {provider}")
