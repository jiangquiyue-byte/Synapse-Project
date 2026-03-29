import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../services/api';
import { ICON_TONES, WorkflowsTabIcon } from '../../components/SynapseIcons';

type WorkflowTemplate = {
  id: string;
  name?: string;
  description?: string;
  mode?: string;
  max_debate_rounds?: number;
  agent_ids?: string[];
};

type PromptTemplate = {
  id: string;
  name?: string;
  content?: string;
  category?: string;
};

export default function WorkflowsScreen() {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);

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

  const applyTemplate = useCallback(async (templateId: string) => {
    try {
      const result = await api.applyWorkflow(templateId);
      if (result?.template) {
        Alert.alert('模板已读取', '该工作流模板已可用于下一步前端编排接入。');
        return;
      }
      Alert.alert('提示', result?.message || '模板已返回，但未包含更多可展示信息。');
    } catch (error: any) {
      Alert.alert('模板读取失败', error?.message || '未知错误');
    }
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <WorkflowsTabIcon size={22} color={ICON_TONES.primary} strokeWidth={1.1} />
          <Text style={styles.heroTitle}>工作流市场</Text>
        </View>
        <Text style={styles.heroSubtitle}>
          浏览已持久化的工作流模板与提示词资产。当前阶段先提供市场浏览、模板回读与信息审计，为下一步真正的一键套用与分享打基础。
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

      <Text style={styles.sectionTitle}>工作流模板</Text>
      <View style={styles.card}>
        {loading ? (
          <Text style={styles.placeholderText}>正在同步市场模板...</Text>
        ) : templates.length === 0 ? (
          <Text style={styles.placeholderText}>当前数据库中还没有工作流模板，可以后续在后台继续沉淀。</Text>
        ) : (
          templates.map((template, index) => (
            <View key={template.id || `template_${index}`} style={[styles.templateRow, index > 0 && styles.dividerTop]}>
              <View style={styles.templateMetaRow}>
                <Text style={styles.templateTitle}>{template.name || '未命名模板'}</Text>
                <Text style={styles.templateMode}>{template.mode || '未定义模式'}</Text>
              </View>
              <Text style={styles.templateDesc}>{template.description || '该模板尚未填写描述。'}</Text>
              <View style={styles.templateFooter}>
                <Text style={styles.templateInfo}>
                  Agent 数量 {template.agent_ids?.length || 0} · 辩论轮数 {template.max_debate_rounds ?? 1}
                </Text>
                <TouchableOpacity style={styles.applyBtn} onPress={() => applyTemplate(template.id)}>
                  <Text style={styles.applyBtnText}>读取模板</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
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

      <Text style={styles.sectionTitle}>市场状态</Text>
      <View style={styles.card}>
        <Text style={styles.statusText}>当前页面已与后端模板与提示词路由打通，可浏览数据库中的工作流资产。</Text>
        <Text style={styles.statusText}>下一步可继续补齐：精选推荐、收藏、排序、创建向导与一键应用到聊天页的完整链路。</Text>
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
  templateRow: {
    paddingVertical: 12,
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
    alignItems: 'center',
    marginBottom: 6,
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
  templateFooter: {
    marginTop: 10,
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
});
