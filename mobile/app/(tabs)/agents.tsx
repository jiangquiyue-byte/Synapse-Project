import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ScrollView, Modal, Switch, Platform, Pressable,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Agent } from '../../stores/useAppStore';
import { api } from '../../services/api';
import { EmptyAgentsIcon, ICON_TONES } from '../../components/SynapseIcons';
import { ModelAvatar } from '../../components/ModelAvatars';

const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'Claude', value: 'claude' },
  { label: '自定义', value: 'custom_openai' },
];

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: '',
  deepseek: 'https://api.deepseek.com/v1',
  gemini: '',
  claude: '',
  custom_openai: '',
};

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4.1-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4o-mini', 'o1-mini'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  custom_openai: ['deepseek-chat', 'qwen-plus', 'glm-4-flash', 'moonshot-v1-8k'],
};

const AVAILABLE_TOOLS = [
  { id: 'web_search', label: '联网搜索', desc: '实时搜索网页信息' },
  { id: 'rag_query', label: '文档检索', desc: '检索已上传的文档' },
];

export default function AgentsScreen() {
  const insets = useSafeAreaInsets();
  const { agents, addAgent, removeAgent } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [provider, setProvider] = useState<string>('openai');
  const [model, setModel] = useState('gpt-4.1-mini');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [supportsVision, setSupportsVision] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [confirmDelete, setConfirmDelete] = useState<{ visible: boolean; id: string; name: string }>({ visible: false, id: '', name: '' });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const toggleTool = (id: string) => setSelectedTools((p) => p.includes(id) ? p.filter((t) => t !== id) : [...p, id]);

  const handleProviderChange = (pv: string) => {
    setProvider(pv as any);
    const models = DEFAULT_MODELS[pv] || [''];
    setModel(models[0]);
    if (PROVIDER_BASE_URLS[pv]) {
      setCustomBaseUrl(PROVIDER_BASE_URLS[pv]);
    } else if (pv !== 'custom_openai') {
      setCustomBaseUrl('');
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) { setToast({ visible: true, message: '请先填写 API Key' }); return; }
    if (!model.trim()) { setToast({ visible: true, message: '请先填写模型名称' }); return; }
    setIsTesting(true);
    setTestResult(null);
    try {
      const effectiveProvider = provider === 'deepseek' ? 'custom_openai' : provider;
      const effectiveBaseUrl = provider === 'deepseek' ? 'https://api.deepseek.com/v1' : customBaseUrl;
      const result = await api.testAgentConnection({
        provider: effectiveProvider,
        model: model.trim(),
        api_key: apiKey.trim(),
        custom_base_url: effectiveBaseUrl,
      });
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ success: false, message: `请求失败：${e.message || '网络错误'}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddAgent = async () => {
    if (!name.trim()) { setToast({ visible: true, message: '请输入名称' }); return; }
    if (!apiKey.trim()) { setToast({ visible: true, message: '请输入 API Key' }); return; }
    const effectiveProvider = provider === 'deepseek' ? 'custom_openai' : provider;
    const effectiveBaseUrl = provider === 'deepseek' ? 'https://api.deepseek.com/v1' : customBaseUrl;
    if (effectiveProvider === 'custom_openai' && !effectiveBaseUrl.trim()) {
      setToast({ visible: true, message: '请输入 API 地址' }); return;
    }

    const newAgent: Agent = {
      id: 'agent_' + Date.now(),
      name: name.trim(),
      persona: persona.trim() || `你是${name.trim()}，请专业地回答问题。`,
      provider: effectiveProvider as any,
      model: model || DEFAULT_MODELS[provider][0],
      apiKey: apiKey.trim(),
      sequenceOrder: agents.length + 1,
      tools: selectedTools,
      temperature: parseFloat(temperature) || 0.7,
      avatarColor: '#F0F0F0',
      supportsVision,
      customBaseUrl: effectiveBaseUrl.trim(),
    };

    try {
      await api.createAgent({ ...newAgent, api_key_encrypted: newAgent.apiKey, custom_base_url: newAgent.customBaseUrl });
    } catch (e) {}
    addAgent(newAgent);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false); setName(''); setPersona(''); setProvider('openai');
    setModel('gpt-4.1-mini'); setApiKey(''); setTemperature('0.7');
    setSelectedTools([]); setSupportsVision(false); setCustomBaseUrl('');
    setTestResult(null); setShowModelPicker(false);
  };

  const handleDelete = (id: string, n: string) => {
    setConfirmDelete({ visible: true, id, name: n });
  };

  const confirmDeleteAgent = async () => {
    try { await api.deleteAgent(confirmDelete.id); } catch {}
    removeAgent(confirmDelete.id);
    setConfirmDelete({ visible: false, id: '', name: '' });
  };

  const renderAgent = ({ item }: { item: Agent }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          <ModelAvatar model={item.model} size={36} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardMeta}>{item.provider === 'custom_openai' ? '自定义' : item.provider.toUpperCase()} · {item.model}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>×</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cardPersona} numberOfLines={2}>{item.persona}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTag}>#{item.sequenceOrder}</Text>
        <Text style={styles.cardTag}>温度={item.temperature}</Text>
        {item.tools.map((t) => <Text key={t} style={styles.cardToolTag}>{t === 'web_search' ? '联网' : '文档'}</Text>)}
        {item.supportsVision && <Text style={styles.cardVisionTag}>视觉</Text>}
        {item.customBaseUrl ? <Text style={styles.cardTag}>自定义</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={agents}
        renderItem={renderAgent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <EmptyAgentsIcon size={80} color={ICON_TONES.primary} opacity={0.26} strokeWidth={1.1} />
            </View>
            <Text style={styles.emptyText}>暂无成员</Text>
            <Text style={styles.emptyHint}>添加 AI Agent 开始协作</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.addBtn, { bottom: insets.bottom + 16 }]}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.addBtnText}>+ 添加成员</Text>
      </TouchableOpacity>

      {/* Modal — 新建成员 */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={[styles.modalHeader, { paddingTop: insets.top + 14 }]}>
              <TouchableOpacity
                onPress={resetForm}
                style={styles.modalHeaderBtn}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>新建成员</Text>
              <TouchableOpacity
                onPress={handleAddAgent}
                style={styles.modalHeaderBtn}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Text style={styles.modalSave}>确定</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.form}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            >
              <Text style={styles.label}>名称</Text>
              <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="如：资料搜集员" placeholderTextColor="#BBB" />

              <Text style={styles.label}>角色设定</Text>
              <TextInput style={[styles.textInput, styles.textArea]} value={persona} onChangeText={setPersona} placeholder="定义 AI 角色和行为风格..." placeholderTextColor="#BBB" multiline numberOfLines={4} />

              <Text style={styles.label}>供应商</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={styles.providerRow}>
                  {PROVIDERS.map((p) => (
                    <TouchableOpacity key={p.value} style={[styles.providerBtn, provider === p.value && styles.providerBtnActive]}
                      onPress={() => handleProviderChange(p.value)}>
                      <Text style={[styles.providerBtnText, provider === p.value && styles.providerBtnTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* API 地址：自定义或 DeepSeek 时显示 */}
              {(provider === 'custom_openai' || provider === 'deepseek') && (
                <>
                  <Text style={styles.label}>API 地址</Text>
                  <TextInput style={styles.textInput} value={customBaseUrl} onChangeText={setCustomBaseUrl}
                    placeholder="https://api.deepseek.com/v1" placeholderTextColor="#BBB" autoCapitalize="none" autoCorrect={false} />
                </>
              )}

              <Text style={styles.label}>模型</Text>
              {/* 模型快捷选择 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(DEFAULT_MODELS[provider] || []).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modelChip, model === m && styles.modelChipActive]}
                      onPress={() => setModel(m)}
                    >
                      <Text style={[styles.modelChipText, model === m && styles.modelChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput style={styles.textInput} value={model} onChangeText={setModel} placeholder="或手动输入模型名称" placeholderTextColor="#BBB" autoCapitalize="none" autoCorrect={false} />

              <Text style={styles.label}>API 密钥</Text>
              <TextInput style={styles.textInput} value={apiKey} onChangeText={(t) => { setApiKey(t); setTestResult(null); }} placeholder="sk-..." placeholderTextColor="#BBB" secureTextEntry autoCapitalize="none" autoCorrect={false} />

              {/* 测试连接按钮 */}
              <TouchableOpacity
                style={[styles.testBtn, isTesting && { opacity: 0.6 }]}
                onPress={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.testBtnText}>⚡ 测试连接</Text>
                )}
              </TouchableOpacity>
              {testResult && (
                <View style={[styles.testResult, testResult.success ? styles.testResultSuccess : styles.testResultFail]}>
                  <Text style={styles.testResultText}>{testResult.success ? '✓ ' : '✗ '}{testResult.message}</Text>
                </View>
              )}

              <Text style={styles.label}>温度 ({temperature})</Text>
              <TextInput style={styles.textInput} value={temperature} onChangeText={setTemperature} placeholder="0.7" placeholderTextColor="#BBB" keyboardType="decimal-pad" />

              <Text style={styles.label}>工具</Text>
              <View style={styles.toolsRow}>
                {AVAILABLE_TOOLS.map((tool) => (
                  <TouchableOpacity key={tool.id} style={[styles.toolChip, selectedTools.includes(tool.id) && styles.toolChipActive]} onPress={() => toggleTool(tool.id)}>
                    <Text style={[styles.toolChipLabel, selectedTools.includes(tool.id) && styles.toolChipLabelActive]}>{tool.label}</Text>
                    <Text style={styles.toolChipDesc}>{tool.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.visionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>图片理解</Text>
                  <Text style={styles.visionHint}>启用后可分析图片内容</Text>
                </View>
                <Switch value={supportsVision} onValueChange={setSupportsVision} trackColor={{ false: '#E5E5E5', true: '#000000' }} thumbColor={supportsVision ? '#FFF' : '#CCC'} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Toast */}
      <Modal visible={toast.visible} transparent animationType="fade">
        <Pressable style={styles.toastOverlay} onPress={() => setToast({ visible: false, message: '' })}>
          <Pressable style={styles.toastCard} onPress={() => {}}>
            <Text style={styles.toastTitle}>提示</Text>
            <Text style={styles.toastMessage}>{toast.message}</Text>
            <TouchableOpacity style={styles.toastBtn} onPress={() => setToast({ visible: false, message: '' })}>
              <Text style={styles.toastBtnText}>确定</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirm Delete */}
      <Modal visible={confirmDelete.visible} transparent animationType="fade">
        <Pressable style={styles.toastOverlay} onPress={() => setConfirmDelete({ visible: false, id: '', name: '' })}>
          <Pressable style={styles.toastCard} onPress={() => {}}>
            <Text style={styles.toastTitle}>确认删除</Text>
            <Text style={styles.toastMessage}>确定要删除「{confirmDelete.name}」吗？</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmDelete({ visible: false, id: '', name: '' })}>
                <Text style={styles.confirmCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDeleteAgent}>
                <Text style={styles.confirmDeleteText}>删除</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyHint: { fontSize: 14, color: '#999' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 22, color: '#CCC', lineHeight: 26 },
  cardPersona: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardTag: { fontSize: 11, color: '#888', backgroundColor: '#F2F2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardToolTag: { fontSize: 11, color: '#2196F3', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardVisionTag: { fontSize: 11, color: '#9C27B0', backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  addBtn: { position: 'absolute', left: 16, right: 16, backgroundColor: '#111', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF' },
  modalHeaderBtn: { minWidth: 48, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  modalCancel: { fontSize: 16, color: '#888' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  modalSave: { fontSize: 16, color: '#111', fontWeight: '700' },
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  textInput: { backgroundColor: '#F6F6F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', borderWidth: 1, borderColor: '#EBEBEB' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  providerRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  providerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: '#E8E8E8' },
  providerBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  providerBtnText: { fontSize: 13, color: '#555', fontWeight: '500' },
  providerBtnTextActive: { color: '#FFF' },
  modelChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: '#E8E8E8' },
  modelChipActive: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  modelChipText: { fontSize: 12, color: '#666' },
  modelChipTextActive: { color: '#2E7D32', fontWeight: '600' },
  testBtn: { marginTop: 12, backgroundColor: '#333', borderRadius: 10, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  testBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  testResult: { marginTop: 8, borderRadius: 10, padding: 12 },
  testResultSuccess: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  testResultFail: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  testResultText: { fontSize: 13, color: '#333', lineHeight: 18 },
  toolsRow: { flexDirection: 'row', gap: 10 },
  toolChip: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F6F6F6', borderWidth: 1.5, borderColor: '#E8E8E8' },
  toolChipActive: { backgroundColor: '#F0F4FF', borderColor: '#3B82F6' },
  toolChipLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 2 },
  toolChipLabelActive: { color: '#1D4ED8' },
  toolChipDesc: { fontSize: 11, color: '#AAA' },
  visionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  visionHint: { fontSize: 12, color: '#AAA', marginTop: 2 },
  toastOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  toastCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '80%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  toastTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 10 },
  toastMessage: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  toastBtn: { backgroundColor: '#111', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  toastBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  confirmBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  confirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F2F2F2', alignItems: 'center' },
  confirmCancelText: { fontSize: 15, color: '#555', fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FF3B30', alignItems: 'center' },
  confirmDeleteText: { fontSize: 15, color: '#FFF', fontWeight: '700' },
});
