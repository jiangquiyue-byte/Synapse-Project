import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ScrollView, Modal, Switch, Platform, Pressable, KeyboardAvoidingView, Image, Animated, Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Agent } from '../../stores/useAppStore';
import { api } from '../../services/api';
import { EmptyAgentsIcon, ICON_TONES } from '../../components/SynapseIcons';
import { ModelAvatar } from '../../components/ModelAvatars';
import { AI_PROVIDER_PRESETS, getProviderPreset, AIProviderPreset } from '../../config/aiProviders';
import PressableScale from '../../components/PressableScale';
import FadeInView from '../../components/FadeInView';

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
  const [selectedProvider, setSelectedProvider] = useState<AIProviderPreset>(AI_PROVIDER_PRESETS[0]);
  const [model, setModel] = useState(AI_PROVIDER_PRESETS[0].defaultModel);
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [supportsVision, setSupportsVision] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customAvatarUri, setCustomAvatarUri] = useState('');
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [confirmDelete, setConfirmDelete] = useState<{ visible: boolean; id: string; name: string }>({ visible: false, id: '', name: '' });

  const toggleTool = (id: string) => setSelectedTools((p) => p.includes(id) ? p.filter((t) => t !== id) : [...p, id]);

  const handleAddAgent = async () => {
    if (!name.trim()) { setToast({ visible: true, message: '请输入名称' }); return; }
    if (!apiKey.trim()) { setToast({ visible: true, message: '请输入 API Key' }); return; }
    if (selectedProvider.isCustom && !customBaseUrl.trim()) { setToast({ visible: true, message: '请输入 API 地址' }); return; }

    const newAgent: Agent = {
      id: 'agent_' + Date.now(),
      name: name.trim(),
      persona: persona.trim() || `你是${name.trim()}，请专业地回答问题。`,
      provider: selectedProvider.isCustom ? 'custom_openai' : selectedProvider.id as any,
      model: model || selectedProvider.defaultModel,
      apiKey: apiKey.trim(),
      sequenceOrder: agents.length + 1,
      tools: selectedTools,
      temperature: parseFloat(temperature) || 0.7,
      avatarColor: selectedProvider.color,
      supportsVision,
      customBaseUrl: selectedProvider.isCustom ? customBaseUrl.trim() : selectedProvider.baseUrl,
      customAvatarUri: customAvatarUri,
    };

    try {
      await api.createAgent({ ...newAgent, api_key_encrypted: newAgent.apiKey, custom_base_url: newAgent.customBaseUrl });
    } catch (e) {}
    addAgent(newAgent);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false); setName(''); setPersona(''); setSelectedProvider(AI_PROVIDER_PRESETS[0]);
    setModel(AI_PROVIDER_PRESETS[0].defaultModel); setApiKey(''); setTemperature('0.7');
    setSelectedTools([]); setSupportsVision(false); setCustomBaseUrl(''); setCustomAvatarUri('');
  };

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setToast({ visible: true, message: '需要相册访问权限' }); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length) {
        setCustomAvatarUri(result.assets[0].uri);
      }
    } catch (e: any) {
      setToast({ visible: true, message: '选择图片失败: ' + e.message });
    }
  };

  const handleDelete = (id: string, n: string) => {
    setConfirmDelete({ visible: true, id, name: n });
  };

  const confirmDeleteAgent = async () => {
    try { await api.deleteAgent(confirmDelete.id); } catch {}
    removeAgent(confirmDelete.id);
    setConfirmDelete({ visible: false, id: '', name: '' });
  };

  const renderAgent = ({ item, index }: { item: Agent; index: number }) => {
    const preset = AI_PROVIDER_PRESETS.find(p => p.id === item.provider);
    return (
      <FadeInView delay={index * 50} direction="up" distance={15}>
        <PressableScale scaleTo={0.98}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardAvatar}>
                {item.customAvatarUri ? (
                  <Image source={{ uri: item.customAvatarUri }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                ) : (
                  <ModelAvatar model={item.model} size={36} />
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{preset?.name || '自定义'} · {item.model}</Text>
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
            </View>
          </View>
        </PressableScale>
      </FadeInView>
    );
  };

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

      <PressableScale
        style={[styles.addBtn, { bottom: insets.bottom + 16 }]}
        onPress={() => setShowForm(true)}
        scaleTo={0.95}
      >
        <Text style={styles.addBtnText}>+ 添加成员</Text>
      </PressableScale>

      {/* Modal — 新建成员 */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          {/* Header — 使用 insets.top 确保不被状态栏遮挡 */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 14 }]}>
            <TouchableOpacity
              onPress={resetForm}
              style={styles.modalHeaderBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>新建成员</Text>
            <TouchableOpacity
              onPress={handleAddAgent}
              style={styles.modalHeaderBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.modalSave}>确定</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
          <ScrollView
            style={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>名称</Text>
            <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="如：资料搜集员" placeholderTextColor="#BBB" cursorColor="#000000" />

            <Text style={styles.label}>角色设定</Text>
            <TextInput style={[styles.textInput, styles.textArea]} value={persona} onChangeText={setPersona} placeholder="定义 AI 角色和行为风格..." placeholderTextColor="#BBB" multiline numberOfLines={4} cursorColor="#000000" />

            <Text style={styles.label}>供应商</Text>
            <TouchableOpacity style={styles.providerSelector} onPress={() => setShowProviderPicker(true)}>
              <View style={[styles.providerDot, { backgroundColor: selectedProvider.color }]} />
              <Text style={styles.providerSelectorText}>{selectedProvider.name}</Text>
              <Text style={styles.providerSelectorArrow}>▾</Text>
            </TouchableOpacity>

            {selectedProvider.isCustom ? (
              <>
                <Text style={styles.label}>API 地址</Text>
                <TextInput style={styles.textInput} value={customBaseUrl} onChangeText={setCustomBaseUrl}
                  placeholder="https://api.deepseek.com/v1" placeholderTextColor="#BBB" autoCapitalize="none" autoCorrect={false} cursorColor="#000000" />
              </>
            ) : (
              <>
                <Text style={styles.label}>API 地址</Text>
                <View style={styles.baseUrlDisplay}>
                  <Text style={styles.baseUrlText}>{selectedProvider.baseUrl}</Text>
                </View>
              </>
            )}

            <Text style={styles.label}>模型</Text>
            {selectedProvider.models.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelScroll}>
                {selectedProvider.models.map((m) => (
                  <TouchableOpacity key={m} style={[styles.modelChip, model === m && styles.modelChipActive]} onPress={() => setModel(m)}>
                    <Text style={[styles.modelChipText, model === m && styles.modelChipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            <TextInput style={styles.textInput} value={model} onChangeText={setModel} placeholder="模型名称" placeholderTextColor="#BBB" cursorColor="#000000" />

            <Text style={styles.label}>自定义头像</Text>
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarPicker} onPress={handlePickAvatar}>
                {customAvatarUri ? (
                  <Image source={{ uri: customAvatarUri }} style={styles.avatarPreview} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>选择图片</Text>
                  </View>
                )}
              </TouchableOpacity>
              {customAvatarUri ? (
                <View style={styles.avatarActions}>
                  <Text style={styles.avatarSelected}>已选择头像</Text>
                  <TouchableOpacity onPress={() => setCustomAvatarUri('')} style={styles.avatarRemoveBtn}>
                    <Text style={styles.avatarRemoveText}>移除</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.avatarHint}>点击选择自定义头像</Text>
              )}
            </View>

            <Text style={styles.label}>API 密钥</Text>
            <TextInput style={styles.textInput} value={apiKey} onChangeText={setApiKey} placeholder="sk-..." placeholderTextColor="#BBB" secureTextEntry cursorColor="#000000" />

            <Text style={styles.label}>温度 ({temperature})</Text>
            <TextInput style={styles.textInput} value={temperature} onChangeText={setTemperature} placeholder="0.7" placeholderTextColor="#BBB" keyboardType="decimal-pad" cursorColor="#000000" />

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

            <View style={{ height: insets.bottom + 60 }} />
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* Provider Picker Modal */}
      <Modal visible={showProviderPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 14 }]}>
            <TouchableOpacity onPress={() => setShowProviderPicker(false)} style={styles.modalHeaderBtn}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>选择供应商</Text>
            <View style={styles.modalHeaderBtn} />
          </View>
          <FlatList
            data={AI_PROVIDER_PRESETS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.providerCard, selectedProvider.id === item.id && styles.providerCardActive]}
                onPress={() => {
                  setSelectedProvider(item);
                  setModel(item.defaultModel);
                  if (!item.isCustom) setCustomBaseUrl('');
                  setShowProviderPicker(false);
                }}
              >
                <View style={[styles.providerCardDot, { backgroundColor: item.color }]} />
                <View style={styles.providerCardInfo}>
                  <Text style={styles.providerCardName}>{item.name}</Text>
                  <Text style={styles.providerCardDesc}>{item.description}</Text>
                  <Text style={styles.providerCardModels}>{item.models.slice(0, 3).join(' / ')}</Text>
                </View>
                {selectedProvider.id === item.id && <Text style={styles.providerCardCheck}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { padding: 16, paddingBottom: 100 },

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
  addBtn: { position: 'absolute', left: 16, right: 16, height: 48, borderRadius: 24, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  modalHeaderBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalCancel: { fontSize: 15, color: '#999' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#000000' },
  modalSave: { fontSize: 15, fontWeight: '700', color: '#000000', textAlign: 'right' },
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  textInput: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#000000' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  // Provider
  providerSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  providerDot: { width: 12, height: 12, borderRadius: 6 },
  providerSelectorText: { flex: 1, fontSize: 14, color: '#000' },
  providerSelectorArrow: { fontSize: 14, color: '#999' },
  baseUrlDisplay: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  baseUrlText: { fontSize: 12, color: '#666', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modelScroll: { marginBottom: 8 },
  modelChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F5F5F5', marginRight: 8 },
  modelChipActive: { backgroundColor: '#000000' },
  modelChipText: { fontSize: 12, color: '#666' },
  modelChipTextActive: { color: '#FFFFFF' },
  // Provider card
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  providerCardActive: { borderColor: '#000000', backgroundColor: '#F8F8F8' },
  providerCardDot: { width: 16, height: 16, borderRadius: 8, marginRight: 12 },
  providerCardInfo: { flex: 1 },
  providerCardName: { fontSize: 15, fontWeight: '700', color: '#000' },
  providerCardDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  providerCardModels: { fontSize: 10, color: '#999', marginTop: 4 },
  providerCardCheck: { fontSize: 18, color: '#000', fontWeight: '700' },
  // Avatar picker
  avatarSection: { gap: 8 },
  avatarPicker: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarPreview: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#E5E5E5' },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5' },
  avatarPlaceholderText: { fontSize: 10, color: '#999' },
  avatarHint: { fontSize: 12, color: '#999' },
  avatarActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarSelected: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  avatarRemoveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FEE2E2' },
  avatarRemoveText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },

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
  // Toast & Confirm
  toastOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', paddingHorizontal: 40 },
  toastCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' },
  toastTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 8 },
  toastMessage: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  toastBtn: { backgroundColor: '#111', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 },
  toastBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  confirmBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  confirmDeleteBtn: { flex: 1, backgroundColor: '#EF4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
