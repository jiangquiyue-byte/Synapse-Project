from __future__ import annotations

import hashlib
import logging
import math
import re
from typing import Any, Iterable, Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
_embedding_client: Optional["ResilientEmbeddings"] = None


def _tokenize(text: str) -> list[str]:
    normalized = (text or "").strip().lower()
    if not normalized:
        return []

    tokens: list[str] = []
    ascii_words = re.findall(r"[a-z0-9_]+", normalized)
    tokens.extend(ascii_words)

    for word in ascii_words:
        if len(word) <= 3:
            continue
        for size in (3, 4):
            if len(word) < size:
                continue
            tokens.extend(word[i:i + size] for i in range(len(word) - size + 1))

    for block in re.findall(r"[\u4e00-\u9fff]+", normalized):
        tokens.append(block)
        if len(block) == 1:
            continue
        for size in (2, 3):
            if len(block) < size:
                continue
            tokens.extend(block[i:i + size] for i in range(len(block) - size + 1))

    unique_tokens: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        token = token.strip()
        if not token or token in seen:
            continue
        seen.add(token)
        unique_tokens.append(token)
    return unique_tokens


def _stable_index(token: str, seed: int, dimension: int) -> int:
    digest = hashlib.blake2b(f"{seed}:{token}".encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, "big") % dimension


def _stable_sign(token: str, seed: int) -> float:
    digest = hashlib.blake2b(f"sign:{seed}:{token}".encode("utf-8"), digest_size=1).digest()
    return 1.0 if digest[0] % 2 else -1.0


def _local_hash_embedding(text: str, dimension: Optional[int] = None) -> list[float]:
    dim = dimension or settings.PGVECTOR_DIMENSION
    vector = [0.0] * dim
    normalized = (text or "").strip()
    if not normalized:
        return vector

    tokens = _tokenize(normalized)
    if not tokens:
        tokens = [normalized.lower()]

    weighted_tokens: list[tuple[str, float]] = [(normalized.lower(), 3.0)]
    weighted_tokens.extend((token, 1.0 + min(len(token), 12) / 12.0) for token in tokens)

    for token, weight in weighted_tokens:
        for seed in range(4):
            idx = _stable_index(token, seed, dim)
            vector[idx] += _stable_sign(token, seed) * weight

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        vector[0] = 1.0
        return vector
    return [value / norm for value in vector]


class ResilientEmbeddings:
    def __init__(self):
        self._remote = None
        self._remote_disabled = False
        self._backend_label = "local-hash-fallback"

    def _get_remote(self):
        if self._remote_disabled:
            return None
        if self._remote is not None:
            return self._remote
        if not settings.OPENAI_API_KEY:
            self._remote_disabled = True
            return None

        try:
            from langchain_openai import OpenAIEmbeddings

            kwargs: dict[str, Any] = {}
            if settings.OPENAI_API_KEY:
                kwargs["api_key"] = settings.OPENAI_API_KEY
            if settings.OPENAI_BASE_URL:
                kwargs["base_url"] = settings.OPENAI_BASE_URL
            self._remote = OpenAIEmbeddings(model=settings.EMBEDDING_MODEL, **kwargs)
            self._backend_label = "openai-compatible"
            return self._remote
        except Exception as exc:
            logger.warning("Embedding client init failed, falling back to local hashed vectors: %s", exc)
            self._remote_disabled = True
            self._backend_label = "local-hash-fallback"
            return None

    def _disable_remote(self, exc: Exception) -> None:
        logger.warning("Remote embeddings unavailable, using local hashed vectors instead: %s", exc)
        self._remote_disabled = True
        self._remote = None
        self._backend_label = "local-hash-fallback"

    async def aembed_query(self, text: str) -> list[float]:
        remote = self._get_remote()
        if remote is not None:
            try:
                return await remote.aembed_query(text)
            except Exception as exc:
                self._disable_remote(exc)
        return _local_hash_embedding(text)

    async def aembed_documents(self, texts: Iterable[str]) -> list[list[float]]:
        text_list = list(texts)
        remote = self._get_remote()
        if remote is not None:
            try:
                return await remote.aembed_documents(text_list)
            except Exception as exc:
                self._disable_remote(exc)
        return [_local_hash_embedding(text) for text in text_list]

    @property
    def backend_label(self) -> str:
        if self._remote is not None and not self._remote_disabled:
            return self._backend_label
        if settings.OPENAI_API_KEY and not self._remote_disabled:
            return "openai-compatible-with-fallback"
        return self._backend_label


def get_embeddings() -> ResilientEmbeddings:
    global _embedding_client
    if _embedding_client is None:
        _embedding_client = ResilientEmbeddings()
    return _embedding_client


def get_embedding_backend_label() -> str:
    return get_embeddings().backend_label
