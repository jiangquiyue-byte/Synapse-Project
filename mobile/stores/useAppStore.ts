import { create } from 'zustand';

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

export type DiscussionMode = 'sequential' | 'debate' | 'vote' | 'single';

interface AppState {
  agents: Agent[];
  messages: Message[];
  currentSessionId: string;
  backendUrl: string;
  isLoading: boolean;
  discussionMode: DiscussionMode;
  maxDebateRounds: number;
  targetAgentId: string | null;
  totalCostUsd: number;

  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setDiscussionMode: (mode: DiscussionMode) => void;
  setTargetAgent: (id: string | null) => void;
  setBackendUrl: (url: string) => void;
  addCost: (cost: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  agents: [],
  messages: [],
  currentSessionId: 'session_' + Date.now(),
  backendUrl: '',
  isLoading: false,
  discussionMode: 'sequential',
  maxDebateRounds: 3,
  targetAgentId: null,
  totalCostUsd: 0,

  addAgent: (agent) => set((s) => ({ agents: [...s.agents, agent] })),
  removeAgent: (id) => set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
  updateAgent: (id, updates) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),
  setLoading: (loading) => set({ isLoading: loading }),
  setDiscussionMode: (mode) => set({ discussionMode: mode }),
  setTargetAgent: (id) => set({ targetAgentId: id }),
  setBackendUrl: (url) => set({ backendUrl: url }),
  addCost: (cost) => set((s) => ({ totalCostUsd: s.totalCostUsd + cost })),
}));
