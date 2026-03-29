from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import re
from typing import Any, Iterable, Optional
from urllib import error as urllib_error
from urllib import request as urllib_request

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


def _l2_normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        if not vector:
            return []
        vector[0] = 1.0
        return vector
    return [value / norm for value in vector]


def _normalize_vector(vector: Iterable[float], dimension: Optional[int] = None) -> list[float]:
    target_dim = int(dimension or settings.PGVECTOR_DIMENSION or 384)
    normalized = [float(value) for value in vector]
    if len(normalized) < target_dim:
        normalized.extend([0.0] * (target_dim - len(normalized)))
    elif len(normalized) > target_dim:
        normalized = normalized[:target_dim]
    return _l2_normalize(normalized)


def _local_hash_embedding(text: str, dimension: Optional[int] = None) -> list[float]:
    dim = int(dimension or settings.PGVECTOR_DIMENSION or 384)
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

    return _l2_normalize(vector)


def _is_numeric_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, (int, float)) for item in value)


def _mean_pool(vectors: list[list[float]]) -> list[float]:
    valid = [vector for vector in vectors if vector]
    if not valid:
        return []
    width = min(len(vector) for vector in valid)
    if width <= 0:
        return []
    pooled = [0.0] * width
    for vector in valid:
        for index in range(width):
            pooled[index] += float(vector[index])
    return [value / len(valid) for value in pooled]


def _collapse_single_embedding_response(payload: Any) -> list[float]:
    if _is_numeric_list(payload):
        return [float(item) for item in payload]

    if isinstance(payload, list):
        numeric_children = [
            [float(item) for item in child]
            for child in payload
            if _is_numeric_list(child)
        ]
        if numeric_children:
            if len(numeric_children) == 1:
                return numeric_children[0]
            return _mean_pool(numeric_children)

        nested_vectors = [
            _collapse_single_embedding_response(child)
            for child in payload
            if isinstance(child, list)
        ]
        nested_vectors = [vector for vector in nested_vectors if vector]
        if nested_vectors:
            if len(nested_vectors) == 1:
                return nested_vectors[0]
            return _mean_pool(nested_vectors)

    raise ValueError("Hugging Face 返回了无法识别的嵌入结果结构")


class HFInferenceBackend:
    def __init__(self):
        self.model_name = (
            getattr(settings, "HF_EMBEDDING_MODEL", "")
            or getattr(settings, "EMBEDDING_MODEL", "")
            or "sentence-transformers/all-MiniLM-L6-v2"
        )
        self.api_key = (getattr(settings, "HF_TOKEN", "") or "").strip()
        if not self.api_key:
            raise ValueError("HF_TOKEN 未配置，无法使用 Hugging Face 远程推理")
        self.endpoint = (
            "https://router.huggingface.co/hf-inference/models/"
            f"{self.model_name}/pipeline/feature-extraction"
        )

    def _post_json(self, payload: dict[str, Any]) -> Any:
        body = json.dumps(payload).encode("utf-8")
        request = urllib_request.Request(
            self.endpoint,
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib_request.urlopen(request, timeout=45) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw)
        except urllib_error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")[:400]
            raise RuntimeError(f"HF inference HTTP {exc.code}: {detail}") from exc
        except urllib_error.URLError as exc:
            raise RuntimeError(f"HF inference 请求失败: {exc.reason}") from exc

    def embed_query_sync(self, text: str) -> list[float]:
        payload = {
            "inputs": text,
            "normalize": False,
            "truncate": True,
            "truncation_direction": "right",
        }
        response = self._post_json(payload)
        return _normalize_vector(_collapse_single_embedding_response(response))

    def embed_documents_sync(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query_sync(text) for text in texts]


class LocalFastEmbedBackend:
    def __init__(self):
        from fastembed import TextEmbedding

        self.model_name = (
            getattr(settings, "LOCAL_EMBEDDING_MODEL", "")
            or getattr(settings, "HF_EMBEDDING_MODEL", "")
            or "sentence-transformers/all-MiniLM-L6-v2"
        )
        self._model = TextEmbedding(model_name=self.model_name)

    def embed_query_sync(self, text: str) -> list[float]:
        vector = next(self._model.embed([text]))
        vector_list = vector.tolist() if hasattr(vector, "tolist") else list(vector)
        return _normalize_vector(vector_list)

    def embed_documents_sync(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors: list[list[float]] = []
        for vector in self._model.embed(texts):
            vector_list = vector.tolist() if hasattr(vector, "tolist") else list(vector)
            vectors.append(_normalize_vector(vector_list))
        return vectors


class ResilientEmbeddings:
    def __init__(self):
        self._hf_remote: Optional[HFInferenceBackend] = None
        self._openai_remote = None
        self._local: Optional[LocalFastEmbedBackend] = None
        self._hf_remote_disabled = False
        self._openai_remote_disabled = False
        self._local_disabled = False
        self._preferred_backend = str(getattr(settings, "EMBEDDING_BACKEND", "huggingface") or "huggingface").lower()
        self._backend_label = "local-hash-fallback"

    def _prefer_local_only(self) -> bool:
        return self._preferred_backend in {"fastembed", "hf-local", "local"}

    def _prefer_hf_remote(self) -> bool:
        return self._preferred_backend in {"auto", "huggingface", "hf", "hf-remote"}

    def _prefer_openai_remote(self) -> bool:
        return self._preferred_backend in {"openai", "openai-compatible"}

    def _get_hf_remote(self) -> Optional[HFInferenceBackend]:
        if self._prefer_local_only() or self._prefer_openai_remote():
            self._hf_remote_disabled = True
            return None
        if self._hf_remote_disabled:
            return None
        if self._hf_remote is not None:
            return self._hf_remote
        if not getattr(settings, "HF_TOKEN", ""):
            self._hf_remote_disabled = True
            return None

        try:
            self._hf_remote = HFInferenceBackend()
            self._backend_label = f"hf-remote:{self._hf_remote.model_name}"
            return self._hf_remote
        except Exception as exc:
            logger.warning("Hugging Face remote embeddings unavailable, switching to local semantic vectors: %s", exc)
            self._hf_remote_disabled = True
            return None

    def _get_openai_remote(self):
        if not self._prefer_openai_remote():
            self._openai_remote_disabled = True
            return None
        if self._openai_remote_disabled:
            return None
        if self._openai_remote is not None:
            return self._openai_remote
        if not settings.OPENAI_API_KEY:
            self._openai_remote_disabled = True
            return None

        try:
            from langchain_openai import OpenAIEmbeddings

            kwargs: dict[str, Any] = {"api_key": settings.OPENAI_API_KEY}
            if settings.OPENAI_BASE_URL:
                kwargs["base_url"] = settings.OPENAI_BASE_URL
            self._openai_remote = OpenAIEmbeddings(model=settings.EMBEDDING_MODEL, **kwargs)
            self._backend_label = f"openai-compatible:{settings.EMBEDDING_MODEL}"
            return self._openai_remote
        except Exception as exc:
            logger.warning("OpenAI-compatible embeddings init failed, switching to local semantic vectors: %s", exc)
            self._openai_remote_disabled = True
            return None

    def _get_local(self) -> Optional[LocalFastEmbedBackend]:
        if self._local_disabled:
            return None
        if self._local is not None:
            return self._local

        try:
            self._local = LocalFastEmbedBackend()
            self._backend_label = f"hf-local-fastembed:{self._local.model_name}"
            return self._local
        except Exception as exc:
            logger.warning("Local semantic embedding init failed, falling back to hash vectors: %s", exc)
            self._local_disabled = True
            return None

    def _disable_hf_remote(self, exc: Exception) -> None:
        logger.warning("Hugging Face remote embeddings unavailable, switching to local semantic vectors: %s", exc)
        self._hf_remote_disabled = True
        self._hf_remote = None

    def _disable_openai_remote(self, exc: Exception) -> None:
        logger.warning("OpenAI-compatible embeddings unavailable, switching to local semantic vectors: %s", exc)
        self._openai_remote_disabled = True
        self._openai_remote = None

    def _disable_local(self, exc: Exception) -> None:
        logger.warning("Local semantic embeddings unavailable, using local hashed vectors instead: %s", exc)
        self._local_disabled = True
        self._local = None
        self._backend_label = "local-hash-fallback"

    async def aembed_query(self, text: str) -> list[float]:
        if self._prefer_openai_remote():
            openai_remote = self._get_openai_remote()
            if openai_remote is not None:
                try:
                    vector = await openai_remote.aembed_query(text)
                    return _normalize_vector(vector)
                except Exception as exc:
                    self._disable_openai_remote(exc)
        else:
            hf_remote = self._get_hf_remote()
            if hf_remote is not None:
                try:
                    return await asyncio.to_thread(hf_remote.embed_query_sync, text)
                except Exception as exc:
                    self._disable_hf_remote(exc)

        local_backend = self._get_local()
        if local_backend is not None:
            try:
                return await asyncio.to_thread(local_backend.embed_query_sync, text)
            except Exception as exc:
                self._disable_local(exc)

        return _local_hash_embedding(text)

    async def aembed_documents(self, texts: Iterable[str]) -> list[list[float]]:
        text_list = list(texts)
        if not text_list:
            return []

        if self._prefer_openai_remote():
            openai_remote = self._get_openai_remote()
            if openai_remote is not None:
                try:
                    vectors = await openai_remote.aembed_documents(text_list)
                    return [_normalize_vector(vector) for vector in vectors]
                except Exception as exc:
                    self._disable_openai_remote(exc)
        else:
            hf_remote = self._get_hf_remote()
            if hf_remote is not None:
                try:
                    return await asyncio.to_thread(hf_remote.embed_documents_sync, text_list)
                except Exception as exc:
                    self._disable_hf_remote(exc)

        local_backend = self._get_local()
        if local_backend is not None:
            try:
                return await asyncio.to_thread(local_backend.embed_documents_sync, text_list)
            except Exception as exc:
                self._disable_local(exc)

        return [_local_hash_embedding(text) for text in text_list]

    @property
    def backend_label(self) -> str:
        if self._hf_remote is not None and not self._hf_remote_disabled:
            return self._backend_label
        if self._openai_remote is not None and not self._openai_remote_disabled:
            return self._backend_label
        if self._local is not None and not self._local_disabled:
            return self._backend_label

        if self._prefer_openai_remote() and settings.OPENAI_API_KEY and not self._openai_remote_disabled:
            return f"openai-compatible:{settings.EMBEDDING_MODEL}"
        if self._prefer_hf_remote() and getattr(settings, "HF_TOKEN", "") and not self._hf_remote_disabled:
            model_name = getattr(settings, "HF_EMBEDDING_MODEL", "") or "sentence-transformers/all-MiniLM-L6-v2"
            return f"hf-remote:{model_name}"
        if not self._local_disabled:
            model_name = (
                getattr(settings, "LOCAL_EMBEDDING_MODEL", "")
                or getattr(settings, "HF_EMBEDDING_MODEL", "")
                or "sentence-transformers/all-MiniLM-L6-v2"
            )
            return f"hf-local-fastembed:{model_name}"
        return self._backend_label


def get_embeddings() -> ResilientEmbeddings:
    global _embedding_client
    if _embedding_client is None:
        _embedding_client = ResilientEmbeddings()
    return _embedding_client


def get_embedding_backend_label() -> str:
    return get_embeddings().backend_label
