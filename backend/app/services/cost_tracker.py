"""精准双币计费引擎 — Synapse M5"""
from __future__ import annotations
import re

USD_TO_CNY = 7.25

PRICING = {
    "gpt-4o": {"input": 2.50, "output": 10.00, "ratio": 4.0, "provider": "openai", "display": "GPT-4o"},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60, "ratio": 4.0, "provider": "openai", "display": "GPT-4o-mini"},
    "gpt-4.1": {"input": 2.00, "output": 8.00, "ratio": 4.0, "provider": "openai", "display": "GPT-4.1"},
    "gpt-4.1-mini": {"input": 0.40, "output": 1.60, "ratio": 4.0, "provider": "openai", "display": "GPT-4.1-mini"},
    "gpt-4.1-nano": {"input": 0.10, "output": 0.40, "ratio": 4.0, "provider": "openai", "display": "GPT-4.1-nano"},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00, "ratio": 3.0, "provider": "openai", "display": "GPT-4-Turbo"},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50, "ratio": 3.0, "provider": "openai", "display": "GPT-3.5-Turbo"},
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00, "ratio": 5.0, "provider": "anthropic", "display": "Claude 3.5 Sonnet"},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00, "ratio": 5.0, "provider": "anthropic", "display": "Claude 3.5 Haiku"},
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00, "ratio": 5.0, "provider": "anthropic", "display": "Claude Sonnet 4"},
    "claude-3-opus-20240229": {"input": 15.00, "output": 75.00, "ratio": 5.0, "provider": "anthropic", "display": "Claude 3 Opus"},
    "claude-haiku-4": {"input": 0.80, "output": 4.00, "ratio": 5.0, "provider": "anthropic", "display": "Claude Haiku 4"},
    "gemini-2.5-pro": {"input": 1.25, "output": 5.00, "ratio": 4.0, "provider": "google", "display": "Gemini 2.5 Pro"},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60, "ratio": 4.0, "provider": "google", "display": "Gemini 2.5 Flash"},
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40, "ratio": 4.0, "provider": "google", "display": "Gemini 2.0 Flash"},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00, "ratio": 4.0, "provider": "google", "display": "Gemini 1.5 Pro"},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30, "ratio": 4.0, "provider": "google", "display": "Gemini 1.5 Flash"},
    "deepseek-chat": {"input": 0.27, "output": 1.10, "ratio": 4.07, "provider": "deepseek", "display": "DeepSeek-V3"},
    "deepseek-v3": {"input": 0.27, "output": 1.10, "ratio": 4.07, "provider": "deepseek", "display": "DeepSeek-V3"},
    "deepseek-reasoner": {"input": 0.55, "output": 2.19, "ratio": 3.98, "provider": "deepseek", "display": "DeepSeek-R1"},
    "deepseek-r1": {"input": 0.55, "output": 2.19, "ratio": 3.98, "provider": "deepseek", "display": "DeepSeek-R1"},
    "grok-2": {"input": 2.00, "output": 10.00, "ratio": 5.0, "provider": "xai", "display": "Grok-2"},
    "grok-3": {"input": 3.00, "output": 15.00, "ratio": 5.0, "provider": "xai", "display": "Grok-3"},
    "llama-3.3-70b": {"input": 0.59, "output": 0.79, "ratio": 1.34, "provider": "meta", "display": "Llama 3.3 70B"},
    "llama-3.1-405b": {"input": 3.00, "output": 3.00, "ratio": 1.0, "provider": "meta", "display": "Llama 3.1 405B"},
    "mistral-large-latest": {"input": 2.00, "output": 6.00, "ratio": 3.0, "provider": "mistral", "display": "Mistral Large"},
    "qwen-plus": {"input": 0.40, "output": 1.20, "ratio": 3.0, "provider": "alibaba", "display": "Qwen-Plus"},
    "qwen-turbo": {"input": 0.05, "output": 0.20, "ratio": 4.0, "provider": "alibaba", "display": "Qwen-Turbo"},
}
DEFAULT_PRICING = {"input": 1.00, "output": 4.00, "ratio": 4.0}


def _normalize_model_key(model: str) -> str:
    lower = (model or "").lower().strip()
    if lower in PRICING:
        return lower
    for key in PRICING:
        if key in lower or lower in key:
            return key
    if "gpt-4o-mini" in lower: return "gpt-4o-mini"
    if "gpt-4o" in lower: return "gpt-4o"
    if "gpt-4.1-mini" in lower: return "gpt-4.1-mini"
    if "gpt-4.1-nano" in lower: return "gpt-4.1-nano"
    if "gpt-4.1" in lower: return "gpt-4.1"
    if "claude" in lower and "haiku" in lower: return "claude-3-5-haiku-20241022"
    if "claude" in lower and "sonnet" in lower: return "claude-3-5-sonnet-20241022"
    if "claude" in lower and "opus" in lower: return "claude-3-opus-20240229"
    if "claude" in lower: return "claude-sonnet-4-20250514"
    if "gemini-2.5-pro" in lower: return "gemini-2.5-pro"
    if "gemini-2.5" in lower: return "gemini-2.5-flash"
    if "gemini-2.0" in lower or "gemini-2" in lower: return "gemini-2.0-flash"
    if "gemini" in lower: return "gemini-1.5-flash"
    if "deepseek" in lower and ("r1" in lower or "reason" in lower): return "deepseek-reasoner"
    if "deepseek" in lower: return "deepseek-chat"
    if "grok-3" in lower: return "grok-3"
    if "grok" in lower: return "grok-2"
    if "llama" in lower and "405" in lower: return "llama-3.1-405b"
    if "llama" in lower: return "llama-3.3-70b"
    if "mistral" in lower: return "mistral-large-latest"
    if "qwen" in lower: return "qwen-plus"
    return ""


def count_tokens(text: str, model: str = "") -> int:
    if not text:
        return 0
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    other_chars = len(text) - chinese_chars
    return max(1, int(chinese_chars * 1.5 + other_chars * 0.25))


def estimate_cost(tokens: int, model: str, provider: str = "") -> float:
    key = _normalize_model_key(model)
    pricing = PRICING.get(key, DEFAULT_PRICING)
    return round(tokens * pricing["output"] / 1_000_000, 8)


def estimate_cost_detailed(prompt_tokens: int, completion_tokens: int, model: str, provider: str = "") -> dict:
    key = _normalize_model_key(model)
    pricing = PRICING.get(key, DEFAULT_PRICING)
    input_cost_usd = prompt_tokens * pricing["input"] / 1_000_000
    output_cost_usd = completion_tokens * pricing["output"] / 1_000_000
    total_usd = input_cost_usd + output_cost_usd
    total_cny = total_usd * USD_TO_CNY
    return {
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "input_cost_usd": round(input_cost_usd, 8),
        "output_cost_usd": round(output_cost_usd, 8),
        "total_cost_usd": round(total_usd, 8),
        "total_cost_cny": round(total_cny, 6),
        "model": model,
        "model_display": pricing.get("display", model),
        "provider": pricing.get("provider", provider),
        "pricing_per_1m": {
            "input_usd": pricing["input"],
            "output_usd": pricing["output"],
            "input_cny": round(pricing["input"] * USD_TO_CNY, 4),
            "output_cny": round(pricing["output"] * USD_TO_CNY, 4),
        },
        "usd_to_cny_rate": USD_TO_CNY,
    }


def format_cost_display(cost_usd: float) -> dict:
    cost_cny = cost_usd * USD_TO_CNY
    def fu(v):
        if v < 0.000001: return "$0.000000"
        if v < 0.01: return f"${v:.6f}"
        if v < 1: return f"${v:.4f}"
        return f"${v:.2f}"
    def fc(v):
        if v < 0.00001: return "\u00a50.00000"
        if v < 0.01: return f"\u00a5{v:.5f}"
        if v < 1: return f"\u00a5{v:.4f}"
        return f"\u00a5{v:.2f}"
    return {"usd": fu(cost_usd), "cny": fc(cost_cny), "usd_raw": cost_usd, "cny_raw": cost_cny}


def get_model_pricing_info(model: str) -> dict:
    key = _normalize_model_key(model)
    pricing = PRICING.get(key, DEFAULT_PRICING)
    return {
        "model": model,
        "display": pricing.get("display", model),
        "provider": pricing.get("provider", "unknown"),
        "input_per_1m_usd": pricing["input"],
        "output_per_1m_usd": pricing["output"],
        "input_per_1m_cny": round(pricing["input"] * USD_TO_CNY, 4),
        "output_per_1m_cny": round(pricing["output"] * USD_TO_CNY, 4),
        "ratio": pricing.get("ratio", 4.0),
        "usd_to_cny": USD_TO_CNY,
    }


def aggregate_session_cost(messages: list) -> dict:
    total_usd = sum(m.get("cost_usd", 0) for m in messages)
    total_tokens = sum(m.get("token_count", 0) for m in messages)
    total_cny = total_usd * USD_TO_CNY
    by_agent: dict = {}
    for msg in messages:
        agent = msg.get("agent_name") or msg.get("role", "unknown")
        if agent not in by_agent:
            by_agent[agent] = {"tokens": 0, "cost_usd": 0.0, "cost_cny": 0.0}
        by_agent[agent]["tokens"] += msg.get("token_count", 0)
        by_agent[agent]["cost_usd"] += msg.get("cost_usd", 0)
        by_agent[agent]["cost_cny"] += msg.get("cost_usd", 0) * USD_TO_CNY
    return {
        "total_cost_usd": round(total_usd, 8),
        "total_cost_cny": round(total_cny, 6),
        "total_tokens": total_tokens,
        "by_agent": {k: {"tokens": v["tokens"], "cost_usd": round(v["cost_usd"], 8), "cost_cny": round(v["cost_cny"], 6)} for k, v in by_agent.items()},
        "display": format_cost_display(total_usd),
        "usd_to_cny_rate": USD_TO_CNY,
    }
