"""
LangGraph multi-mode orchestrator for Synapse.
Supports: sequential, debate, vote, single modes.
Provides both graph-based aggregation and token-level streaming helpers.
"""
from __future__ import annotations

import asyncio
import operator
import os
from datetime import datetime
from typing import Annotated, Any, AsyncGenerator, TypedDict
from uuid import uuid4

from app.services.agent_factory import create_llm
from app.services.cost_tracker import count_tokens, estimate_cost, estimate_cost_detailed


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


def _normalize_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text") or item.get("content") or ""
                if text:
                    parts.append(str(text))
            else:
                parts.append(str(item))
        return "".join(parts)
    return str(content)


def _get_tools_for_agent(cfg: dict) -> list:
    """Build the tool list for an agent based on its config."""
    tools = []
    agent_tools = cfg.get("tools", [])

    if "web_search" in agent_tools:
        try:
            from app.services.web_search import web_search_tool
            tools.append(web_search_tool)
        except Exception:
            pass

    if "rag_query" in agent_tools:
        try:
            from app.services.rag_pipeline import rag_query_tool
            tools.append(rag_query_tool)
        except Exception:
            pass

    return tools


def _build_mode_instruction(state: ConversationState) -> str:
    if state["mode"] == "debate":
        current_round = state.get("debate_round", 0)
        max_rounds = state.get("max_debate_rounds", 3)
        return (
            "\n这是一场自由辩论。你可以质疑、补充或反驳之前任何 Agent 的观点。"
            "请明确指出你同意或不同意谁的观点，并给出理由。"
            f"\n当前是第 {current_round + 1}/{max_rounds} 轮辩论。"
        )

    if state["mode"] == "vote":
        return (
            "\n这是投票表决模式。请独立回答用户问题，不要参考其他 Agent 的回答。"
            "在回答末尾，用一句话总结你的核心立场。"
        )

    return ""


def _build_tool_instruction(cfg: dict) -> str:
    agent_tools = cfg.get("tools", [])
    tool_names: list[str] = []
    if "web_search" in agent_tools:
        tool_names.append("联网搜索")
    if "rag_query" in agent_tools:
        tool_names.append("文档检索")
    if tool_names:
        return f"\n你拥有以下工具能力：{'、'.join(tool_names)}。如果需要，可以在回答中引用搜索结果或文档内容。"
    return ""


def _build_previous_messages(state: ConversationState) -> str:
    if state["mode"] == "vote":
        return ""
    return "\n".join(
        f"[{m['agent_name']}]: {m['content']}"
        for m in state["messages"]
        if m.get("role") != "user"
    )


def _build_agent_prompt(cfg: dict, state: ConversationState) -> tuple[str, list[dict]]:
    prev_msgs = _build_previous_messages(state)
    mode_instruction = _build_mode_instruction(state)
    tool_instruction = _build_tool_instruction(cfg)

    system_msg = f"""你是「{cfg['name']}」。{cfg['persona']}
{mode_instruction}
{tool_instruction}

之前的发言记录：
{prev_msgs if prev_msgs else '(尚无)'}

{'相关文档参考：' + state.get('rag_context', '') if state.get('rag_context') else ''}

用户的原始问题：{state['user_query']}

请从你的角色定位出发给出专业回复。回复请控制在500字以内。"""

    llm_messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": state["user_query"]},
    ]

    if state.get("image_data") and cfg.get("supports_vision"):
        llm_messages = [
            {"role": "system", "content": system_msg},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_data']}"}},
                    {"type": "text", "text": state["user_query"]},
                ],
            },
        ]

    return system_msg, llm_messages


async def _run_tool_calls(response: Any) -> list[str]:
    tool_results: list[str] = []
    if not hasattr(response, "tool_calls") or not response.tool_calls:
        return tool_results

    for tool_call in response.tool_calls:
        tool_name = tool_call.get("name", "")
        tool_args = tool_call.get("args", {})
        try:
            if tool_name == "web_search_tool":
                from app.services.web_search import web_search_tool
                result = web_search_tool.invoke(tool_args)
                tool_results.append(f"[联网搜索结果]\n{result}")
            elif tool_name == "rag_query_tool":
                from app.services.rag_pipeline import rag_query_tool
                result = await rag_query_tool.ainvoke(tool_args)
                tool_results.append(f"[文档检索结果]\n{result}")
        except Exception as exc:
            tool_results.append(f"[工具调用失败: {str(exc)}]")
    return tool_results


async def _invoke_agent_content(cfg: dict, state: ConversationState) -> str:
    llm = create_llm(cfg)
    system_msg, llm_messages = _build_agent_prompt(cfg, state)
    tools = _get_tools_for_agent(cfg)

    try:
        if tools:
            llm_with_tools = llm.bind_tools(tools)
            response = await llm_with_tools.ainvoke(llm_messages)
            tool_results = await _run_tool_calls(response)
            if tool_results:
                tool_context = "\n\n".join(tool_results)
                enhanced_messages = [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": f"{state['user_query']}\n\n以下是工具返回的参考信息：\n{tool_context}"},
                ]
                final_response = await llm.ainvoke(enhanced_messages)
                return _normalize_text(getattr(final_response, "content", final_response))
            return _normalize_text(getattr(response, "content", response))

        response = await llm.ainvoke(llm_messages)
        return _normalize_text(getattr(response, "content", response))
    except Exception:
        try:
            response = await llm.ainvoke(llm_messages)
            return _normalize_text(getattr(response, "content", response))
        except Exception as exc:
            return f"[LLM 调用失败: {str(exc)}]"


async def _emit_text_as_tokens(
    content: str,
    *,
    message_id: str,
    agent_id: str,
    agent_name: str,
) -> AsyncGenerator[dict, None]:
    buffer = ""
    for index, char in enumerate(content):
        buffer += char
        yield {
            "event": "token",
            "data": {
                "message_id": message_id,
                "agent_id": agent_id,
                "agent_name": agent_name,
                "delta": char,
                "content": buffer,
            },
        }
        if index % 24 == 0:
            await asyncio.sleep(0)


async def invoke_agent_response(cfg: dict, state: ConversationState) -> dict:
    content = await _invoke_agent_content(cfg, state)
    # Estimate prompt tokens from system + user messages
    system_msg, llm_messages = _build_agent_prompt(cfg, state)
    prompt_text = system_msg + " " + state.get("user_query", "")
    prompt_tokens = count_tokens(prompt_text, cfg["model"])
    completion_tokens = count_tokens(content, cfg["model"])
    cost_detail = estimate_cost_detailed(prompt_tokens, completion_tokens, cfg["model"], cfg["provider"])

    return {
        "messages": [{
            "id": str(uuid4()),
            "role": cfg["id"],
            "agent_name": cfg["name"],
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "token_count": prompt_tokens + completion_tokens,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "cost_usd": cost_detail["total_cost_usd"],
            "cost_cny": cost_detail["total_cost_cny"],
            "cost_detail": cost_detail,
        }],
        "current_agent_index": state["current_agent_index"] + 1,
    }


def make_agent_node(cfg: dict):
    async def agent_node(state):
        return await invoke_agent_response(cfg, state)

    return agent_node


def make_round_counter_node(num_agents: int):
    async def round_counter(state):
        return {
            "messages": [],
            "debate_round": state["debate_round"] + 1,
            "current_agent_index": 0,
        }

    return round_counter


def debate_should_continue(state):
    if state["debate_round"] >= state["max_debate_rounds"]:
        return "synthesize"
    return "next_round"


async def _invoke_synthesizer_content(state: ConversationState) -> str:
    all_responses = "\n\n".join(
        f"[{m['agent_name']}]: {m['content']}"
        for m in state["messages"] if m.get("role") != "user"
    )

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        from app.core.config import get_settings
        api_key = get_settings().OPENAI_API_KEY

    from langchain_openai import ChatOpenAI
    base_url = os.environ.get("OPENAI_BASE_URL", None)
    synth_kwargs = dict(
        model="gpt-4.1-mini",
        api_key=api_key,
        temperature=0.3,
    )
    if base_url:
        synth_kwargs["base_url"] = base_url
    synth_llm = ChatOpenAI(**synth_kwargs)

    if state["mode"] == "debate":
        synthesis_prompt = f"""你是 Synapse 的智慧综合器。以下是多位 AI 专家经过 {state['debate_round']} 轮辩论后的完整记录。
请综合所有观点，指出：
1. 各方的核心论点
2. 主要共识
3. 关键分歧
4. 你的最终综合结论

{all_responses}

用户原始问题：{state['user_query']}
回复请控制在500字以内。"""
    else:
        synthesis_prompt = f"""你是 Synapse 的智慧综合器。以下是多位 AI 专家对同一问题的独立投票回答。
请统计并分析：
1. 各专家的核心立场
2. 多数共识（如果有）
3. 少数异见（如果有）
4. 综合最终结论

{all_responses}

用户原始问题：{state['user_query']}
回复请控制在500字以内。"""

    try:
        response = await synth_llm.ainvoke([{"role": "system", "content": synthesis_prompt}])
        return _normalize_text(getattr(response, "content", response))
    except Exception as exc:
        return f"[综合器调用失败: {str(exc)}]"


async def synthesizer_node(state):
    content = await _invoke_synthesizer_content(state)
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


async def _stream_agent_response(cfg: dict, state: ConversationState) -> AsyncGenerator[dict, None]:
    llm = create_llm(cfg)
    system_msg, llm_messages = _build_agent_prompt(cfg, state)
    message_id = str(uuid4())

    yield {
        "event": "agent_start",
        "data": {
            "agent_name": cfg["name"],
            "agent_id": cfg["id"],
            "message_id": message_id,
        },
    }

    content = ""
    try:
        tools = _get_tools_for_agent(cfg)
        if tools:
            llm_with_tools = llm.bind_tools(tools)
            response = await llm_with_tools.ainvoke(llm_messages)
            tool_results = await _run_tool_calls(response)
            if tool_results:
                tool_context = "\n\n".join(tool_results)
                stream_messages = [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": f"{state['user_query']}\n\n以下是工具返回的参考信息：\n{tool_context}"},
                ]
                async for chunk in llm.astream(stream_messages):
                    delta = _normalize_text(getattr(chunk, "content", chunk))
                    if not delta:
                        continue
                    content += delta
                    yield {
                        "event": "token",
                        "data": {
                            "message_id": message_id,
                            "agent_id": cfg["id"],
                            "agent_name": cfg["name"],
                            "delta": delta,
                            "content": content,
                        },
                    }
            else:
                precomputed = _normalize_text(getattr(response, "content", response))
                async for event in _emit_text_as_tokens(
                    precomputed,
                    message_id=message_id,
                    agent_id=cfg["id"],
                    agent_name=cfg["name"],
                ):
                    content = event["data"]["content"]
                    yield event
        else:
            async for chunk in llm.astream(llm_messages):
                delta = _normalize_text(getattr(chunk, "content", chunk))
                if not delta:
                    continue
                content += delta
                yield {
                    "event": "token",
                    "data": {
                        "message_id": message_id,
                        "agent_id": cfg["id"],
                        "agent_name": cfg["name"],
                        "delta": delta,
                        "content": content,
                    },
                }
    except Exception:
        fallback = await _invoke_agent_content(cfg, state)
        async for event in _emit_text_as_tokens(
            fallback,
            message_id=message_id,
            agent_id=cfg["id"],
            agent_name=cfg["name"],
        ):
            content = event["data"]["content"]
            yield event

    # Use prompt/completion split for accurate billing
    system_msg_for_cost, _ = _build_agent_prompt(cfg, state)
    prompt_text_for_cost = system_msg_for_cost + " " + state.get("user_query", "")
    prompt_tokens = count_tokens(prompt_text_for_cost, cfg["model"])
    completion_tokens = count_tokens(content, cfg["model"])
    cost_detail = estimate_cost_detailed(prompt_tokens, completion_tokens, cfg["model"], cfg["provider"])
    yield {
        "event": "agent_message",
        "data": {
            "id": message_id,
            "role": cfg["id"],
            "agent_name": cfg["name"],
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "token_count": prompt_tokens + completion_tokens,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "cost_usd": cost_detail["total_cost_usd"],
            "cost_cny": cost_detail["total_cost_cny"],
            "cost_detail": cost_detail,
        },
    }


async def _stream_synthesizer_response(state: ConversationState) -> AsyncGenerator[dict, None]:
    message_id = str(uuid4())
    agent_name = "Synapse 综合结论"
    agent_id = "synthesizer"

    yield {
        "event": "agent_start",
        "data": {
            "agent_name": agent_name,
            "agent_id": agent_id,
            "message_id": message_id,
        },
    }

    content = await _invoke_synthesizer_content(state)
    async for event in _emit_text_as_tokens(
        content,
        message_id=message_id,
        agent_id=agent_id,
        agent_name=agent_name,
    ):
        yield event

    yield {
        "event": "agent_message",
        "data": {
            "id": message_id,
            "role": agent_id,
            "agent_name": agent_name,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "token_count": count_tokens(content, "gpt-4.1-mini"),
            "cost_usd": 0.0,
        },
    }


async def stream_conversation(
    agent_configs: list[dict],
    initial_state: ConversationState,
) -> AsyncGenerator[dict, None]:
    state: ConversationState = dict(initial_state)
    sorted_agents = sorted(agent_configs, key=lambda a: a["sequence_order"])

    async def run_agent_and_update(cfg: dict) -> AsyncGenerator[dict, None]:
        nonlocal state
        async for event in _stream_agent_response(cfg, state):
            yield event
            if event["event"] == "agent_message":
                state["messages"] = state.get("messages", []) + [event["data"]]
                state["current_agent_index"] = state.get("current_agent_index", 0) + 1

    if state["mode"] == "single":
        if sorted_agents:
            async for event in run_agent_and_update(sorted_agents[0]):
                yield event
        return

    if state["mode"] == "sequential":
        for cfg in sorted_agents:
            async for event in run_agent_and_update(cfg):
                yield event
        return

    if state["mode"] == "debate":
        max_rounds = state.get("max_debate_rounds", 3)
        for round_index in range(max_rounds):
            state["debate_round"] = round_index
            state["current_agent_index"] = 0
            for cfg in sorted_agents:
                async for event in run_agent_and_update(cfg):
                    yield event
        state["debate_round"] = max_rounds
        async for event in _stream_synthesizer_response(state):
            yield event
        return

    if state["mode"] == "vote":
        for cfg in sorted_agents:
            async for event in run_agent_and_update(cfg):
                yield event
        async for event in _stream_synthesizer_response(state):
            yield event
        return


async def build_graph(agent_configs: list, mode: str, max_rounds: int = 3):
    """Build and compile the LangGraph state graph for multi-agent orchestration."""
    from langgraph.graph import END, StateGraph

    sorted_agents = sorted(agent_configs, key=lambda a: a["sequence_order"])
    graph = StateGraph(ConversationState)

    if mode == "sequential":
        for cfg in sorted_agents:
            graph.add_node(f"agent_{cfg['id']}", make_agent_node(cfg))
        names = [f"agent_{a['id']}" for a in sorted_agents]
        graph.set_entry_point(names[0])
        for i in range(len(names) - 1):
            graph.add_edge(names[i], names[i + 1])
        graph.add_edge(names[-1], END)

    elif mode == "single":
        cfg = sorted_agents[0]
        graph.add_node(f"agent_{cfg['id']}", make_agent_node(cfg))
        graph.set_entry_point(f"agent_{cfg['id']}")
        graph.add_edge(f"agent_{cfg['id']}", END)

    elif mode == "debate":
        for cfg in sorted_agents:
            graph.add_node(f"agent_{cfg['id']}", make_agent_node(cfg))
        graph.add_node("round_counter", make_round_counter_node(len(sorted_agents)))
        graph.add_node("synthesizer", synthesizer_node)

        names = [f"agent_{a['id']}" for a in sorted_agents]
        graph.set_entry_point(names[0])
        for i in range(len(names) - 1):
            graph.add_edge(names[i], names[i + 1])
        graph.add_edge(names[-1], "round_counter")
        graph.add_conditional_edges(
            "round_counter",
            debate_should_continue,
            {"next_round": names[0], "synthesize": "synthesizer"},
        )
        graph.add_edge("synthesizer", END)

    elif mode == "vote":
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
