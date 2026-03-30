from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.models.database import (
    delete_session,
    ensure_session,
    get_user_config,
    list_sessions,
    list_user_configs,
    set_user_config,
    update_session_title,
)

router = APIRouter(prefix="/api/state", tags=["state"])


class SessionCreateRequest(BaseModel):
    session_id: str
    title: str = "新会话"


class SessionTitleUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class UserConfigRequest(BaseModel):
    value: dict


@router.get("/sessions")
async def get_sessions(limit: int = 100):
    return {"sessions": await list_sessions(limit=limit)}


@router.post("/sessions")
async def create_session(request: SessionCreateRequest):
    session = await ensure_session(request.session_id, request.title)
    return {"session": session}


@router.patch("/sessions/{session_id}")
async def rename_session(session_id: str, request: SessionTitleUpdateRequest):
    session = await update_session_title(session_id, request.title.strip())
    if not session:
        return JSONResponse(status_code=404, content={"status": "error", "message": "会话不存在"})
    return {"session": session}


@router.delete("/sessions/{session_id}")
async def remove_session(session_id: str):
    deleted = await delete_session(session_id)
    return {"status": "ok" if deleted else "not_found", "deleted": deleted}


@router.get("/configs")
async def get_configs():
    return {"configs": await list_user_configs()}


@router.get("/configs/{key}")
async def get_config(key: str):
    config = await get_user_config(key)
    if not config:
        return JSONResponse(status_code=404, content={"status": "error", "message": "配置不存在"})
    return config


@router.put("/configs/{key}")
async def put_config(key: str, request: UserConfigRequest):
    saved = await set_user_config(key, request.value)
    return saved


@router.get("/billing/stats")
async def get_billing_stats():
    """Get aggregated billing statistics across all sessions."""
    from app.models.database import get_db
    from sqlalchemy import select, func
    from app.models.database import MessageRecord
    try:
        async with get_db() as db:
            result = await db.execute(
                select(
                    func.sum(MessageRecord.cost_usd).label("total_cost_usd"),
                    func.sum(MessageRecord.token_count).label("total_tokens"),
                    func.count(MessageRecord.id).label("message_count"),
                ).where(MessageRecord.role != "user")
            )
            row = result.first()
            total_usd = float(row.total_cost_usd or 0)
            total_cny = total_usd * 7.25
            return {
                "total_cost_usd": round(total_usd, 8),
                "total_cost_cny": round(total_cny, 6),
                "total_tokens": int(row.total_tokens or 0),
                "message_count": int(row.message_count or 0),
                "usd_to_cny_rate": 7.25,
            }
    except Exception as e:
        return {"total_cost_usd": 0, "total_cost_cny": 0, "total_tokens": 0, "message_count": 0, "error": str(e)}
