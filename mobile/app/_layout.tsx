import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';

function AppGate({ children }: { children: React.ReactNode }) {
  const { _hasHydrated, authToken, clearAuthToken } = useAppStore();

  useEffect(() => {
    if (!_hasHydrated) return;

    const checkAuth = async () => {
      if (!authToken) {
        router.replace('/login');
        return;
      }
      try {
        const result = await api.verifyToken(authToken);
        if (!result?.valid) {
          clearAuthToken();
          router.replace('/login');
        }
      } catch {
        // 网络错误时保持当前状态（离线模式）
      }
    };

    checkAuth();
  }, [_hasHydrated, authToken]);

  if (!_hasHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>⬡</Text>
        </View>
        <Text style={styles.brandName}>Synapse</Text>
        <ActivityIndicator color="#111" size="small" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppGate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#000000',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#FFFFFF' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        </Stack>
      </AppGate>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logoText: { fontSize: 36, color: '#FFF' },
  brandName: { fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -1 },
});
