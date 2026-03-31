import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { api } from '../../services/api';
import { ICON_TONES, WorkflowsTabIcon } from '../../components/SynapseIcons';
import { useAppStore, type Agent, type DiscussionMode } from '../../stores/useAppStore';

type WorkflowAgentConfig = {
  id: string;
  name?: string;
  persona?: string;
  provider?: Agent['provider'];
  model?: string;
  api_key_encrypted?: string;
  sequence_order?: number;
  tools?: string[];
  temperature?: number;
  supports_vision?: boolean;
  custom_base_url?: string;
};

type WorkflowTemplate = {
  id: string;
  name?: string;
  description?: string;
  mode?: DiscussionMode;
  max_debate_rounds?: number;
  agent_configs?: WorkflowAgentConfig[];
};

type PromptTemplate = {
  id: string;
  name?: string;
  content?: string;
  category?: string;
};

const WORKFLOW_NOTES: Record<string, { badge: string; summary: string; checklist: string[] }> = {
  official_deep_research: {
    badge: '官方推荐',
    summary: '适合行业分析、竞品扫描、战略研判与结构化输出。',
    checklist: ['自动启用联网搜索', '内置研究总监 / 行业分析师 / 数据质检官', '开局即给出结构化研报框架'],
  },
  official_expert_roundtable: {
    badge: '高协作',
    summary: '适合需求评审、方案争议、功能优先级与跨角色共识。',
    checklist: ['技术 / 产品 / 设计三专家齐备', '自动切换为辩论模式', '适合快速获得多视角评审结论'],
  },
  official_code_audit: {
    badge: '风险优先',
    summary: '适合上线前审计、接口复查与关键模块重构建议。',
    checklist: ['安全漏洞扫描', '逻辑重构建议', '补充测试策略与回归重点'],
  },
};

const AGENT_COLORS = ['#EEF3FF', '#F8F0FF', '#EEF8F2', '#FFF7EA', '#FDEFF3'];

function normalizeWorkflowAgent(agent: WorkflowAgentConfig, index: number): Agent {
  return {
    id: agent.id,
    name: agent.name || `Agent ${index + 1}`,
    persona: agent.persona || '',
    provider: (agent.provider || 'custom_openai') as Agent['provider'],
    model: agent.model || 'deepseek-chat',
    apiKey: agent.api_key_encrypted || '',
    sequenceOrder: agent.sequence_order ?? index,
    tools: Array.isArray(agent.tools) ? agent.tools : [],
    temperature: agent.temperature ?? 0.7,
    avatarColor: AGENT_COLORS[index % AGENT_COLORS.length],
    supportsVision: Boolean(agent.supports_vision),
    customBaseUrl: agent.custom_base_url || '',
  };
}

export default function WorkflowsScreen() {
  const router = useRouter();
  const refreshSessions = useAppStore((state) => state.refreshSessions);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, promptsRes] = await Promise.all([
        api.listWorkflows(),
        api.listPrompts(),
      ]);
      setTemplates(Array.isArray(templatesRes?.templates) ? templatesRes.templates : []);
      setPrompts(Array.isArray(promptsRes?.prompts) ? promptsRes.prompts : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarketplace();
  }, [loadMarketplace]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [prompts]);

  const featuredTemplates = useMemo(() => {
    const officialOrder = ['official_deep_research', 'official_expert_roundtable', 'official_code_audit'];
    const ordered = officialOrder
      .map((id) => templates.find((tpl) => tpl.id === id))
      .filter(Boolean) as WorkflowTemplate[];
    const remaining = templates.filter((tpl) => !officialOrder.includes(tpl.id));
    return [...ordered, ...remaining];
  }, [templates]);

  const applyTemplate = useCallback(async (templateId: string) => {
    try {
      setApplyingId(templateId);
      const result = await api.applyWorkflow(templateId);
      const applied = result?.applied;
      if (!applied?.session_id || !Array.isArray(applied?.agent_configs)) {
        showToast(result?.message || '后端未返回完整的工作流配置', 'error');
        return;
      }

      const normalizedAgents = applied.agent_configs.map(normalizeWorkflowAgent);

      useAppStore.setState({
        agents: normalizedAgents,
        currentSessionId: applied.session_id,
        messages: [],
        discussionMode: (applied.discussion_mode || 'sequential') as DiscussionMode,
        maxDebateRounds: Number(applied.max_debate_rounds || 3),
        targetAgentId: null,
        totalCostUsd: 0,
      });
      await refreshSessions();

      showToast(applied.success_message || `✓ 已套用「${applied.session_title || '工作流会话'}」`, 'success');
      router.push('/');
      return;
    } catch (error: any) {
      showToast(error?.message || '模板套用失败，请重试', 'error');
    } finally {
      setApplyingId(null);
    }
  }, [refreshSessions, router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {toast && (
        <View style={[styles.toastBar, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <WorkflowsTabIcon size={22} color={ICON_TONES.primary} strokeWidth={1.1} />
          <Text style={styles.heroTitle}>工作流市场</Text>
        </View>
        <Text style={styles.heroSubtitle}>
          直接套用官方工作流，系统会自动创建新会话、写入对应 Agent 群组、切换讨论模式，并把你带回聊天页开始执行。
        </Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>模板总数</Text>
            <Text style={styles.metricValue}>{templates.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>提示词总数</Text>
            <Text style={styles.metricValue}>{prompts.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>分类数</Text>
            <Text style={styles.metricValue}>{categories.length}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>精选官方工作流</Text>
      <View style={styles.card}>
        {loading ? (
          <Text style={styles.placeholderText}>正在同步工作流模板...</Text>
        ) : featuredTemplates.length === 0 ? (
          <Text style={styles.placeholderText}>当前还没有可用模板，请稍后重试。</Text>
        ) : (
          featuredTemplates.map((template, index) => {
            const note = WORKFLOW_NOTES[template.id] || {
              badge: '自定义',
              summary: '可继续扩展的工作流模板。',
              checklist: ['支持模板回读', '支持一键创建新会话'],
            };
            const agentCount = template.agent_configs?.length || 0;
            const applying = applyingId === template.id;

            return (
              <View key={template.id || `template_${index}`} style={[styles.templateCard, index > 0 && styles.dividerTop]}>
                <View style={styles.templateMetaRow}>
                  <View style={styles.templateHeaderTextWrap}>
                    <Text style={styles.templateTitle}>{template.name || '未命名模板'}</Text>
                    <Text style={styles.templateDesc}>{template.description || '该模板尚未填写描述。'}</Text>
                  </View>
                  <View style={styles.badgeWrap}>
                    <Text style={styles.templateBadge}>{note.badge}</Text>
                    <Text style={styles.templateMode}>{template.mode || '未定义模式'}</Text>
                  </View>
                </View>

                <Text style={styles.templateSummary}>{note.summary}</Text>
                <View style={styles.agentChipsRow}>
                  {(template.agent_configs || []).map((agent, agentIndex) => (
                    <View key={agent.id || `${template.id}_agent_${agentIndex}`} style={styles.agentChip}>
                      <Text style={styles.agentChipText}>{agent.name || `Agent ${agentIndex + 1}`}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.checklistWrap}>
                  {note.checklist.map((item) => (
                    <Text key={`${template.id}_${item}`} style={styles.checklistItem}>• {item}</Text>
                  ))}
                </View>
                <View style={styles.templateFooter}>
                  <Text style={styles.templateInfo}>
                    Agent 数量 {agentCount} · 辩论轮数 {template.max_debate_rounds ?? 1}
                  </Text>
                  <TouchableOpacity
                    style={[styles.applyBtn, applying && styles.applyBtnDisabled]}
                    onPress={() => applyTemplate(template.id)}
                    disabled={applying}
                  >
                    <Text style={styles.applyBtnText}>{applying ? '正在套用...' : '一键套用'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      <Text style={styles.sectionTitle}>提示词资产</Text>
      <View style={styles.card}>
        {prompts.length === 0 ? (
          <Text style={styles.placeholderText}>当前还没有可供浏览的提示词资产。</Text>
        ) : (
          prompts.map((prompt, index) => (
            <View key={prompt.id || `prompt_${index}`} style={[styles.promptRow, index > 0 && styles.dividerTop]}>
              <View style={styles.templateMetaRow}>
                <Text style={styles.templateTitle}>{prompt.name || '未命名提示词'}</Text>
                <Text style={styles.promptCategory}>{prompt.category || '未分类'}</Text>
              </View>
              <Text style={styles.promptContent} numberOfLines={4}>
                {prompt.content || '该提示词暂无内容。'}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>使用方式</Text>
      <View style={styles.card}>
        <Text style={styles.statusText}>1. 在此页选择一个官方工作流并点击「一键套用」。</Text>
        <Text style={styles.statusText}>2. 系统会自动新建会话、装载对应 Agent 群组，并切换到合适的讨论模式。</Text>
        <Text style={styles.statusText}>3. 返回聊天页后，直接粘贴需求即可开始协作；若模板提供了建议开场语，可直接照着发第一条消息。</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 0.75,
    borderColor: '#E3E3E3',
    padding: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#666666',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 0.75,
    borderColor: '#E6E6E6',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 10,
    color: '#8A8A8A',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 14,
    color: '#111111',
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#8B8B8B',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.75,
    borderColor: '#E6E6E6',
    padding: 14,
  },
  placeholderText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#888888',
  },
  templateCard: {
    paddingVertical: 14,
  },
  promptRow: {
    paddingVertical: 12,
  },
  dividerTop: {
    borderTopWidth: 0.6,
    borderTopColor: '#ECECEC',
  },
  templateMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  templateHeaderTextWrap: {
    flex: 1,
    gap: 6,
  },
  badgeWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  templateBadge: {
    fontSize: 10,
    color: '#2B4EFF',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    fontWeight: '700',
  },
  templateTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  templateMode: {
    fontSize: 10,
    color: '#666666',
    borderWidth: 0.75,
    borderColor: '#DCDCDC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  promptCategory: {
    fontSize: 10,
    color: '#666666',
  },
  templateDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333333',
  },
  templateSummary: {
    fontSize: 12,
    lineHeight: 19,
    color: '#666666',
    marginBottom: 10,
  },
  agentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  agentChip: {
    borderRadius: 999,
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  agentChipText: {
    fontSize: 11,
    color: '#333333',
    fontWeight: '600',
  },
  checklistWrap: {
    gap: 6,
  },
  checklistItem: {
    fontSize: 12,
    lineHeight: 18,
    color: '#555555',
  },
  templateFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  templateInfo: {
    flex: 1,
    fontSize: 11,
    color: '#888888',
  },
  applyBtn: {
    borderRadius: 18,
    backgroundColor: '#111111',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  applyBtnDisabled: {
    opacity: 0.65,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  promptContent: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333333',
  },
  statusText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#555555',
    marginBottom: 8,
  },
  toastBar: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toastSuccess: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  toastError: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
