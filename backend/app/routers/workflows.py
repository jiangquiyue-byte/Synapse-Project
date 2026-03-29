from fastapi import APIRouter, HTTPException

from app.models.database import (
    delete_workflow_by_id,
    get_all_prompt_templates,
    get_all_workflows,
    get_workflow,
    save_prompt_template,
    save_workflow,
)
from app.models.schemas import PromptTemplate, WorkflowTemplate

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("/templates")
async def list_templates():
    return {"templates": await get_all_workflows()}


@router.post("/templates")
async def create_template(template: WorkflowTemplate):
    saved = await save_workflow(template.model_dump())
    return {"template": saved}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    if not await delete_workflow_by_id(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "deleted"}


@router.post("/templates/{template_id}/apply")
async def apply_template(template_id: str):
    tpl = await get_workflow(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"template": tpl}


@router.get("/prompts")
async def list_prompt_templates():
    return {"prompts": await get_all_prompt_templates()}


@router.post("/prompts")
async def create_prompt_template(template: PromptTemplate):
    saved = await save_prompt_template(template.model_dump())
    return {"prompt": saved}
