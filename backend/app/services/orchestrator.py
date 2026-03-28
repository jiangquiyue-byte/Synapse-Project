"""
LangGraph multi-mode orchestrator for Synapse.
Supports: sequential, debate, vote, single modes.
Real LLM API integration with SSE streaming.
Integrates web_search and rag_query tools for M4.
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


def make_agent_node(cfg: dict):
    """Factory that creates an async agent node function.
    This is the core function that calls real LLM APIs (OpenAI/Gemini/Claude)
    via LangChain and returns structured messages for SSE streaming.
    """

    async def agent_node(state):
        llm = create_llm(cfg)

        # In vote mode, agents should NOT see other agents' responses
        if state["mode"] == "vote":
            prev_msgs = ""
        else:
            prev_msgs = "\n".join(
                f"[{m['agent_name']}]: {m['content']}"
                for m in state["messages"] if m["role"] != "user"
            )

        mode_instruction = ""
        if state["mode"] == "debate":
            current_round = state.get("debate_round", 0)
            max_rounds = state.get("max_debate_rounds", 3)
            mode_instruction = (
                "\n这是一场自由辩论。你可以质疑、补充或反驳之前任何 Agent 的观点。"
                "请明确指出你同意或不同意谁的观点，并给出理由。"
                f"\n当前是第 {current_round + 1}/{max_rounds} 轮辩论。"
            )
        elif state["mode"] == "vote":
            mode_instruction = (
                "\n这是投票表决模式。请独立回答用户问题，不要参考其他 Agent 的回答。"
                "在回答末尾，用一句话总结你的核心立场。"
            )

        # Build tool instruction
        agent_tools = cfg.get("tools", [])
        tool_instruction = ""
        if agent_tools:
            tool_names = []
            if "web_search" in agent_tools:
                tool_names.append("联网搜索")
            if "rag_query" in agent_tools:
                tool_names.append("文档检索")
            if tool_names:
                tool_instruction = f"\n你拥有以下工具能力：{'、'.join(tool_names)}。如果需要，可以在回答中引用搜索结果或文档内容。"

        system_msg = f"""你是「{cfg['name']}」。{cfg['persona']}
{mode_instruction}
{tool_instruction}

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

        # Prepare tools and handle tool calls
        tools = _get_tools_for_agent(cfg)
        content = ""

        try:
            if tools:
                # Bind tools to LLM and handle potential tool calls
                llm_with_tools = llm.bind_tools(tools)
                response = await llm_with_tools.ainvoke(llm_messages)

                # Check if the LLM wants to call tools
                if hasattr(response, 'tool_calls') and response.tool_calls:
                    tool_results = []
                    for tool_call in response.tool_calls:
                        tool_name = tool_call.get("name", "")
                        tool_args = tool_call.get("args", {})

                        # Execute the tool
                        try:
                            if tool_name == "web_search_tool":
                                from app.services.web_search import web_search_tool
                                result = web_search_tool.invoke(tool_args)
                                tool_results.append(f"[联网搜索结果]\n{result}")
                            elif tool_name == "rag_query_tool":
                                from app.services.rag_pipeline import rag_query_tool
                                result = await rag_query_tool.ainvoke(tool_args)
                                tool_results.append(f"[文档检索结果]\n{result}")
                        except Exception as te:
                            tool_results.append(f"[工具调用失败: {str(te)}]")

                    # Re-invoke LLM with tool results
                    tool_context = "\n\n".join(tool_results)
                    enhanced_messages = [
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": f"{state['user_query']}\n\n以下是工具返回的参考信息：\n{tool_context}"}
                    ]
                    final_response = await llm.ainvoke(enhanced_messages)
                    content = final_response.content if hasattr(final_response, 'content') else str(final_response)
                else:
                    content = response.content if hasattr(response, 'content') else str(response)
            else:
                # No tools, direct invocation
                response = await llm.ainvoke(llm_messages)
                content = response.content if hasattr(response, 'content') else str(response)

        except Exception as e:
            # If tool binding fails, fall back to direct invocation
            try:
                response = await llm.ainvoke(llm_messages)
                content = response.content if hasattr(response, 'content') else str(response)
            except Exception as e2:
                content = f"[LLM 调用失败: {str(e2)}]"

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


def make_round_counter_node(num_agents: int):
    """Creates a node that increments the debate_round counter
    after all agents have spoken in the current round."""

    async def round_counter(state):
        return {
            "messages": [],
            "debate_round": state["debate_round"] + 1,
            "current_agent_index": 0,
        }

    return round_counter


def debate_should_continue(state):
    """Decide whether to continue the debate or synthesize."""
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
    base_url = os.environ.get("OPENAI_BASE_URL", None)
    synth_kwargs = dict(
        model="gpt-4.1-mini",
        api_key=api_key,
        temperature=0.3,
    )
    if base_url:
        synth_kwargs["base_url"] = base_url
    synth_llm = ChatOpenAI(**synth_kwargs)

    synthesis_prompt = ""
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
    elif state["mode"] == "vote":
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
        response = await synth_llm.ainvoke([{
            "role": "system",
            "content": synthesis_prompt
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
        # Fixed: Added round_counter node to properly increment debate_round
        for cfg in sorted_agents:
            graph.add_node(f"agent_{cfg['id']}", make_agent_node(cfg))
        graph.add_node("round_counter", make_round_counter_node(len(sorted_agents)))
        graph.add_node("synthesizer", synthesizer_node)

        names = [f"agent_{a['id']}" for a in sorted_agents]
        graph.set_entry_point(names[0])

        # Chain agents sequentially within a round
        for i in range(len(names) - 1):
            graph.add_edge(names[i], names[i + 1])

        # Last agent -> round_counter (increments debate_round)
        graph.add_edge(names[-1], "round_counter")

        # round_counter decides: continue debate or synthesize
        graph.add_conditional_edges(
            "round_counter",
            debate_should_continue,
            {"next_round": names[0], "synthesize": "synthesizer"}
        )
        graph.add_edge("synthesizer", END)

    elif mode == "vote":
        # Vote: A1 -> A2 -> A3 -> Synthesizer -> END
        # Each agent answers independently (prev_msgs hidden in vote mode)
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
