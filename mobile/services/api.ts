import { useAppStore } from '../stores/useAppStore';

const DEFAULT_BACKEND_URL = 'https://8000-itjpuatlcc84icpovyuc5-2b4d9b54.sg1.manus.computer';

const getBaseUrl = () => {
  return useAppStore.getState().backendUrl || DEFAULT_BACKEND_URL;
};

export const api = {
  health: async () => {
    const res = await fetch(`${getBaseUrl()}/health`);
    return res.json();
  },

  // Agents
  listAgents: async () => {
    const res = await fetch(`${getBaseUrl()}/api/agents/`);
    return res.json();
  },

  createAgent: async (agent: any) => {
    const res = await fetch(`${getBaseUrl()}/api/agents/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    return res.json();
  },

  deleteAgent: async (id: string) => {
    const res = await fetch(`${getBaseUrl()}/api/agents/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Prompt templates
  listPrompts: async () => {
    const res = await fetch(`${getBaseUrl()}/api/workflows/prompts`);
    return res.json();
  },

  // Chat stream URL
  getChatStreamUrl: () => `${getBaseUrl()}/api/chat/stream`,
};
