"""Memory system router."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("/{session_id}")
async def get_memory(session_id: str):
    """Retrieve memory context for a session."""
    # TODO: Implement pgvector-based memory in production
    return {"session_id": session_id, "memory": "", "message": "记忆系统将在后续里程碑实现"}
