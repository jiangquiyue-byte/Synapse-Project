"""
RAG Pipeline for Synapse - Document ingestion and vector retrieval.

Uses in-memory FAISS vector store (no external DB required).
Supports PDF, DOCX, TXT, and Markdown files.
Integrates with LangChain for text splitting and embeddings.
"""
import os
import tempfile
import logging
from typing import Dict, List, Optional

from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# ─── In-memory document store ───
# Structure: { session_id: { "chunks": [...], "metadatas": [...], "embeddings": [...] } }
_document_store: Dict[str, dict] = {}

# Lazy-initialized embedding model
_embeddings = None


def _get_embeddings():
    """Lazy-init OpenAI embeddings using system API key."""
    global _embeddings
    if _embeddings is None:
        from langchain_openai import OpenAIEmbeddings
        api_key = os.environ.get("OPENAI_API_KEY", "")
        base_url = os.environ.get("OPENAI_BASE_URL", None)
        kwargs = {}
        if api_key:
            kwargs["api_key"] = api_key
        if base_url:
            kwargs["base_url"] = base_url
        _embeddings = OpenAIEmbeddings(model="text-embedding-3-small", **kwargs)
    return _embeddings


def _parse_document(file_bytes: bytes, filename: str) -> str:
    """Parse document content from various file formats.
    
    Supports: PDF (.pdf), Word (.docx), Text (.txt), Markdown (.md)
    Uses PyMuPDF for PDF parsing (lightweight, no system deps).
    Uses python-docx for DOCX parsing.
    Falls back to plain text for unknown formats.
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".pdf":
        try:
            import fitz  # PyMuPDF
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            try:
                doc = fitz.open(tmp_path)
                text_parts = []
                for page in doc:
                    text_parts.append(page.get_text())
                doc.close()
                return "\n".join(text_parts)
            finally:
                os.unlink(tmp_path)
        except ImportError:
            logger.warning("PyMuPDF not available, trying pdfplumber...")
            try:
                import pdfplumber
                import io
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    return "\n".join(
                        page.extract_text() or "" for page in pdf.pages
                    )
            except ImportError:
                return file_bytes.decode("utf-8", errors="ignore")
    
    elif ext == ".docx":
        try:
            from docx import Document
            import io
            doc = Document(io.BytesIO(file_bytes))
            return "\n".join(para.text for para in doc.paragraphs if para.text)
        except ImportError:
            logger.warning("python-docx not available, falling back to raw text")
            return file_bytes.decode("utf-8", errors="ignore")
    
    elif ext in (".txt", ".md", ".markdown", ".csv"):
        return file_bytes.decode("utf-8", errors="ignore")
    
    else:
        # Try to decode as text
        return file_bytes.decode("utf-8", errors="ignore")


def _split_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks using RecursiveCharacterTextSplitter."""
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", "。", ".", " ", ""],
    )
    return splitter.split_text(text)


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    import math
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def ingest_document(file_bytes: bytes, filename: str, session_id: str) -> dict:
    """Parse, chunk, and embed a document into the in-memory vector store.
    
    Args:
        file_bytes: Raw file content
        filename: Original filename (used for format detection)
        session_id: Session ID for scoping the document store
        
    Returns:
        dict with status, chunk count, and filename
    """
    # Parse document
    text = _parse_document(file_bytes, filename)
    if not text.strip():
        return {"status": "error", "message": "文档内容为空或无法解析", "chunks": 0}
    
    # Split into chunks
    chunks = _split_text(text)
    if not chunks:
        return {"status": "error", "message": "文档分块失败", "chunks": 0}
    
    # Generate embeddings
    embeddings_model = _get_embeddings()
    try:
        embeddings = await embeddings_model.aembed_documents(chunks)
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        # Fallback: store chunks without embeddings (keyword search only)
        if session_id not in _document_store:
            _document_store[session_id] = {"chunks": [], "metadatas": [], "embeddings": []}
        
        store = _document_store[session_id]
        for chunk in chunks:
            store["chunks"].append(chunk)
            store["metadatas"].append({"source": filename})
            store["embeddings"].append(None)
        
        return {
            "status": "ok",
            "chunks": len(chunks),
            "filename": filename,
            "message": f"文档已解析为 {len(chunks)} 个文本块（无向量，将使用关键词检索）"
        }
    
    # Store in memory
    if session_id not in _document_store:
        _document_store[session_id] = {"chunks": [], "metadatas": [], "embeddings": []}
    
    store = _document_store[session_id]
    for i, chunk in enumerate(chunks):
        store["chunks"].append(chunk)
        store["metadatas"].append({"source": filename})
        store["embeddings"].append(embeddings[i])
    
    return {
        "status": "ok",
        "chunks": len(chunks),
        "filename": filename,
        "message": f"文档已成功解析为 {len(chunks)} 个文本块并完成向量化"
    }


async def retrieve_rag_context(session_id: str, query: str, k: int = 5) -> str:
    """Retrieve relevant document chunks for a query using vector similarity.
    
    Args:
        session_id: Session ID to scope the search
        query: User query to search for
        k: Number of top results to return
        
    Returns:
        Concatenated relevant text chunks, or empty string if no documents
    """
    store = _document_store.get(session_id)
    if not store or not store["chunks"]:
        return ""
    
    # Check if we have embeddings
    has_embeddings = any(e is not None for e in store["embeddings"])
    
    if has_embeddings:
        # Vector similarity search
        try:
            embeddings_model = _get_embeddings()
            query_embedding = await embeddings_model.aembed_query(query)
            
            # Calculate similarities
            scored = []
            for i, emb in enumerate(store["embeddings"]):
                if emb is not None:
                    sim = _cosine_similarity(query_embedding, emb)
                    scored.append((sim, i))
            
            # Sort by similarity (descending) and take top k
            scored.sort(key=lambda x: x[0], reverse=True)
            top_indices = [idx for _, idx in scored[:k]]
            
            results = []
            for idx in top_indices:
                source = store["metadatas"][idx].get("source", "unknown")
                results.append(f"[来源: {source}]\n{store['chunks'][idx]}")
            
            return "\n---\n".join(results)
        except Exception as e:
            logger.error(f"Vector search failed, falling back to keyword: {e}")
    
    # Fallback: simple keyword matching
    query_terms = set(query.lower().split())
    scored = []
    for i, chunk in enumerate(store["chunks"]):
        chunk_lower = chunk.lower()
        score = sum(1 for term in query_terms if term in chunk_lower)
        if score > 0:
            scored.append((score, i))
    
    scored.sort(key=lambda x: x[0], reverse=True)
    top_indices = [idx for _, idx in scored[:k]]
    
    if not top_indices:
        # Return first k chunks as context
        top_indices = list(range(min(k, len(store["chunks"]))))
    
    results = []
    for idx in top_indices:
        source = store["metadatas"][idx].get("source", "unknown")
        results.append(f"[来源: {source}]\n{store['chunks'][idx]}")
    
    return "\n---\n".join(results)


def get_session_documents(session_id: str) -> List[dict]:
    """Get list of documents uploaded for a session."""
    store = _document_store.get(session_id)
    if not store:
        return []
    
    # Aggregate by source filename
    sources = {}
    for meta in store["metadatas"]:
        src = meta.get("source", "unknown")
        sources[src] = sources.get(src, 0) + 1
    
    return [{"filename": k, "chunks": v} for k, v in sources.items()]


def clear_session_documents(session_id: str) -> bool:
    """Clear all documents for a session."""
    if session_id in _document_store:
        del _document_store[session_id]
        return True
    return False


@tool
async def rag_query_tool(query: str) -> str:
    """在已上传的文档中搜索相关信息。当用户的问题涉及已上传的文档内容时使用此工具。"""
    # This tool is used within LangGraph agent nodes
    # The session_id needs to be injected via state; for now search all sessions
    all_results = []
    for sid, store in _document_store.items():
        if store["chunks"]:
            result = await retrieve_rag_context(sid, query, k=3)
            if result:
                all_results.append(result)
    
    if all_results:
        return "\n\n".join(all_results)
    return "未找到相关文档内容。"
