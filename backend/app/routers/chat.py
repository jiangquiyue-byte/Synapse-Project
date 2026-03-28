"""Chat router with SSE streaming and non-streaming support for multi-agent conversations."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from app.models.schemas import ChatRequest
from app.models.database import (
    get_agent, add_session_message, get_messages_until
)
from app.services.orchestrator import build_graph, ConversationState
from app.services.rag_pipeline import retrieve_rag_context
import json
from uuid import uuid4

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _resolve_agents(request: ChatRequest) -> list[dict]:
    """Resolve agent configs from inline_agents or in-memory store."""
    agent_configs = []

    if request.inline_agents:
        for ia in request.inline_agents:
            agent_configs.append({
                "id": ia.id,
                "name": ia.name,
                "persona": ia.persona,
                "provider": ia.provider,
                "model": ia.model,
                "api_key_encrypted": ia.api_key,
                "sequence_order": ia.sequence_order,
                "tools": ia.tools,
                "temperature": ia.temperature,
                "supports_vision": ia.supports_vision,
                "custom_base_url": ia.custom_base_url,
            })
    else:
        for aid in request.agent_ids:
            agent = get_agent(aid)
            if agent:
                agent_configs.append(agent)

    if request.mode.value == "single" and request.target_agent_id:
        agent_configs = [c for c in agent_configs if c["id"] == request.target_agent_id]

    return agent_configs


@router.post("/send")
async def send_chat(request: ChatRequest):
    """Non-streaming chat endpoint. Returns all agent responses as JSON.
    
    This is the primary endpoint for React Native clients where
    ReadableStream (SSE) is not natively supported.
    
    Returns:
        {
            "messages": [...],
            "total_cost_usd": 0.001
        }
    """
    try:
        agent_configs = _resolve_agents(request)

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
                }
            )

        initial_messages = []
        if request.branch_from_message_id:
            initial_messages = get_messages_until(
                request.session_id, request.branch_from_message_id
            )

        graph = await build_graph(
            agent_configs,
            request.mode.value,
            request.max_debate_rounds
        )

        rag_context = ""
        try:
            rag_context = await retrieve_rag_context(
                request.session_id, request.user_message, k=5
            )
        except Exception:
            pass

        initial_state = ConversationState(
            messages=initial_messages,
            current_agent_index=0,
            agent_configs=agent_configs,
            user_query=request.user_message,
            rag_context=rag_context,
            mode=request.mode.value,
            debate_round=0,
            max_debate_rounds=request.max_debate_rounds,
            should_continue_debate=True,
            image_data=request.image_base64 or "",
        )

        all_messages = []
        total_cost = 0.0

        async for event in graph.astream(initial_state, stream_mode="updates"):
            for node_name, node_output in event.items():
                if "messages" in node_output:
                    for msg in node_output["messages"]:
                        if "id" not in msg:
                            msg["id"] = str(uuid4())
                        total_cost += msg.get("cost_usd", 0)
                        add_session_message(request.session_id, msg)
                        all_messages.append(msg)

        return JSONResponse(content={
            "messages": all_messages,
            "total_cost_usd": round(total_cost, 6),
        })

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
            }
        )


@router.post("/stream")
async def stream_chat(request: ChatRequest):
    """Stream multi-agent chat responses via SSE.
    
    Note: This endpoint requires ReadableStream support.
    For React Native clients, use /api/chat/send instead.
    """
    agent_configs = _resolve_agents(request)

    if not agent_configs:
        async def error_gen():
            yield {
                "event": "error",
                "data": json.dumps({"error": "没有找到有效的 Agent 配置。请确认已添加成员。"}, ensure_ascii=False)
            }
            yield {"event": "done", "data": "{}"}
        return EventSourceResponse(error_gen())

    initial_messages = []
    if request.branch_from_message_id:
        initial_messages = get_messages_until(
            request.session_id, request.branch_from_message_id
        )

    graph = await build_graph(
        agent_configs,
        request.mode.value,
        request.max_debate_rounds
    )

    rag_context = ""
    try:
        rag_context = await retrieve_rag_context(
            request.session_id, request.user_message, k=5
        )
    except Exception:
        pass

    initial_state = ConversationState(
        messages=initial_messages,
        current_agent_index=0,
        agent_configs=agent_configs,
        user_query=request.user_message,
        rag_context=rag_context,
        mode=request.mode.value,
        debate_round=0,
        max_debate_rounds=request.max_debate_rounds,
        should_continue_debate=True,
        image_data=request.image_base64 or "",
    )

    async def event_generator():
        total_cost = 0.0
        try:
            async for event in graph.astream(initial_state, stream_mode="updates"):
                for node_name, node_output in event.items():
                    if "messages" in node_output:
                        for msg in node_output["messages"]:
                            if "id" not in msg:
                                msg["id"] = str(uuid4())
                            total_cost += msg.get("cost_usd", 0)
                            yield {
                                "event": "agent_start",
                                "data": json.dumps({
                                    "agent_name": msg.get("agent_name", "Agent"),
                                    "agent_id": msg.get("role", ""),
                                }, ensure_ascii=False)
                            }
                            add_session_message(request.session_id, msg)
                            yield {
                                "event": "agent_message",
                                "data": json.dumps(msg, ensure_ascii=False)
                            }

            yield {
                "event": "cost_summary",
                "data": json.dumps({"total_cost_usd": round(total_cost, 6)})
            }
            yield {"event": "done", "data": "{}"}

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}, ensure_ascii=False)
            }
            yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session."""
    from app.models.database import get_session_messages
    return {"messages": get_session_messages(session_id)}
