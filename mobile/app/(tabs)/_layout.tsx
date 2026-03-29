import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

  if (name === 'chat') {
    return <ChatTabIcon size={24} color={color} opacity={opacity} strokeWidth={1.2} />;
  }

  if (name === 'agents') {
    return <AgentsTabIcon size={24} color={color} opacity={opacity} strokeWidth={1.2} />;
  }

  if (name === 'memory') {
    return <MemoryTabIcon size={24} color={color} opacity={opacity} strokeWidth={1.15} />;
  }

  if (name === 'workflows') {
    return <WorkflowsTabIcon size={24} color={color} opacity={opacity} strokeWidth={1.15} />;
  }

  return <SettingsTabIcon size={24} color={color} opacity={opacity} strokeWidth={1.2} />;
}

export default function TabLayout() {
  const initializeApp = useAppStore((state) => state.initializeApp);
  const isBootstrapping = useAppStore((state) => state.isBootstrapping);

  useEffect(() => {
    void initializeApp();
  }, [initializeApp]);

  if (isBootstrapping) {
    return (
      <View style={styles.loadingScreen}>
        <SynapsePulse size={28} strokeWidth={1.35} />
        <Text style={styles.loadingText}>正在同步会话与配置...</Text>
      </View>
    );
  }

  return (
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
    fontSize: 12,
    color: '#6F6F6F',
    letterSpacing: 0.4,
  },
  icon: {
    width: 34,
    height: 34,
  },
});
