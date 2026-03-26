"""Synapse Backend - FastAPI Main Entry."""
from fastapi import FastAPI
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

app.include_router(chat.router)
app.include_router(agents.router)
app.include_router(upload.router)
app.include_router(workflows.router)
app.include_router(memory.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {"status": "alive", "app": "Synapse", "version": "2.0.0"}
