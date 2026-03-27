"""
LangGraph multi-mode orchestrator for Synapse.
Supports: sequential, debate, vote, single modes.
Real LLM API integration with SSE streaming.
"""
import operator
import os
from typing import TypedDict, Annotated
from datetime import datetime
from uuid import uuid4

from app.services.agent_factory import create_llm
from app.services.cost_tracker import count_tokens, estimate_cost


class ConversationState(TypedDict):
    messages: Annotated[list[dict], operator.add]
    current_agent_index: int
    agent_configs: list[dict]
    user_query: str
    rag_context: str
    mode: str
    debate_round: int
    max_debate_rounds: int
    should_continue_debate: bool
    image_data: str


def make_agent_node(cfg: dict):
    """Factory that creates an async agent node function.
    This is the core function that calls real LLM APIs (OpenAI/Gemini/Claude)
    via LangChain and returns structured messages for SSE streaming.
    """

    async def agent_node(state):
        # --- Line 45: Real LLM API invocation starts here ---
        llm = create_llm(cfg)

        prev_msgs = "\n".join(
            f"[{m['agent_name']}]: {m['content']}"
            for m in state["messages"] if m["role"] != "user"
        )

        mode_instruction = ""
        if state["mode"] == "debate":
            mode_instruction = (
                "\n这是一场自由辩论。你可以质疑、补充或反驳之前任何 Agent 的观点。"
                "请明确指出你同意或不同意谁的观点，并给出理由。"
                f"\n当前是第 {state['debate_round']+1}/{state['max_debate_rounds']} 轮辩论。"
            )
        elif state["mode"] == "vote":
            mode_instruction = (
                "\n这是投票表决模式。请独立回答用户问题，不要参考其他 Agent 的回答。"
                "在回答末尾，用一句话总结你的核心立场。"
            )

        system_msg = f"""你是「{cfg['name']}」。{cfg['persona']}
{mode_instruction}

之前的发言记录：
{prev_msgs if prev_msgs else '(尚无)'}

{'相关文档参考：' + state.get('rag_context', '') if state.get('rag_context') else ''}

用户的原始问题：{state['user_query']}

请从你的角色定位出发给出专业回复。回复请控制在500字以内。"""

        # Build message list for LLM invocation
        llm_messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": state["user_query"]}
        ]

        # Support multimodal (vision) if agent supports it and image is provided
        if state.get("image_data") and cfg.get("supports_vision"):
            llm_messages = [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_data']}"}},
                    {"type": "text", "text": state["user_query"]}
                ]}
            ]

        # Real LLM API call
        try:
            response = await llm.ainvoke(llm_messages)
            content = response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            content = f"[LLM 调用失败: {str(e)}]"

        tokens = count_tokens(content, cfg["model"])
        cost = estimate_cost(tokens, cfg["model"], cfg["provider"])

        return {
            "messages": [{
                "id": str(uuid4()),
                "role": cfg["id"],
                "agent_name": cfg["name"],
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "token_count": tokens,
                "cost_usd": cost,
            }],
            "current_agent_index": state["current_agent_index"] + 1,
        }

    return agent_node


def debate_should_continue(state):
    if state["debate_round"] >= state["max_debate_rounds"]:
        return "synthesize"
    return "next_round"


async def synthesizer_node(state):
    """Synthesizer node that aggregates all agent responses.
    Uses the system OPENAI_API_KEY for the synthesis step."""
    all_responses = "\n\n".join(
        f"[{m['agent_name']}]: {m['content']}"
        for m in state["messages"] if m["role"] != "user"
    )

    mode_label = "辩论" if state["mode"] == "debate" else "投票"

    # Use system-level OpenAI key for synthesizer
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        from app.core.config import get_settings
        api_key = get_settings().OPENAI_API_KEY

    from langchain_openai import ChatOpenAI
    synth_llm = ChatOpenAI(
        model="gpt-4.1-mini",
        api_key=api_key,
        temperature=0.3,
    )

    try:
        response = await synth_llm.ainvoke([{
            "role": "system",
            "content": f"""你是 Synapse 的智慧综合器。以下是多位 AI 专家的{mode_label}结果。
请综合所有观点，指出共识与分歧，给出最终结论。回复请控制在500字以内。

{all_responses}

用户原始问题：{state['user_query']}"""
        }])
        content = response.content if hasattr(response, 'content') else str(response)
    except Exception as e:
        content = f"[综合器调用失败: {str(e)}]"

    return {
        "messages": [{
            "id": str(uuid4()),
            "role": "synthesizer",
            "agent_name": "Synapse 综合结论",
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "token_count": count_tokens(content, "gpt-4.1-mini"),
            "cost_usd": 0.0,
        }]
    }


async def build_graph(agent_configs: list, mode: str, max_rounds: int = 3):
    """Build and compile the LangGraph state graph for multi-agent orchestration."""
    from langgraph.graph import StateGraph, END

    sorted_agents = sorted(agent_configs, key=lambda a: a["sequence_order"])
    graph = StateGraph(ConversationState)

    if mode == "sequential":
        # Sequential: A1 -> A2 -> A3 -> END
        for cfg in sorted_agents:
            graph.add_node(f"agent_{cfg['id']}", make_agent_node(cfg))
        names = [f"agent_{a['id']}" for a in sorted_agents]
        graph.set_entry_point(names[0])
        for i in range(len(names) - 1):
            graph.add_edge(names[i], names[i + 1])
        graph.add_edge(names[-1], END)

    elif mode == "single":
        # Single: Only one agent responds
        cfg = sorted_agents[0]
        graph.add_node(f"agent_{cfg['id']}", make_agent_node(cfg))
        graph.set_entry_point(f"agent_{cfg['id']}")
        graph.add_edge(f"agent_{cfg['id']}", END)

    elif mode == "debate":
        # Debate: [A1,A2,A3] x N rounds -> Synthesizer
        for cfg in sorted_agents:
            graph.add_node(f"agent_{cfg['id']}", make_agent_node(cfg))
        graph.add_node("synthesizer", synthesizer_node)
        names = [f"agent_{a['id']}" for a in sorted_agents]
        graph.set_entry_point(names[0])
        for i in range(len(names) - 1):
            graph.add_edge(names[i], names[i + 1])
        graph.add_conditional_edges(
            names[-1],
            debate_should_continue,
            {"next_round": names[0], "synthesize": "synthesizer"}
        )
        graph.add_edge("synthesizer", END)

    elif mode == "vote":
        # Vote: A1 -> A2 -> A3 -> Synthesizer -> END
        for cfg in sorted_agents:
            graph.add_node(f"agent_{cfg['id']}", make_agent_node(cfg))
        graph.add_node("synthesizer", synthesizer_node)
        names = [f"agent_{a['id']}" for a in sorted_agents]
        graph.set_entry_point(names[0])
        for i in range(len(names) - 1):
            graph.add_edge(names[i], names[i + 1])
        graph.add_edge(names[-1], "synthesizer")
        graph.add_edge("synthesizer", END)

    return graph.compile()
