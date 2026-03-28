import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image,
  StyleSheet, ScrollView, Alert, Modal, Switch, Platform,
} from 'react-native';
import { useAppStore, Agent } from '../../stores/useAppStore';
import { api } from '../../services/api';

const EMPTY_ICON = require('../../assets/icons/empty-agents.png');
const ADD_ICON = require('../../assets/icons/add-neuron.png');

const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'Claude', value: 'claude' },
  { label: 'Custom', value: 'custom_openai' },
];

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.5-flash',
  claude: 'claude-sonnet-4-20250514',
  custom_openai: 'deepseek-chat',
};

const AVAILABLE_TOOLS = [
  { id: 'web_search', label: 'WEB', desc: '实时搜索网页信息' },
  { id: 'rag_query', label: 'RAG', desc: '检索已上传的文档' },
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
    if (provider === 'custom_openai' && !customBaseUrl.trim()) { Alert.alert('提示', '请输入 API Base URL'); return; }

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
      avatarColor: '#1A1A1A',
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
    Alert.alert('确认删除', `删除 ${n}？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => { try { await api.deleteAgent(id); } catch {} removeAgent(id); } },
    ]);
  };

  const renderAgent = ({ item }: { item: Agent }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{item.name[0]}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardMeta}>{item.provider.toUpperCase()} · {item.model}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>×</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cardPersona} numberOfLines={2}>{item.persona}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTag}>#{item.sequenceOrder}</Text>
        <Text style={styles.cardTag}>T={item.temperature}</Text>
        {item.tools.map((t) => <Text key={t} style={styles.cardToolTag}>{t === 'web_search' ? 'WEB' : 'RAG'}</Text>)}
        {item.supportsVision && <Text style={styles.cardVisionTag}>VIS</Text>}
        {item.customBaseUrl ? <Text style={styles.cardTag}>CUSTOM</Text> : null}
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
            <Image source={EMPTY_ICON} style={styles.emptyIcon} resizeMode="contain" />
            <Text style={styles.emptyText}>NO NEURONS</Text>
            <Text style={styles.emptyHint}>添加 AI Agent 激活突触网络</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
        <Text style={styles.addBtnText}>+ ADD NEURON</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetForm}><Text style={styles.modalCancel}>CANCEL</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>NEW NEURON</Text>
            <TouchableOpacity onPress={handleAddAgent}><Text style={styles.modalSave}>ACTIVATE</Text></TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>NAME</Text>
            <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="如：资料搜集员" placeholderTextColor="#444" />

            <Text style={styles.label}>PERSONA</Text>
            <TextInput style={[styles.textInput, styles.textArea]} value={persona} onChangeText={setPersona} placeholder="定义 AI 角色和行为风格..." placeholderTextColor="#444" multiline numberOfLines={4} />

            <Text style={styles.label}>PROVIDER</Text>
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
                <Text style={styles.label}>API BASE URL</Text>
                <TextInput style={styles.textInput} value={customBaseUrl} onChangeText={setCustomBaseUrl}
                  placeholder="https://api.deepseek.com/v1" placeholderTextColor="#444" autoCapitalize="none" autoCorrect={false} />
              </>
            )}

            <Text style={styles.label}>MODEL</Text>
            <TextInput style={styles.textInput} value={model} onChangeText={setModel} placeholder="model name" placeholderTextColor="#444" />

            <Text style={styles.label}>API KEY</Text>
            <TextInput style={styles.textInput} value={apiKey} onChangeText={setApiKey} placeholder="sk-..." placeholderTextColor="#444" secureTextEntry />

            <Text style={styles.label}>TEMPERATURE ({temperature})</Text>
            <TextInput style={styles.textInput} value={temperature} onChangeText={setTemperature} placeholder="0.7" placeholderTextColor="#444" keyboardType="decimal-pad" />

            <Text style={styles.label}>TOOLS</Text>
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
                <Text style={styles.label}>VISION</Text>
                <Text style={styles.visionHint}>启用图片理解能力</Text>
              </View>
              <Switch value={supportsVision} onValueChange={setSupportsVision} trackColor={{ false: '#262626', true: '#FFFFFF' }} thumbColor={supportsVision ? '#000' : '#555'} />
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  list: { padding: 16, paddingBottom: 80 },

  // Card
  card: { backgroundColor: '#0A0A0A', borderRadius: 2, padding: 16, marginBottom: 10, borderWidth: 0.5, borderColor: '#262626' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardAvatar: { width: 36, height: 36, borderRadius: 2, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 0.5, borderColor: '#333' },
  cardAvatarText: { fontSize: 14, fontWeight: '700', color: '#888' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  cardMeta: { fontSize: 10, color: '#555', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0.5 },
  deleteBtn: { width: 24, height: 24, borderRadius: 2, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#333' },
  deleteBtnText: { fontSize: 14, color: '#555', fontWeight: '300' },
  cardPersona: { fontSize: 12, color: '#666', lineHeight: 16, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardTag: { fontSize: 9, color: '#555', backgroundColor: '#111', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cardToolTag: { fontSize: 9, color: '#888', backgroundColor: '#1A1A1A', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 1, borderWidth: 0.5, borderColor: '#333', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cardVisionTag: { fontSize: 9, color: '#FFF', backgroundColor: '#333', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 1, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { width: 80, height: 80, opacity: 0.15, marginBottom: 24, tintColor: '#FFFFFF' },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#333', letterSpacing: 4, marginBottom: 8 },
  emptyHint: { fontSize: 12, color: '#333' },

  // Add button
  addBtn: { position: 'absolute', bottom: 20, left: 16, right: 16, height: 48, backgroundColor: '#FFFFFF', borderRadius: 2, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#000000', fontSize: 12, fontWeight: '700', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#000000' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#262626' },
  modalCancel: { fontSize: 11, color: '#555', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modalTitle: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modalSave: { fontSize: 11, color: '#FFFFFF', fontWeight: '700', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  form: { padding: 16 },
  label: { fontSize: 10, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 16, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  textInput: { backgroundColor: '#0D0D0D', borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#FFFFFF', borderWidth: 0.5, borderColor: '#262626' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  providerRow: { flexDirection: 'row', gap: 6 },
  providerBtn: { flex: 1, paddingVertical: 10, borderRadius: 2, borderWidth: 0.5, borderColor: '#262626', alignItems: 'center', backgroundColor: '#0A0A0A' },
  providerBtnActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  providerBtnText: { fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  providerBtnTextActive: { color: '#000000' },

  // Tools
  toolsRow: { gap: 6 },
  toolChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 2, borderWidth: 0.5, borderColor: '#262626', backgroundColor: '#0A0A0A' },
  toolChipActive: { borderColor: '#FFFFFF', backgroundColor: '#111' },
  toolChipLabel: { fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  toolChipLabelActive: { color: '#FFFFFF' },
  toolChipDesc: { fontSize: 11, color: '#444', marginTop: 2 },

  // Vision
  visionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingVertical: 8 },
  visionHint: { fontSize: 10, color: '#444', marginTop: 2 },
});
