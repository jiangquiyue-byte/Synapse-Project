import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import NetInfo from '@react-native-community/netinfo';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Markdown from 'react-native-markdown-display';
import { useAppStore, Message, DiscussionMode } from '../../stores/useAppStore';
import { SSEClient } from '../../services/sseClient';
import { api } from '../../services/api';
import SynapsePulse from '../../components/SynapsePulse';
import { ModelAvatar } from '../../components/ModelAvatars';
import UserIdentitySetup from '../../components/UserIdentitySetup';
import {
  AddPlusIcon,
  CloseCircleIcon,
  DebateModeIcon,
  ICON_TONES,
  ExportDialogIcon,
  JsonFileIcon,
  MarkdownFileIcon,
  PdfFileIcon,
  SendPulseIcon,
  SequentialModeIcon,
  SingleModeIcon,
  SynapseMarkIcon,
  VoteModeIcon,
} from '../../components/SynapseIcons';

const MODE_LABELS: Record<DiscussionMode, string> = {
  sequential: '顺序',
  debate: '辩论',
  vote: '投票',
  single: '指定',
};

const EXPORT_OPTIONS = [
  {
    format: 'markdown' as const,
    title: 'Markdown',
    subtitle: '适合继续编辑、沉淀知识库与二次排版。',
    Icon: MarkdownFileIcon,
  },
  {
    format: 'pdf' as const,
    title: 'PDF',
    subtitle: '适合发送汇报、归档留存与只读分享。',
    Icon: PdfFileIcon,
  },
  {
    format: 'json' as const,
    title: 'JSON',
    subtitle: '适合程序消费、自动化处理与结构化迁移。',
    Icon: JsonFileIcon,
  },
];

function ModeIcon({ mode, color = ICON_TONES.primary }: { mode: DiscussionMode; color?: string }) {
  switch (mode) {
    case 'debate':
      return <DebateModeIcon size={16} color={color} strokeWidth={1} />;
    case 'vote':
      return <VoteModeIcon size={16} color={color} strokeWidth={1} />;
    case 'single':
      return <SingleModeIcon size={16} color={color} strokeWidth={1} />;
    case 'sequential':
    default:
      return <SequentialModeIcon size={16} color={color} strokeWidth={1} />;
  }
}

// User avatar component
function UserAvatar({ nickname, avatarColor, avatarUri, size = 32 }: {
  nickname: string;
  avatarColor: string;
  avatarUri?: string;
  size?: number;
}) {
  if (avatarUri) {
    return (
      <Image
        source={{ uri: avatarUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: avatarColor,
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: '#FFFFFF' }}>
        {nickname ? nickname[0].toUpperCase() : 'U'}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const {
    messages,
    agents,
    addMessage,
    upsertMessage,
    patchMessage,
    isLoading,
    setLoading,
    backendUrl,
    discussionMode,
    setDiscussionMode,
    currentSessionId,
    maxDebateRounds,
    addCost,
    tavilySearchEnabled,
    userNickname,
    userAvatarColor,
    userAvatarUri,
    hasCompletedIdentitySetup,
    setUserIdentity,
  } = useAppStore();

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [showIdentitySetup, setShowIdentitySetup] = useState(!hasCompletedIdentitySetup);
  const [isOffline, setIsOffline] = useState(false);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const sseClient = useRef(new SSEClient());

  useEffect(() => {
    if (!hasCompletedIdentitySetup) setShowIdentitySetup(true);
  }, [hasCompletedIdentitySetup]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  const hasBackend = () => !!(backendUrl || api.getChatStreamUrl());

  // Handle @ input detection
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    // Show @ menu when user types @
    if (text.endsWith('@') && agents.length > 0) {
      setShowAtMenu(true);
    } else if (!text.includes('@')) {
      setShowAtMenu(false);
    }
  }, [agents]);

  const handleAtSelect = useCallback((agentName: string) => {
    setInputText(prev => {
      const lastAt = prev.lastIndexOf('@');
      return prev.substring(0, lastAt) + `@${agentName} `;
    });
    setShowAtMenu(false);
  }, []);

  // ─── Plus Menu Actions ───
  const handleDocumentUpload = useCallback(async () => {
    setShowPlusMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain', 'text/markdown',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      setUploadingDoc(true);
      addMessage({ id: 'sys_' + Date.now(), role: 'system', content: `正在上传: ${file.name}`, timestamp: new Date().toISOString() });
      try {
        const r = await api.uploadDocument(
          { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' },
          currentSessionId
        );
        addMessage({ id: 'sys_' + Date.now(), role: 'system', content: r.status === 'ok' ? `${r.message}` : `上传失败: ${r.message || '未知错误'}`, timestamp: new Date().toISOString() });
      } catch (e: any) {
        addMessage({ id: 'sys_' + Date.now(), role: 'system', content: `上传失败: ${e.message}`, timestamp: new Date().toISOString() });
      }
    } catch (e: any) {
      addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '错误: ' + e.message, timestamp: new Date().toISOString() });
    } finally {
      setUploadingDoc(false);
    }
  }, [currentSessionId]);

  const handleImagePick = useCallback(async () => {
    setShowPlusMenu(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '需要相册访问权限', timestamp: new Date().toISOString() }); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.base64) {
        setSelectedImage({ uri: asset.uri, base64: asset.base64 });
      } else {
        const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        setSelectedImage({ uri: asset.uri, base64: b64 });
      }
    } catch (e: any) {
      addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '错误: ' + e.message, timestamp: new Date().toISOString() });
    }
  }, []);

  const handleExport = useCallback(async (format: 'markdown' | 'pdf' | 'json') => {
    setShowExportMenu(false);
    if (!currentSessionId) {
      addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '当前没有可导出的会话', timestamp: new Date().toISOString() });
      return;
    }

    const url =
      format === 'pdf'
        ? api.exportPdf(currentSessionId)
        : format === 'json'
          ? api.exportJson(currentSessionId)
          : api.exportMarkdown(currentSessionId);

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '导出失败: 当前设备无法打开链接', timestamp: new Date().toISOString() });
        return;
      }
      await Linking.openURL(url);
    } catch (error: any) {
      addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '导出失败: ' + (error?.message || '无法打开链接'), timestamp: new Date().toISOString() });
    }
  }, [currentSessionId]);

  // ─── Send Message ───
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    if (!hasBackend()) { addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '请先在「设置」中配置后端地址', timestamp: new Date().toISOString() }); return; }
    if (agents.length === 0) { addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '请先在「成员」中添加至少一个 Agent', timestamp: new Date().toISOString() }); return; }

    addMessage({ id: 'user_' + Date.now(), role: 'user', content: selectedImage ? `[图片] ${text}` : text, timestamp: new Date().toISOString() });
    setInputText('');
    setShowAtMenu(false);
    setLoading(true);

    let targetAgentId: string | null = null;
    let mode = discussionMode;
    const atMatch = text.match(/@(\S+)/);
    if (atMatch) {
      const t = agents.find((a) => a.name === atMatch[1]);
      if (t) { targetAgentId = t.id; mode = 'single'; }
    }
    const imageBase64 = selectedImage?.base64 || null;
    setSelectedImage(null);

    try {
      await sseClient.current.connect(
        api.getChatStreamUrl(),
        {
          session_id: currentSessionId,
          user_message: text,
          agent_ids: agents.map((a) => a.id),
          mode,
          target_agent_id: targetAgentId,
          max_debate_rounds: maxDebateRounds,
          image_base64: imageBase64,
          inline_agents: agents.map((a) => ({
            id: a.id,
            name: a.name,
            persona: a.persona,
            provider: a.provider,
            model: a.model,
            api_key: a.apiKey,
            sequence_order: a.sequenceOrder,
            tools: tavilySearchEnabled
              ? Array.from(new Set([...(a.tools || []), 'web_search']))
              : (a.tools || []).filter((tool) => tool !== 'web_search'),
            temperature: a.temperature,
            supports_vision: a.supportsVision,
            custom_base_url: a.customBaseUrl || '',
          })),
        },
        (event, data) => {
          if (event === 'agent_start' && data) {
            const messageId = data.message_id || 'msg_' + Date.now() + Math.random();
            upsertMessage({
              id: messageId,
              role: data.agent_id || 'agent',
              agentName: data.agent_name,
              content: '',
              timestamp: new Date().toISOString(),
              isStreaming: true,
            });
          } else if (event === 'token' && data) {
            const messageId = data.message_id;
            if (!messageId) return;
            patchMessage(messageId, {
              role: data.agent_id || 'agent',
              agentName: data.agent_name,
              content: data.content || '',
              isStreaming: true,
            });
          } else if (event === 'agent_message' && data) {
            upsertMessage({
              id: data.id || 'msg_' + Date.now() + Math.random(),
              role: data.role || 'agent',
              agentName: data.agent_name,
              content: data.content,
              timestamp: data.timestamp || new Date().toISOString(),
              tokenCount: data.token_count,
              costUsd: data.cost_usd,
              isStreaming: false,
            });
          } else if (event === 'cost_summary' && data) {
            addCost(data.total_cost_usd || 0);
          } else if (event === 'error' && data) {
            addMessage({ id: 'err_' + Date.now(), role: 'system', content: `错误: ${data.error || data.message || '未知'}`, timestamp: new Date().toISOString() });
          } else if (event === 'agent_error' && data) {
            // 确保显示后端详细错误
            const messageId = data.message_id;
            if (messageId) {
              patchMessage(messageId, {
                role: data.agent_id || 'agent',
                agentName: data.agent_name,
                content: data.error || '未知错误',
                isStreaming: false,
              });
            } else {
              addMessage({ id: 'err_' + Date.now(), role: 'system', content: `[${data.agent_name || 'Agent'} 错误]: ${data.error}`, timestamp: new Date().toISOString() });
            }
          }
        },
        (err) => { addMessage({ id: 'err_' + Date.now(), role: 'system', content: `连接错误: ${err.message}`, timestamp: new Date().toISOString() }); },
        () => { setLoading(false); }
      );
    } catch (e: any) {
      setLoading(false);
      addMessage({ id: 'err_' + Date.now(), role: 'system', content: `发送失败: ${e.message}`, timestamp: new Date().toISOString() });
    }
  }, [
    inputText,
    isLoading,
    agents,
    backendUrl,
    discussionMode,
    currentSessionId,
    selectedImage,
    upsertMessage,
    patchMessage,
    addMessage,
    addCost,
    setLoading,
    tavilySearchEnabled,
  ]);

  // ─── Render Message (群聊布局) ───
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';
    const isSynth = item.role === 'synthesizer';

    if (isSystem) {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }
    if (isSynth) {
      return (
        <View style={styles.synthContainer}>
          <View style={styles.synthHeader}>
            <View style={styles.synthDot} />
            <Text style={styles.synthLabel}>{item.agentName || '综合结论'}</Text>
          </View>
          <View style={styles.synthBody}>
            <Text style={styles.synthText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // Find agent config for model avatar
    const agentCfg = agents.find(a => a.name === item.agentName || a.id === item.role);
    const costCny = item.costUsd ? (item.costUsd * 7.25) : 0;

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        {/* Left: AI official avatar */}
        {!isUser && (
          <View style={styles.aiAvatarWrap}>
            <ModelAvatar model={agentCfg?.model || item.agentName || ''} size={32} />
          </View>
        )}

        {/* Message bubble */}
        <Pressable 
          style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent]}
          onLongPress={() => {
            Clipboard.setStringAsync(item.content);
            alert('已复制消息内容');
          }}
        >
          {!isUser && <Text style={styles.agentLabel}>{item.agentName}</Text>}
          <Markdown
            style={{
              body: [styles.msgText, isUser && styles.msgTextUser],
              paragraph: { marginTop: 0, marginBottom: 0 },
            }}
          >
            {item.content}
          </Markdown>
          {item.tokenCount ? (
            <Text style={styles.tokenText}>
              {item.tokenCount} tokens · ${item.costUsd?.toFixed(6)} / ¥{costCny.toFixed(5)}
            </Text>
          ) : null}
        </Pressable>

        {/* Right: User custom avatar */}
        {isUser && (
          <View style={styles.userAvatarWrap}>
            <UserAvatar
              nickname={userNickname || 'U'}
              avatarColor={userAvatarColor || '#1A1A2E'}
              avatarUri={userAvatarUri}
              size={32}
            />
          </View>
        )}
      </View>
    );
  };

  const cycleModes: DiscussionMode[] = ['sequential', 'debate', 'vote', 'single'];
  const cycleMode = () => {
    const idx = cycleModes.indexOf(discussionMode);
    setDiscussionMode(cycleModes[(idx + 1) % cycleModes.length]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      {/* Identity Setup Modal — 强制门控 */}
      <UserIdentitySetup
        visible={showIdentitySetup}
        onComplete={(identity) => {
          setUserIdentity(identity.nickname, identity.avatarColor, identity.avatarUri);
          setShowIdentitySetup(false);
        }}
      />

      <View style={styles.topActionBar}>
        <TouchableOpacity style={styles.topActionMeta} onPress={() => setShowSessionDrawer(true)}>
          <Text style={styles.topActionTitle}>当前会话 ▾</Text>
          <Text style={styles.topActionSubtitle}>
            {userNickname ? `${userNickname} · ` : ''}{tavilySearchEnabled ? '联网搜索已启用' : '本地对话模式'}
          </Text>
        </TouchableOpacity>
        {isOffline && (
          <View style={{ backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>离线</Text>
          </View>
        )}
        <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportMenu(true)}>
          <ExportDialogIcon size={15} color={ICON_TONES.primary} strokeWidth={1.05} />
          <Text style={styles.exportBtnText}>导出</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyLogo}>
              <SynapseMarkIcon size={80} color={ICON_TONES.primary} opacity={0.26} strokeWidth={1.15} />
            </View>
            <Text style={styles.emptyTitle}>Synapse</Text>
            <Text style={styles.emptySubtitle}>连接智慧，协同思考</Text>
            <Text style={styles.emptyHint}>{agents.length === 0 ? '前往「成员」添加 AI Agent' : '输入问题，开始多智能体群聊'}</Text>
          </View>
        }
      />

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingBar}>
          <SynapsePulse size={20} strokeWidth={1.35} />
          <Text style={styles.loadingText}>思考中...</Text>
        </View>
      )}

      {/* @ Mention popup */}
      {showAtMenu && agents.length > 0 && (
        <View style={styles.atMenuContainer}>
          <Text style={styles.atMenuTitle}>@ 呼唤 Agent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.atMenuScroll}>
            {agents.map((agent) => (
              <TouchableOpacity
                key={agent.id}
                style={styles.atAgentChip}
                onPress={() => handleAtSelect(agent.name)}
              >
                <ModelAvatar model={agent.model} size={24} />
                <Text style={styles.atAgentName}>{agent.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Image preview */}
      {selectedImage && (
        <View style={styles.imgPreview}>
          <Image source={{ uri: selectedImage.uri }} style={styles.imgThumb} />
          <Text style={styles.imgLabel}>已选择图片</Text>
          <TouchableOpacity onPress={() => setSelectedImage(null)}>
            <Text style={styles.imgRemove}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <View style={styles.leftControls}>
          <TouchableOpacity style={styles.plusBtn} onPress={() => setShowPlusMenu(true)} disabled={uploadingDoc || isLoading}>
            <AddPlusIcon size={18} color={uploadingDoc ? ICON_TONES.subtle : ICON_TONES.primary} strokeWidth={1} opacity={uploadingDoc ? 0.82 : 1} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.modePill} onPress={cycleMode}>
            <View style={styles.modeIconWrap}>
              <ModeIcon mode={discussionMode} color={ICON_TONES.primary} />
            </View>
            <Text style={styles.modePillText}>{MODE_LABELS[discussionMode]}</Text>
          </TouchableOpacity>
        </View>

        {/* Text input */}
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="输入消息... 或 @ 呼唤 Agent"
          placeholderTextColor="#999"
          multiline
          maxLength={2000}
          editable={!isLoading}
        />

        {/* Send */}
        <TouchableOpacity style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]} onPress={sendMessage} disabled={isLoading}>
          <SendPulseIcon size={16} color={ICON_TONES.inverse} strokeWidth={1.35} />
        </TouchableOpacity>
      </View>

      <Modal visible={showExportMenu} transparent animationType="fade">
        <Pressable style={styles.exportOverlay} onPress={() => setShowExportMenu(false)}>
          <Pressable style={styles.exportDialog} onPress={() => {}}>
            <View style={styles.exportDialogHeader}>
              <View style={styles.exportDialogTitleWrap}>
                <Text style={styles.exportDialogEyebrow}>导出会话</Text>
                <Text style={styles.exportDialogTitle}>选择导出格式</Text>
              </View>
              <TouchableOpacity style={styles.exportDialogCloseBtn} onPress={() => setShowExportMenu(false)}>
                <CloseCircleIcon size={18} color={ICON_TONES.subtle} strokeWidth={1} />
              </TouchableOpacity>
            </View>

            <Text style={styles.exportDialogSubtitle}>
              当前会话可以导出为可编辑文档、只读归档或结构化数据。选择一种格式后，将直接打开对应导出链接。
            </Text>

            <View style={styles.exportOptionsWrap}>
              {EXPORT_OPTIONS.map((item) => {
                const Icon = item.Icon;
                return (
                  <TouchableOpacity key={item.format} style={styles.exportOptionCard} onPress={() => void handleExport(item.format)}>
                    <View style={styles.exportOptionIconWrap}>
                      <Icon size={20} color={ICON_TONES.primary} strokeWidth={1.05} />
                    </View>
                    <View style={styles.exportOptionTextWrap}>
                      <Text style={styles.exportOptionTitle}>{item.title}</Text>
                      <Text style={styles.exportOptionSubtitle}>{item.subtitle}</Text>
                    </View>
                    <Text style={styles.exportOptionAction}>导出</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Session Drawer */}
      <Modal visible={showSessionDrawer} transparent animationType="slide">
        <Pressable style={styles.menuOverlay} onPress={() => setShowSessionDrawer(false)}>
          <View style={[styles.menuContainer, { width: '80%', height: '50%', backgroundColor: 'white', padding: 20, borderRadius: 16 }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>历史会话</Text>
            <ScrollView>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }} onPress={() => { useAppStore.getState().createNewSession(); setShowSessionDrawer(false); }}>
                <Text style={{ color: '#111', fontWeight: 'bold' }}>+ 新建会话</Text>
              </TouchableOpacity>
              {useAppStore.getState().sessions?.map(s => (
                <TouchableOpacity key={s.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: s.id === currentSessionId ? '#f0f0f0' : 'transparent' }} onPress={() => { useAppStore.getState().switchSession(s.id); setShowSessionDrawer(false); }}>
                  <Text>{s.name || '未命名会话'}</Text>
                  <Text style={{ fontSize: 10, color: '#999' }}>{new Date(s.updatedAt).toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Plus menu modal */}
      <Modal visible={showPlusMenu} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setShowPlusMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleImagePick}>
              <Text style={styles.menuIcon}>图片</Text>
              <Text style={styles.menuLabel}>上传图片</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDocumentUpload}>
              <Text style={styles.menuIcon}>文档</Text>
              <Text style={styles.menuLabel}>上传文档</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  topActionMeta: {
    flex: 1,
  },
  topActionTitle: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  topActionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#444444',
  },
  exportBtn: {
    minWidth: 82,
    height: 34,
    borderRadius: 17,
    borderWidth: 0.9,
    borderColor: '#D7D7D7',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Messages — 群聊布局
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },

  // AI avatar (left side)
  aiAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },

  // User avatar (right side)
  userAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 8,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },

  bubble: { maxWidth: '72%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleUser: { backgroundColor: '#000000', borderBottomRightRadius: 4 },
  bubbleAgent: { backgroundColor: '#F2F2F2', borderBottomLeftRadius: 4 },
  agentLabel: { fontSize: 10, fontWeight: '700', color: '#888', marginBottom: 4 },
  msgText: { fontSize: 14, lineHeight: 20, color: '#333333' },
  msgTextUser: { color: '#FFFFFF' },
  tokenText: { fontSize: 9, color: '#AAA', marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // System
  systemRow: { alignItems: 'center', marginVertical: 6 },
  systemText: { fontSize: 11, color: '#999', backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },

  // Synthesizer
  synthContainer: { marginVertical: 12, marginHorizontal: 4 },
  synthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  synthDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#000000' },
  synthLabel: { fontSize: 11, fontWeight: '700', color: '#666' },
  synthBody: { backgroundColor: '#F8F8F8', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#E5E5E5', borderLeftWidth: 3, borderLeftColor: '#000000' },
  synthText: { fontSize: 13, lineHeight: 20, color: '#333' },

  // Loading
  loadingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 10 },
  loadingText: { fontSize: 12, color: '#999' },

  // @ mention menu
  atMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  atMenuTitle: { fontSize: 10, fontWeight: '700', color: '#999', marginBottom: 6, letterSpacing: 0.3 },
  atMenuScroll: { flexDirection: 'row' },
  atAgentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  atAgentName: { fontSize: 12, fontWeight: '600', color: '#333' },

  // Image preview
  imgPreview: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#F8F8F8', borderTopWidth: 0.5, borderTopColor: '#E5E5E5', gap: 8 },
  imgThumb: { width: 32, height: 32, borderRadius: 6, borderWidth: 0.5, borderColor: '#DDD' },
  imgLabel: { flex: 1, fontSize: 11, color: '#666' },
  imgRemove: { fontSize: 18, color: '#999', paddingHorizontal: 8 },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#E5E5E5' },
  leftControls: { flexDirection: 'row', alignItems: 'center', marginRight: 8, gap: 6 },
  plusBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.9, borderColor: '#D8D8D8', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  modePill: { height: 36, paddingHorizontal: 11, borderRadius: 18, borderWidth: 0.9, borderColor: '#D8D8D8', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F7', flexDirection: 'row', gap: 6 },
  modeIconWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  modePillText: { fontSize: 11, fontWeight: '600', color: '#333' },
  input: { flex: 1, minHeight: 36, maxHeight: 100, backgroundColor: '#F5F5F5', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: '#000000', marginRight: 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CCC' },
  sendIcon: { width: 16, height: 16 },

  // Export dialog
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  exportDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 0.75,
    borderColor: '#E8E8E8',
  },
  exportDialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  exportDialogTitleWrap: {
    flex: 1,
  },
  exportDialogEyebrow: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  exportDialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  exportDialogCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  exportDialogSubtitle: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: '#666666',
  },
  exportOptionsWrap: {
    gap: 12,
    marginTop: 18,
  },
  exportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 0.8,
    borderColor: '#E7E7E7',
    backgroundColor: '#FBFBFB',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  exportOptionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.75,
    borderColor: '#E7E7E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionTextWrap: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  exportOptionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#777777',
  },
  exportOptionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },

  // Plus menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', paddingBottom: 80, paddingHorizontal: 16 },
  menuContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { fontSize: 13, fontWeight: '600', color: '#333', width: 40 },
  menuLabel: { fontSize: 15, color: '#333' },
  menuDivider: { height: 0.5, backgroundColor: '#E5E5E5', marginHorizontal: 16 },

  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyLogo: { width: 80, height: 80, opacity: 0.2, marginBottom: 24 },
  emptyTitle: { fontSize: 28, fontWeight: '300', letterSpacing: 4, color: '#000000', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#999', marginBottom: 24 },
  emptyHint: { fontSize: 12, color: '#BBB' },
});
