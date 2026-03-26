"""Chat router with SSE streaming support."""
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from app.models.schemas import ChatRequest
from app.models.database import (
    get_agent, add_session_message, get_messages_until
)
from app.services.orchestrator import build_graph, ConversationState
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/stream")
async def stream_chat(request: ChatRequest):
    """Stream multi-agent chat responses via SSE."""

    # Load agent configs
    agent_configs = []
    for aid in request.agent_ids:
        agent = get_agent(aid)
        if agent:
            agent_configs.append(agent)

    if not agent_configs:
        async def error_gen():
            yield {
                "event": "error",
                "data": json.dumps({"error": "没有找到有效的 Agent 配置"})
            }
            yield {"event": "done", "data": "{}"}
        return EventSourceResponse(error_gen())

    # Handle @single mode
    if request.mode.value == "single" and request.target_agent_id:
        agent_configs = [c for c in agent_configs if c["id"] == request.target_agent_id]

    # Handle branch
    initial_messages = []
    if request.branch_from_message_id:
        initial_messages = get_messages_until(
            request.session_id, request.branch_from_message_id
        )

    # Build graph
    graph = await build_graph(
        agent_configs,
        request.mode.value,
        request.max_debate_rounds
    )

    initial_state = ConversationState(
        messages=initial_messages,
        current_agent_index=0,
        agent_configs=agent_configs,
        user_query=request.user_message,
        rag_context="",
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
                            total_cost += msg.get("cost_usd", 0)
                            # Save to session
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
