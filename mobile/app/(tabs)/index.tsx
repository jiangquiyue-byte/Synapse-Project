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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAppStore, Message, DiscussionMode } from '../../stores/useAppStore';
import { SSEClient } from '../../services/sseClient';
import { api } from '../../services/api';

const AGENT_COLORS: Record<string, string> = {};
const COLOR_POOL = ['#F5F5F5', '#EBEBEB', '#E0E0E0', '#D6D6D6', '#CCCCCC'];
let colorIndex = 0;

function getAgentColor(agentName: string): string {
  if (!AGENT_COLORS[agentName]) {
    AGENT_COLORS[agentName] = COLOR_POOL[colorIndex % COLOR_POOL.length];
    colorIndex++;
  }
  return AGENT_COLORS[agentName];
}

const MODE_ICONS: Record<DiscussionMode, any> = {
  sequential: require('../../assets/icons/mode-sequential.png'),
  debate: require('../../assets/icons/mode-debate.png'),
  vote: require('../../assets/icons/mode-vote.png'),
  single: require('../../assets/icons/mode-single.png'),
};

const MODE_LABELS: Record<DiscussionMode, string> = {
  sequential: '顺序',
  debate: '辩论',
  vote: '投票',
  single: '指定',
};

const SEND_ICON = require('../../assets/icons/send-pulse.png');

export default function ChatScreen() {
  const {
    messages,
    agents,
    addMessage,
    isLoading,
    setLoading,
    backendUrl,
    discussionMode,
    setDiscussionMode,
    currentSessionId,
    maxDebateRounds,
    addCost,
  } = useAppStore();

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    base64: string;
  } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const sseClient = useRef(new SSEClient());

  // Check if backend is reachable
  const hasBackend = () => {
    return !!(backendUrl || api.getChatStreamUrl());
  };

  // ─── Document Upload ───
  const handleDocumentUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setUploadingDoc(true);

      addMessage({
        id: 'sys_upload_' + Date.now(),
        role: 'system',
        content: `正在上传文档: ${file.name}...`,
        timestamp: new Date().toISOString(),
      });

      try {
        const uploadResult = await api.uploadDocument(
          { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' },
          currentSessionId
        );

        addMessage({
          id: 'sys_upload_done_' + Date.now(),
          role: 'system',
          content: uploadResult.status === 'ok'
            ? `文档上传成功: ${uploadResult.message}`
            : `文档上传失败: ${uploadResult.message || '未知错误'}`,
          timestamp: new Date().toISOString(),
        });
      } catch (e: any) {
        addMessage({
          id: 'sys_upload_err_' + Date.now(),
          role: 'system',
          content: `文档上传失败: ${e.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      Alert.alert('错误', '选择文档失败: ' + e.message);
    } finally {
      setUploadingDoc(false);
    }
  }, [currentSessionId]);

  // ─── Image Picker ───
  const handleImagePick = useCallback(async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('权限', '需要相册访问权限来选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      if (asset.base64) {
        setSelectedImage({ uri: asset.uri, base64: asset.base64 });
      } else {
        // Read file and convert to base64
        const b64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setSelectedImage({ uri: asset.uri, base64: b64 });
      }
    } catch (e: any) {
      Alert.alert('错误', '选择图片失败: ' + e.message);
    }
  }, []);

  const clearSelectedImage = () => setSelectedImage(null);

  // ─── Send Message ───
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    if (!hasBackend()) {
      addMessage({
        id: 'sys_' + Date.now(),
        role: 'system',
        content: '请先在「设置」中配置后端地址',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (agents.length === 0) {
      addMessage({
        id: 'sys_' + Date.now(),
        role: 'system',
        content: '请先在「成员」中添加至少一个 AI Agent',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userMsg: Message = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: selectedImage ? `[图片已附加] ${text}` : text,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setInputText('');
    setLoading(true);

    // Parse @mention
    let targetAgentId: string | null = null;
    let mode = discussionMode;
    const atMatch = text.match(/@(\S+)/);
    if (atMatch) {
      const targetAgent = agents.find((a) => a.name === atMatch[1]);
      if (targetAgent) {
        targetAgentId = targetAgent.id;
        mode = 'single';
      }
    }

    const imageBase64 = selectedImage?.base64 || null;
    clearSelectedImage();

    try {
      await sseClient.current.connect(
        api.getChatStreamUrl(),
        {
          session_id: currentSessionId,
          user_message: text,
          agent_ids: agents.map((a) => a.id),
          mode: mode,
          target_agent_id: targetAgentId,
          max_debate_rounds: maxDebateRounds,
          image_base64: imageBase64,
        },
        (event, data) => {
          if (event === 'agent_message' && data) {
            addMessage({
              id: data.id || 'msg_' + Date.now() + Math.random(),
              role: data.role || 'agent',
              agentName: data.agent_name,
              content: data.content,
              timestamp: data.timestamp || new Date().toISOString(),
              tokenCount: data.token_count,
              costUsd: data.cost_usd,
            });
          } else if (event === 'cost_summary' && data) {
            addCost(data.total_cost_usd || 0);
          } else if (event === 'error' && data) {
            addMessage({
              id: 'err_' + Date.now(),
              role: 'system',
              content: `错误: ${data.error || '未知错误'}`,
              timestamp: new Date().toISOString(),
            });
          }
        },
        (err) => {
          addMessage({
            id: 'err_' + Date.now(),
            role: 'system',
            content: `连接错误: ${err.message}`,
            timestamp: new Date().toISOString(),
          });
        },
        () => {
          setLoading(false);
        }
      );
    } catch (e: any) {
      setLoading(false);
      addMessage({
        id: 'err_' + Date.now(),
        role: 'system',
        content: `发送失败: ${e.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  }, [inputText, isLoading, agents, backendUrl, discussionMode, currentSessionId, selectedImage]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';
    const isSynthesizer = item.role === 'synthesizer';

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    // Synthesizer gets a special full-width card style
    if (isSynthesizer) {
      return (
        <View style={styles.synthesizerContainer}>
          <View style={styles.synthesizerHeader}>
            <View style={styles.synthesizerIcon}>
              <Text style={styles.synthesizerIconText}>S</Text>
            </View>
            <Text style={styles.synthesizerTitle}>
              {item.agentName || 'Synapse 综合结论'}
            </Text>
          </View>
          <View style={styles.synthesizerBubble}>
            <Text style={styles.synthesizerText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.msgRow,
          isUser ? styles.msgRowRight : styles.msgRowLeft,
        ]}
      >
        {!isUser && (
          <View
            style={[
              styles.avatar,
              { backgroundColor: getAgentColor(item.agentName || 'Agent') },
            ]}
          >
            <Text style={styles.avatarText}>
              {(item.agentName || 'A').charAt(0)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAgent,
          ]}
        >
          {!isUser && (
            <Text style={styles.agentName}>{item.agentName || 'Agent'}</Text>
          )}
          <Text style={[styles.msgText, isUser && styles.msgTextUser]}>
            {item.content}
          </Text>
          {item.tokenCount ? (
            <Text style={styles.tokenInfo}>
              {item.tokenCount} tokens · ${item.costUsd?.toFixed(6)}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  // Mode description
  const getModeHint = (): string => {
    switch (discussionMode) {
      case 'debate':
        return `辩论模式 · ${maxDebateRounds} 轮交锋`;
      case 'vote':
        return '投票模式 · 独立回答后综合';
      case 'single':
        return '指定模式 · @名称 指定发言';
      default:
        return '顺序模式 · 依次发言';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Mode selector bar */}
      <View style={styles.modeBar}>
        {(['sequential', 'debate', 'vote', 'single'] as DiscussionMode[]).map(
          (mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeBtn,
                discussionMode === mode && styles.modeBtnActive,
              ]}
              onPress={() => setDiscussionMode(mode)}
            >
              <Image
                source={MODE_ICONS[mode]}
                style={[
                  styles.modeIcon,
                  discussionMode === mode && styles.modeIconActive,
                ]}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.modeBtnText,
                  discussionMode === mode && styles.modeBtnTextActive,
                ]}
              >
                {MODE_LABELS[mode]}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Mode hint bar */}
      <View style={styles.modeHintBar}>
        <Text style={styles.modeHintText}>{getModeHint()}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image
              source={require('../../assets/icons/tab-chat.png')}
              style={styles.emptyLogo}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>S Y N A P S E</Text>
            <Text style={styles.emptySubtitle}>连接智慧，协同思考</Text>
            <Text style={styles.emptyHint}>
              {agents.length === 0
                ? '请先前往「成员」添加 AI Agent'
                : '输入问题，开始多智能体群聊'}
            </Text>
          </View>
        }
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.loadingText}>突触信号传递中...</Text>
        </View>
      )}

      {/* Selected image preview */}
      {selectedImage && (
        <View style={styles.imagePreviewBar}>
          <Image
            source={{ uri: selectedImage.uri }}
            style={styles.imagePreviewThumb}
          />
          <Text style={styles.imagePreviewText}>图片已选择</Text>
          <TouchableOpacity onPress={clearSelectedImage}>
            <Text style={styles.imagePreviewRemove}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar with attachment buttons */}
      <View style={styles.inputBar}>
        {/* Document upload button */}
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handleDocumentUpload}
          disabled={uploadingDoc || isLoading}
        >
          <Text style={styles.attachBtnText}>
            {uploadingDoc ? '...' : '📎'}
          </Text>
        </TouchableOpacity>

        {/* Image picker button */}
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handleImagePick}
          disabled={isLoading}
        >
          <Text style={styles.attachBtnText}>🖼</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={
            discussionMode === 'single'
              ? '输入 @名称 消息内容...'
              : '输入消息... (@名称 可指定发言)'
          }
          placeholderTextColor="#999"
          multiline
          maxLength={2000}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={isLoading}
        >
          <Image
            source={SEND_ICON}
            style={styles.sendIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modeBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  modeIcon: {
    width: 24,
    height: 24,
    tintColor: '#666',
  },
  modeIconActive: {
    tintColor: '#FFFFFF',
  },
  modeBtnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  modeHintBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  modeHintText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#000000',
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
  },
  agentName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#000000',
  },
  msgTextUser: {
    color: '#FFFFFF',
  },
  tokenInfo: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  systemMsgContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMsgText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  // Synthesizer special styles
  synthesizerContainer: {
    marginVertical: 12,
    marginHorizontal: 4,
  },
  synthesizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  synthesizerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  synthesizerIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  synthesizerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  synthesizerBubble: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderLeftWidth: 3,
    borderLeftColor: '#000',
  },
  synthesizerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#000',
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
  },
  // Image preview bar
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    gap: 8,
  },
  imagePreviewThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  imagePreviewText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  imagePreviewRemove: {
    fontSize: 20,
    color: '#999',
    paddingHorizontal: 8,
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  attachBtn: {
    width: 36,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtnText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    marginHorizontal: 4,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#CCC',
  },
  sendIcon: {
    width: 26,
    height: 26,
    tintColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyLogo: {
    width: 96,
    height: 96,
    opacity: 0.3,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '200',
    letterSpacing: 8,
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  emptyHint: {
    fontSize: 13,
    color: '#BBB',
  },
});
