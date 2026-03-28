import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { useAppStore } from '../../stores/useAppStore';
import { api } from '../../services/api';

const SETTINGS_ICON = require('../../assets/icons/tab-settings.png');
const CHAT_ICON = require('../../assets/icons/tab-chat.png');
const AGENTS_ICON = require('../../assets/icons/tab-agents.png');

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

  const statusColors = { idle: '#333', testing: '#888', ok: '#FFFFFF', error: '#555' };
  const statusLabels = { idle: 'OFFLINE', testing: 'PROBING...', ok: 'CONNECTED', error: 'SIGNAL LOST' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection */}
      <View style={styles.sectionHeader}>
        <Image source={CHAT_ICON} style={styles.sectionIcon} resizeMode="contain" />
        <Text style={styles.sectionTitle}>SYNAPSE LINK</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>ENDPOINT</Text>
        <TextInput style={styles.textInput} value={urlInput} onChangeText={setUrlInput}
          placeholder="https://synapse-project-seven.vercel.app" placeholderTextColor="#333" autoCapitalize="none" autoCorrect={false} />
        <View style={styles.connectionRow}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[connectionStatus] }]} />
            <Text style={styles.statusText}>{statusLabels[connectionStatus]}</Text>
          </View>
          <TouchableOpacity style={styles.testBtn} onPress={testConnection}>
            <Text style={styles.testBtnText}>PROBE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.sectionHeader}>
        <Image source={AGENTS_ICON} style={styles.sectionIcon} resizeMode="contain" />
        <Text style={styles.sectionTitle}>ENERGY STATS</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>TOTAL COST</Text>
          <Text style={styles.costValue}>${totalCostUsd.toFixed(6)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>NEURONS</Text>
          <Text style={styles.costValue}>{agents.length}</Text>
        </View>
      </View>

      {/* About */}
      <View style={styles.sectionHeader}>
        <Image source={SETTINGS_ICON} style={styles.sectionIcon} resizeMode="contain" />
        <Text style={styles.sectionTitle}>ABOUT</Text>
      </View>
      <View style={styles.card}>
        <Image source={SETTINGS_ICON} style={styles.aboutLogo} resizeMode="contain" />
        <Text style={styles.aboutTitle}>S Y N A P S E</Text>
        <Text style={styles.aboutSubtitle}>突触 · 连接智慧，协同思考</Text>
        <Text style={styles.aboutVersion}>v2.1.0</Text>
        <Text style={styles.aboutDesc}>
          Multi-Agent Collaborative Chat System{'\n'}
          多智能体群聊协作系统
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 16, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 20, gap: 8 },
  sectionIcon: { width: 22, height: 22, opacity: 0.3, tintColor: '#FFFFFF' },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  card: { backgroundColor: '#0A0A0A', borderRadius: 2, padding: 16, borderWidth: 0.5, borderColor: '#262626' },
  label: { fontSize: 10, fontWeight: '700', color: '#555', marginBottom: 6, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  textInput: { backgroundColor: '#0D0D0D', borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#FFFFFF', borderWidth: 0.5, borderColor: '#262626' },
  connectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 1 },
  statusText: { fontSize: 10, color: '#555', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1 },
  testBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF', borderRadius: 2 },
  testBtnText: { color: '#000000', fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  costLabel: { fontSize: 10, color: '#555', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1 },
  costValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  divider: { height: 0.5, backgroundColor: '#262626' },
  aboutLogo: { width: 72, height: 72, opacity: 0.1, alignSelf: 'center', marginBottom: 16, tintColor: '#FFFFFF' },
  aboutTitle: { fontSize: 22, fontWeight: '200', letterSpacing: 6, color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  aboutSubtitle: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 12 },
  aboutVersion: { fontSize: 10, color: '#333', textAlign: 'center', marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1 },
  aboutDesc: { fontSize: 12, color: '#444', textAlign: 'center', lineHeight: 18 },
});
