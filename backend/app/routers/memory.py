from typing import Optional

from fastapi import APIRouter, Query

from app.services.embedding_service import get_embedding_backend_label
from app.services.memory_service import build_memory_context, list_memories, semantic_search_memories

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("")
async def get_memory_overview(
    session_id: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
):
    memories = await list_memories(session_id=session_id, limit=limit)
    return {
        "session_id": session_id,
        "count": len(memories),
        "backend_label": get_embedding_backend_label(),
        "memories": memories,
    }


@router.get("/search")
async def search_memory(
    query: str,
    current_session_id: Optional[str] = None,
    include_current_session: bool = False,
    limit: int = Query(default=4, ge=1, le=20),
):
    results = await semantic_search_memories(
        query,
        current_session_id=current_session_id,
        include_current_session=include_current_session,
        limit=limit,
    )
    return {
        "query": query,
        "count": len(results),
        "backend_label": get_embedding_backend_label(),
        "results": results,
    }


@router.get("/context")
async def preview_memory_context(
    query: str,
    current_session_id: Optional[str] = None,
    include_current_session: bool = False,
    limit: int = Query(default=4, ge=1, le=20),
):
    context = await build_memory_context(
        query,
        current_session_id=current_session_id,
        include_current_session=include_current_session,
        limit=limit,
    )
    return {
        "query": query,
        "current_session_id": current_session_id,
        "context": context,
        "enabled": True,
        "backend_label": get_embedding_backend_label(),
    }


@router.get("/{session_id}")
async def get_memory(session_id: str, limit: int = Query(default=50, ge=1, le=200)):
    memories = await list_memories(session_id=session_id, limit=limit)
    return {
        "session_id": session_id,
        "count": len(memories),
        "backend_label": get_embedding_backend_label(),
        "memory": memories,
        "message": "记忆系统已启用，可基于数据库中的历史会话进行检索",
    }
