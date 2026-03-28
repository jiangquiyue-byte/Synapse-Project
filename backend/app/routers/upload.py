"""File upload router for RAG pipeline."""
from fastapi import APIRouter, UploadFile, File, Form
from app.services.rag_pipeline import (
    ingest_document,
    retrieve_rag_context,
    get_session_documents,
    clear_session_documents,
)

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(default="default"),
):
    """Upload a document for RAG processing.
    
    Supports: PDF, DOCX, TXT, MD files.
    The document will be parsed, chunked, and vectorized for retrieval.
    """
    contents = await file.read()
    
    if len(contents) == 0:
        return {"status": "error", "message": "文件为空"}
    
    # Max file size: 10MB
    if len(contents) > 10 * 1024 * 1024:
        return {"status": "error", "message": "文件大小超过 10MB 限制"}
    
    result = await ingest_document(contents, file.filename or "unknown.txt", session_id)
    return result


@router.post("/query")
async def query_documents(session_id: str = "default", query: str = "", k: int = 5):
    """Query uploaded documents using vector similarity search."""
    if not query:
        return {"status": "error", "message": "查询内容不能为空"}
    
    context = await retrieve_rag_context(session_id, query, k=k)
    return {
        "status": "ok",
        "context": context,
        "query": query,
    }


@router.get("/documents/{session_id}")
async def list_documents(session_id: str):
    """List all uploaded documents for a session."""
    docs = get_session_documents(session_id)
    return {"status": "ok", "documents": docs}


@router.delete("/documents/{session_id}")
async def delete_documents(session_id: str):
    """Clear all documents for a session."""
    success = clear_session_documents(session_id)
    return {
        "status": "ok" if success else "not_found",
        "message": "文档已清除" if success else "未找到该会话的文档",
    }
