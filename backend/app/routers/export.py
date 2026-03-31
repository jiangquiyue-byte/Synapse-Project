from app.core.auth import get_current_user
from fastapi import Depends
import io
import json

import fitz
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.database import get_session_messages

router = APIRouter(prefix="/api/export", tags=["export"], dependencies=[Depends(get_current_user)])


def _build_export_payload(session_id: str, messages: list[dict]) -> dict:
    return {
        "session_id": session_id,
        "message_count": len(messages),
        "messages": messages,
    }


async def _build_markdown_content(session_id: str) -> str:
    messages = await get_session_messages(session_id)
    md_content = "# Synapse 对话记录\n\n"
    for msg in messages:
        if msg.get("role") == "user":
            md_content += f"## 用户\n{msg['content']}\n\n"
        else:
            name = msg.get("agent_name", "Agent")
            md_content += f"## {name}\n{msg['content']}\n\n"
    return md_content


async def _build_json_content(session_id: str) -> bytes:
    messages = await get_session_messages(session_id)
    payload = _build_export_payload(session_id, messages)
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def _build_pdf_bytes(markdown_content: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    rect = fitz.Rect(40, 40, 555, 802)

    plain_text = markdown_content.replace("## ", "").replace("# ", "")
    remaining = page.insert_textbox(
        rect,
        plain_text,
        fontsize=11,
        fontname="china-s",
        lineheight=1.45,
        color=(0, 0, 0),
    )

    if remaining < 0:
        extra_page = doc.new_page()
        extra_page.insert_textbox(
            rect,
            plain_text,
            fontsize=11,
            fontname="china-s",
            lineheight=1.45,
            color=(0, 0, 0),
        )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@router.get("/markdown/{session_id}")
async def export_markdown(session_id: str):
    md_content = await _build_markdown_content(session_id)
    return StreamingResponse(
        io.BytesIO(md_content.encode("utf-8")),
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=synapse_{session_id}.md"},
    )


@router.get("/pdf/{session_id}")
async def export_pdf(session_id: str):
    md_content = await _build_markdown_content(session_id)
    pdf_bytes = _build_pdf_bytes(md_content)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=synapse_{session_id}.pdf"},
    )


@router.get("/json/{session_id}")
async def export_json(session_id: str):
    json_bytes = await _build_json_content(session_id)
    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=synapse_{session_id}.json"},
    )
