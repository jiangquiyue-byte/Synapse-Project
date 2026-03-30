import { useAppStore } from '../stores/useAppStore';

const DEFAULT_BACKEND_URL = 'https://synapse-project-seven.vercel.app';

const getBaseUrl = () => {
  return useAppStore.getState().backendUrl || DEFAULT_BACKEND_URL;
};

/**
 * Safe JSON parser - handles non-JSON responses gracefully.
 */
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      status: 'error',
      message: res.ok ? text : `HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  }
}

export const api = {
  health: async () => {
    const res = await fetch(`${getBaseUrl()}/health`);
    return safeJson(res);
  },

  // State persistence
  listSessions: async () => {
    const res = await fetch(`${getBaseUrl()}/api/state/sessions`);
    return safeJson(res);
  },

  createSession: async (sessionId: string, title = '新会话') => {
    const res = await fetch(`${getBaseUrl()}/api/state/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, title }),
    });
    return safeJson(res);
  },

  renameSession: async (sessionId: string, title: string) => {
    const res = await fetch(`${getBaseUrl()}/api/state/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return safeJson(res);
  },

  deleteSession: async (sessionId: string) => {
    const res = await fetch(`${getBaseUrl()}/api/state/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    return safeJson(res);
  },

  listConfigs: async () => {
    const res = await fetch(`${getBaseUrl()}/api/state/configs`);
    return safeJson(res);
  },

  getConfig: async (key: string) => {
    const res = await fetch(`${getBaseUrl()}/api/state/configs/${key}`);
    return safeJson(res);
  },

  setConfig: async (key: string, value: Record<string, any>) => {
    const res = await fetch(`${getBaseUrl()}/api/state/configs/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    return safeJson(res);
  },

  // Agents
  listAgents: async () => {
    const res = await fetch(`${getBaseUrl()}/api/agents/`);
    return safeJson(res);
  },

  createAgent: async (agent: any) => {
    const res = await fetch(`${getBaseUrl()}/api/agents/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    return safeJson(res);
  },

  deleteAgent: async (id: string) => {
    const res = await fetch(`${getBaseUrl()}/api/agents/${id}`, {
      method: 'DELETE',
    });
    return safeJson(res);
  },

  // Prompt templates / workflows
  listPrompts: async () => {
    const res = await fetch(`${getBaseUrl()}/api/workflows/prompts`);
    return safeJson(res);
  },

  listWorkflows: async () => {
    const res = await fetch(`${getBaseUrl()}/api/workflows/templates`);
    return safeJson(res);
  },

  applyWorkflow: async (templateId: string) => {
    const res = await fetch(`${getBaseUrl()}/api/workflows/templates/${templateId}/apply`, {
      method: 'POST',
    });
    return safeJson(res);
  },

  // Memory
  listMemory: async (sessionId?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (sessionId) params.set('session_id', sessionId);
    params.set('limit', String(limit));
    const qs = params.toString();
    const res = await fetch(`${getBaseUrl()}/api/memory${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  searchMemory: async (
    query: string,
    options?: { currentSessionId?: string; includeCurrentSession?: boolean; limit?: number }
  ) => {
    const params = new URLSearchParams();
    params.set('query', query);
    if (options?.currentSessionId) params.set('current_session_id', options.currentSessionId);
    if (typeof options?.includeCurrentSession === 'boolean') {
      params.set('include_current_session', String(options.includeCurrentSession));
    }
    if (options?.limit) params.set('limit', String(options.limit));
    const res = await fetch(`${getBaseUrl()}/api/memory/search?${params.toString()}`);
    return safeJson(res);
  },

  previewMemoryContext: async (
    query: string,
    options?: { currentSessionId?: string; includeCurrentSession?: boolean; limit?: number }
  ) => {
    const params = new URLSearchParams();
    params.set('query', query);
    if (options?.currentSessionId) params.set('current_session_id', options.currentSessionId);
    if (typeof options?.includeCurrentSession === 'boolean') {
      params.set('include_current_session', String(options.includeCurrentSession));
    }
    if (options?.limit) params.set('limit', String(options.limit));
    const res = await fetch(`${getBaseUrl()}/api/memory/context?${params.toString()}`);
    return safeJson(res);
  },

  getSessionMemory: async (sessionId: string, limit = 50) => {
    const res = await fetch(`${getBaseUrl()}/api/memory/${encodeURIComponent(sessionId)}?limit=${limit}`);
    return safeJson(res);
  },

  // Upload
  uploadDocument: async (file: { uri: string; name: string; type: string }, sessionId: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    formData.append('session_id', sessionId);
    const res = await fetch(`${getBaseUrl()}/api/upload/`, {
      method: 'POST',
      body: formData,
    });
    return safeJson(res);
  },

  queryDocuments: async (sessionId: string, query: string) => {
    const res = await fetch(`${getBaseUrl()}/api/upload/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, query }),
    });
    return safeJson(res);
  },

  listDocuments: async (sessionId: string) => {
    const res = await fetch(`${getBaseUrl()}/api/upload/documents/${sessionId}`);
    return safeJson(res);
  },

  // Chat / export
  getChatHistory: async (sessionId: string) => {
    const res = await fetch(`${getBaseUrl()}/api/chat/history/${sessionId}`);
    return safeJson(res);
  },

  exportMarkdown: (sessionId: string) => `${getBaseUrl()}/api/export/markdown/${sessionId}`,
  exportPdf: (sessionId: string) => `${getBaseUrl()}/api/export/pdf/${sessionId}`,
  exportJson: (sessionId: string) => `${getBaseUrl()}/api/export/json/${sessionId}`,

  // Chat URLs
  getChatStreamUrl: () => `${getBaseUrl()}/api/chat/stream`,
  getChatSendUrl: () => `${getBaseUrl()}/api/chat/send`,

  // Billing
  getBillingStats: async () => {
    const res = await fetch(`${getBaseUrl()}/api/state/billing/stats`);
    return safeJson(res);
  },
};
