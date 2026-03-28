import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { useAppStore } from '../../stores/useAppStore';
import { api } from '../../services/api';

export default function SettingsScreen() {
  const { backendUrl, setBackendUrl, totalCostUsd, agents } = useAppStore();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');

  const testConnection = async () => {
    if (!urlInput.trim()) { Alert.alert('提示', '请输入后端地址'); return; }
    setConnectionStatus('testing');
    setBackendUrl(urlInput.trim().replace(/\/$/, ''));
    try {
      const result = await api.health();
      if (result.status === 'alive') {
        setConnectionStatus('ok');
        Alert.alert('连接成功', `Synapse v${result.version}`);
      } else {
        setConnectionStatus('error');
        Alert.alert('连接失败', '后端返回异常状态');
      }
    } catch (e: any) {
      setConnectionStatus('error');
      Alert.alert('连接失败', e.message);
    }
  };

  const statusColors = { idle: '#CCC', testing: '#999', ok: '#4CAF50', error: '#F44336' };
  const statusLabels = { idle: '未连接', testing: '检测中...', ok: '已连接', error: '连接失败' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection */}
      <Text style={styles.sectionTitle}>后端连接</Text>
      <View style={styles.card}>
        <Text style={styles.label}>服务器地址</Text>
        <TextInput style={styles.textInput} value={urlInput} onChangeText={setUrlInput}
          placeholder="https://synapse-project-seven.vercel.app" placeholderTextColor="#BBB" autoCapitalize="none" autoCorrect={false} />
        <View style={styles.connectionRow}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[connectionStatus] }]} />
            <Text style={styles.statusText}>{statusLabels[connectionStatus]}</Text>
          </View>
          <TouchableOpacity style={styles.testBtn} onPress={testConnection}>
            <Text style={styles.testBtnText}>测试连接</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>使用统计</Text>
      <View style={styles.card}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>累计花费</Text>
          <Text style={styles.costValue}>${totalCostUsd.toFixed(6)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>成员数量</Text>
          <Text style={styles.costValue}>{agents.length}</Text>
        </View>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>关于</Text>
      <View style={styles.card}>
        <Text style={styles.aboutTitle}>Synapse</Text>
        <Text style={styles.aboutSubtitle}>突触 · 连接智慧，协同思考</Text>
        <Text style={styles.aboutVersion}>v2.1.0</Text>
        <Text style={styles.aboutDesc}>
          多智能体群聊协作系统{'\n'}
          Multi-Agent Collaborative Chat
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 8, marginTop: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#E5E5E5' },
  label: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 6 },
  textInput: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#000000' },
  connectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: '#666' },
  testBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#000000', borderRadius: 20 },
  testBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  costLabel: { fontSize: 13, color: '#666' },
  costValue: { fontSize: 17, fontWeight: '700', color: '#000000', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  divider: { height: 0.5, backgroundColor: '#E5E5E5' },
  aboutTitle: { fontSize: 24, fontWeight: '300', letterSpacing: 4, color: '#000000', textAlign: 'center', marginBottom: 4, marginTop: 8 },
  aboutSubtitle: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 12 },
  aboutVersion: { fontSize: 11, color: '#BBB', textAlign: 'center', marginBottom: 8 },
  aboutDesc: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 },
});
