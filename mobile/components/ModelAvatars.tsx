/**
 * ModelAvatars.tsx
 * AI 名人堂 — 主流模型官方品牌头像 SVG 组件库
 * 支持 20+ 主流模型的官方风格图标
 */
import React from 'react';
import Svg, {
  Circle, Ellipse, G, Line, Path, Polygon, Polyline,
  Rect, Text as SvgText, Defs, LinearGradient, Stop,
  ClipPath, Mask, RadialGradient,
} from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';

export type ModelAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<ModelAvatarSize, number> = {
  sm: 28,
  md: 36,
  lg: 44,
  xl: 56,
};

// ─── OpenAI GPT-4o ───────────────────────────────────────────────────────────
export function GPT4oAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#10A37F" />
      <Path
        d="M18 8.5C13.3 8.5 9.5 12.3 9.5 17C9.5 19.1 10.3 21 11.6 22.5L10 27.5L15.2 26C16.1 26.4 17 26.6 18 26.6C22.7 26.6 26.5 22.8 26.5 18.1C26.5 13.4 22.7 8.5 18 8.5Z"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.5 17.5C14.5 17.5 15.5 19 18 19C20.5 19 21.5 17.5 21.5 17.5"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <Circle cx="15.5" cy="15.5" r="1" fill="white" />
      <Circle cx="20.5" cy="15.5" r="1" fill="white" />
    </Svg>
  );
}

// ─── OpenAI GPT-4o-mini ───────────────────────────────────────────────────────
export function GPT4oMiniAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#19C37D" />
      <Path
        d="M18 9.5C13.8 9.5 10.5 12.8 10.5 17C10.5 18.8 11.1 20.5 12.2 21.8L11 26L15.4 24.9C16.2 25.2 17.1 25.4 18 25.4C22.2 25.4 25.5 22.1 25.5 17.9C25.5 13.7 22.2 9.5 18 9.5Z"
        fill="white"
        opacity="0.9"
      />
      <SvgText x="18" y="20" textAnchor="middle" fontSize="8" fill="#19C37D" fontWeight="bold">mini</SvgText>
    </Svg>
  );
}

// ─── Claude 3.5 Sonnet ────────────────────────────────────────────────────────
export function ClaudeAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#D97757" />
      {/* Anthropic 风格的抽象人形 */}
      <Path
        d="M12 26L16.5 10H19.5L24 26"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M13.5 21H22.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Claude 3 Haiku ───────────────────────────────────────────────────────────
export function ClaudeHaikuAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#E8956D" />
      <Path
        d="M13 25L17 11H19L23 25"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M14.5 20.5H21.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Gemini 2.5 Pro ───────────────────────────────────────────────────────────
export function GeminiProAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#1A73E8" />
      <Defs>
        <LinearGradient id="geminiGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#4285F4" />
          <Stop offset="50%" stopColor="#EA4335" />
          <Stop offset="100%" stopColor="#FBBC04" />
        </LinearGradient>
      </Defs>
      {/* Gemini 星形图标 */}
      <Path
        d="M18 8C18 8 20.5 14 26 18C20.5 22 18 28 18 28C18 28 15.5 22 10 18C15.5 14 18 8 18 8Z"
        fill="white"
        opacity="0.95"
      />
    </Svg>
  );
}

// ─── Gemini 2.0 Flash ─────────────────────────────────────────────────────────
export function GeminiFlashAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#4285F4" />
      <Path
        d="M18 9C18 9 20 14 24.5 18C20 22 18 27 18 27C18 27 16 22 11.5 18C16 14 18 9 18 9Z"
        fill="white"
        opacity="0.9"
      />
      {/* Flash 闪电 */}
      <Path
        d="M20 13L16.5 18.5H19.5L16 23.5"
        stroke="#4285F4"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── DeepSeek-V3 ──────────────────────────────────────────────────────────────
export function DeepSeekAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#1C1C2E" />
      {/* DeepSeek 鲸鱼/深海风格 */}
      <Path
        d="M9 18C9 18 11 13 18 13C25 13 27 18 27 18C27 18 25 23 18 23C11 23 9 18 9 18Z"
        stroke="#4FC3F7"
        strokeWidth="1.5"
        fill="none"
      />
      <Circle cx="18" cy="18" r="3.5" fill="#4FC3F7" />
      <Circle cx="18" cy="18" r="1.5" fill="#1C1C2E" />
      {/* 眼睛高光 */}
      <Circle cx="22" cy="15" r="1.2" fill="#4FC3F7" />
      <Circle cx="22.5" cy="14.5" r="0.4" fill="white" />
    </Svg>
  );
}

// ─── DeepSeek-R1 ──────────────────────────────────────────────────────────────
export function DeepSeekR1Avatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#0D1B2A" />
      <Path
        d="M9 18C9 18 11 12 18 12C25 12 27 18 27 18C27 18 25 24 18 24C11 24 9 18 9 18Z"
        stroke="#00BCD4"
        strokeWidth="1.5"
        fill="none"
      />
      <Circle cx="18" cy="18" r="4" fill="#00BCD4" />
      <Circle cx="18" cy="18" r="1.8" fill="#0D1B2A" />
      <Circle cx="22.5" cy="14.5" r="1.3" fill="#00BCD4" />
      <Circle cx="23" cy="14" r="0.5" fill="white" />
      {/* R1 标识 */}
      <SvgText x="18" y="30.5" textAnchor="middle" fontSize="5" fill="#00BCD4" fontWeight="bold">R1</SvgText>
    </Svg>
  );
}

// ─── Grok ─────────────────────────────────────────────────────────────────────
export function GrokAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#000000" />
      {/* X 形状 */}
      <Path
        d="M10 10L26 26M26 10L10 26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Llama 3 ──────────────────────────────────────────────────────────────────
export function LlamaAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#0467DF" />
      {/* Meta 风格羊驼 */}
      <Path
        d="M14 24C14 24 13 20 13 17C13 14 15 11 18 11C21 11 23 14 23 17C23 20 22 24 22 24"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M14 24H22"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* 耳朵 */}
      <Path
        d="M15 12L13.5 9.5L15.5 10.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M21 12L22.5 9.5L20.5 10.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── Mistral ──────────────────────────────────────────────────────────────────
export function MistralAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#FF7000" />
      {/* Mistral 风格方块 */}
      <Rect x="9" y="9" width="7" height="7" fill="white" />
      <Rect x="20" y="9" width="7" height="7" fill="white" />
      <Rect x="9" y="20" width="7" height="7" fill="white" />
      <Rect x="20" y="20" width="7" height="7" fill="white" opacity="0.5" />
    </Svg>
  );
}

// ─── Qwen ─────────────────────────────────────────────────────────────────────
export function QwenAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#612BF5" />
      {/* 通义千问 Q 形 */}
      <Circle cx="18" cy="17" r="7" stroke="white" strokeWidth="2" fill="none" />
      <Path
        d="M22.5 21.5L26 25"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Yi Lightning ─────────────────────────────────────────────────────────────
export function YiAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#2563EB" />
      <SvgText x="18" y="23" textAnchor="middle" fontSize="16" fill="white" fontWeight="bold">Yi</SvgText>
    </Svg>
  );
}

// ─── Command R+ ───────────────────────────────────────────────────────────────
export function CommandRAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#39594D" />
      <Circle cx="18" cy="18" r="6" stroke="white" strokeWidth="1.8" fill="none" />
      <Circle cx="18" cy="18" r="2" fill="white" />
      <Path d="M18 9V12M18 24V27M9 18H12M24 18H27" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// ─── 通用 fallback 头像 ────────────────────────────────────────────────────────
export function GenericModelAvatar({ 
  name, 
  size = 36, 
  bgColor = '#666' 
}: { 
  name: string; 
  size?: number; 
  bgColor?: string;
}) {
  const initial = (name || '?')[0].toUpperCase();
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      backgroundColor: bgColor,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{
        color: 'white',
        fontSize: size * 0.38,
        fontWeight: '700',
      }}>{initial}</Text>
    </View>
  );
}

// ─── 用户自定义头像 ────────────────────────────────────────────────────────────
export function UserAvatar({ 
  nickname, 
  size = 36,
  avatarUri,
}: { 
  nickname: string; 
  size?: number;
  avatarUri?: string;
}) {
  const initial = (nickname || 'U')[0].toUpperCase();
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#333',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#555',
    }}>
      <Text style={{
        color: 'white',
        fontSize: size * 0.42,
        fontWeight: '700',
      }}>{initial}</Text>
    </View>
  );
}

// ─── 模型名称 → 头像组件映射 ──────────────────────────────────────────────────
export const MODEL_AVATAR_MAP: Record<string, (size: number) => React.ReactElement> = {
  // OpenAI
  'gpt-4o': (s) => <GPT4oAvatar size={s} />,
  'gpt-4o-mini': (s) => <GPT4oMiniAvatar size={s} />,
  'gpt-4.1': (s) => <GPT4oAvatar size={s} />,
  'gpt-4.1-mini': (s) => <GPT4oMiniAvatar size={s} />,
  'gpt-4.1-nano': (s) => <GPT4oMiniAvatar size={s} />,
  'gpt-4-turbo': (s) => <GPT4oAvatar size={s} />,
  'gpt-3.5-turbo': (s) => <GPT4oMiniAvatar size={s} />,
  // Anthropic Claude
  'claude-3-5-sonnet': (s) => <ClaudeAvatar size={s} />,
  'claude-3-5-haiku': (s) => <ClaudeHaikuAvatar size={s} />,
  'claude-3-opus': (s) => <ClaudeAvatar size={s} />,
  'claude-sonnet-4-20250514': (s) => <ClaudeAvatar size={s} />,
  'claude-haiku-4': (s) => <ClaudeHaikuAvatar size={s} />,
  // Google Gemini
  'gemini-2.5-pro': (s) => <GeminiProAvatar size={s} />,
  'gemini-2.5-flash': (s) => <GeminiFlashAvatar size={s} />,
  'gemini-2.0-flash': (s) => <GeminiFlashAvatar size={s} />,
  'gemini-1.5-pro': (s) => <GeminiProAvatar size={s} />,
  'gemini-1.5-flash': (s) => <GeminiFlashAvatar size={s} />,
  // DeepSeek
  'deepseek-v3': (s) => <DeepSeekAvatar size={s} />,
  'deepseek-chat': (s) => <DeepSeekAvatar size={s} />,
  'deepseek-r1': (s) => <DeepSeekR1Avatar size={s} />,
  'deepseek-reasoner': (s) => <DeepSeekR1Avatar size={s} />,
  // xAI Grok
  'grok-2': (s) => <GrokAvatar size={s} />,
  'grok-3': (s) => <GrokAvatar size={s} />,
  'grok-beta': (s) => <GrokAvatar size={s} />,
  // Meta Llama
  'llama-3.3-70b': (s) => <LlamaAvatar size={s} />,
  'llama-3.1-405b': (s) => <LlamaAvatar size={s} />,
  'llama-3-70b': (s) => <LlamaAvatar size={s} />,
  // Mistral
  'mistral-large': (s) => <MistralAvatar size={s} />,
  'mistral-medium': (s) => <MistralAvatar size={s} />,
  'mixtral-8x7b': (s) => <MistralAvatar size={s} />,
  // Alibaba Qwen
  'qwen2.5-72b': (s) => <QwenAvatar size={s} />,
  'qwen-turbo': (s) => <QwenAvatar size={s} />,
  'qwen-plus': (s) => <QwenAvatar size={s} />,
  // 01.AI
  'yi-lightning': (s) => <YiAvatar size={s} />,
  'yi-large': (s) => <YiAvatar size={s} />,
  // Cohere
  'command-r-plus': (s) => <CommandRAvatar size={s} />,
  'command-r': (s) => <CommandRAvatar size={s} />,
};

/**
 * 根据模型名称自动匹配头像
 * 支持模糊匹配（包含关键词）
 */
export function getModelAvatar(modelName: string, size = 36): React.ReactElement {
  const lower = (modelName || '').toLowerCase();
  
  // 精确匹配
  if (MODEL_AVATAR_MAP[lower]) {
    return MODEL_AVATAR_MAP[lower](size);
  }
  
  // 模糊匹配
  if (lower.includes('gpt-4o-mini') || lower.includes('gpt-4.1-mini') || lower.includes('gpt-4.1-nano')) {
    return <GPT4oMiniAvatar size={size} />;
  }
  if (lower.includes('gpt-4') || lower.includes('gpt-5') || lower.includes('openai')) {
    return <GPT4oAvatar size={size} />;
  }
  if (lower.includes('claude') && (lower.includes('haiku') || lower.includes('3-5-h'))) {
    return <ClaudeHaikuAvatar size={size} />;
  }
  if (lower.includes('claude')) {
    return <ClaudeAvatar size={size} />;
  }
  if (lower.includes('gemini') && lower.includes('flash')) {
    return <GeminiFlashAvatar size={size} />;
  }
  if (lower.includes('gemini')) {
    return <GeminiProAvatar size={size} />;
  }
  if (lower.includes('deepseek') && (lower.includes('r1') || lower.includes('reason'))) {
    return <DeepSeekR1Avatar size={size} />;
  }
  if (lower.includes('deepseek')) {
    return <DeepSeekAvatar size={size} />;
  }
  if (lower.includes('grok')) {
    return <GrokAvatar size={size} />;
  }
  if (lower.includes('llama') || lower.includes('meta')) {
    return <LlamaAvatar size={size} />;
  }
  if (lower.includes('mistral') || lower.includes('mixtral')) {
    return <MistralAvatar size={size} />;
  }
  if (lower.includes('qwen') || lower.includes('tongyi')) {
    return <QwenAvatar size={size} />;
  }
  if (lower.includes('yi-') || lower.includes('yi_')) {
    return <YiAvatar size={size} />;
  }
  if (lower.includes('command')) {
    return <CommandRAvatar size={size} />;
  }
  
  // 按 provider 匹配
  const colors: Record<string, string> = {
    openai: '#10A37F',
    anthropic: '#D97757',
    google: '#4285F4',
    deepseek: '#1C1C2E',
    xai: '#000000',
    meta: '#0467DF',
    mistral: '#FF7000',
    alibaba: '#612BF5',
  };
  
  // 默认 fallback
  const hash = lower.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const fallbackColors = ['#10A37F', '#D97757', '#4285F4', '#1C1C2E', '#612BF5', '#FF7000', '#0467DF', '#39594D'];
  const bgColor = fallbackColors[hash % fallbackColors.length];
  
  return <GenericModelAvatar name={modelName} size={size} bgColor={bgColor} />;
}

// ─── LMSYS 前 20 名模型列表 ───────────────────────────────────────────────────
export const LMSYS_TOP20 = [
  { rank: 1, name: 'GPT-4o', model: 'gpt-4o', provider: 'openai', score: 1287 },
  { rank: 2, name: 'Claude 3.5 Sonnet', model: 'claude-3-5-sonnet', provider: 'anthropic', score: 1282 },
  { rank: 3, name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro', provider: 'google', score: 1275 },
  { rank: 4, name: 'GPT-4.1', model: 'gpt-4.1', provider: 'openai', score: 1271 },
  { rank: 5, name: 'DeepSeek-V3', model: 'deepseek-v3', provider: 'deepseek', score: 1265 },
  { rank: 6, name: 'Claude 3 Opus', model: 'claude-3-opus', provider: 'anthropic', score: 1258 },
  { rank: 7, name: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash', provider: 'google', score: 1252 },
  { rank: 8, name: 'Grok-3', model: 'grok-3', provider: 'xai', score: 1248 },
  { rank: 9, name: 'DeepSeek-R1', model: 'deepseek-r1', provider: 'deepseek', score: 1245 },
  { rank: 10, name: 'GPT-4o-mini', model: 'gpt-4o-mini', provider: 'openai', score: 1238 },
  { rank: 11, name: 'Claude 3.5 Haiku', model: 'claude-3-5-haiku', provider: 'anthropic', score: 1232 },
  { rank: 12, name: 'Gemini 2.5 Flash', model: 'gemini-2.5-flash', provider: 'google', score: 1228 },
  { rank: 13, name: 'Llama 3.3 70B', model: 'llama-3.3-70b', provider: 'meta', score: 1215 },
  { rank: 14, name: 'Grok-2', model: 'grok-2', provider: 'xai', score: 1210 },
  { rank: 15, name: 'Mistral Large', model: 'mistral-large', provider: 'mistral', score: 1205 },
  { rank: 16, name: 'Qwen2.5-72B', model: 'qwen2.5-72b', provider: 'alibaba', score: 1198 },
  { rank: 17, name: 'Llama 3.1 405B', model: 'llama-3.1-405b', provider: 'meta', score: 1192 },
  { rank: 18, name: 'Command R+', model: 'command-r-plus', provider: 'cohere', score: 1185 },
  { rank: 19, name: 'Yi-Lightning', model: 'yi-lightning', provider: '01ai', score: 1178 },
  { rank: 20, name: 'GPT-4.1-mini', model: 'gpt-4.1-mini', provider: 'openai', score: 1172 },
];
