from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.security import encrypt_api_key, decrypt_api_key
from app.models.database import (
    delete_agent_by_id,
    get_agent,
    get_all_agents,
    reorder_agents,
    save_agent,
)
from app.models.schemas import AgentConfig

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/")
async def list_agents():
    agents = await get_all_agents()
    safe_agents = []
    for a in agents:
        safe = {**a}
        safe["api_key_encrypted"] = "***" if a.get("api_key_encrypted") else ""
        safe_agents.append(safe)
    return {"agents": safe_agents}


@router.post("/")
async def create_agent(config: AgentConfig):
    agent_dict = config.model_dump()
    if agent_dict.get("api_key_encrypted") and agent_dict["api_key_encrypted"] != "":
        try:
            agent_dict["api_key_encrypted"] = encrypt_api_key(agent_dict["api_key_encrypted"])
        except Exception:
            pass
    saved = await save_agent(agent_dict)
    return {"agent": saved}


@router.put("/{agent_id}")
async def update_agent(agent_id: str, config: AgentConfig):
    existing = await get_agent(agent_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_dict = config.model_dump()
    agent_dict["id"] = agent_id
    if agent_dict.get("api_key_encrypted") and agent_dict["api_key_encrypted"] not in ("", "***"):
        try:
            agent_dict["api_key_encrypted"] = encrypt_api_key(agent_dict["api_key_encrypted"])
        except Exception:
            pass
    elif agent_dict.get("api_key_encrypted") == "***":
        agent_dict["api_key_encrypted"] = existing.get("api_key_encrypted", "")

    saved = await save_agent(agent_dict)
    return {"agent": saved}


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    if not await delete_agent_by_id(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "deleted"}


@router.put("/reorder")
async def reorder(order: list[dict]):
    result = await reorder_agents(order)
    return {"agents": result}


class TestAgentRequest(BaseModel):
    provider: str
    model: str
    api_key: str          # 明文 key（前端直接传入，未加密）
    custom_base_url: str = ""
    agent_id: str = ""    # 可选：若传入，则从数据库取加密 key


@router.post("/test")
async def test_agent_connection(req: TestAgentRequest):
    """测试 Agent API Key 连通性，返回成功/失败和耗时。"""
    import time
    from app.services.agent_factory import create_llm

    # 解析 api_key：若前端传 "***" 或空，则从数据库取
    api_key = req.api_key.strip()
    if (not api_key or api_key == "***") and req.agent_id:
        stored = await get_agent(req.agent_id)
        if stored and stored.get("api_key_encrypted"):
            try:
                api_key = decrypt_api_key(stored["api_key_encrypted"])
            except Exception:
                api_key = stored.get("api_key_encrypted", "")

    cfg = {
        "id": req.agent_id or "test",
        "name": "Test",
        "persona": "Test agent",
        "provider": req.provider,
        "model": req.model,
        "api_key_encrypted": api_key,
        "custom_base_url": req.custom_base_url,
        "temperature": 0.1,
        "tools": [],
        "supports_vision": False,
        "sequence_order": 0,
    }

    start = time.time()
    try:
        llm = create_llm(cfg)
        response = await llm.ainvoke([{"role": "user", "content": "Reply with exactly: OK"}])
        elapsed_ms = int((time.time() - start) * 1000)
        content = getattr(response, "content", str(response))
        return {
            "success": True,
            "message": f"连接成功！响应延迟 {elapsed_ms}ms",
            "response_preview": str(content)[:100],
            "elapsed_ms": elapsed_ms,
        }
    except Exception as exc:
        import traceback
        elapsed_ms = int((time.time() - start) * 1000)
        err_msg = str(exc)
        err_detail = traceback.format_exc()
        if "AuthenticationError" in err_detail or "401" in err_msg or "Incorrect API key" in err_msg:
            friendly = f"API Key 认证失败：请检查 Key 是否正确，注意不要有多余空格。"
        elif "NotFoundError" in err_detail or "404" in err_msg or "model_not_found" in err_msg:
            friendly = f"模型不存在：请检查模型名称（DeepSeek→deepseek-chat，OpenAI→gpt-4o，Gemini→gemini-2.5-flash）。"
        elif "RateLimitError" in err_detail or "429" in err_msg:
            friendly = f"速率限制：API 调用频率超限，请稍后重试。"
        elif "ConnectionError" in err_detail or "connect" in err_msg.lower():
            friendly = f"网络连接失败：请检查 API Base URL 是否正确（末尾不要加斜杠）。"
        elif "ValueError" in err_detail:
            friendly = f"配置错误：{err_msg}"
        else:
            friendly = f"连接失败：{err_msg}"
        return {
            "success": False,
            "message": friendly,
            "error_detail": err_msg[:300],
            "elapsed_ms": elapsed_ms,
        }
