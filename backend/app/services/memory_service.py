"""Cross-session memory service backed by persistent database vectors."""
from __future__ import annotations

import logging
import math
import re
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import select

from app.core.config import get_settings
from app.models.database import IS_POSTGRES, MemoryRecord, session_factory
from app.services.embedding_service import get_embeddings

logger = logging.getLogger(__name__)
settings = get_settings()


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _tokenize_for_search(text: str) -> list[str]:
    normalized = (text or "").lower().strip()
    if not normalized:
        return []

    tokens: list[str] = []
    tokens.extend(re.findall(r"[a-z0-9_]+", normalized))

    for block in re.findall(r"[\u4e00-\u9fff]+", normalized):
        tokens.append(block)
        if len(block) <= 2:
            continue
        for size in (2, 3):
            if len(block) < size:
                continue
            tokens.extend(block[i:i + size] for i in range(len(block) - size + 1))

    unique_tokens: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        token = token.strip()
        if not token or token in seen:
            continue
        seen.add(token)
        unique_tokens.append(token)
    return unique_tokens


def _memory_to_dict(record: MemoryRecord, score: Optional[float] = None) -> dict:
    return {
        "id": record.id,
        "session_id": record.session_id,
        "source_message_id": record.source_message_id,
        "content": record.content,
        "metadata_json": record.metadata_json or {},
        "embedding": record.embedding,
        "created_at": record.created_at.isoformat() if record.created_at else "",
        "score": score,
    }


async def embed_text(text: str) -> Optional[list[float]]:
    cleaned = (text or "").strip()
    if not cleaned:
        return None

    try:
        embeddings_model = get_embeddings()
        return await embeddings_model.aembed_query(cleaned)
    except Exception as exc:
        logger.warning("Memory embedding generation failed: %s", exc)
        return None


async def remember_message(session_id: str, message: dict) -> Optional[dict]:
    content = (message.get("content") or "").strip()
    role = message.get("role", "")
    source_message_id = message.get("id")

    if not content or role == "system":
        return None

    async with session_factory() as session:
        if source_message_id:
            existing = (
                await session.execute(
                    select(MemoryRecord).where(MemoryRecord.source_message_id == source_message_id)
                )
            ).scalar_one_or_none()
            if existing:
                return _memory_to_dict(existing)

        record = MemoryRecord(
            id=str(uuid4()),
            session_id=session_id,
            source_message_id=source_message_id,
            content=content,
            metadata_json={
                "role": role,
                "agent_name": message.get("agent_name", ""),
                "timestamp": message.get("timestamp") or datetime.utcnow().isoformat(),
                "source": "chat_message",
            },
            embedding=await embed_text(content),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return _memory_to_dict(record)


async def list_memories(session_id: Optional[str] = None, limit: int = 50) -> list[dict]:
    async with session_factory() as session:
        stmt = select(MemoryRecord)
        if session_id:
            stmt = stmt.where(MemoryRecord.session_id == session_id)
        stmt = stmt.order_by(MemoryRecord.created_at.desc()).limit(limit)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [_memory_to_dict(row) for row in rows]


async def semantic_search_memories(
    query: str,
    *,
    current_session_id: Optional[str] = None,
    include_current_session: bool = False,
    limit: int = 4,
) -> list[dict]:
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        return []

    query_embedding = await embed_text(cleaned_query)

    async with session_factory() as session:
        stmt = select(MemoryRecord)
        if current_session_id and not include_current_session:
            stmt = stmt.where(MemoryRecord.session_id != current_session_id)
        elif current_session_id and include_current_session:
            stmt = stmt.where(MemoryRecord.session_id == current_session_id)

        if IS_POSTGRES and query_embedding is not None:
            stmt = (
                stmt.where(MemoryRecord.embedding.is_not(None))
                .order_by(MemoryRecord.embedding.cosine_distance(query_embedding))
                .limit(limit)
            )
            result = await session.execute(stmt)
            rows = result.scalars().all()
            return [_memory_to_dict(row) for row in rows]

        result = await session.execute(stmt.order_by(MemoryRecord.created_at.desc()).limit(300))
        rows = result.scalars().all()

        if query_embedding is not None:
            scored_rows: list[tuple[float, MemoryRecord]] = []
            for row in rows:
                if row.embedding is None:
                    continue
                try:
                    scored_rows.append((_cosine_similarity(query_embedding, row.embedding), row))
                except Exception:
                    continue
            if scored_rows:
                scored_rows.sort(key=lambda item: item[0], reverse=True)
                return [_memory_to_dict(row, score=score) for score, row in scored_rows[:limit]]

        query_terms = _tokenize_for_search(cleaned_query)
        keyword_scored: list[tuple[int, MemoryRecord]] = []
        for row in rows:
            haystack = row.content.lower()
            score = sum(1 for term in query_terms if term in haystack)
            if score == 0 and cleaned_query.lower() in haystack:
                score = len(cleaned_query)
            if score > 0:
                keyword_scored.append((score, row))
        keyword_scored.sort(key=lambda item: item[0], reverse=True)
        return [_memory_to_dict(row, score=float(score)) for score, row in keyword_scored[:limit]]


async def build_memory_context(
    query: str,
    *,
    current_session_id: Optional[str] = None,
    include_current_session: bool = False,
    limit: int = 4,
) -> str:
    memories = await semantic_search_memories(
        query,
        current_session_id=current_session_id,
        include_current_session=include_current_session,
        limit=limit,
    )
    if not memories:
        return ""

    sections: list[str] = []
    for item in memories:
        metadata = item.get("metadata_json", {})
        role = metadata.get("role", "unknown")
        agent_name = metadata.get("agent_name") or "用户"
        sections.append(
            f"[历史会话 {item['session_id']} | {role} | {agent_name}]\n{item['content']}"
        )
    return "\n---\n".join(sections)
