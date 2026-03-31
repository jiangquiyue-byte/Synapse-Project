"""
单用户 JWT 认证模块
- 只允许一个管理员账户（通过环境变量配置）
- 提供 /api/auth/login 接口获取 JWT Token
- 提供 get_current_user 依赖项用于保护 API 路由
"""
import os
import time
import hmac
import hashlib
import base64
import json
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ── 配置 ──────────────────────────────────────────────────────────────────────
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "synapse2025")
JWT_SECRET = os.getenv("JWT_SECRET", "synapse-jwt-secret-key-2025-change-in-prod")
TOKEN_EXPIRE_SECONDS = 60 * 60 * 24 * 30  # 30 天有效期

security = HTTPBearer(auto_error=False)


# ── 简单 JWT 实现（不依赖 python-jose）────────────────────────────────────────
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def create_access_token(username: str) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url_encode(json.dumps({
        "sub": username,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRE_SECONDS,
    }).encode())
    signing_input = f"{header}.{payload}"
    sig = hmac.new(
        JWT_SECRET.encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_b64url_encode(sig)}"


def verify_token(token: str) -> Optional[str]:
    """验证 JWT Token，返回 username 或 None（无效时）。"""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(
            JWT_SECRET.encode(),
            signing_input.encode(),
            hashlib.sha256,
        ).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload.get("sub")
    except Exception:
        return None


def verify_password(plain: str) -> bool:
    return plain == ADMIN_PASSWORD


# ── FastAPI 依赖项 ─────────────────────────────────────────────────────────────
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> str:
    """
    FastAPI 依赖项：验证 Bearer Token，返回用户名。
    如果 ADMIN_PASSWORD 为空（未配置），则跳过认证（开发模式）。
    """
    # 如果未配置密码，跳过认证（向后兼容）
    if not ADMIN_PASSWORD or ADMIN_PASSWORD == "":
        return ADMIN_USERNAME

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证 Token，请先登录",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 无效或已过期，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username
