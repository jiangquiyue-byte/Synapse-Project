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

  // Prompt templates
  listPrompts: async () => {
    const res = await fetch(`${getBaseUrl()}/api/workflows/prompts`);
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

  // Chat URLs
  getChatStreamUrl: () => `${getBaseUrl()}/api/chat/stream`,
  getChatSendUrl: () => `${getBaseUrl()}/api/chat/send`,
};
