import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    AsyncStorage.setItem('last_crash_error', JSON.stringify({
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString()
    })).catch(() => {});
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>⚠️</Text>
            </View>
            <Text style={styles.title}>出错了</Text>
            <Text style={styles.subtitle}>
              应用遇到了一些问题。你可以尝试重启应用或点击下方按钮重试。
            </Text>
            {this.state.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText} numberOfLines={4}>
                  {this.state.error.message}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
              <Text style={styles.btnText}>重试</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  icon: { fontSize: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  errorBox: { backgroundColor: '#F5F5F5', padding: 16, borderRadius: 12, width: '100%', marginBottom: 32 },
  errorText: { fontSize: 12, color: '#FF3B30', fontFamily: 'monospace' },
  btn: { backgroundColor: '#111', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});
