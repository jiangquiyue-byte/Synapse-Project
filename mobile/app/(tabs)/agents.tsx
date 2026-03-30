import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ScrollView, Alert, Modal, Switch, Platform,
} from 'react-native';
import { useAppStore, Agent } from '../../stores/useAppStore';
import { api } from '../../services/api';
import { EmptyAgentsIcon, ICON_TONES } from '../../components/SynapseIcons';
import { ModelAvatar } from '../../components/ModelAvatars';

const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'Claude', value: 'claude' },
  { label: '自定义', value: 'custom_openai' },
];

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.5-flash',
  claude: 'claude-sonnet-4-20250514',
  custom_openai: 'deepseek-chat',
};

const AVAILABLE_TOOLS = [
  { id: 'web_search', label: '联网搜索', desc: '实时搜索网页信息' },
  { id: 'rag_query', label: '文档检索', desc: '检索已上传的文档' },
];

export default function AgentsScreen() {
  const { agents, addAgent, removeAgent } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'claude' | 'custom_openai'>('openai');
  const [model, setModel] = useState('gpt-4.1-mini');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [supportsVision, setSupportsVision] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');

  const toggleTool = (id: string) => setSelectedTools((p) => p.includes(id) ? p.filter((t) => t !== id) : [...p, id]);

  const handleAddAgent = async () => {
    if (!name.trim()) { Alert.alert('提示', '请输入名称'); return; }
    if (!apiKey.trim()) { Alert.alert('提示', '请输入 API Key'); return; }
    if (provider === 'custom_openai' && !customBaseUrl.trim()) { Alert.alert('提示', '请输入 API 地址'); return; }

    const newAgent: Agent = {
      id: 'agent_' + Date.now(),
      name: name.trim(),
      persona: persona.trim() || `你是${name.trim()}，请专业地回答问题。`,
      provider,
      model: model || DEFAULT_MODELS[provider],
      apiKey: apiKey.trim(),
      sequenceOrder: agents.length + 1,
      tools: selectedTools,
      temperature: parseFloat(temperature) || 0.7,
      avatarColor: '#F0F0F0',
      supportsVision,
      customBaseUrl: customBaseUrl.trim(),
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
  };

  const handleDelete = (id: string, n: string) => {
    Alert.alert('确认删除', `确定要删除「${n}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => { try { await api.deleteAgent(id); } catch {} removeAgent(id); } },
    ]);
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
        contentContainerStyle={styles.list}
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

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
        <Text style={styles.addBtnText}>+ 添加成员</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetForm}><Text style={styles.modalCancel}>取消</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>新建成员</Text>
            <TouchableOpacity onPress={handleAddAgent}><Text style={styles.modalSave}>确定</Text></TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>名称</Text>
            <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="如：资料搜集员" placeholderTextColor="#BBB" />

            <Text style={styles.label}>角色设定</Text>
            <TextInput style={[styles.textInput, styles.textArea]} value={persona} onChangeText={setPersona} placeholder="定义 AI 角色和行为风格..." placeholderTextColor="#BBB" multiline numberOfLines={4} />

            <Text style={styles.label}>供应商</Text>
            <View style={styles.providerRow}>
              {PROVIDERS.map((p) => (
                <TouchableOpacity key={p.value} style={[styles.providerBtn, provider === p.value && styles.providerBtnActive]}
                  onPress={() => { setProvider(p.value as any); setModel(DEFAULT_MODELS[p.value]); }}>
                  <Text style={[styles.providerBtnText, provider === p.value && styles.providerBtnTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {provider === 'custom_openai' && (
              <>
                <Text style={styles.label}>API 地址</Text>
                <TextInput style={styles.textInput} value={customBaseUrl} onChangeText={setCustomBaseUrl}
                  placeholder="https://api.deepseek.com/v1" placeholderTextColor="#BBB" autoCapitalize="none" autoCorrect={false} />
              </>
            )}

            <Text style={styles.label}>模型</Text>
            <TextInput style={styles.textInput} value={model} onChangeText={setModel} placeholder="模型名称" placeholderTextColor="#BBB" />

            <Text style={styles.label}>API 密钥</Text>
            <TextInput style={styles.textInput} value={apiKey} onChangeText={setApiKey} placeholder="sk-..." placeholderTextColor="#BBB" secureTextEntry />

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

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { padding: 16, paddingBottom: 80 },

  // Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: '#E5E5E5' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardAvatarText: { fontSize: 14, fontWeight: '700', color: '#333' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#000000' },
  cardMeta: { fontSize: 11, color: '#999', marginTop: 2 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { fontSize: 16, color: '#999' },
  cardPersona: { fontSize: 12, color: '#666', marginBottom: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardTag: { fontSize: 10, color: '#999', backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardToolTag: { fontSize: 10, color: '#333', backgroundColor: '#E8E8E8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  cardVisionTag: { fontSize: 10, color: '#FFF', backgroundColor: '#000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { width: 80, height: 80, opacity: 0.2, marginBottom: 24 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginBottom: 8 },
  emptyHint: { fontSize: 12, color: '#BBB' },

  // Add button
  addBtn: { position: 'absolute', bottom: 24, left: 16, right: 16, height: 48, borderRadius: 24, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#E5E5E5' },
  modalCancel: { fontSize: 15, color: '#999' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#000000' },
  modalSave: { fontSize: 15, fontWeight: '700', color: '#000000' },
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  textInput: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#000000' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  // Provider
  providerRow: { flexDirection: 'row', gap: 6 },
  providerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5' },
  providerBtnActive: { backgroundColor: '#000000' },
  providerBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
  providerBtnTextActive: { color: '#FFFFFF' },

  // Tools
  toolsRow: { gap: 8 },
  toolChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F5F5F5', gap: 8 },
  toolChipActive: { backgroundColor: '#000000' },
  toolChipLabel: { fontSize: 12, fontWeight: '700', color: '#333' },
  toolChipLabelActive: { color: '#FFFFFF' },
  toolChipDesc: { fontSize: 11, color: '#999' },

  // Vision
  visionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  visionHint: { fontSize: 11, color: '#999', marginTop: 2 },
});
