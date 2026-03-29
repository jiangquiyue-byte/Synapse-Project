import io

import markdown
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.database import get_session_messages

router = APIRouter(prefix="/api/export", tags=["export"])


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
    html = markdown.markdown(md_content)
    styled_html = f"""<html><head><meta charset=\"utf-8\"><style>
body {{ font-family: Arial, sans-serif; max-width: 700px; margin: auto; padding: 20px; }}
h1 {{ color: #000; }} h2 {{ color: #333; }}
</style></head><body>{html}</body></html>"""

    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=styled_html).write_pdf()
    except Exception:
        pdf_bytes = styled_html.encode("utf-8")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=synapse_{session_id}.pdf"},
    )
