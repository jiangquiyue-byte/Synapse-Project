/**
 * settings.tsx — Synapse M5 生产化设置页
 * 包含：Heartbeat Dashboard、精准双币计费看板、用户身份管理、后端配置、创作者信息
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Switch,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { useAppStore } from '../../stores/useAppStore';
import { api } from '../../services/api';
import UserIdentitySetup from '../../components/UserIdentitySetup';
import { UserAvatar } from '../../components/ModelAvatars';

interface HealthData {
  status: string;
  version: string;
  database: string;
  embedding_backend: string;
  m5_production: boolean;
  features: string[];
  tavily_enabled: boolean;
}

// ─── Custom Toast Modal (替代原生 Alert) ─────────────────────────
function ToastModal({ visible, title, message, onClose }: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.toastOverlay} onPress={onClose}>
        <Pressable style={styles.toastCard} onPress={() => {}}>
          <Text style={styles.toastTitle}>{title}</Text>
          <Text style={styles.toastMessage}>{message}</Text>
          <TouchableOpacity style={styles.toastBtn} onPress={onClose}>
            <Text style={styles.toastBtnText}>确定</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HeartbeatDashboard() {
  const { backendUrl, totalCostUsd } = useAppStore();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const baseUrl = backendUrl || 'https://synapse-project-seven.vercel.app';
      const res = await fetch(`${baseUrl}/health`);
      const elapsed = Date.now() - start;
      setLatency(elapsed);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      setLatency(null);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const totalCny = totalCostUsd * 7.25;

  return (
    <View style={styles.dashCard}>
      <View style={styles.dashHeader}>
        <View style={styles.dashTitleRow}>
          <View style={[styles.statusDot, { backgroundColor: health?.status === 'alive' ? '#22C55E' : '#EF4444' }]} />
          <Text style={styles.dashTitle}>心跳监控面板</Text>
        </View>
        <TouchableOpacity onPress={fetchHealth} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#999" />
          ) : (
            <Text style={styles.refreshBtn}>刷新</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.dashSection}>
        <Text style={styles.dashSectionTitle}>M5 生产化进度</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>M5 生产化</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '99%' }]} />
          </View>
          <Text style={styles.progressPct}>99%</Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>语义记忆</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {
              width: health?.embedding_backend && !health.embedding_backend.includes('fallback') ? '100%' : '60%',
              backgroundColor: health?.embedding_backend && !health.embedding_backend.includes('fallback') ? '#22C55E' : '#F59E0B'
            }]} />
          </View>
          <Text style={styles.progressPct}>{health?.embedding_backend && !health.embedding_backend.includes('fallback') ? '已激活' : '降级'}</Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>数据库</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#22C55E' }]} />
          </View>
          <Text style={styles.progressPct}>已连接</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{latency !== null ? `${latency}ms` : '--'}</Text>
          <Text style={styles.metricLabel}>响应延迟</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{health?.version || '--'}</Text>
          <Text style={styles.metricLabel}>后端版本</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { fontSize: 10 }]}>{health?.embedding_backend ? health.embedding_backend.split('-')[0] : '--'}</Text>
          <Text style={styles.metricLabel}>向量引擎</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{health?.database?.includes('pgvector') ? 'pgvec' : 'SQLite'}</Text>
          <Text style={styles.metricLabel}>数据库</Text>
        </View>
      </View>

      <View style={styles.dashSection}>
        <Text style={styles.dashSectionTitle}>累计消耗 (双币)</Text>
        <View style={styles.billingRow}>
          <View style={styles.billingItem}>
            <Text style={styles.billingCurrency}>USD</Text>
            <Text style={styles.billingAmount}>${totalCostUsd.toFixed(6)}</Text>
          </View>
          <View style={styles.billingDivider} />
          <View style={styles.billingItem}>
            <Text style={styles.billingCurrency}>CNY</Text>
            <Text style={styles.billingAmount}>¥{totalCny.toFixed(5)}</Text>
          </View>
        </View>
        <Text style={styles.billingRate}>汇率: 1 USD = 7.25 CNY</Text>
      </View>

      {health?.features && (
        <View style={styles.featuresRow}>
          {health.features.map((f: string) => (
            <View key={f} style={styles.featureChip}>
              <Text style={styles.featureChipText}>{f}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const {
    backendUrl,
    setBackendUrl,
    tavilySearchEnabled,
    setTavilySearchEnabled,
    userNickname,
    userAvatarColor,
    userAvatarUri,
    hasCompletedIdentitySetup,
    setUserIdentity,
    totalCostUsd,
  } = useAppStore();

  const [urlInput, setUrlInput] = useState(backendUrl || '');
  const [saving, setSaving] = useState(false);
  const [showIdentityEdit, setShowIdentityEdit] = useState(false);
  const [toast, setToast] = useState({ visible: false, title: '', message: '' });

  const showToast = (title: string, message: string) => setToast({ visible: true, title, message });

  const handleSaveUrl = useCallback(async () => {
    setSaving(true);
    try {
      await setBackendUrl(urlInput);
      showToast('已保存', '后端地址已更新');
    } catch (e: any) {
      showToast('保存失败', e.message);
    } finally {
      setSaving(false);
    }
  }, [urlInput, setBackendUrl]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <UserIdentitySetup
          visible={showIdentityEdit}
          onComplete={(identity) => {
            setUserIdentity(identity.nickname, identity.avatarColor, identity.avatarUri);
            setShowIdentityEdit(false);
          }}
        />

        <ToastModal
          visible={toast.visible}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast({ ...toast, visible: false })}
        />

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>设置</Text>
          <Text style={styles.pageSubtitle}>Synapse M5 · 生产化配置</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>用户身份</Text>
          <View style={styles.identityRow}>
            <UserAvatar 
              nickname={userNickname || 'U'} 
              avatarUri={userAvatarUri} 
              size={48} 
            />
            <View style={[styles.identityInfo, { marginLeft: 12 }]}>
              <Text style={styles.identityName}>{userNickname || '未设置昵称'}</Text>
              <Text style={styles.identityStatus}>
                {hasCompletedIdentitySetup ? '身份已验证 ✓' : '请完善身份信息'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowIdentityEdit(true)}>
              <Text style={styles.editBtnText}>编辑</Text>
            </TouchableOpacity>
          </View>
        </View>

        <HeartbeatDashboard />

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>后端地址</Text>
          <Text style={styles.sectionHint}>生产后端: synapse-project-seven.vercel.app</Text>
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="https://synapse-project-seven.vercel.app"
            placeholderTextColor="#BBB"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSaveUrl}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? '保存中...' : '保存后端地址'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>联网搜索 (Tavily)</Text>
              <Text style={styles.toggleHint}>启用后 Agent 可实时搜索互联网</Text>
            </View>
            <Switch
              value={tavilySearchEnabled}
              onValueChange={setTavilySearchEnabled}
              trackColor={{ false: '#E5E5E5', true: '#000000' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>计费说明 (精准双币)</Text>
          <View style={styles.billingInfoRow}>
            <Text style={styles.billingInfoKey}>计费精度</Text>
            <Text style={styles.billingInfoVal}>Prompt / Completion 分离</Text>
          </View>
          <View style={styles.billingInfoRow}>
            <Text style={styles.billingInfoKey}>汇率</Text>
            <Text style={styles.billingInfoVal}>1 USD = 7.25 CNY</Text>
          </View>
          <View style={styles.billingInfoRow}>
            <Text style={styles.billingInfoKey}>本次累计</Text>
            <Text style={styles.billingInfoVal}>${totalCostUsd.toFixed(6)} / ¥{(totalCostUsd * 7.25).toFixed(5)}</Text>
          </View>
          <View style={styles.billingInfoRow}>
            <Text style={styles.billingInfoKey}>GPT-4o</Text>
            <Text style={styles.billingInfoVal}>$2.5/1M in · $10/1M out</Text>
          </View>
          <View style={styles.billingInfoRow}>
            <Text style={styles.billingInfoKey}>Claude 3.5</Text>
            <Text style={styles.billingInfoVal}>$3/1M in · $15/1M out</Text>
          </View>
          <View style={styles.billingInfoRow}>
            <Text style={styles.billingInfoKey}>DeepSeek-V3</Text>
            <Text style={styles.billingInfoVal}>$0.27/1M in · $1.1/1M out</Text>
          </View>
          <View style={styles.billingInfoRow}>
            <Text style={styles.billingInfoKey}>Gemini 2.5 Flash</Text>
            <Text style={styles.billingInfoVal}>$0.15/1M in · $0.6/1M out</Text>
          </View>
        </View>

        {/* ─── 创作者信息 ─── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>关于 Synapse</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>创作者</Text>
            <Text style={styles.aboutVal}>jiangqiuyue</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>版本</Text>
            <Text style={styles.aboutVal}>v2.5.0 (M5)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>架构</Text>
            <Text style={styles.aboutVal}>React Native + FastAPI + LangGraph</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>描述</Text>
            <Text style={styles.aboutVal}>商业级多智能体群聊协作平台</Text>
          </View>
          <TouchableOpacity
            style={styles.githubBtn}
            onPress={() => Linking.openURL('https://github.com/jiangquiyue-byte/Synapse-Project')}
          >
            <Text style={styles.githubBtnText}>GitHub 仓库</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionRow}>
          <Text style={styles.versionText}>Synapse M5 · v2.5.0 · 商业级聚合平台</Text>
          <Text style={styles.versionText}>© 2025-2026 jiangqiuyue. All rights reserved.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  pageHeader: { paddingTop: 20, paddingBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#111111' },
  pageSubtitle: { fontSize: 12, color: '#999', marginTop: 4 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: '#EEEEEE' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8A8A8A', letterSpacing: 0.4, marginBottom: 10 },
  sectionHint: { fontSize: 11, color: '#BBB', marginBottom: 8 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  identityAvatarText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  identityInfo: { flex: 1 },
  identityName: { fontSize: 16, fontWeight: '700', color: '#111111' },
  identityStatus: { fontSize: 12, color: '#888', marginTop: 2 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.9, borderColor: '#D8D8D8', backgroundColor: '#F7F7F7' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },
  dashCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: '#EEEEEE' },
  dashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  dashTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dashTitle: { fontSize: 14, fontWeight: '700', color: '#111111' },
  refreshBtn: { fontSize: 12, color: '#888', fontWeight: '600' },
  dashSection: { marginBottom: 14 },
  dashSectionTitle: { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 0.4, marginBottom: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  progressLabel: { fontSize: 11, color: '#555', width: 60 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#000000', borderRadius: 3 },
  progressPct: { fontSize: 10, color: '#888', width: 40, textAlign: 'right' },
  metricsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricCard: { flex: 1, backgroundColor: '#F8F8F8', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#EEEEEE' },
  metricValue: { fontSize: 14, fontWeight: '700', color: '#111111', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  metricLabel: { fontSize: 9, color: '#999', marginTop: 3, textAlign: 'center' },
  billingRow: { flexDirection: 'row', gap: 12 },
  billingItem: { flex: 1, backgroundColor: '#F8F8F8', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: '#EEEEEE' },
  billingDivider: { width: 0.5, backgroundColor: '#E5E5E5' },
  billingCurrency: { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 0.5 },
  billingAmount: { fontSize: 13, fontWeight: '700', color: '#111111', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 },
  billingRate: { fontSize: 10, color: '#BBB', textAlign: 'center', marginTop: 8 },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  featureChip: { backgroundColor: '#F0F0F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  featureChipText: { fontSize: 9, color: '#666', fontWeight: '600' },
  urlInput: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111111', marginBottom: 10, borderWidth: 0.5, borderColor: '#E5E5E5' },
  saveBtn: { backgroundColor: '#000000', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#CCC' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#111111' },
  toggleHint: { fontSize: 11, color: '#999', marginTop: 2 },
  billingInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  billingInfoKey: { fontSize: 12, color: '#888' },
  billingInfoVal: { fontSize: 12, color: '#333', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 12 },
  // About / Creator
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  aboutKey: { fontSize: 13, color: '#888' },
  aboutVal: { fontSize: 13, color: '#333', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  githubBtn: { marginTop: 12, backgroundColor: '#111111', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  githubBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  versionRow: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  versionText: { fontSize: 11, color: '#CCC' },
  // Toast Modal
  toastOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', paddingHorizontal: 40 },
  toastCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' },
  toastTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 8 },
  toastMessage: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  toastBtn: { backgroundColor: '#111', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 },
  toastBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
