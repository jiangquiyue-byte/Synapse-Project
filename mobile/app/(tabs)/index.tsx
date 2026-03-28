import React, { useState, useRef, useCallback } from 'react';
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
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAppStore, Message, DiscussionMode } from '../../stores/useAppStore';
import { SSEClient } from '../../services/sseClient';
import { api } from '../../services/api';

const SEND_ICON = require('../../assets/icons/send-pulse.png');

const MODE_LABELS: Record<DiscussionMode, string> = {
  sequential: 'SEQ',
  debate: 'DBT',
  vote: 'VOT',
  single: '@1',
};

const MODE_FULL: Record<DiscussionMode, string> = {
  sequential: '顺序发言',
  debate: '自由辩论',
  vote: '投票表决',
  single: '指定发言',
};

export default function ChatScreen() {
  const {
    messages, agents, addMessage, isLoading, setLoading,
    backendUrl, discussionMode, setDiscussionMode,
    currentSessionId, maxDebateRounds, addCost,
  } = useAppStore();

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const sseClient = useRef(new SSEClient());

  const hasBackend = () => !!(backendUrl || api.getChatStreamUrl());

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
      addMessage({ id: 'sys_' + Date.now(), role: 'system', content: `上传中: ${file.name}`, timestamp: new Date().toISOString() });
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
      Alert.alert('错误', e.message);
    } finally {
      setUploadingDoc(false);
    }
  }, [currentSessionId]);

  const handleImagePick = useCallback(async () => {
    setShowPlusMenu(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('权限', '需要相册访问权限'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.base64) {
        setSelectedImage({ uri: asset.uri, base64: asset.base64 });
      } else {
        const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        setSelectedImage({ uri: asset.uri, base64: b64 });
      }
    } catch (e: any) {
      Alert.alert('错误', e.message);
    }
  }, []);

  // ─── Send Message ───
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    if (!hasBackend()) { addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '请先在「设置」中配置后端地址', timestamp: new Date().toISOString() }); return; }
    if (agents.length === 0) { addMessage({ id: 'sys_' + Date.now(), role: 'system', content: '请先在「成员」中添加至少一个 Agent', timestamp: new Date().toISOString() }); return; }

    addMessage({ id: 'user_' + Date.now(), role: 'user', content: selectedImage ? `[图片] ${text}` : text, timestamp: new Date().toISOString() });
    setInputText('');
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
        { session_id: currentSessionId, user_message: text, agent_ids: agents.map((a) => a.id), mode, target_agent_id: targetAgentId, max_debate_rounds: maxDebateRounds, image_base64: imageBase64 },
        (event, data) => {
          if (event === 'agent_message' && data) {
            addMessage({ id: data.id || 'msg_' + Date.now() + Math.random(), role: data.role || 'agent', agentName: data.agent_name, content: data.content, timestamp: data.timestamp || new Date().toISOString(), tokenCount: data.token_count, costUsd: data.cost_usd });
          } else if (event === 'cost_summary' && data) { addCost(data.total_cost_usd || 0); }
          else if (event === 'error' && data) { addMessage({ id: 'err_' + Date.now(), role: 'system', content: `错误: ${data.error || data.message || '未知'}`, timestamp: new Date().toISOString() }); }
        },
        (err) => { addMessage({ id: 'err_' + Date.now(), role: 'system', content: `连接错误: ${err.message}`, timestamp: new Date().toISOString() }); },
        () => { setLoading(false); }
      );
    } catch (e: any) {
      setLoading(false);
      addMessage({ id: 'err_' + Date.now(), role: 'system', content: `发送失败: ${e.message}`, timestamp: new Date().toISOString() });
    }
  }, [inputText, isLoading, agents, backendUrl, discussionMode, currentSessionId, selectedImage]);

  // ─── Render ───
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
            <Text style={styles.synthLabel}>{item.agentName || 'SYNAPSE SYNTHESIS'}</Text>
          </View>
          <View style={styles.synthBody}>
            <Text style={styles.synthText}>{item.content}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.agentName || 'A')[0]}</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent]}>
          {!isUser && <Text style={styles.agentLabel}>{item.agentName}</Text>}
          <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{item.content}</Text>
          {item.tokenCount ? <Text style={styles.tokenText}>{item.tokenCount} tok · ${item.costUsd?.toFixed(6)}</Text> : null}
        </View>
      </View>
    );
  };

  const cycleModes: DiscussionMode[] = ['sequential', 'debate', 'vote', 'single'];
  const cycleMode = () => {
    const idx = cycleModes.indexOf(discussionMode);
    setDiscussionMode(cycleModes[(idx + 1) % cycleModes.length]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image source={require('../../assets/icons/tab-chat.png')} style={styles.emptyLogo} resizeMode="contain" />
            <Text style={styles.emptyTitle}>S Y N A P S E</Text>
            <Text style={styles.emptySubtitle}>连接智慧，协同思考</Text>
            <Text style={styles.emptyHint}>{agents.length === 0 ? '前往「成员」添加 AI Agent' : '输入问题，开始多智能体群聊'}</Text>
          </View>
        }
      />

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loadingText}>突触信号传递中...</Text>
        </View>
      )}

      {/* Image preview */}
      {selectedImage && (
        <View style={styles.imgPreview}>
          <Image source={{ uri: selectedImage.uri }} style={styles.imgThumb} />
          <Text style={styles.imgLabel}>图片已选择</Text>
          <TouchableOpacity onPress={() => setSelectedImage(null)}>
            <Text style={styles.imgRemove}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        {/* Plus button */}
        <TouchableOpacity style={styles.plusBtn} onPress={() => setShowPlusMenu(true)} disabled={uploadingDoc || isLoading}>
          <Text style={styles.plusText}>{uploadingDoc ? '...' : '+'}</Text>
        </TouchableOpacity>

        {/* Mode pill */}
        <TouchableOpacity style={styles.modePill} onPress={cycleMode}>
          <Text style={styles.modePillText}>{MODE_LABELS[discussionMode]}</Text>
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          placeholderTextColor="#555"
          multiline
          maxLength={2000}
          editable={!isLoading}
        />

        {/* Send */}
        <TouchableOpacity style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]} onPress={sendMessage} disabled={isLoading}>
          <Image source={SEND_ICON} style={styles.sendIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* Plus menu modal */}
      <Modal visible={showPlusMenu} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setShowPlusMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleImagePick}>
              <Text style={styles.menuIcon}>IMG</Text>
              <Text style={styles.menuLabel}>上传图片</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDocumentUpload}>
              <Text style={styles.menuIcon}>DOC</Text>
              <Text style={styles.menuLabel}>上传文档</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },

  // Messages
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 2, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 0.5, borderColor: '#333' },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#888' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 2 },
  bubbleUser: { backgroundColor: '#1A1A1A', borderWidth: 0.5, borderColor: '#333' },
  bubbleAgent: { backgroundColor: '#0D0D0D', borderWidth: 0.5, borderColor: '#262626' },
  agentLabel: { fontSize: 10, fontWeight: '700', color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  msgText: { fontSize: 14, lineHeight: 20, color: '#E0E0E0' },
  msgTextUser: { color: '#FFFFFF' },
  tokenText: { fontSize: 9, color: '#444', marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // System
  systemRow: { alignItems: 'center', marginVertical: 6 },
  systemText: { fontSize: 11, color: '#555', backgroundColor: '#0A0A0A', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 2, borderWidth: 0.5, borderColor: '#1A1A1A' },

  // Synthesizer
  synthContainer: { marginVertical: 12, marginHorizontal: 4 },
  synthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  synthDot: { width: 8, height: 8, borderRadius: 1, backgroundColor: '#FFFFFF' },
  synthLabel: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 2, textTransform: 'uppercase' },
  synthBody: { backgroundColor: '#0A0A0A', borderRadius: 2, padding: 16, borderWidth: 0.5, borderColor: '#262626', borderLeftWidth: 2, borderLeftColor: '#FFFFFF' },
  synthText: { fontSize: 13, lineHeight: 20, color: '#CCCCCC' },

  // Loading
  loadingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 8 },
  loadingText: { fontSize: 12, color: '#555', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Image preview
  imgPreview: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#0A0A0A', borderTopWidth: 0.5, borderTopColor: '#262626', gap: 8 },
  imgThumb: { width: 32, height: 32, borderRadius: 2, borderWidth: 0.5, borderColor: '#333' },
  imgLabel: { flex: 1, fontSize: 11, color: '#555' },
  imgRemove: { fontSize: 18, color: '#555', paddingHorizontal: 8 },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#000000', borderTopWidth: 0.5, borderTopColor: '#262626' },
  plusBtn: { width: 32, height: 32, borderRadius: 2, borderWidth: 0.5, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  plusText: { fontSize: 18, color: '#888', fontWeight: '300' },
  modePill: { height: 32, paddingHorizontal: 8, borderRadius: 2, borderWidth: 0.5, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 6, backgroundColor: '#0D0D0D' },
  modePillText: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  input: { flex: 1, minHeight: 32, maxHeight: 100, backgroundColor: '#0D0D0D', borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#FFFFFF', borderWidth: 0.5, borderColor: '#262626', marginRight: 6 },
  sendBtn: { width: 32, height: 32, borderRadius: 2, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#333' },
  sendIcon: { width: 18, height: 18, tintColor: '#000000' },

  // Plus menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', paddingBottom: 80, paddingHorizontal: 16 },
  menuContainer: { backgroundColor: '#111111', borderRadius: 2, borderWidth: 0.5, borderColor: '#262626', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 1, width: 36, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  menuLabel: { fontSize: 14, color: '#CCCCCC' },
  menuDivider: { height: 0.5, backgroundColor: '#262626' },

  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyLogo: { width: 80, height: 80, opacity: 0.15, marginBottom: 24, tintColor: '#FFFFFF' },
  emptyTitle: { fontSize: 28, fontWeight: '200', letterSpacing: 8, color: '#FFFFFF', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#555', marginBottom: 24 },
  emptyHint: { fontSize: 12, color: '#333' },
});
