"""File upload router for RAG pipeline."""
from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/")
async def upload_file(file: UploadFile = File(...), session_id: str = "default"):
    """Upload a document for RAG processing."""
    contents = await file.read()
    # TODO: Integrate with RAG pipeline (pgvector) in production
    return {
        "status": "ok",
        "filename": file.filename,
        "size": len(contents),
        "message": "文件已接收，RAG 解析将在后续里程碑实现"
    }
