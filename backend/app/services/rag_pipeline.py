"""RAG Pipeline for Synapse.

This module now persists document chunks and embeddings into the database,
using pgvector in PostgreSQL production environments and JSON-backed vectors
for local SQLite development.
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import List
from uuid import uuid4

from langchain_core.tools import tool

from app.core.config import get_settings
from app.models.database import (
    clear_session_documents as clear_session_documents_db,
    get_session_document_chunks,
    list_session_documents as list_session_documents_db,
    replace_document_chunks,
    upsert_document,
)

logger = logging.getLogger(__name__)
settings = get_settings()
_embeddings = None


def _get_embeddings():
    """Lazy-init OpenAI embeddings using configured credentials."""
    global _embeddings
    if _embeddings is None:
        from langchain_openai import OpenAIEmbeddings

        kwargs = {}
        if settings.OPENAI_API_KEY:
            kwargs["api_key"] = settings.OPENAI_API_KEY
        if settings.OPENAI_BASE_URL:
            kwargs["base_url"] = settings.OPENAI_BASE_URL

        _embeddings = OpenAIEmbeddings(model=settings.EMBEDDING_MODEL, **kwargs)
    return _embeddings


def _parse_document(file_bytes: bytes, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        try:
            import fitz

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            try:
                doc = fitz.open(tmp_path)
                text_parts = [page.get_text() for page in doc]
                doc.close()
                return "\n".join(text_parts)
            finally:
                os.unlink(tmp_path)
        except ImportError:
            logger.warning("PyMuPDF not available, fallback to text decode")
            return file_bytes.decode("utf-8", errors="ignore")

    if ext == ".docx":
        try:
            from docx import Document
            import io

            doc = Document(io.BytesIO(file_bytes))
            return "\n".join(para.text for para in doc.paragraphs if para.text)
        except ImportError:
            logger.warning("python-docx not available, fallback to text decode")
            return file_bytes.decode("utf-8", errors="ignore")

    if ext in (".txt", ".md", ".markdown", ".csv", ".json"):
        return file_bytes.decode("utf-8", errors="ignore")

    return file_bytes.decode("utf-8", errors="ignore")


def _split_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", "。", ".", " ", ""],
    )
    return splitter.split_text(text)


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    import math

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def ingest_document(file_bytes: bytes, filename: str, session_id: str) -> dict:
    text = _parse_document(file_bytes, filename)
    if not text.strip():
        return {"status": "error", "message": "文档内容为空或无法解析", "chunks": 0}

    chunks = _split_text(text)
    if not chunks:
        return {"status": "error", "message": "文档分块失败", "chunks": 0}

    embeddings = []
    has_vectors = False
    try:
        embeddings_model = _get_embeddings()
        embeddings = await embeddings_model.aembed_documents(chunks)
        has_vectors = True
    except Exception as e:
        logger.error("Embedding generation failed: %s", e)
        embeddings = [None for _ in chunks]

    document_id = str(uuid4())
    await upsert_document(
        {
            "id": document_id,
            "session_id": session_id,
            "filename": filename,
            "chunk_count": len(chunks),
        }
    )
    await replace_document_chunks(
        document_id,
        session_id,
        [
            {
                "content": chunk,
                "metadata_json": {"source": filename},
                "embedding": embeddings[idx],
            }
            for idx, chunk in enumerate(chunks)
        ],
    )

    return {
        "status": "ok",
        "chunks": len(chunks),
        "filename": filename,
        "document_id": document_id,
        "message": (
            f"文档已成功解析为 {len(chunks)} 个文本块并完成向量化"
            if has_vectors
            else f"文档已解析为 {len(chunks)} 个文本块（当前使用关键词检索降级模式）"
        ),
    }


async def retrieve_rag_context(session_id: str, query: str, k: int = 5) -> str:
    rows = await get_session_document_chunks(session_id)
    if not rows:
        return ""

    embeddings_available = any(row.get("embedding") is not None for row in rows)

    if embeddings_available:
        try:
            embeddings_model = _get_embeddings()
            query_embedding = await embeddings_model.aembed_query(query)
            scored = []
            for idx, row in enumerate(rows):
                emb = row.get("embedding")
                if emb is not None:
                    scored.append((_cosine_similarity(query_embedding, emb), idx))
            scored.sort(key=lambda item: item[0], reverse=True)
            top_indices = [idx for _, idx in scored[:k]]
            results = []
            for idx in top_indices:
                row = rows[idx]
                source = row.get("metadata_json", {}).get("source", "unknown")
                results.append(f"[来源: {source}]\n{row['content']}")
            if results:
                return "\n---\n".join(results)
        except Exception as e:
            logger.error("Vector search failed, fallback to keyword search: %s", e)

    query_terms = set(query.lower().split())
    scored = []
    for idx, row in enumerate(rows):
        chunk_lower = row["content"].lower()
        score = sum(1 for term in query_terms if term in chunk_lower)
        if score > 0:
            scored.append((score, idx))
    scored.sort(key=lambda item: item[0], reverse=True)
    top_indices = [idx for _, idx in scored[:k]] or list(range(min(k, len(rows))))

    results = []
    for idx in top_indices:
        row = rows[idx]
        source = row.get("metadata_json", {}).get("source", "unknown")
        results.append(f"[来源: {source}]\n{row['content']}")
    return "\n---\n".join(results)


async def get_session_documents(session_id: str) -> List[dict]:
    return await list_session_documents_db(session_id)


async def clear_session_documents(session_id: str) -> bool:
    return await clear_session_documents_db(session_id)


@tool
async def rag_query_tool(query: str) -> str:
    """在已上传的文档中搜索相关信息。当用户的问题涉及已上传的文档内容时使用此工具。"""
    # Session-aware injection can be added through orchestration state later.
    return "RAG 工具已启用，但当前需要在具体会话上下文中调用。"
