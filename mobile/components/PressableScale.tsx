/**
 * PressableScale.tsx
 * 按压缩放组件 — 提供丝滑的点击反馈
 */
import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleSheet } from 'react-native';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  scaleTo?: number;
  duration?: number;
  style?: any;
}

export default function PressableScale({
  children,
  scaleTo = 0.96,
  duration = 80,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: scaleTo,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.85,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    onPressOut?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const Easing = require('react-native').Easing;
