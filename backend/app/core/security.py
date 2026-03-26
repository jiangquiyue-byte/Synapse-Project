from cryptography.fernet import Fernet
from app.core.config import get_settings

_fernet = None


def get_fernet():
    global _fernet
    if _fernet is None:
        settings = get_settings()
        key = settings.ENCRYPTION_KEY
        if key == "placeholder-key":
            key = Fernet.generate_key().decode()
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_api_key(plain_key: str) -> str:
    return get_fernet().encrypt(plain_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    return get_fernet().decrypt(encrypted_key.encode()).decode()
