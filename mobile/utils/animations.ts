/**
 * animations.ts
 * 统一动画配置 — 使用 React Native 内置 Animated API
 * 提供丝滑的过渡效果
 */
import { Animated, Easing, Platform } from 'react-native';

// ─── 通用动画配置 ───────────────────────────────────────────────────────────
export const SPRING_CONFIG = {
  tension: 120,
  friction: 14,
  useNativeDriver: true,
};

export const TIMING_CONFIG = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1), // iOS 标准曲线
  useNativeDriver: true,
};

export const FAST_TIMING = {
  duration: 150,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  useNativeDriver: true,
};

export const SLOW_TIMING = {
  duration: 500,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  useNativeDriver: true,
};

// ─── 按压缩放动画 ───────────────────────────────────────────────────────────
export function createPressScale(
  scaleValue: Animated.Value,
  toScale = 0.95,
  duration = 100
) {
  return {
    onPressIn: () => {
      Animated.timing(scaleValue, {
        toValue: toScale,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    onPressOut: () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    },
  };
}

// ─── 淡入动画 ───────────────────────────────────────────────────────────────
export function fadeIn(
  value: Animated.Value,
  duration = 300,
  delay = 0
): Animated.CompositeAnimation {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    delay,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  });
}

export function fadeOut(
  value: Animated.Value,
  duration = 200
): Animated.CompositeAnimation {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.in(Easing.quad),
    useNativeDriver: true,
  });
}

// ─── 滑入动画 ───────────────────────────────────────────────────────────────
export function slideInUp(
  value: Animated.Value,
  distance = 100,
  duration = 350
): Animated.CompositeAnimation {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
}

export function slideOutDown(
  value: Animated.Value,
  distance = 100,
  duration = 250
): Animated.CompositeAnimation {
  return Animated.timing(value, {
    toValue: distance,
    duration,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  });
}

// ─── 弹性动画 ───────────────────────────────────────────────────────────────
export function springIn(
  value: Animated.Value,
  toValue = 1
): Animated.CompositeAnimation {
  return Animated.spring(value, {
    toValue,
    tension: 100,
    friction: 12,
    useNativeDriver: true,
  });
}

// ─── 连续动画 ───────────────────────────────────────────────────────────────
export function staggerFadeIn(
  values: Animated.Value[],
  duration = 300,
  staggerDelay = 50
): Animated.CompositeAnimation {
  return Animated.stagger(
    staggerDelay,
    values.map((v) => fadeIn(v, duration))
  );
}

// ─── 循环脉冲 ───────────────────────────────────────────────────────────────
export function pulseLoop(
  value: Animated.Value,
  minScale = 0.95,
  maxScale = 1.05,
  duration = 1500
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: maxScale,
        duration: duration / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: minScale,
        duration: duration / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ])
  );
}

// ─── 旋转动画 ───────────────────────────────────────────────────────────────
export function spinLoop(
  value: Animated.Value,
  duration = 1000
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.timing(value, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );
}

// ─── 交错出现动画 Hook ─────────────────────────────────────────────────────
export function useStaggerAnimation(count: number, delay = 50) {
  const values = Array.from({ length: count }, () => new Animated.Value(0));
  
  const animate = () => {
    Animated.stagger(
      delay,
      values.map((v) =>
        Animated.spring(v, {
          toValue: 1,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        })
      )
    ).start();
  };

  return { values, animate };
}

// ─── 页面转场配置 ───────────────────────────────────────────────────────────
export const PAGE_TRANSITIONS = {
  // iOS 风格从右滑入
  slideFromRight: {
    cardStyleInterpolator: ({ current, layouts }: any) => ({
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    }),
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 350,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
      },
    },
  },
  
  // 底部弹出
  slideFromBottom: {
    cardStyleInterpolator: ({ current, layouts }: any) => ({
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.height, 0],
            }),
          },
        ],
      },
    }),
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 300,
          easing: Easing.in(Easing.cubic),
        },
      },
    },
  },
  
  // 淡入缩放
  fadeScale: {
    cardStyleInterpolator: ({ current }: any) => ({
      cardStyle: {
        opacity: current.progress,
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }),
          },
        ],
      },
    }),
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 200,
          easing: Easing.in(Easing.cubic),
        },
      },
    },
  },
};
