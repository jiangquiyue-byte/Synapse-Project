from app.core.auth import get_current_user
from fastapi import Depends
import traceback

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.services.rag_pipeline import (
    clear_session_documents,
    get_session_documents,
    ingest_document,
    retrieve_rag_context,
)

router = APIRouter(prefix="/api/upload", tags=["upload"], dependencies=[Depends(get_current_user)])


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(default="default"),
):
    """Upload a document for RAG processing."""
    try:
        contents = await file.read()

        if len(contents) == 0:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "文件为空"},
            )

        if len(contents) > 10 * 1024 * 1024:
            return JSONResponse(
                status_code=413,
                content={"status": "error", "message": "文件大小超过 10MB 限制"},
            )

        result = await ingest_document(contents, file.filename or "unknown.txt", session_id)
        return result

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"文件处理失败: {str(e)}"},
        )


@router.post("/query")
async def query_documents(session_id: str = "default", query: str = "", k: int = 5):
    """Query uploaded documents using vector similarity search."""
    try:
        if not query:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "查询内容不能为空"},
            )

        context = await retrieve_rag_context(session_id, query, k=k)
        return {"status": "ok", "context": context, "query": query}

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"查询失败: {str(e)}"},
        )


@router.get("/documents/{session_id}")
async def list_documents(session_id: str):
    """List all uploaded documents for a session."""
    try:
        docs = await get_session_documents(session_id)
        return {"status": "ok", "documents": docs}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"获取文档列表失败: {str(e)}"},
        )


@router.delete("/documents/{session_id}")
async def delete_documents(session_id: str):
    """Clear all documents for a session."""
    try:
        success = await clear_session_documents(session_id)
        return {
            "status": "ok" if success else "not_found",
            "message": "文档已清除" if success else "未找到该会话的文档",
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"删除文档失败: {str(e)}"},
        )
