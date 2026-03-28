"""Multi-provider LLM factory for creating agent instances.
Supports OpenAI, Gemini, Claude, and Custom OpenAI-compatible APIs.
"""
import os
from app.core.security import decrypt_api_key


def create_llm(agent_config: dict):
    """Create LLM instance based on provider configuration.

    Tries to decrypt the API key first; if decryption fails,
    uses the key as-is (for dev/testing with plaintext keys).
    Falls back to system env vars if no key provided.

    Providers:
      - openai: Official OpenAI API (uses system OPENAI_BASE_URL if set)
      - gemini: Google Gemini via langchain-google-genai
      - claude: Anthropic Claude via langchain-anthropic
      - custom_openai: Any OpenAI-compatible API (DeepSeek, Qwen, etc.)
                       Requires custom_base_url in agent_config
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
        if provider in ("openai", "custom_openai"):
            api_key = os.environ.get("OPENAI_API_KEY", "")
        elif provider == "gemini":
            api_key = os.environ.get("GOOGLE_API_KEY", "")
        elif provider == "claude":
            api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    model = agent_config["model"]
    temp = agent_config.get("temperature", 0.7)

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        base_url = os.environ.get("OPENAI_BASE_URL", None)
        kwargs = dict(
            model=model,
            api_key=api_key,
            temperature=temp,
            streaming=False,
        )
        if base_url:
            kwargs["base_url"] = base_url
        return ChatOpenAI(**kwargs)

    elif provider == "custom_openai":
        from langchain_openai import ChatOpenAI
        custom_base_url = agent_config.get("custom_base_url", "")
        if not custom_base_url:
            raise ValueError("Custom OpenAI 供应商需要提供 API Base URL")
        kwargs = dict(
            model=model,
            api_key=api_key,
            temperature=temp,
            streaming=False,
            base_url=custom_base_url,
        )
        return ChatOpenAI(**kwargs)

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
