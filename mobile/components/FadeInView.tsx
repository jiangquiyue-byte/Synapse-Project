/**
 * FadeInView.tsx
 * 淡入视图组件 — 支持多种进入动画
 */
import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps, Easing } from 'react-native';

interface FadeInViewProps extends ViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  scale?: boolean;
}

export default function FadeInView({
  children,
  duration = 350,
  delay = 0,
  direction = 'up',
  distance = 20,
  scale = false,
  style,
  ...props
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(distance)).current;
  const scaleValue = useRef(new Animated.Value(scale ? 0.9 : 1)).current;

  useEffect(() => {
    const animations = [
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ];

    if (direction !== 'none') {
      animations.push(
        Animated.timing(translate, {
          toValue: 0,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      );
    }

    if (scale) {
      animations.push(
        Animated.spring(scaleValue, {
          toValue: 1,
          delay,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, []);

  const getTransform = () => {
    const transforms: any[] = [];
    
    switch (direction) {
      case 'up':
        transforms.push({ translateY: translate });
        break;
      case 'down':
        transforms.push({ translateY: translate.interpolate({ inputRange: [0, distance], outputRange: [0, -distance] }) });
        break;
      case 'left':
        transforms.push({ translateX: translate });
        break;
      case 'right':
        transforms.push({ translateX: translate.interpolate({ inputRange: [0, distance], outputRange: [0, -distance] }) });
        break;
    }

    if (scale) {
      transforms.push({ scale: scaleValue });
    }

    return transforms;
  };

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: getTransform(),
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}
