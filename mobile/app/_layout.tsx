import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Easing } from 'react-native';

const forSlideFromRight = ({ current, next, layouts }: any) => ({
  cardStyle: {
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [layouts.screen.width, 0],
        }),
      },
    ],
    opacity: current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
    }),
  },
  overlayStyle: {
    opacity: current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3],
    }),
  },
});

const transitionSpec = {
  open: {
    animation: 'timing' as const,
    config: {
      duration: 350,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
  },
  close: {
    animation: 'timing' as const,
    config: {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#000000',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#FFFFFF' },
          cardStyleInterpolator: forSlideFromRight,
          transitionSpec,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}


