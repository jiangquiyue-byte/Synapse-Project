import json
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from app.models.database import (
    add_session_message,
    ensure_session,
    get_agent,
    get_messages_until,
    get_session_messages,
)
from app.models.schemas import ChatRequest
from app.services.memory_service import build_memory_context, remember_message
from app.services.orchestrator import ConversationState, build_graph, stream_conversation
from app.services.rag_pipeline import retrieve_rag_context

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _resolve_agents(request: ChatRequest) -> list[dict]:
    """Resolve agent configs from inline_agents or persistent storage.

    Mobile clients may send masked API keys ("***") after reloading saved agents.
    In that case, merge the inline payload with the stored agent record so the
    backend can still use the encrypted key persisted in the database.
    """
    agent_configs = []

    if request.inline_agents:
        for ia in request.inline_agents:
            stored_agent = await get_agent(ia.id)
            masked_inline_key = ia.api_key in ("", "***")

            agent_configs.append({
                "id": ia.id,
                "name": ia.name or (stored_agent.get("name") if stored_agent else ""),
                "persona": ia.persona or (stored_agent.get("persona") if stored_agent else ""),
                "provider": ia.provider or (stored_agent.get("provider") if stored_agent else ""),
                "model": ia.model or (stored_agent.get("model") if stored_agent else ""),
                "api_key_encrypted": (
                    stored_agent.get("api_key_encrypted", "")
                    if stored_agent and masked_inline_key
                    else ia.api_key
                ),
                "sequence_order": ia.sequence_order,
                "tools": ia.tools,
                "temperature": ia.temperature,
                "supports_vision": ia.supports_vision,
                "custom_base_url": (
                    ia.custom_base_url
                    or (stored_agent.get("custom_base_url", "") if stored_agent else "")
                ),
            })
    else:
        for aid in request.agent_ids:
            agent = await get_agent(aid)
            if agent:
                agent_configs.append(agent)

    if request.mode.value == "single" and request.target_agent_id:
        agent_configs = [c for c in agent_configs if c["id"] == request.target_agent_id]

    return agent_configs


async def _load_initial_messages(request: ChatRequest) -> list[dict]:
    if request.branch_from_message_id:
        return await get_messages_until(request.session_id, request.branch_from_message_id)
    return await get_session_messages(request.session_id)


async def _persist_user_message(request: ChatRequest) -> dict:
    user_msg = {
        "id": str(uuid4()),
        "role": "user",
        "agent_name": "用户",
        "content": request.user_message,
        "timestamp": datetime.utcnow().isoformat(),
        "token_count": 0,
        "cost_usd": 0.0,
        "branch_id": request.branch_from_message_id,
    }
    saved = await add_session_message(request.session_id, user_msg)
    await remember_message(request.session_id, saved)
    return saved


async def _build_context_bundle(session_id: str, user_message: str) -> str:
    context_sections: list[str] = []

    try:
        rag_context = await retrieve_rag_context(session_id, user_message, k=5)
        if rag_context:
            context_sections.append(f"[当前会话文档参考]\n{rag_context}")
    except Exception:
        pass

    try:
        memory_context = await build_memory_context(
            user_message,
            current_session_id=session_id,
            include_current_session=False,
            limit=4,
        )
        if memory_context:
            context_sections.append(f"[跨会话记忆参考]\n{memory_context}")
    except Exception:
        pass

    return "\n\n".join(context_sections)


@router.post("/send")
async def send_chat(request: ChatRequest):
    """Non-streaming chat endpoint for React Native clients."""
    try:
        await ensure_session(request.session_id, title=request.user_message[:40] or "新会话")
        agent_configs = await _resolve_agents(request)

        if not agent_configs:
            return JSONResponse(
                status_code=200,
                content={
                    "messages": [{
                        "id": str(uuid4()),
                        "role": "system",
                        "agent_name": "系统",
                        "content": "没有找到有效的 Agent 配置。请确认已添加成员。",
                        "timestamp": "",
                        "token_count": 0,
                        "cost_usd": 0.0,
                    }],
                    "total_cost_usd": 0.0,
                },
            )

        initial_messages = await _load_initial_messages(request)
        await _persist_user_message(request)

        graph = await build_graph(
            agent_configs,
            request.mode.value,
            request.max_debate_rounds,
        )

        context_bundle = await _build_context_bundle(request.session_id, request.user_message)

        initial_state = ConversationState(
            messages=initial_messages,
            current_agent_index=0,
            agent_configs=agent_configs,
            user_query=request.user_message,
            rag_context=context_bundle,
            mode=request.mode.value,
            debate_round=0,
            max_debate_rounds=request.max_debate_rounds,
            should_continue_debate=True,
            image_data=request.image_base64 or "",
        )

        all_messages = []
        total_cost = 0.0

        async for event in graph.astream(initial_state, stream_mode="updates"):
            for _, node_output in event.items():
                if "messages" not in node_output:
                    continue
                for msg in node_output["messages"]:
                    if "id" not in msg:
                        msg["id"] = str(uuid4())
                    total_cost += msg.get("cost_usd", 0)
                    saved = await add_session_message(request.session_id, msg)
                    await remember_message(request.session_id, saved)
                    all_messages.append(saved)

        return JSONResponse(
            content={
                "messages": all_messages,
                "total_cost_usd": round(total_cost, 6),
            }
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "messages": [{
                    "id": str(uuid4()),
                    "role": "system",
                    "agent_name": "系统",
                    "content": f"服务器错误: {str(e)}",
                    "timestamp": "",
                    "token_count": 0,
                    "cost_usd": 0.0,
                }],
                "total_cost_usd": 0.0,
            },
        )


@router.post("/stream")
async def stream_chat(request: ChatRequest):
    """Stream multi-agent chat responses via SSE with token-level updates."""
    await ensure_session(request.session_id, title=request.user_message[:40] or "新会话")
    agent_configs = await _resolve_agents(request)

    if not agent_configs:
        async def error_gen():
            yield {
                "event": "error",
                "data": json.dumps({"error": "没有找到有效的 Agent 配置。请确认已添加成员。"}, ensure_ascii=False),
            }
            yield {"event": "done", "data": "{}"}

        return EventSourceResponse(error_gen())

    initial_messages = await _load_initial_messages(request)
    await _persist_user_message(request)
    context_bundle = await _build_context_bundle(request.session_id, request.user_message)

    initial_state = ConversationState(
        messages=initial_messages,
        current_agent_index=0,
        agent_configs=agent_configs,
        user_query=request.user_message,
        rag_context=context_bundle,
        mode=request.mode.value,
        debate_round=0,
        max_debate_rounds=request.max_debate_rounds,
        should_continue_debate=True,
        image_data=request.image_base64 or "",
    )

    async def event_generator():
        total_cost = 0.0
        try:
            async for event in stream_conversation(agent_configs, initial_state):
                event_name = event.get("event", "message")
                data = event.get("data", {})

                if event_name == "agent_message":
                    total_cost += data.get("cost_usd", 0)
                    saved = await add_session_message(request.session_id, data)
                    await remember_message(request.session_id, saved)
                    yield {
                        "event": "agent_message",
                        "data": json.dumps(saved, ensure_ascii=False),
                    }
                    continue

                if event_name in {"agent_start", "token", "error", "cost_summary"}:
                    yield {
                        "event": event_name,
                        "data": json.dumps(data, ensure_ascii=False),
                    }

            yield {
                "event": "cost_summary",
                "data": json.dumps({"total_cost_usd": round(total_cost, 6)}, ensure_ascii=False),
            }
            yield {"event": "done", "data": "{}"}

        except Exception as e:
            import traceback

            traceback.print_exc()
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}, ensure_ascii=False),
            }
            yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get persisted chat history for a session."""
    return {"messages": await get_session_messages(session_id)}
