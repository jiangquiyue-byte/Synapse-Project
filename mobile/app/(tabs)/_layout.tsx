import { Tabs } from 'expo-router';
import { Image, StyleSheet } from 'react-native';

const ICONS = {
  chat: require('../../assets/icons/tab-chat.png'),
  agents: require('../../assets/icons/tab-agents.png'),
  settings: require('../../assets/icons/tab-settings.png'),
};

function TabIcon({ name, focused }: { name: keyof typeof ICONS; focused: boolean }) {
  return (
    <Image
      source={ICONS[name]}
      style={[styles.icon, { opacity: focused ? 1 : 0.35 }]}
      resizeMode="contain"
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5E5',
          borderTopWidth: 0.5,
          height: 70,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#999999',
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
          title: 'AI 成员',
          tabBarLabel: '成员',
          tabBarIcon: ({ focused }) => <TabIcon name="agents" focused={focused} />,
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
  icon: {
    width: 34,
    height: 34,
  },
});
