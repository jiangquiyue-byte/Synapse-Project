from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("EMBEDDING_BACKEND", "huggingface")
os.environ.setdefault("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
os.environ.setdefault("LOCAL_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
os.environ.setdefault("PGVECTOR_DIMENSION", "1536")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/synapse_phase3_verify.db")
os.environ.setdefault("OPENAI_BASE_URL", "https://api.deepseek.com/v1")
os.environ.setdefault("OPENAI_API_KEY", "test_deepseek_key_placeholder")

from app.models.database import init_db  # noqa: E402
from app.routers.memory import preview_memory_context, search_memory  # noqa: E402
from app.routers.workflows import apply_template, list_templates  # noqa: E402
from app.services.memory_service import remember_message  # noqa: E402


async def main() -> None:
    await init_db()

    await remember_message(
        "phase3-session-a",
        {
            "id": "phase3-msg-1",
            "role": "user",
            "content": "我们需要一个可一键套用的多专家圆桌工作流，覆盖技术、产品和设计三种角色。",
            "timestamp": "2026-03-30T00:00:00Z",
        },
    )
    await remember_message(
        "phase3-session-b",
        {
            "id": "phase3-msg-2",
            "role": "assistant",
            "agent_name": "研究总监",
            "content": "深度研报工作流要结合联网搜索、结构化行业分析以及风险和结论部分。",
            "timestamp": "2026-03-30T00:01:00Z",
        },
    )

    templates = await list_templates()
    applied = await apply_template("official_expert_roundtable")
    memory_search = await search_memory(
        query="多专家圆桌和深度研报工作流",
        current_session_id="phase3-session-current",
        include_current_session=False,
        limit=3,
    )
    memory_context = await preview_memory_context(
        query="调出关于多专家圆桌和深度研报的历史经验",
        current_session_id="phase3-session-current",
        include_current_session=False,
        limit=2,
    )

    result = {
        "template_count": len(templates.get("templates", [])),
        "applied_session_id": applied.get("applied", {}).get("session_id"),
        "applied_mode": applied.get("applied", {}).get("discussion_mode"),
        "applied_agent_count": len(applied.get("applied", {}).get("agent_configs", [])),
        "recommended_opening_message": applied.get("applied", {}).get("recommended_opening_message"),
        "memory_backend_label": memory_search.get("backend_label"),
        "memory_result_count": memory_search.get("count"),
        "memory_context_backend_label": memory_context.get("backend_label"),
        "memory_context_preview": memory_context.get("context"),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
