import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
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

const MODE_LABELS: Record<DiscussionMode, string> = {
  sequential: '顺序',
  debate: '辩论',
  vote: '投票',
  single: '指定',
};

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
  const flatListRef = useRef<FlatList>(null);
  const sseClient = useRef(new SSEClient());

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    if (!backendUrl) {
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

    // Add user message
    const userMsg: Message = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setInputText('');
    setLoading(true);

    // Determine target agent for @mention
    let targetAgentId: string | null = null;
    let mode = discussionMode;
    const atMatch = text.match(/^@(\S+)/);
    if (atMatch) {
      const targetAgent = agents.find((a) => a.name === atMatch[1]);
      if (targetAgent) {
        targetAgentId = targetAgent.id;
        mode = 'single';
      }
    }

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
  }, [inputText, isLoading, agents, backendUrl, discussionMode, currentSessionId]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
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
          <Text style={styles.loadingText}>AI 正在思考...</Text>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息... (@名称 可指定发言)"
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
          <Text style={styles.sendBtnText}>↑</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    gap: 8,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  modeBtnActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  modeBtnText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
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
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#CCC',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
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
