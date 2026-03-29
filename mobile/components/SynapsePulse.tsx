import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Line } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type SynapsePulseProps = {
  size?: number;
  strokeWidth?: number;
  color?: string;
  dotColor?: string;
  animate?: boolean;
};

/**
 * SynapsePulse
 *
 * 设计原则：
 * 1. 以文档首页 Logo 的“突触连接”关系为基础，重构为纯黑线条矢量；
 * 2. 中间脉冲小黑点在上下两个末梢之间做上下往复位移；
 * 3. 不依赖任何位图资源，可作为全站 Loading/品牌标识的统一组件。
 */
export default function SynapsePulse({
  size = 28,
  strokeWidth = 1.4,
  color = '#000000',
  dotColor = '#000000',
  animate = true,
}: SynapsePulseProps) {
  const travel = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      travel.stopAnimation();
      breathe.stopAnimation();
      travel.setValue(0.5);
      breathe.setValue(0);
      return;
    }

    const motion = Animated.loop(
      Animated.sequence([
        Animated.timing(travel, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(travel, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    motion.start();
    pulse.start();

    return () => {
      motion.stop();
      pulse.stop();
    };
  }, [animate, breathe, travel]);

  const dotCy = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 24],
  });

  const dotRadius = breathe.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [2.4, 3.3, 2.4],
  });

  const haloRadius = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [4.8, 7.4],
  });

  const haloOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.02],
  });

  const viewBox = useMemo(() => '0 0 64 64', []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={viewBox} fill="none">
        <G>
          <Path
            d="M14 47C17.6 45.6 19.9 42.5 21.7 38.9C23.9 34.4 27.2 31.6 31.8 31.2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M50 17C46.4 18.4 44.1 21.5 42.3 25.1C40.1 29.6 36.8 32.4 32.2 32.8"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <Path
            d="M8 52C12.2 50.4 15.6 46.8 18.1 41.6C20.7 36.3 24.9 32.6 31.2 31.7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M56 12C51.8 13.6 48.4 17.2 45.9 22.4C43.3 27.7 39.1 31.4 32.8 32.3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <Line
            x1="28.5"
            y1="40"
            x2="35.5"
            y2="24"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="1.2 4.2"
          />

          <Circle cx="8" cy="52" r="2" fill={color} />
          <Circle cx="14" cy="47" r="1.55" fill={color} />
          <Circle cx="56" cy="12" r="2" fill={color} />
          <Circle cx="50" cy="17" r="1.55" fill={color} />

          <AnimatedCircle cx="32" cy={dotCy as unknown as number} r={haloRadius as unknown as number} fill={dotColor} opacity={haloOpacity as unknown as number} />
          <AnimatedCircle cx="32" cy={dotCy as unknown as number} r={dotRadius as unknown as number} fill={dotColor} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
