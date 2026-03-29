from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("EMBEDDING_BACKEND", "fastembed")
os.environ.setdefault(
    "LOCAL_EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)
os.environ.setdefault("PGVECTOR_DIMENSION", "1536")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/synapse_semantic_verify.db")

from app.models.database import init_db  # noqa: E402
from app.services.embedding_service import get_embedding_backend_label, get_embeddings  # noqa: E402
from app.services.memory_service import build_memory_context, remember_message  # noqa: E402


async def main() -> None:
    await init_db()

    embeddings = get_embeddings()
    query_vector = await embeddings.aembed_query("如何改进多专家协作的方案评审质量")

    await remember_message(
        "session-a",
        {
            "id": "msg-1",
            "role": "user",
            "content": "我们计划组织技术、产品、设计三位专家评审新版工作流系统。",
            "timestamp": "2026-03-30T00:00:00Z",
        },
    )
    await remember_message(
        "session-b",
        {
            "id": "msg-2",
            "role": "assistant",
            "agent_name": "研究员",
            "content": "深度研报工作流需要联网搜索、行业结构化分析和证据引用。",
            "timestamp": "2026-03-30T00:01:00Z",
        },
    )

    memory_context = await build_memory_context(
        "请调出关于专家评审和深度研报工作流的历史经验",
        current_session_id="session-current",
        include_current_session=False,
        limit=2,
    )

    result = {
        "backend_label": get_embedding_backend_label(),
        "vector_dimension": len(query_vector),
        "vector_head": query_vector[:8],
        "memory_context": memory_context,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
