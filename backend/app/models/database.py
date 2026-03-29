"""Persistent storage layer for Synapse.

This module replaces the previous in-memory implementation with an async,
SQLAlchemy-based persistence layer. It targets PostgreSQL + pgvector in
production while preserving SQLite compatibility for local development.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


BUILTIN_PROMPTS = [
    {
        "id": "builtin-legal",
        "name": "法律顾问",
        "category": "法律",
        "persona": "你是一位资深法律顾问，擅长合同审查、合规分析和法律风险评估。请用严谨的法律语言回答问题。",
        "recommended_model": "gpt-4o",
        "recommended_tools": ["web_search"],
    },
    {
        "id": "builtin-coder",
        "name": "代码审查员",
        "category": "技术",
        "persona": "你是一位资深软件工程师，擅长代码审查、架构设计和性能优化。请给出具体的代码建议。",
        "recommended_model": "gpt-4o-mini",
        "recommended_tools": ["rag_query"],
    },
    {
        "id": "builtin-copywriter",
        "name": "文案策划",
        "category": "营销",
        "persona": "你是一位创意文案专家，擅长市场营销、品牌传播和内容创作。请用生动有力的文字回答问题。",
        "recommended_model": "gpt-4o",
        "recommended_tools": ["web_search"],
    },
    {
        "id": "builtin-analyst",
        "name": "数据分析师",
        "category": "数据",
        "persona": "你是一位资深数据分析师，擅长数据解读、统计分析和可视化建议。请用数据驱动的方式回答问题。",
        "recommended_model": "gpt-4o",
        "recommended_tools": ["rag_query"],
    },
    {
        "id": "builtin-researcher",
        "name": "学术研究员",
        "category": "学术",
        "persona": "你是一位学术研究员，擅长文献检索、论文分析和研究方法论。请用学术严谨的方式回答问题。",
        "recommended_model": "gpt-4o",
        "recommended_tools": ["web_search", "rag_query"],
    },
]


settings = get_settings()


def _normalize_database_url(raw_url: str) -> tuple[str, dict[str, Any]]:
    normalized = raw_url
    if raw_url.startswith("postgres://"):
        normalized = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif raw_url.startswith("postgresql://"):
        normalized = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif raw_url.startswith("sqlite://") and not raw_url.startswith("sqlite+aiosqlite://"):
        normalized = raw_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    connect_args: dict[str, Any] = {}
    if normalized.startswith("postgresql+asyncpg://"):
        parts = urlsplit(normalized)
        filtered_query: list[tuple[str, str]] = []
        for key, value in parse_qsl(parts.query, keep_blank_values=True):
            lowered = key.lower()
            if lowered == "channel_binding":
                continue
            if lowered == "sslmode":
                if value.lower() != "disable":
                    connect_args["ssl"] = "require"
                continue
            filtered_query.append((key, value))
        normalized = urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(filtered_query), parts.fragment)
        )

    return normalized, connect_args


DATABASE_URL, DATABASE_CONNECT_ARGS = _normalize_database_url(settings.DATABASE_URL)
IS_POSTGRES = DATABASE_URL.startswith("postgresql+asyncpg://")
EMBEDDING_COLUMN_TYPE = Vector(settings.PGVECTOR_DIMENSION) if IS_POSTGRES else JSON


class Base(DeclarativeBase):
    pass


class SessionRecord(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), default="新会话")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class AgentRecord(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    persona: Mapped[str] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(64))
    model: Mapped[str] = mapped_column(String(255))
    api_key_encrypted: Mapped[str] = mapped_column(Text, default="")
    sequence_order: Mapped[int] = mapped_column(Integer, default=0)
    tools: Mapped[list] = mapped_column(JSON, default=list)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    supports_vision: Mapped[bool] = mapped_column(Boolean, default=False)
    custom_base_url: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class MessageRecord(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("sessions.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(128))
    agent_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[str] = mapped_column(String(64), default="")
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    branch_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    message_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WorkflowRecord(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    agent_configs: Mapped[list] = mapped_column(JSON, default=list)
    mode: Mapped[str] = mapped_column(String(64))
    max_debate_rounds: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PromptTemplateRecord(Base):
    __tablename__ = "prompt_templates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(128), default="")
    persona: Mapped[str] = mapped_column(Text)
    recommended_model: Mapped[str] = mapped_column(String(255))
    recommended_tools: Mapped[list] = mapped_column(JSON, default=list)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class UserConfigRecord(Base):
    __tablename__ = "user_configs"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class DocumentRecord(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(128), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DocumentChunkRecord(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[str] = mapped_column(String(64), index=True)
    session_id: Mapped[str] = mapped_column(String(128), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    embedding: Mapped[Optional[list[float]]] = mapped_column(EMBEDDING_COLUMN_TYPE, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MemoryRecord(Base):
    __tablename__ = "memory_entries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(128), index=True)
    source_message_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    embedding: Mapped[Optional[list[float]]] = mapped_column(EMBEDDING_COLUMN_TYPE, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


engine = create_async_engine(
    DATABASE_URL,
    future=True,
    echo=False,
    pool_pre_ping=IS_POSTGRES,
    poolclass=NullPool,
    connect_args=DATABASE_CONNECT_ARGS if IS_POSTGRES else {},
)
session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db_session() -> AsyncSession:
    return session_factory()


async def init_db() -> None:
    async with engine.begin() as conn:
        if IS_POSTGRES:
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            except Exception:
                pass
        await conn.run_sync(Base.metadata.create_all)
    await _seed_builtin_prompts()


async def close_db() -> None:
    await engine.dispose()


async def _seed_builtin_prompts() -> None:
    builtin_ids = [p["id"] for p in BUILTIN_PROMPTS]
    async with session_factory() as session:
        existing_ids = set(
            (
                await session.execute(
                    select(PromptTemplateRecord.id).where(PromptTemplateRecord.id.in_(builtin_ids))
                )
            ).scalars().all()
        )
        for prompt in BUILTIN_PROMPTS:
            if prompt["id"] in existing_ids:
                continue
            session.add(
                PromptTemplateRecord(
                    id=prompt["id"],
                    name=prompt["name"],
                    category=prompt["category"],
                    persona=prompt["persona"],
                    recommended_model=prompt["recommended_model"],
                    recommended_tools=prompt["recommended_tools"],
                    is_builtin=True,
                )
            )
        await session.commit()


async def ensure_session(session_id: str, title: str = "新会话") -> dict:
    async with session_factory() as session:
        record = await session.get(SessionRecord, session_id)
        if not record:
            record = SessionRecord(id=session_id, title=title)
            session.add(record)
            await session.commit()
            await session.refresh(record)
        return _session_to_dict(record)


async def list_sessions(limit: int = 100) -> list[dict]:
    async with session_factory() as session:
        result = await session.execute(
            select(SessionRecord).order_by(SessionRecord.updated_at.desc()).limit(limit)
        )
        return [_session_to_dict(row) for row in result.scalars().all()]


async def update_session_title(session_id: str, title: str) -> Optional[dict]:
    async with session_factory() as session:
        record = await session.get(SessionRecord, session_id)
        if not record:
            return None
        record.title = title
        record.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(record)
        return _session_to_dict(record)


async def delete_session(session_id: str) -> bool:
    async with session_factory() as session:
        record = await session.get(SessionRecord, session_id)
        if not record:
            return False
        await session.delete(record)
        await session.commit()
        return True


async def get_all_agents() -> list[dict]:
    async with session_factory() as session:
        result = await session.execute(
            select(AgentRecord).order_by(AgentRecord.sequence_order.asc(), AgentRecord.created_at.asc())
        )
        return [_agent_to_dict(row) for row in result.scalars().all()]


async def get_agent(agent_id: str) -> Optional[dict]:
    async with session_factory() as session:
        record = await session.get(AgentRecord, agent_id)
        return _agent_to_dict(record) if record else None


async def save_agent(agent: dict) -> dict:
    async with session_factory() as session:
        record = await session.get(AgentRecord, agent["id"])
        if not record:
            record = AgentRecord(id=agent["id"])
            session.add(record)

        record.name = agent.get("name", "")
        record.persona = agent.get("persona", "")
        record.provider = agent.get("provider", "openai")
        record.model = agent.get("model", "")
        record.api_key_encrypted = agent.get("api_key_encrypted", "")
        record.sequence_order = int(agent.get("sequence_order", 0) or 0)
        record.tools = agent.get("tools", []) or []
        record.temperature = float(agent.get("temperature", 0.7) or 0.7)
        record.supports_vision = bool(agent.get("supports_vision", False))
        record.custom_base_url = agent.get("custom_base_url", "")
        record.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(record)
        return _agent_to_dict(record)


async def delete_agent_by_id(agent_id: str) -> bool:
    async with session_factory() as session:
        record = await session.get(AgentRecord, agent_id)
        if not record:
            return False
        await session.delete(record)
        await session.commit()
        return True


async def reorder_agents(order: list[dict]) -> list[dict]:
    async with session_factory() as session:
        for item in order:
            record = await session.get(AgentRecord, item.get("id"))
            if record:
                record.sequence_order = int(item.get("sequence_order", record.sequence_order) or 0)
                record.updated_at = datetime.utcnow()
        await session.commit()
    return await get_all_agents()


async def get_session_messages(session_id: str) -> list[dict]:
    async with session_factory() as session:
        result = await session.execute(
            select(MessageRecord)
            .where(MessageRecord.session_id == session_id)
            .order_by(MessageRecord.message_order.asc(), MessageRecord.created_at.asc())
        )
        return [_message_to_dict(row) for row in result.scalars().all()]


async def add_session_message(session_id: str, message: dict) -> dict:
    async with session_factory() as session:
        await _ensure_session_within_session(session, session_id)

        next_order = (
            await session.execute(
                select(func.coalesce(func.max(MessageRecord.message_order), 0)).where(
                    MessageRecord.session_id == session_id
                )
            )
        ).scalar_one()

        record = MessageRecord(
            id=message.get("id", ""),
            session_id=session_id,
            role=message.get("role", "assistant"),
            agent_name=message.get("agent_name"),
            content=message.get("content", ""),
            timestamp=message.get("timestamp", ""),
            token_count=int(message.get("token_count", 0) or 0),
            cost_usd=float(message.get("cost_usd", 0.0) or 0.0),
            branch_id=message.get("branch_id"),
            message_order=int(next_order) + 1,
        )
        session.add(record)

        session_record = await session.get(SessionRecord, session_id)
        if session_record:
            session_record.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(record)
        return _message_to_dict(record)


async def get_messages_until(session_id: str, message_id: str) -> list[dict]:
    async with session_factory() as session:
        target_order = (
            await session.execute(
                select(MessageRecord.message_order).where(
                    MessageRecord.session_id == session_id,
                    MessageRecord.id == message_id,
                )
            )
        ).scalar_one_or_none()

        if target_order is None:
            return []

        result = await session.execute(
            select(MessageRecord)
            .where(
                MessageRecord.session_id == session_id,
                MessageRecord.message_order <= target_order,
            )
            .order_by(MessageRecord.message_order.asc(), MessageRecord.created_at.asc())
        )
        return [_message_to_dict(row) for row in result.scalars().all()]


async def get_all_workflows() -> list[dict]:
    async with session_factory() as session:
        result = await session.execute(
            select(WorkflowRecord).order_by(WorkflowRecord.updated_at.desc())
        )
        return [_workflow_to_dict(row) for row in result.scalars().all()]


async def get_workflow(workflow_id: str) -> Optional[dict]:
    async with session_factory() as session:
        record = await session.get(WorkflowRecord, workflow_id)
        return _workflow_to_dict(record) if record else None


async def save_workflow(workflow: dict) -> dict:
    async with session_factory() as session:
        record = await session.get(WorkflowRecord, workflow["id"])
        if not record:
            record = WorkflowRecord(id=workflow["id"])
            session.add(record)

        record.name = workflow.get("name", "")
        record.description = workflow.get("description", "")
        record.agent_configs = workflow.get("agent_configs", []) or []
        record.mode = workflow.get("mode", "sequential")
        record.max_debate_rounds = int(workflow.get("max_debate_rounds", 3) or 3)
        record.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(record)
        return _workflow_to_dict(record)


async def delete_workflow_by_id(wf_id: str) -> bool:
    async with session_factory() as session:
        record = await session.get(WorkflowRecord, wf_id)
        if not record:
            return False
        await session.delete(record)
        await session.commit()
        return True


async def get_all_prompt_templates() -> list[dict]:
    async with session_factory() as session:
        result = await session.execute(
            select(PromptTemplateRecord).order_by(
                PromptTemplateRecord.is_builtin.desc(),
                PromptTemplateRecord.created_at.asc(),
            )
        )
        return [_prompt_to_dict(row) for row in result.scalars().all()]


async def save_prompt_template(template: dict) -> dict:
    async with session_factory() as session:
        record = await session.get(PromptTemplateRecord, template["id"])
        if not record:
            record = PromptTemplateRecord(id=template["id"])
            session.add(record)

        record.name = template.get("name", "")
        record.category = template.get("category", "")
        record.persona = template.get("persona", "")
        record.recommended_model = template.get("recommended_model", "")
        record.recommended_tools = template.get("recommended_tools", []) or []
        record.is_builtin = bool(template.get("is_builtin", False))
        record.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(record)
        return _prompt_to_dict(record)


async def get_user_config(key: str) -> Optional[dict]:
    async with session_factory() as session:
        record = await session.get(UserConfigRecord, key)
        return {"key": record.key, "value": record.value} if record else None


async def set_user_config(key: str, value: dict[str, Any]) -> dict:
    async with session_factory() as session:
        record = await session.get(UserConfigRecord, key)
        if not record:
            record = UserConfigRecord(key=key)
            session.add(record)
        record.value = value
        record.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(record)
        return {"key": record.key, "value": record.value}


async def list_user_configs() -> list[dict]:
    async with session_factory() as session:
        result = await session.execute(select(UserConfigRecord).order_by(UserConfigRecord.key.asc()))
        return [{"key": row.key, "value": row.value} for row in result.scalars().all()]


async def _ensure_session_within_session(session: AsyncSession, session_id: str) -> SessionRecord:
    record = await session.get(SessionRecord, session_id)
    if not record:
        record = SessionRecord(id=session_id)
        session.add(record)
        await session.flush()
    return record


def _session_to_dict(record: SessionRecord) -> dict:
    return {
        "id": record.id,
        "title": record.title,
        "created_at": record.created_at.isoformat() if record.created_at else "",
        "updated_at": record.updated_at.isoformat() if record.updated_at else "",
    }


def _agent_to_dict(record: AgentRecord) -> dict:
    return {
        "id": record.id,
        "name": record.name,
        "persona": record.persona,
        "provider": record.provider,
        "model": record.model,
        "api_key_encrypted": record.api_key_encrypted,
        "sequence_order": record.sequence_order,
        "tools": record.tools or [],
        "temperature": record.temperature,
        "supports_vision": record.supports_vision,
        "custom_base_url": record.custom_base_url,
    }


def _message_to_dict(record: MessageRecord) -> dict:
    return {
        "id": record.id,
        "role": record.role,
        "agent_name": record.agent_name,
        "content": record.content,
        "timestamp": record.timestamp,
        "token_count": record.token_count,
        "cost_usd": record.cost_usd,
        "branch_id": record.branch_id,
    }


def _workflow_to_dict(record: WorkflowRecord) -> dict:
    return {
        "id": record.id,
        "name": record.name,
        "description": record.description,
        "agent_configs": record.agent_configs or [],
        "mode": record.mode,
        "max_debate_rounds": record.max_debate_rounds,
    }


def _prompt_to_dict(record: PromptTemplateRecord) -> dict:
    return {
        "id": record.id,
        "name": record.name,
        "category": record.category,
        "persona": record.persona,
        "recommended_model": record.recommended_model,
        "recommended_tools": record.recommended_tools or [],
    }


async def upsert_document(document: dict) -> dict:
    async with session_factory() as session:
        record = await session.get(DocumentRecord, document["id"])
        if not record:
            record = DocumentRecord(id=document["id"])
            session.add(record)

        record.session_id = document.get("session_id", "default")
        record.filename = document.get("filename", "unknown")
        record.chunk_count = int(document.get("chunk_count", 0) or 0)

        await session.commit()
        await session.refresh(record)
        return {
            "id": record.id,
            "session_id": record.session_id,
            "filename": record.filename,
            "chunk_count": record.chunk_count,
            "created_at": record.created_at.isoformat() if record.created_at else "",
        }


async def replace_document_chunks(document_id: str, session_id: str, chunks: list[dict]) -> None:
    async with session_factory() as session:
        existing = (
            await session.execute(
                select(DocumentChunkRecord).where(DocumentChunkRecord.document_id == document_id)
            )
        ).scalars().all()
        for row in existing:
            await session.delete(row)

        for idx, chunk in enumerate(chunks):
            session.add(
                DocumentChunkRecord(
                    document_id=document_id,
                    session_id=session_id,
                    chunk_index=idx,
                    content=chunk.get("content", ""),
                    metadata_json=chunk.get("metadata_json", {}) or {},
                    embedding=chunk.get("embedding"),
                )
            )

        await session.commit()


async def list_session_documents(session_id: str) -> list[dict]:
    async with session_factory() as session:
        result = await session.execute(
            select(DocumentRecord)
            .where(DocumentRecord.session_id == session_id)
            .order_by(DocumentRecord.created_at.desc())
        )
        docs = []
        for row in result.scalars().all():
            docs.append(
                {
                    "id": row.id,
                    "filename": row.filename,
                    "chunks": row.chunk_count,
                    "created_at": row.created_at.isoformat() if row.created_at else "",
                }
            )
        return docs


async def get_session_document_chunks(session_id: str) -> list[dict]:
    async with session_factory() as session:
        result = await session.execute(
            select(DocumentChunkRecord)
            .where(DocumentChunkRecord.session_id == session_id)
            .order_by(DocumentChunkRecord.created_at.asc(), DocumentChunkRecord.chunk_index.asc())
        )
        rows = result.scalars().all()
        return [
            {
                "document_id": row.document_id,
                "session_id": row.session_id,
                "chunk_index": row.chunk_index,
                "content": row.content,
                "metadata_json": row.metadata_json or {},
                "embedding": row.embedding,
            }
            for row in rows
        ]


async def clear_session_documents(session_id: str) -> bool:
    async with session_factory() as session:
        chunks = (
            await session.execute(
                select(DocumentChunkRecord).where(DocumentChunkRecord.session_id == session_id)
            )
        ).scalars().all()
        docs = (
            await session.execute(
                select(DocumentRecord).where(DocumentRecord.session_id == session_id)
            )
        ).scalars().all()

        if not chunks and not docs:
            return False

        for row in chunks:
            await session.delete(row)
        for row in docs:
            await session.delete(row)

        await session.commit()
        return True


async def add_memory_entry(entry: dict) -> dict:
    async with session_factory() as session:
        record = MemoryRecord(
            id=entry["id"],
            session_id=entry.get("session_id", "default"),
            source_message_id=entry.get("source_message_id"),
            content=entry.get("content", ""),
            metadata_json=entry.get("metadata_json", {}) or {},
            embedding=entry.get("embedding"),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return {
            "id": record.id,
            "session_id": record.session_id,
            "source_message_id": record.source_message_id,
            "content": record.content,
            "metadata_json": record.metadata_json or {},
            "embedding": record.embedding,
            "created_at": record.created_at.isoformat() if record.created_at else "",
        }


async def list_memory_entries(session_id: Optional[str] = None, limit: int = 50) -> list[dict]:
    async with session_factory() as session:
        stmt = select(MemoryRecord)
        if session_id:
            stmt = stmt.where(MemoryRecord.session_id == session_id)
        stmt = stmt.order_by(MemoryRecord.created_at.desc()).limit(limit)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [
            {
                "id": row.id,
                "session_id": row.session_id,
                "source_message_id": row.source_message_id,
                "content": row.content,
                "metadata_json": row.metadata_json or {},
                "embedding": row.embedding,
                "created_at": row.created_at.isoformat() if row.created_at else "",
            }
            for row in rows
        ]


async def clear_session_memory(session_id: str) -> bool:
    async with session_factory() as session:
        rows = (
            await session.execute(
                select(MemoryRecord).where(MemoryRecord.session_id == session_id)
            )
        ).scalars().all()
        if not rows:
            return False
        for row in rows:
            await session.delete(row)
        await session.commit()
        return True
