/**
 * UserIdentitySetup.tsx
 * 强制用户身份设置 — 新用户必须设置昵称 + 头像后方可进入会话
 * 支持：文字头像 / 上传图片 / 自定义颜色
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path } from 'react-native-svg';

export interface UserIdentity {
  nickname: string;
  avatarType: 'initial' | 'color' | 'custom';
  avatarColor: string;
  avatarUri?: string;
}

interface Props {
  visible: boolean;
  onComplete: (identity: UserIdentity) => void;
}

const PRESET_COLORS = [
  '#1A1A2E', '#16213E', '#0F3460', '#533483',
  '#2C3E50', '#1B4332', '#6B2737', '#7B3F00',
  '#1A535C', '#4ECDC4', '#FF6B6B', '#C06C84',
];

const AVATAR_EMOJIS = ['🧠', '🤖', '👾', '🦾', '⚡', '🔮', '🌊', '🔥', '💎', '🚀', '🎯', '🌟'];

export default function UserIdentitySetup({ visible, onComplete }: Props) {
  const [nickname, setNickname] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [customAvatarUri, setCustomAvatarUri] = useState('');
  const [step, setStep] = useState<'nickname' | 'avatar'>('nickname');

  const pickCustomAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { alert('需要相册访问权限'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length) {
        setCustomAvatarUri(result.assets[0].uri);
        setSelectedEmoji('');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleNicknameNext = () => {
    if (!nickname.trim()) {
      alert('昵称不能为空，这将是你在 Synapse 中的身份标识。');
      return;
    }
    if (nickname.trim().length > 16) {
      alert('昵称最多 16 个字符。');
      return;
    }
    setStep('avatar');
  };

  const handleComplete = () => {
    onComplete({
      nickname: nickname.trim(),
      avatarType: customAvatarUri ? 'custom' : 'color',
      avatarColor: selectedColor,
      avatarUri: customAvatarUri || selectedEmoji || undefined,
    });
  };

  const renderNicknameStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrap}>
        <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
          <Circle cx="28" cy="28" r="27" stroke="#111" strokeWidth="1.5" />
          <Circle cx="28" cy="22" r="8" stroke="#111" strokeWidth="1.5" fill="none" />
          <Path
            d="M12 44C12 38 19 34 28 34C37 34 44 38 44 44"
            stroke="#111"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>

      <Text style={styles.stepTitle}>欢迎来到 Synapse</Text>
      <Text style={styles.stepSubtitle}>
        在开始之前，请设置你的身份标识。{'\n'}
        这将显示在所有对话中。
      </Text>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>你的昵称</Text>
        <TextInput
          style={styles.nicknameInput}
          value={nickname}
          onChangeText={setNickname}
          placeholder="输入昵称（最多 16 字）"
          placeholderTextColor="#BBB"
          maxLength={16}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={handleNicknameNext}
        />
        <Text style={styles.charCount}>{nickname.length}/16</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !nickname.trim() && styles.primaryBtnDisabled]}
        onPress={handleNicknameNext}
        disabled={!nickname.trim()}
      >
        <Text style={styles.primaryBtnText}>下一步 →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAvatarStep = () => (
    <View style={styles.stepContainer}>
      {/* 预览 */}
      <View style={styles.avatarPreviewWrap}>
        {customAvatarUri ? (
          <Image source={{ uri: customAvatarUri }} style={styles.avatarPreviewImg} />
        ) : (
          <View style={[styles.avatarPreview, { backgroundColor: selectedColor }]}>
            {selectedEmoji ? (
              <Text style={styles.avatarEmoji}>{selectedEmoji}</Text>
            ) : (
              <Text style={styles.avatarInitial}>{nickname[0]?.toUpperCase() || '?'}</Text>
            )}
          </View>
        )}
        <Text style={styles.avatarPreviewName}>{nickname}</Text>
      </View>

      <TouchableOpacity style={styles.pickPhotoBtn} onPress={pickCustomAvatar}>
        <Text style={styles.pickPhotoBtnText}>{customAvatarUri ? '更换自定义头像' : '从相册选择头像'}</Text>
      </TouchableOpacity>
      {customAvatarUri ? (
        <TouchableOpacity style={styles.clearPhotoBtn} onPress={() => setCustomAvatarUri('')}>
          <Text style={styles.clearPhotoBtnText}>移除自定义头像</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionLabel}>选择颜色</Text>
      <View style={styles.colorGrid}>
        {PRESET_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorDot,
              { backgroundColor: color },
              selectedColor === color && styles.colorDotSelected,
            ]}
            onPress={() => setSelectedColor(color)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>选择图标（可选）</Text>
      <View style={styles.emojiGrid}>
        <TouchableOpacity
          style={[styles.emojiBtn, !selectedEmoji && styles.emojiBtnSelected]}
          onPress={() => setSelectedEmoji('')}
        >
          <Text style={styles.emojiText}>{nickname[0]?.toUpperCase() || '?'}</Text>
        </TouchableOpacity>
        {AVATAR_EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[styles.emojiBtn, selectedEmoji === emoji && styles.emojiBtnSelected]}
            onPress={() => setSelectedEmoji(emoji)}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('nickname')}>
          <Text style={styles.backBtnText}>← 返回</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleComplete}>
          <Text style={styles.primaryBtnText}>进入 Synapse ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* 进度指示 */}
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.progressStepActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressStep, step === 'avatar' && styles.progressStepActive]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'nickname' ? renderNicknameStep() : renderAvatarStep()}
        </ScrollView>

        {/* 底部品牌 */}
        <View style={styles.brandFooter}>
          <Text style={styles.brandText}>S Y N A P S E</Text>
          <Text style={styles.brandSub}>连接智慧，协同思考</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    gap: 0,
  },
  progressStep: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
  },
  progressStepActive: {
    backgroundColor: '#111111',
  },
  progressLine: {
    width: 40,
    height: 1.5,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 6,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 20,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputWrap: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  nicknameInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#FAFAFA',
  },
  charCount: {
    fontSize: 11,
    color: '#BBB',
    textAlign: 'right',
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: '#CCC',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Avatar step
  avatarPreviewWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarPreviewImg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    marginBottom: 10,
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '700',
    color: 'white',
  },
  avatarEmoji: {
    fontSize: 38,
  },
  avatarPreviewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#111',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiBtnSelected: {
    borderColor: '#111',
    backgroundColor: '#F0F0F0',
  },
  emojiText: {
    fontSize: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  brandFooter: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingTop: 16,
  },
  pickPhotoBtn: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  pickPhotoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearPhotoBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearPhotoBtnText: {
    fontSize: 12,
    color: '#999',
  },
  brandText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#CCC',
  },
  brandSub: {
    fontSize: 11,
    color: '#DDD',
    marginTop: 4,
  },
});
