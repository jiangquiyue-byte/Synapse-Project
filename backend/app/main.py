import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.models.database import close_db, init_db
from app.routers import agents, auth, chat, export, memory, state, upload, workflows
from app.services.embedding_service import get_embedding_backend_label

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    try:
        yield
    finally:
        await close_db()


app = FastAPI(title="Synapse Backend", version="2.5.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(agents.router)
app.include_router(upload.router)
app.include_router(workflows.router)
app.include_router(memory.router)
app.include_router(state.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {
        "status": "alive",
        "app": "Synapse",
        "version": "2.5.0",
        "database": "postgresql+pgvector" if settings.DATABASE_URL.startswith(("postgres://", "postgresql://")) else "sqlite-dev",
        "tavily_enabled": bool(settings.TAVILY_API_KEY),
        "embedding_backend": get_embedding_backend_label(),
        "m5_production": True,
        "features": ["ai-hall-of-fame", "dual-currency-billing", "semantic-memory", "multi-agent", "knowledge-base"],
    }
