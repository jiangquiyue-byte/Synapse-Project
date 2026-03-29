import { create } from 'zustand';

import { api } from '../services/api';

export interface Agent {
  id: string;
  name: string;
  persona: string;
  provider: 'openai' | 'gemini' | 'claude' | 'custom_openai';
  model: string;
  apiKey: string;
  sequenceOrder: number;
  tools: string[];
  temperature: number;
  avatarColor: string;
  supportsVision: boolean;
  customBaseUrl: string;
}

export interface Message {
  id: string;
  role: string;
  agentName?: string;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  tokenCount?: number;
  costUsd?: number;
  branchId?: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DiscussionMode = 'sequential' | 'debate' | 'vote' | 'single';

interface AppState {
  agents: Agent[];
  messages: Message[];
  sessions: SessionSummary[];
  currentSessionId: string;
  backendUrl: string;
  isLoading: boolean;
  isBootstrapping: boolean;
  discussionMode: DiscussionMode;
  maxDebateRounds: number;
  targetAgentId: string | null;
  totalCostUsd: number;
  tavilySearchEnabled: boolean;

  initializeApp: () => Promise<void>;
  createNewSession: (title?: string) => Promise<string>;
  switchSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshAgents: () => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;

  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;

  addMessage: (msg: Message) => void;
  upsertMessage: (msg: Message) => void;
  patchMessage: (id: string, patch: Partial<Message>) => void;
  replaceMessages: (messages: Message[]) => void;
  clearMessages: () => void;

  setLoading: (loading: boolean) => void;
  setDiscussionMode: (mode: DiscussionMode) => void;
  setTargetAgent: (id: string | null) => void;
  setBackendUrl: (url: string) => Promise<void>;
  setTavilySearchEnabled: (enabled: boolean) => Promise<void>;
  addCost: (cost: number) => void;
}

const makeSessionId = () => `session_${Date.now()}`;

const normalizeMessage = (msg: any): Message => ({
  id: msg.id,
  role: msg.role,
  agentName: msg.agent_name ?? msg.agentName,
  content: msg.content,
  timestamp: msg.timestamp,
  tokenCount: msg.token_count ?? msg.tokenCount,
  costUsd: msg.cost_usd ?? msg.costUsd,
  branchId: msg.branch_id ?? msg.branchId,
  isStreaming: msg.is_streaming ?? msg.isStreaming,
});

const normalizeAgent = (agent: any): Agent => ({
  id: agent.id,
  name: agent.name,
  persona: agent.persona,
  provider: agent.provider,
  model: agent.model,
  apiKey: agent.api_key_encrypted || agent.apiKey || '',
  sequenceOrder: agent.sequence_order ?? agent.sequenceOrder ?? 0,
  tools: agent.tools || [],
  temperature: agent.temperature ?? 0.7,
  avatarColor: agent.avatar_color || agent.avatarColor || '#F0F0F0',
  supportsVision: agent.supports_vision ?? agent.supportsVision ?? false,
  customBaseUrl: agent.custom_base_url || agent.customBaseUrl || '',
});

const normalizeSession = (session: any): SessionSummary => ({
  id: session.id,
  title: session.title || '新会话',
  createdAt: session.created_at ?? session.createdAt,
  updatedAt: session.updated_at ?? session.updatedAt,
});

export const useAppStore = create<AppState>((set, get) => ({
  agents: [],
  messages: [],
  sessions: [],
  currentSessionId: makeSessionId(),
  backendUrl: '',
  isLoading: false,
  isBootstrapping: false,
  discussionMode: 'sequential',
  maxDebateRounds: 3,
  targetAgentId: null,
  totalCostUsd: 0,
  tavilySearchEnabled: false,

  initializeApp: async () => {
    if (get().isBootstrapping) return;
    set({ isBootstrapping: true });

    try {
      const [configsRes, sessionsRes, agentsRes] = await Promise.allSettled([
        api.listConfigs(),
        api.listSessions(),
        api.listAgents(),
      ]);

      let backendUrl = get().backendUrl;
      let tavilySearchEnabled = get().tavilySearchEnabled;

      if (configsRes.status === 'fulfilled' && Array.isArray(configsRes.value?.configs)) {
        const configMap = new Map<string, any>();
        configsRes.value.configs.forEach((item: any) => configMap.set(item.key, item.value));
        backendUrl = configMap.get('backend_url')?.url || backendUrl;
        tavilySearchEnabled = Boolean(configMap.get('tavily_search')?.enabled ?? tavilySearchEnabled);
      }

      const sessions =
        sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value?.sessions)
          ? sessionsRes.value.sessions.map(normalizeSession)
          : [];

      const agents =
        agentsRes.status === 'fulfilled' && Array.isArray(agentsRes.value?.agents)
          ? agentsRes.value.agents.map(normalizeAgent)
          : [];

      let nextSessionId = get().currentSessionId;
      if (sessions.length > 0) {
        nextSessionId = sessions[0].id;
      } else {
        const createdId = makeSessionId();
        await api.createSession(createdId, '新会话');
        nextSessionId = createdId;
      }

      set({
        backendUrl,
        tavilySearchEnabled,
        sessions,
        agents,
        currentSessionId: nextSessionId,
      });

      if (sessions.length === 0) {
        await get().refreshSessions();
      }
      await get().loadMessages(nextSessionId);
    } finally {
      set({ isBootstrapping: false });
    }
  },

  createNewSession: async (title = '新会话') => {
    const sessionId = makeSessionId();
    await api.createSession(sessionId, title);
    await get().refreshSessions();
    set({ currentSessionId: sessionId, messages: [] });
    return sessionId;
  },

  switchSession: async (sessionId: string) => {
    set({ currentSessionId: sessionId, messages: [] });
    await get().loadMessages(sessionId);
  },

  refreshSessions: async () => {
    const result = await api.listSessions();
    if (Array.isArray(result?.sessions)) {
      set({ sessions: result.sessions.map(normalizeSession) });
    }
  },

  refreshAgents: async () => {
    const result = await api.listAgents();
    if (Array.isArray(result?.agents)) {
      set({ agents: result.agents.map(normalizeAgent) });
    }
  },

  loadMessages: async (sessionId: string) => {
    const result = await api.getChatHistory(sessionId);
    if (Array.isArray(result?.messages)) {
      set({ messages: result.messages.map(normalizeMessage) });
    } else {
      set({ messages: [] });
    }
  },

  addAgent: (agent) => set((s) => ({ agents: [...s.agents, agent] })),
  removeAgent: (id) => set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
  updateAgent: (id, updates) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  upsertMessage: (msg) =>
    set((s) => {
      const idx = s.messages.findIndex((item) => item.id === msg.id);
      if (idx === -1) {
        return { messages: [...s.messages, msg] };
      }
      const next = [...s.messages];
      next[idx] = { ...next[idx], ...msg };
      return { messages: next };
    }),
  patchMessage: (id, patch) =>
    set((s) => {
      const idx = s.messages.findIndex((item) => item.id === id);
      if (idx === -1) {
        return {};
      }
      const next = [...s.messages];
      next[idx] = { ...next[idx], ...patch };
      return { messages: next };
    }),
  replaceMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),

  setLoading: (loading) => set({ isLoading: loading }),
  setDiscussionMode: (mode) => set({ discussionMode: mode }),
  setTargetAgent: (id) => set({ targetAgentId: id }),

  setBackendUrl: async (url) => {
    const normalized = url.trim().replace(/\/$/, '');
    set({ backendUrl: normalized });
    try {
      await api.setConfig('backend_url', { url: normalized });
    } catch {}
  },

  setTavilySearchEnabled: async (enabled) => {
    set({ tavilySearchEnabled: enabled });
    try {
      await api.setConfig('tavily_search', { enabled });
    } catch {}
  },

  addCost: (cost) => set((s) => ({ totalCostUsd: s.totalCostUsd + cost })),
}));
