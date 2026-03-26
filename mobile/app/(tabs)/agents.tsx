import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useAppStore, Agent } from '../../stores/useAppStore';
import { api } from '../../services/api';

const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'Claude', value: 'claude' },
];

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  claude: 'claude-sonnet-4-20250514',
};

export default function AgentsScreen() {
  const { agents, addAgent, removeAgent, backendUrl } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'claude'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState('0.7');

  const handleAddAgent = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入 Agent 名称');
      return;
    }
    if (!apiKey.trim()) {
      Alert.alert('提示', '请输入 API Key');
      return;
    }

    const newAgent: Agent = {
      id: 'agent_' + Date.now(),
      name: name.trim(),
      persona: persona.trim() || `你是${name.trim()}，请专业地回答问题。`,
      provider,
      model: model || DEFAULT_MODELS[provider],
      apiKey: apiKey.trim(),
      sequenceOrder: agents.length + 1,
      tools: [],
      temperature: parseFloat(temperature) || 0.7,
      avatarColor: '#E0E0E0',
      supportsVision: false,
    };

    // Save to backend if available
    if (backendUrl) {
      try {
        await api.createAgent({
          ...newAgent,
          api_key_encrypted: newAgent.apiKey,
        });
      } catch (e) {
        // Continue with local storage
      }
    }

    addAgent(newAgent);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setName('');
    setPersona('');
    setProvider('openai');
    setModel('gpt-4o-mini');
    setApiKey('');
    setTemperature('0.7');
  };

  const handleDelete = (id: string, agentName: string) => {
    Alert.alert('确认删除', `确定要删除 ${agentName} 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => removeAgent(id),
      },
    ]);
  };

  const renderAgent = ({ item }: { item: Agent }) => (
    <View style={styles.agentCard}>
      <View style={styles.agentHeader}>
        <View style={styles.agentAvatar}>
          <Text style={styles.agentAvatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{item.name}</Text>
          <Text style={styles.agentMeta}>
            {item.provider.toUpperCase()} · {item.model}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.name)}
          style={styles.deleteBtn}
        >
          <Text style={styles.deleteBtnText}>×</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.agentPersona} numberOfLines={2}>
        {item.persona}
      </Text>
      <View style={styles.agentFooter}>
        <Text style={styles.agentOrder}>#{item.sequenceOrder}</Text>
        <Text style={styles.agentTemp}>T={item.temperature}</Text>
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
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyText}>还没有 AI 成员</Text>
            <Text style={styles.emptyHint}>点击下方按钮添加第一个 Agent</Text>
          </View>
        }
      />

      {/* Add button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.addBtnText}>+ 添加 AI 成员</Text>
      </TouchableOpacity>

      {/* Add Agent Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>添加 AI 成员</Text>
            <TouchableOpacity onPress={handleAddAgent}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>名称</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="如：资料搜集员"
              placeholderTextColor="#BBB"
            />

            <Text style={styles.label}>人设 Prompt</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={persona}
              onChangeText={setPersona}
              placeholder="定义 AI 角色和行为风格..."
              placeholderTextColor="#BBB"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>LLM 供应商</Text>
            <View style={styles.providerRow}>
              {PROVIDERS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.providerBtn,
                    provider === p.value && styles.providerBtnActive,
                  ]}
                  onPress={() => {
                    setProvider(p.value as any);
                    setModel(DEFAULT_MODELS[p.value]);
                  }}
                >
                  <Text
                    style={[
                      styles.providerBtnText,
                      provider === p.value && styles.providerBtnTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>模型名称</Text>
            <TextInput
              style={styles.textInput}
              value={model}
              onChangeText={setModel}
              placeholder="gpt-4o-mini"
              placeholderTextColor="#BBB"
            />

            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.textInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-..."
              placeholderTextColor="#BBB"
              secureTextEntry
            />

            <Text style={styles.label}>Temperature ({temperature})</Text>
            <TextInput
              style={styles.textInput}
              value={temperature}
              onChangeText={setTemperature}
              placeholder="0.7"
              placeholderTextColor="#BBB"
              keyboardType="decimal-pad"
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  agentCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#E5E5E5',
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  agentMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '300',
  },
  agentPersona: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  agentFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  agentOrder: {
    fontSize: 11,
    color: '#BBB',
    fontWeight: '600',
  },
  agentTemp: {
    fontSize: 11,
    color: '#BBB',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
  },
  addBtn: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 48,
    backgroundColor: '#000000',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  modalCancel: {
    fontSize: 15,
    color: '#999',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  modalSave: {
    fontSize: 15,
    color: '#000',
    fontWeight: '700',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  providerBtnActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  providerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  providerBtnTextActive: {
    color: '#FFF',
  },
});
