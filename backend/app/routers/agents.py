"""Agent CRUD router."""
from fastapi import APIRouter, HTTPException
from app.models.schemas import AgentConfig
from app.models.database import (
    get_all_agents, get_agent, save_agent,
    delete_agent_by_id, reorder_agents
)
from app.core.security import encrypt_api_key

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/")
async def list_agents():
    agents = get_all_agents()
    # Strip encrypted keys from response
    safe_agents = []
    for a in agents:
        safe = {**a}
        safe["api_key_encrypted"] = "***" if a.get("api_key_encrypted") else ""
        safe_agents.append(safe)
    return {"agents": safe_agents}


@router.post("/")
async def create_agent(config: AgentConfig):
    agent_dict = config.model_dump()
    # Encrypt API key if provided
    if agent_dict.get("api_key_encrypted") and agent_dict["api_key_encrypted"] != "":
        try:
            agent_dict["api_key_encrypted"] = encrypt_api_key(agent_dict["api_key_encrypted"])
        except Exception:
            pass  # Keep as-is for dev
    saved = save_agent(agent_dict)
    return {"agent": saved}


@router.put("/{agent_id}")
async def update_agent(agent_id: str, config: AgentConfig):
    existing = get_agent(agent_id)
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
    saved = save_agent(agent_dict)
    return {"agent": saved}


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    if not delete_agent_by_id(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "deleted"}


@router.put("/reorder")
async def reorder(order: list[dict]):
    result = reorder_agents(order)
    return {"agents": result}
