"""
Web Search Tool for Synapse - Tavily API integration.

Provides real-time web search capability as a LangGraph tool.
Agents with 'web_search' in their tools list can invoke this
to retrieve up-to-date information from the internet.
"""
import os
import logging
from typing import Optional

from langchain_core.tools import tool

logger = logging.getLogger(__name__)


def _get_tavily_api_key() -> str:
    """Get Tavily API key from environment or config."""
    key = os.environ.get("TAVILY_API_KEY", "")
    if not key:
        try:
            from app.core.config import get_settings
            key = get_settings().TAVILY_API_KEY
        except Exception:
            pass
    return key


@tool
def web_search_tool(query: str) -> str:
    """在互联网上搜索最新信息。当需要查找实时数据、新闻、事实或任何需要最新信息的问题时使用此工具。

    Args:
        query: 搜索查询关键词

    Returns:
        格式化的搜索结果，包含标题、URL 和内容摘要
    """
    api_key = _get_tavily_api_key()

    if not api_key:
        return "[联网搜索不可用: 未配置 TAVILY_API_KEY 环境变量]"

    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=api_key)
        results = client.search(query, max_results=5, search_depth="basic")

        if not results or not results.get("results"):
            return f"未找到与 '{query}' 相关的搜索结果。"

        formatted = []
        for r in results["results"]:
            title = r.get("title", "无标题")
            url = r.get("url", "")
            content = r.get("content", "")
            formatted.append(f"**{title}**\n链接: {url}\n{content}")

        return "\n\n---\n\n".join(formatted)

    except ImportError:
        logger.error("tavily-python package not installed")
        return "[联网搜索不可用: tavily-python 未安装]"
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return f"[联网搜索失败: {str(e)}]"


async def web_search_async(query: str, max_results: int = 5) -> dict:
    """Async web search for direct API calls (non-tool usage).

    Args:
        query: Search query
        max_results: Maximum number of results

    Returns:
        dict with status and results
    """
    api_key = _get_tavily_api_key()

    if not api_key:
        return {"status": "error", "message": "未配置 TAVILY_API_KEY"}

    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=api_key)
        results = client.search(query, max_results=max_results, search_depth="basic")

        return {
            "status": "ok",
            "query": query,
            "results": [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("content", ""),
                    "score": r.get("score", 0),
                }
                for r in results.get("results", [])
            ],
        }
    except ImportError:
        return {"status": "error", "message": "tavily-python 未安装"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
