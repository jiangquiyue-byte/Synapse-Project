import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';

import SynapsePulse from '../../components/SynapsePulse';
import {
  AgentsTabIcon,
  ChatTabIcon,
  ICON_TONES,
  MemoryTabIcon,
  SettingsTabIcon,
  WorkflowsTabIcon,
} from '../../components/SynapseIcons';
import { useAppStore } from '../../stores/useAppStore';

function TabIcon({ name, focused }: { name: 'chat' | 'agents' | 'memory' | 'workflows' | 'settings'; focused: boolean }) {
  const color = focused ? ICON_TONES.primary : ICON_TONES.muted;
  const opacity = focused ? 1 : 0.92;
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.1 : 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  const iconMap = {
    chat: ChatTabIcon,
    agents: AgentsTabIcon,
    memory: MemoryTabIcon,
    workflows: WorkflowsTabIcon,
    settings: SettingsTabIcon,
  };

  const IconComponent = iconMap[name];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <IconComponent size={24} color={color} opacity={opacity} strokeWidth={1.2} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const initializeApp = useAppStore((state) => state.initializeApp);
  const isBootstrapping = useAppStore((state) => state.isBootstrapping);
  const hasHydrated = useAppStore((state) => state._hasHydrated);

  useEffect(() => {
    if (hasHydrated) {
      void initializeApp();
    }
  }, [initializeApp, hasHydrated]);

  if (!hasHydrated || isBootstrapping) {
    return (
      <View style={styles.loadingScreen}>
        <SynapsePulse size={56} strokeWidth={1.35} />
        <Text style={styles.loadingText}>正在同步会话与配置...</Text>
        <Text style={styles.loadingBrand}>S Y N A P S E</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5E5',
          borderTopWidth: 0.5,
          height: 74,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: ICON_TONES.primary,
        tabBarInactiveTintColor: ICON_TONES.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#000000',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Synapse',
          tabBarLabel: '群聊',
          tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: '成员管理',
          tabBarLabel: '成员',
          tabBarIcon: ({ focused }) => <TabIcon name="agents" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: '记忆中心',
          tabBarLabel: '记忆',
          tabBarIcon: ({ focused }) => <TabIcon name="memory" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workflows"
        options={{
          title: '工作流市场',
          tabBarLabel: '工作流',
          tabBarIcon: ({ focused }) => <TabIcon name="workflows" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarLabel: '设置',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
      </Tabs>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 13,
    color: '#6F6F6F',
    letterSpacing: 0.4,
  },
  loadingBrand: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 6,
    color: '#CCC',
    marginTop: 12,
  },
  icon: {
    width: 34,
    height: 34,
  },
});
