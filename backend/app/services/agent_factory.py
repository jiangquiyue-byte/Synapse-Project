"""Multi-provider LLM factory for creating agent instances."""

from app.core.security import decrypt_api_key


def create_llm(agent_config: dict):
    """Create LLM instance based on provider configuration."""
    provider = agent_config["provider"]
    api_key = agent_config.get("api_key_encrypted", "")

    # Try to decrypt; if it fails, use as-is (for dev/testing)
    try:
        api_key = decrypt_api_key(api_key)
    except Exception:
        pass

    model = agent_config["model"]
    temp = agent_config.get("temperature", 0.7)

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model, api_key=api_key,
            temperature=temp, streaming=True
        )
    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model, google_api_key=api_key,
            temperature=temp
        )
    elif provider == "claude":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model, anthropic_api_key=api_key,
            temperature=temp
        )
    else:
        raise ValueError(f"不支持的 LLM 供应商: {provider}")
