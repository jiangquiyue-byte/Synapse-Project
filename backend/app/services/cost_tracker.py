"""Token counting and cost estimation service."""

PRICING = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
}


def count_tokens(text: str, model: str) -> int:
    """Estimate token count. Simple approximation for now."""
    # Rough estimate: ~4 chars per token for English, ~2 for Chinese
    return max(1, len(text) // 3)


def estimate_cost(tokens: int, model: str, provider: str) -> float:
    pricing = PRICING.get(model, {"input": 1.0, "output": 4.0})
    return round(tokens * pricing["output"] / 1_000_000, 6)
