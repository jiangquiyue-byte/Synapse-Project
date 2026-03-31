/**
 * SSEClient - React Native compatible SSE client.
 *
 * Strategy:
 *   1. Try XMLHttpRequest-based SSE streaming on /api/chat/stream
 *   2. If streaming fails before any event is received, fall back to /api/chat/send
 */
export class SSEClient {
  private xhr: XMLHttpRequest | null = null;
  private aborted = false;
  private processedLength = 0;
  private pendingBuffer = '';
  private hasReceivedEvent = false;

  async connect(
    url: string,
    body: object,
    onMessage: (event: string, data: any) => void,
    onError?: (err: Error) => void,
    onDone?: () => void
  ) {
    this.aborted = false;
    this.processedLength = 0;
    this.pendingBuffer = '';
    this.hasReceivedEvent = false;

    try {
      await this.connectStream(url, body, onMessage, onError, onDone);
    } catch (err: any) {
      if (this.aborted) return;
      if (this.hasReceivedEvent) {
        onError?.(new Error(`流式连接中断: ${err.message}`));
        onDone?.();
        return;
      }
      await this.connectFallback(url, body, onMessage, onError, onDone, err);
    }
  }

  private async connectStream(
    url: string,
    body: object,
    onMessage: (event: string, data: any) => void,
    onError?: (err: Error) => void,
    onDone?: () => void
  ) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      this.xhr = xhr;

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.setRequestHeader('Cache-Control', 'no-cache');
      const token = require('../stores/useAppStore').useAppStore.getState().authToken;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 0;

      let finished = false;
      const finish = (fn: () => void) => {
        if (finished) return;
        finished = true;
        fn();
      };

      xhr.onreadystatechange = () => {
        if (this.aborted) {
          finish(() => resolve());
          return;
        }

        if (xhr.readyState >= XMLHttpRequest.HEADERS_RECEIVED && xhr.status >= 400) {
          const message = xhr.responseText || `HTTP ${xhr.status}`;
          finish(() => reject(new Error(message.slice(0, 300))));
          return;
        }

        if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
          try {
            this.consumeResponseText(xhr.responseText || '', onMessage, onDone, resolve, finish);
          } catch (err: any) {
            finish(() => reject(err));
            return;
          }
        }

        if (xhr.readyState === XMLHttpRequest.DONE && !finished) {
          this.flushPending(onMessage);
          finish(() => {
            onDone?.();
            resolve();
          });
        }
      };

      xhr.onerror = () => {
        finish(() => reject(new Error('网络连接失败')));
      };

      xhr.ontimeout = () => {
        finish(() => reject(new Error('流式请求超时')));
      };

      xhr.send(JSON.stringify(body));
    });
  }

  private consumeResponseText(
    responseText: string,
    onMessage: (event: string, data: any) => void,
    onDone: (() => void) | undefined,
    resolve: () => void,
    finish: (fn: () => void) => void
  ) {
    if (responseText.length <= this.processedLength) return;

    const newText = responseText.slice(this.processedLength);
    this.processedLength = responseText.length;
    this.pendingBuffer += newText;

    const segments = this.pendingBuffer.split(/\n\n/);
    this.pendingBuffer = segments.pop() || '';

    for (const segment of segments) {
      const parsed = this.parseSSEEvent(segment);
      if (!parsed) continue;

      this.hasReceivedEvent = true;
      const { event, data } = parsed;

      if (event === 'done') {
        finish(() => {
          onDone?.();
          resolve();
        });
        return;
      }

      onMessage(event, data);
    }
  }

  private flushPending(onMessage: (event: string, data: any) => void) {
    const rest = this.pendingBuffer.trim();
    this.pendingBuffer = '';
    if (!rest) return;
    const parsed = this.parseSSEEvent(rest);
    if (!parsed || parsed.event === 'done') return;
    onMessage(parsed.event, parsed.data);
  }

  private parseSSEEvent(segment: string): { event: string; data: any } | null {
    const lines = segment
      .split(/\n/)
      .map((line) => line.replace(/\r$/, ''))
      .filter(Boolean);

    if (lines.length === 0) return null;

    let event = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    const rawData = dataLines.join('\n');
    if (!rawData) return { event, data: {} };

    try {
      return { event, data: JSON.parse(rawData) };
    } catch {
      return { event, data: { raw: rawData } };
    }
  }

  private async connectFallback(
    url: string,
    body: object,
    onMessage: (event: string, data: any) => void,
    onError?: (err: Error) => void,
    onDone?: () => void,
    streamErr?: Error
  ) {
    const sendUrl = url.replace('/chat/stream', '/chat/send');

    try {
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(require('../stores/useAppStore').useAppStore.getState().authToken ? { 'Authorization': `Bearer ${require('../stores/useAppStore').useAppStore.getState().authToken}` } : {}) },
        body: JSON.stringify(body),
      });

      if (this.aborted) return;

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

      if (!response.ok) {
        const errorMsg = result?.messages?.[0]?.content
          || result?.detail
          || result?.error
          || streamErr?.message
          || `HTTP ${response.status}`;
        onError?.(new Error(errorMsg));
        onDone?.();
        return;
      }

      if (result.messages && Array.isArray(result.messages)) {
        for (const msg of result.messages) {
          if (msg.role === 'system' && msg.content?.startsWith('没有找到')) {
            onMessage('error', { error: msg.content });
          } else {
            onMessage('agent_start', {
              agent_name: msg.agent_name || 'Agent',
              agent_id: msg.role || '',
              message_id: msg.id,
            });
            onMessage('agent_message', msg);
          }
        }
      }

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
    this.processedLength = 0;
    this.pendingBuffer = '';
    this.hasReceivedEvent = false;
    if (this.xhr) {
      try { this.xhr.abort(); } catch {}
      this.xhr = null;
    }
  }
}
