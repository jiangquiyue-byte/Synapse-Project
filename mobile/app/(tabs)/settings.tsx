import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAppStore } from '../../stores/useAppStore';
import { api } from '../../services/api';

export default function SettingsScreen() {
  const { backendUrl, setBackendUrl, totalCostUsd, agents } = useAppStore();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'ok' | 'error'
  >('idle');

  const testConnection = async () => {
    if (!urlInput.trim()) {
      Alert.alert('提示', '请输入后端地址');
      return;
    }

    setConnectionStatus('testing');
    setBackendUrl(urlInput.trim().replace(/\/$/, ''));

    try {
      const result = await api.health();
      if (result.status === 'alive') {
        setConnectionStatus('ok');
        Alert.alert('连接成功', `Synapse 后端 v${result.version} 已连接`);
      } else {
        setConnectionStatus('error');
        Alert.alert('连接失败', '后端返回异常状态');
      }
    } catch (e: any) {
      setConnectionStatus('error');
      Alert.alert('连接失败', e.message);
    }
  };

  const statusColors = {
    idle: '#BBB',
    testing: '#F5A623',
    ok: '#4CAF50',
    error: '#F44336',
  };

  const statusLabels = {
    idle: '未连接',
    testing: '测试中...',
    ok: '已连接',
    error: '连接失败',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Backend Connection */}
      <Text style={styles.sectionTitle}>后端连接</Text>
      <View style={styles.card}>
        <Text style={styles.label}>后端地址</Text>
        <TextInput
          style={styles.textInput}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://your-backend.railway.app"
          placeholderTextColor="#BBB"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.connectionRow}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColors[connectionStatus] },
              ]}
            />
            <Text style={styles.statusText}>
              {statusLabels[connectionStatus]}
            </Text>
          </View>
          <TouchableOpacity style={styles.testBtn} onPress={testConnection}>
            <Text style={styles.testBtnText}>测试连接</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cost Dashboard */}
      <Text style={styles.sectionTitle}>费用统计</Text>
      <View style={styles.card}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>总费用</Text>
          <Text style={styles.costValue}>${totalCostUsd.toFixed(6)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>AI 成员数</Text>
          <Text style={styles.costValue}>{agents.length}</Text>
        </View>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>关于</Text>
      <View style={styles.card}>
        <Text style={styles.aboutTitle}>S Y N A P S E</Text>
        <Text style={styles.aboutSubtitle}>突触 · 连接智慧，协同思考</Text>
        <Text style={styles.aboutVersion}>版本 2.0.0</Text>
        <Text style={styles.aboutDesc}>
          多智能体群聊协作系统{'\n'}
          Multi-Agent Collaborative Chat System
        </Text>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#E5E5E5',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
    borderWidth: 0.5,
    borderColor: '#E5E5E5',
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#666',
  },
  testBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  testBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E5E5E5',
  },
  aboutTitle: {
    fontSize: 22,
    fontWeight: '200',
    letterSpacing: 6,
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  aboutSubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  aboutVersion: {
    fontSize: 12,
    color: '#BBB',
    textAlign: 'center',
    marginBottom: 8,
  },
  aboutDesc: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
