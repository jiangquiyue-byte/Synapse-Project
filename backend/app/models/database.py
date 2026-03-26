"""
In-memory storage for development phase.
Will be replaced with PostgreSQL + pgvector in production.
"""
from typing import Dict, List, Optional
from app.models.schemas import AgentConfig, ChatMessage, WorkflowTemplate, PromptTemplate
import json

# In-memory stores
_agents: Dict[str, dict] = {}
_messages: Dict[str, List[dict]] = {}  # session_id -> messages
_workflows: Dict[str, dict] = {}
_prompt_templates: Dict[str, dict] = {}

# Built-in prompt templates
BUILTIN_PROMPTS = [
    {
        "id": "builtin-legal",
        "name": "法律顾问",
        "category": "法律",
        "persona": "你是一位资深法律顾问，擅长合同审查、合规分析和法律风险评估。请用严谨的法律语言回答问题。",
        "recommended_model": "gpt-4o",
        "recommended_tools": ["web_search"],
    },
    {
        "id": "builtin-coder",
        "name": "代码审查员",
        "category": "技术",
        "persona": "你是一位资深软件工程师，擅长代码审查、架构设计和性能优化。请给出具体的代码建议。",
        "recommended_model": "gpt-4o-mini",
        "recommended_tools": ["rag_query"],
    },
    {
        "id": "builtin-copywriter",
        "name": "文案策划",
        "category": "营销",
        "persona": "你是一位创意文案专家，擅长市场营销、品牌传播和内容创作。请用生动有力的文字回答。",
        "recommended_model": "gpt-4o",
        "recommended_tools": ["web_search"],
    },
    {
        "id": "builtin-analyst",
        "name": "数据分析师",
        "category": "数据",
        "persona": "你是一位资深数据分析师，擅长数据解读、统计分析和可视化建议。请用数据驱动的方式回答。",
        "recommended_model": "gpt-4o",
        "recommended_tools": ["rag_query"],
    },
    {
        "id": "builtin-researcher",
        "name": "学术研究员",
        "category": "学术",
        "persona": "你是一位学术研究员，擅长文献检索、论文分析和研究方法论。请用学术严谨的方式回答。",
        "recommended_model": "gpt-4o",
        "recommended_tools": ["web_search", "rag_query"],
    },
]


# Initialize built-in prompts
for p in BUILTIN_PROMPTS:
    _prompt_templates[p["id"]] = p


# Agent CRUD
def get_all_agents() -> List[dict]:
    return list(_agents.values())


def get_agent(agent_id: str) -> Optional[dict]:
    return _agents.get(agent_id)


def save_agent(agent: dict) -> dict:
    _agents[agent["id"]] = agent
    return agent


def delete_agent_by_id(agent_id: str) -> bool:
    if agent_id in _agents:
        del _agents[agent_id]
        return True
    return False


def reorder_agents(order: list) -> list:
    for item in order:
        if item["id"] in _agents:
            _agents[item["id"]]["sequence_order"] = item["sequence_order"]
    return get_all_agents()


# Messages
def get_session_messages(session_id: str) -> List[dict]:
    return _messages.get(session_id, [])


def add_session_message(session_id: str, message: dict):
    if session_id not in _messages:
        _messages[session_id] = []
    _messages[session_id].append(message)


def get_messages_until(session_id: str, message_id: str) -> List[dict]:
    msgs = _messages.get(session_id, [])
    result = []
    for m in msgs:
        result.append(m)
        if m.get("id") == message_id:
            break
    return result


# Workflows
def get_all_workflows() -> List[dict]:
    return list(_workflows.values())


def save_workflow(workflow: dict) -> dict:
    _workflows[workflow["id"]] = workflow
    return workflow


def delete_workflow_by_id(wf_id: str) -> bool:
    if wf_id in _workflows:
        del _workflows[wf_id]
        return True
    return False


# Prompt templates
def get_all_prompt_templates() -> List[dict]:
    return list(_prompt_templates.values())


def save_prompt_template(template: dict) -> dict:
    _prompt_templates[template["id"]] = template
    return template
