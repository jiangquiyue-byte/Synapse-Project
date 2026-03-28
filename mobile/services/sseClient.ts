/**
 * SSEClient - React Native compatible SSE client.
 *
 * Strategy:
 *   1. Try XMLHttpRequest-based streaming (works in React Native)
 *   2. If streaming fails, fall back to non-streaming /api/chat/send endpoint
 *
 * React Native's fetch() does NOT support ReadableStream (response.body),
 * so we use XHR with onreadystatechange to incrementally read SSE chunks.
 */
export class SSEClient {
  private xhr: XMLHttpRequest | null = null;
  private aborted = false;

  async connect(
    url: string,
    body: object,
    onMessage: (event: string, data: any) => void,
    onError?: (err: Error) => void,
    onDone?: () => void
  ) {
    this.aborted = false;

    // Try non-streaming endpoint first (most reliable for React Native)
    const sendUrl = url.replace('/chat/stream', '/chat/send');

    try {
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (this.aborted) return;

      // Read response as text first to handle any format
      const text = await response.text();
      if (this.aborted) return;

      let result: any;
      try {
        result = JSON.parse(text);
      } catch {
        onError?.(new Error(`服务器返回了非 JSON 响应: ${text.slice(0, 200)}`));
        onDone?.();
        return;
      }

      // Check for HTTP errors
      if (!response.ok) {
        const errorMsg = result?.messages?.[0]?.content
          || result?.detail
          || result?.error
          || `HTTP ${response.status}`;
        onError?.(new Error(errorMsg));
        onDone?.();
        return;
      }

      // Process messages from the JSON response
      if (result.messages && Array.isArray(result.messages)) {
        for (const msg of result.messages) {
          if (msg.role === 'system' && msg.content?.startsWith('没有找到')) {
            onMessage('error', { error: msg.content });
          } else {
            onMessage('agent_message', msg);
          }
        }
      }

      // Process cost summary
      if (result.total_cost_usd !== undefined) {
        onMessage('cost_summary', { total_cost_usd: result.total_cost_usd });
      }

      onDone?.();
    } catch (err: any) {
      if (this.aborted) return;
      onError?.(new Error(`连接失败: ${err.message}`));
      onDone?.();
    }
  }

  disconnect() {
    this.aborted = true;
    if (this.xhr) {
      try { this.xhr.abort(); } catch {}
      this.xhr = null;
    }
  }
}
