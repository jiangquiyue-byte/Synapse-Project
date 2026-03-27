/**
 * SSEClient - Custom SSE-over-fetch client for Expo/React Native.
 * Properly handles event boundaries (blank lines) per SSE spec.
 */
export class SSEClient {
  private controller: AbortController | null = null;

  async connect(
    url: string,
    body: object,
    onMessage: (event: string, data: any) => void,
    onError?: (err: Error) => void,
    onDone?: () => void
  ) {
    this.controller = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: this.controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onDone?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line.trim() === '') {
            // Blank line = end of SSE event block, dispatch if we have data
            if (currentData) {
              try {
                onMessage(currentEvent, JSON.parse(currentData));
              } catch {
                onMessage(currentEvent, currentData);
              }
            }
            // Reset for next event block
            currentEvent = 'message';
            currentData = '';
          }
        }

        // If we have pending data without a trailing blank line, dispatch it
        // (sse-starlette may not always send trailing blank lines)
        if (currentData) {
          try {
            onMessage(currentEvent, JSON.parse(currentData));
          } catch {
            onMessage(currentEvent, currentData);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError?.(err);
      }
    }
  }

  disconnect() {
    this.controller?.abort();
  }
}
