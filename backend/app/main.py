"""Synapse Backend - FastAPI Main Entry."""
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, agents, upload, workflows, memory, export
from app.core.config import get_settings

app = FastAPI(title="Synapse Backend", version="2.0.0")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global exception handlers to always return valid JSON ───

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return a clean JSON error."""
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": f"服务器内部错误: {str(exc)}",
            "detail": str(type(exc).__name__),
        },
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"status": "error", "message": "接口不存在"},
    )


@app.exception_handler(422)
async def validation_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "message": "请求参数验证失败",
            "detail": str(exc),
        },
    )


app.include_router(chat.router)
app.include_router(agents.router)
app.include_router(upload.router)
app.include_router(workflows.router)
app.include_router(memory.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {"status": "alive", "app": "Synapse", "version": "2.1.0"}
