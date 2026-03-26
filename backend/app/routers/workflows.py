"""Workflow and prompt template router."""
from fastapi import APIRouter, HTTPException
from app.models.schemas import WorkflowTemplate, PromptTemplate
from app.models.database import (
    get_all_workflows, save_workflow, delete_workflow_by_id,
    get_all_prompt_templates, save_prompt_template
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("/templates")
async def list_templates():
    return {"templates": get_all_workflows()}


@router.post("/templates")
async def create_template(template: WorkflowTemplate):
    saved = save_workflow(template.model_dump())
    return {"template": saved}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    if not delete_workflow_by_id(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "deleted"}


@router.post("/templates/{template_id}/apply")
async def apply_template(template_id: str):
    from app.models.database import _workflows
    tpl = _workflows.get(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"template": tpl}


@router.get("/prompts")
async def list_prompt_templates():
    return {"prompts": get_all_prompt_templates()}


@router.post("/prompts")
async def create_prompt_template(template: PromptTemplate):
    saved = save_prompt_template(template.model_dump())
    return {"prompt": saved}
