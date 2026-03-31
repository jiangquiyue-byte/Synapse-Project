import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { setAuthToken } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.login(username.trim(), password.trim());
      if (result.access_token) {
        setAuthToken(result.access_token);
        router.replace('/(tabs)');
      } else {
        setError(result.detail || result.message || '登录失败，请检查用户名和密码');
      }
    } catch (e: any) {
      setError('网络错误，请检查连接后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        {/* Logo 区域 */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>⬡</Text>
          </View>
          <Text style={styles.brandName}>Synapse</Text>
          <Text style={styles.brandTagline}>商业级多智能体协作平台</Text>
        </View>

        {/* 登录表单 */}
        <View style={styles.form}>
          <Text style={styles.label}>用户名</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(t) => { setUsername(t); setError(''); }}
            placeholder="输入用户名"
            placeholderTextColor="#BBB"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>密码</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            placeholder="输入密码"
            placeholderTextColor="#BBB"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>登录</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Synapse v2.1.1 · 单用户专属版</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'space-between' },
  logoArea: { alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  logoText: { fontSize: 36, color: '#FFF' },
  brandName: { fontSize: 32, fontWeight: '800', color: '#111', letterSpacing: -1 },
  brandTagline: { fontSize: 14, color: '#888' },
  form: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#111', borderWidth: 1.5, borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  errorBox: {
    backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FFCDD2', marginTop: 8,
  },
  errorText: { fontSize: 13, color: '#D32F2F', textAlign: 'center' },
  loginBtn: {
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  loginBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 12, color: '#CCC' },
});
