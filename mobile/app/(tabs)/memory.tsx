import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import { ICON_TONES, MemoryTabIcon, SearchGlobeIcon } from '../../components/SynapseIcons';

type MemoryItem = {
  id?: string;
  session_id?: string;
  role?: string;
  content?: string;
  created_at?: string;
  similarity?: number;
};

export default function MemoryScreen() {
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const sessions = useAppStore((state) => state.sessions);

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [includeCurrentSession, setIncludeCurrentSession] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<MemoryItem[]>([]);
  const [contextPreview, setContextPreview] = useState('');

  const currentSessionTitle = useMemo(() => {
    return sessions.find((item) => item.id === currentSessionId)?.title || '当前会话';
  }, [currentSessionId, sessions]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listMemory(undefined, 60);
      setMemories(Array.isArray(result?.memories) ? result.memories : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setContextPreview('');
      return;
    }

    setLoading(true);
    try {
      const [searchRes, contextRes] = await Promise.all([
        api.searchMemory(trimmed, {
          currentSessionId,
          includeCurrentSession,
          limit: 6,
        }),
        api.previewMemoryContext(trimmed, {
          currentSessionId,
          includeCurrentSession,
          limit: 4,
        }),
      ]);

      setSearchResults(Array.isArray(searchRes?.results) ? searchRes.results : []);
      setContextPreview(contextRes?.context || '暂无可注入的记忆上下文。');
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, includeCurrentSession, query]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <MemoryTabIcon size={22} color={ICON_TONES.primary} strokeWidth={1.1} />
          <Text style={styles.heroTitle}>记忆中心</Text>
        </View>
        <Text style={styles.heroSubtitle}>浏览跨会话记忆、执行语义召回，并预览注入到当前对话的上下文。</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaLabel}>当前会话</Text>
            <Text style={styles.metaValue}>{currentSessionTitle}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaLabel}>记忆总数</Text>
            <Text style={styles.metaValue}>{memories.length}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>语义检索</Text>
      <View style={styles.card}>
        <View style={styles.searchRow}>
          <View style={styles.searchIconWrap}>
            <SearchGlobeIcon size={16} color={ICON_TONES.primary} strokeWidth={1.05} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索历史记忆，例如：用户偏好、长期目标、上次结论"
            placeholderTextColor="#A8A8A8"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.scopeToggle, includeCurrentSession && styles.scopeToggleActive]}
            onPress={() => setIncludeCurrentSession((prev) => !prev)}
          >
            <Text style={[styles.scopeToggleText, includeCurrentSession && styles.scopeToggleTextActive]}>
              {includeCurrentSession ? '已包含当前会话' : '仅检索跨会话记忆'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.searchButton} onPress={runSearch}>
            <Text style={styles.searchButtonText}>开始检索</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#111111" />
            <Text style={styles.loadingText}>正在检索记忆...</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>上下文预览</Text>
      <View style={styles.card}>
        <Text style={styles.contextText}>{contextPreview || '输入查询后，这里会展示注入给模型的记忆上下文预览。'}</Text>
      </View>

      <Text style={styles.sectionTitle}>召回结果</Text>
      <View style={styles.card}>
        {searchResults.length === 0 ? (
          <Text style={styles.placeholderText}>当前还没有检索结果。你可以输入问题测试跨会话召回。</Text>
        ) : (
          searchResults.map((item, index) => (
            <View key={`${item.session_id || 'memory'}_${item.id || index}`} style={[styles.memoryRow, index > 0 && styles.memoryDivider]}>
              <View style={styles.memoryHeader}>
                <Text style={styles.memorySession}>{item.session_id || '未知会话'}</Text>
                <Text style={styles.memoryMeta}>
                  {item.similarity ? `相似度 ${(item.similarity * 100).toFixed(1)}%` : item.role || 'memory'}
                </Text>
              </View>
              <Text style={styles.memoryContent}>{item.content || '（空记忆）'}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>最近记忆</Text>
      <View style={styles.card}>
        {memories.length === 0 ? (
          <Text style={styles.placeholderText}>数据库中暂时还没有可展示的长期记忆。</Text>
        ) : (
          memories.slice(0, 12).map((item, index) => (
            <View key={`${item.session_id || 'overview'}_${item.id || index}`} style={[styles.memoryRow, index > 0 && styles.memoryDivider]}>
              <View style={styles.memoryHeader}>
                <Text style={styles.memorySession}>{item.session_id || '未知会话'}</Text>
                <Text style={styles.memoryMeta}>{item.role || 'memory'}</Text>
              </View>
              <Text style={styles.memoryContent}>{item.content || '（空记忆）'}</Text>
            </View>
          ))
        )}
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
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metaPill: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: '#E6E6E6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  metaLabel: {
    fontSize: 10,
    color: '#8A8A8A',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13,
    color: '#111111',
    fontWeight: '600',
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.75,
    borderColor: '#DDDDDD',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  searchIconWrap: {
    width: 20,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 14,
    color: '#111111',
    paddingLeft: 8,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  scopeToggle: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 0.9,
    borderColor: '#DADADA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scopeToggleActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  scopeToggleText: {
    textAlign: 'center',
    color: '#3C3C3C',
    fontSize: 12,
    fontWeight: '600',
  },
  scopeToggleTextActive: {
    color: '#FFFFFF',
  },
  searchButton: {
    borderRadius: 20,
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#666666',
  },
  contextText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#333333',
  },
  placeholderText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#888888',
  },
  memoryRow: {
    paddingVertical: 10,
  },
  memoryDivider: {
    borderTopWidth: 0.6,
    borderTopColor: '#ECECEC',
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  memorySession: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#111111',
  },
  memoryMeta: {
    fontSize: 10,
    color: '#888888',
  },
  memoryContent: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333333',
  },
});
