from app.core.auth import get_current_user
from fastapi import Depends
from uuid import uuid4

from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.database import (
    delete_workflow_by_id,
    ensure_session,
    get_all_prompt_templates,
    get_all_workflows,
    get_workflow,
    save_prompt_template,
    save_workflow,
)
from app.models.schemas import PromptTemplate, WorkflowTemplate

router = APIRouter(prefix="/api/workflows", tags=["workflows"], dependencies=[Depends(get_current_user)])


def _official_templates() -> list[dict]:
    return [
        {
            "id": "official_deep_research",
            "name": "深度研报",
            "description": "联动联网搜索能力，自动组织研究总监、行业分析师与数据质检官，生成结构化行业分析、竞争格局与关键风险研判。",
            "mode": "sequential",
            "max_debate_rounds": 2,
            "agent_configs": [
                {
                    "id": "wf_research_lead",
                    "name": "研究总监",
                    "persona": "你负责把用户问题拆成清晰的研究任务，先给出分析框架，再组织其余成员补齐行业事实、竞争格局、风险与结论，最终输出结构化研报。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 0,
                    "tools": ["web_search"],
                    "temperature": 0.25,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
                {
                    "id": "wf_industry_analyst",
                    "name": "行业分析师",
                    "persona": "你专注于行业规模、增长驱动、主要玩家、商业模式与竞争格局分析。联网搜索时优先引用可信来源，并给出可以直接写入报告的洞察。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 1,
                    "tools": ["web_search"],
                    "temperature": 0.35,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
                {
                    "id": "wf_research_qa",
                    "name": "数据质检官",
                    "persona": "你负责检查论据是否充分、数据是否自洽、引用是否可信，并补充关键风险、反例与不确定性声明，避免报告空泛。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 2,
                    "tools": ["web_search"],
                    "temperature": 0.15,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
            ],
        },
        {
            "id": "official_expert_roundtable",
            "name": "多专家圆桌",
            "description": "一键组建技术、产品、设计三位专家，就同一方案进行多视角评审，适合功能规划、需求争议和方案打磨。",
            "mode": "debate",
            "max_debate_rounds": 2,
            "agent_configs": [
                {
                    "id": "wf_tech_reviewer",
                    "name": "技术负责人",
                    "persona": "你从架构复杂度、实现风险、性能、稳定性与工程成本角度审视方案，优先指出技术上的关键约束与替代实现路径。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 0,
                    "tools": [],
                    "temperature": 0.35,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
                {
                    "id": "wf_product_reviewer",
                    "name": "产品负责人",
                    "persona": "你从用户价值、需求优先级、业务目标、边界条件与上线策略角度评审方案，聚焦是否值得做、该先做什么、如何验证。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 1,
                    "tools": [],
                    "temperature": 0.45,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
                {
                    "id": "wf_design_reviewer",
                    "name": "设计负责人",
                    "persona": "你从信息架构、交互路径、视觉一致性、易用性与无障碍角度评审方案，强调用户理解成本与关键体验断点。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 2,
                    "tools": [],
                    "temperature": 0.4,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
            ],
        },
        {
            "id": "official_code_audit",
            "name": "代码审计",
            "description": "专注于安全漏洞扫描、逻辑缺陷分析与重构建议，适合对关键代码、接口实现和上线前变更做快速审查。",
            "mode": "sequential",
            "max_debate_rounds": 2,
            "agent_configs": [
                {
                    "id": "wf_security_auditor",
                    "name": "安全审计官",
                    "persona": "你优先发现注入、鉴权、敏感信息泄露、权限绕过、不安全依赖与输入校验缺失等安全问题，并按风险等级给出修复建议。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 0,
                    "tools": [],
                    "temperature": 0.15,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
                {
                    "id": "wf_refactor_architect",
                    "name": "重构顾问",
                    "persona": "你负责识别代码中的结构性问题、重复逻辑、边界处理缺失与可维护性风险，并给出分阶段重构建议。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 1,
                    "tools": [],
                    "temperature": 0.25,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
                {
                    "id": "wf_test_designer",
                    "name": "测试设计师",
                    "persona": "你为审计结果补充测试策略，设计回归测试、边界条件与失败场景，帮助用户验证修复是否真正生效。",
                    "provider": "custom_openai",
                    "model": "deepseek-chat",
                    "api_key_encrypted": "",
                    "sequence_order": 2,
                    "tools": [],
                    "temperature": 0.2,
                    "supports_vision": False,
                    "custom_base_url": "",
                },
            ],
        },
    ]


OFFICIAL_TEMPLATE_HINTS = {
    "official_deep_research": {
        "recommended_opening_message": "请基于最新公开信息，生成一份结构化行业分析，至少覆盖市场规模、竞争格局、增长驱动、风险与结论。",
        "success_message": "已创建“深度研报”工作流会话，研究 Agent 群组已经就位。",
    },
    "official_expert_roundtable": {
        "recommended_opening_message": "请围绕我的方案，从技术、产品、设计三个维度展开多轮评审，并在最后给出统一结论与下一步建议。",
        "success_message": "已创建“多专家圆桌”会话，三位专家已经配置完成。",
    },
    "official_code_audit": {
        "recommended_opening_message": "请对我提供的代码进行安全审计与逻辑重构建议，优先列出高风险问题、触发条件与修复方案。",
        "success_message": "已创建“代码审计”会话，审计 Agent 群组已经配置完成。",
    },
}


async def _ensure_official_templates() -> None:
    for template in _official_templates():
        await save_workflow(template)


@router.get("/templates")
async def list_templates():
    await _ensure_official_templates()
    return {"templates": await get_all_workflows()}


@router.post("/templates")
async def create_template(template: WorkflowTemplate):
    saved = await save_workflow(template.model_dump())
    return {"template": saved}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    if template_id.startswith("official_"):
        raise HTTPException(status_code=403, detail="Official templates cannot be deleted")
    if not await delete_workflow_by_id(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "deleted"}


@router.post("/templates/{template_id}/apply")
async def apply_template(template_id: str):
    await _ensure_official_templates()
    tpl = await get_workflow(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    session_id = f"wf_{template_id}_{uuid4().hex[:8]}"
    session = await ensure_session(session_id, tpl.get("name") or "工作流会话")
    hints = OFFICIAL_TEMPLATE_HINTS.get(template_id, {})

    return {
        "status": "ok",
        "template": tpl,
        "applied": {
            "session": session,
            "session_id": session["id"],
            "session_title": session.get("title") or tpl.get("name") or "工作流会话",
            "agent_configs": tpl.get("agent_configs", []),
            "discussion_mode": tpl.get("mode", "sequential"),
            "max_debate_rounds": tpl.get("max_debate_rounds", 3),
            "recommended_opening_message": hints.get("recommended_opening_message", "请基于该工作流模板继续执行。"),
            "success_message": hints.get("success_message", "工作流模板已套用。"),
        },
    }


@router.get("/prompts")
async def list_prompt_templates():
    return {"prompts": await get_all_prompt_templates()}


@router.post("/prompts")
async def create_prompt_template(template: PromptTemplate):
    saved = await save_prompt_template(template.model_dump())
    return {"prompt": saved}
