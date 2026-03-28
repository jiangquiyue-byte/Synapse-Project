"""
Image Analysis Service for Synapse - Multi-modal vision support.

Enables agents with supports_vision=True to analyze images
sent by users in the chat. Uses OpenAI-compatible vision API.
"""
import os
import logging
import base64

logger = logging.getLogger(__name__)


def validate_image_base64(image_data: str) -> bool:
    """Validate that the provided string is valid base64 image data."""
    if not image_data:
        return False
    try:
        # Try to decode a small portion to validate
        decoded = base64.b64decode(image_data[:100] + "==", validate=False)
        return len(image_data) > 0
    except Exception:
        return False


async def analyze_image_standalone(
    image_base64: str,
    prompt: str = "请描述这张图片的内容。",
    model: str = "gpt-4.1-mini",
) -> dict:
    """Standalone image analysis using system OpenAI key.
    
    Used for direct image analysis outside of agent conversations.
    
    Args:
        image_base64: Base64-encoded image data
        prompt: Analysis prompt
        model: Vision-capable model to use
        
    Returns:
        dict with status and analysis result
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return {"status": "error", "message": "未配置 OPENAI_API_KEY"}

    if not validate_image_base64(image_base64):
        return {"status": "error", "message": "无效的图片数据"}

    try:
        from langchain_openai import ChatOpenAI

        base_url = os.environ.get("OPENAI_BASE_URL", None)
        kwargs = dict(
            model=model,
            api_key=api_key,
            temperature=0.3,
        )
        if base_url:
            kwargs["base_url"] = base_url

        llm = ChatOpenAI(**kwargs)

        messages = [
            {"role": "system", "content": "你是一个专业的图片分析助手。请详细描述和分析用户提供的图片。"},
            {"role": "user", "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                },
                {"type": "text", "text": prompt}
            ]}
        ]

        response = await llm.ainvoke(messages)
        content = response.content if hasattr(response, 'content') else str(response)

        return {
            "status": "ok",
            "analysis": content,
            "model": model,
        }

    except Exception as e:
        logger.error(f"Image analysis failed: {e}")
        return {"status": "error", "message": str(e)}


def build_vision_messages(
    system_prompt: str,
    user_query: str,
    image_base64: str,
) -> list:
    """Build LLM messages with image content for vision-capable agents.
    
    This is used by the orchestrator when an agent has supports_vision=True
    and the user has provided an image.
    
    Args:
        system_prompt: The agent's system prompt
        user_query: The user's text query
        image_base64: Base64-encoded image data
        
    Returns:
        List of messages formatted for vision API
    """
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": [
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
            },
            {"type": "text", "text": user_query}
        ]}
    ]
