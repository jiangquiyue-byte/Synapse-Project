"""
认证路由：提供登录接口
POST /api/auth/login  → 返回 JWT Token
GET  /api/auth/me     → 返回当前用户信息（需要 Token）
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.core.auth import (
    ADMIN_USERNAME,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    expires_in: int = 60 * 60 * 24 * 30  # 30 天


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """单用户登录接口，返回 JWT Token（有效期 30 天）。"""
    if req.username != ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    if not verify_password(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    token = create_access_token(req.username)
    return LoginResponse(
        access_token=token,
        username=req.username,
    )


@router.get("/me")
async def get_me(current_user: str = Depends(get_current_user)):
    """获取当前登录用户信息。"""
    return {
        "username": current_user,
        "is_admin": True,
    }


@router.post("/verify")
async def verify_token_endpoint(current_user: str = Depends(get_current_user)):
    """验证 Token 是否有效（用于 App 启动时静默验证）。"""
    return {"valid": True, "username": current_user}
