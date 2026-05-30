/**
 * aiProviders.ts
 * 主流 AI 供应商预设配置
 * 包含 API 地址、默认模型、图标等
 */

export interface AIProviderPreset {
  id: string;
  name: string;
  nameEn: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  description: string;
  color: string;
  needsApiKey: boolean;
  isCustom?: boolean;
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    nameEn: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini'],
    description: 'ChatGPT 开发商，最流行的 AI 服务',
    color: '#10A37F',
    needsApiKey: true,
  },
  {
    id: 'anthropic',
    name: 'Claude',
    nameEn: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
    description: '安全可靠的 AI 助手，擅长长文本',
    color: '#D97757',
    needsApiKey: true,
  },
  {
    id: 'google',
    name: 'Gemini',
    nameEn: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    description: 'Google 大模型，支持多模态',
    color: '#4285F4',
    needsApiKey: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    nameEn: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    description: '国产高性能模型，性价比极高',
    color: '#1C1C2E',
    needsApiKey: true,
  },
  {
    id: 'xiaomi',
    name: '小米 MiMo',
    nameEn: 'Xiaomi MiMo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    defaultModel: 'mimo-v2-flash',
    models: ['mimo-v2-flash', 'mimo-v2-pro', 'mimo-v2-omni'],
    description: '小米大模型，中文理解优秀',
    color: '#FF6900',
    needsApiKey: true,
  },
  {
    id: 'qwen',
    name: '通义千问',
    nameEn: 'Alibaba Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
    description: '阿里云大模型，免费额度充足',
    color: '#612BF5',
    needsApiKey: true,
  },
  {
    id: 'zhipu',
    name: '智谱清言',
    nameEn: 'Zhipu GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-plus', 'glm-4-flash', 'glm-4-long', 'glm-4-air'],
    description: '清华系大模型，免费 Flash 模型',
    color: '#3366FF',
    needsApiKey: true,
  },
  {
    id: 'moonshot',
    name: '月之暗面',
    nameEn: 'Moonshot AI',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    description: 'Kimi 大模型，超长上下文',
    color: '#000000',
    needsApiKey: true,
  },
  {
    id: 'baichuan',
    name: '百川智能',
    nameEn: 'Baichuan',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    defaultModel: 'Baichuan4',
    models: ['Baichuan4', 'Baichuan3-Turbo', 'Baichuan3-Turbo-128k'],
    description: '百川大模型，中文创作能力强',
    color: '#FF6B35',
    needsApiKey: true,
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    nameEn: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'abab6.5s-chat',
    models: ['abab6.5s-chat', 'abab6.5-chat', 'abab5.5-chat'],
    description: 'MiniMax 大模型，多模态支持',
    color: '#00D4AA',
    needsApiKey: true,
  },
  {
    id: 'stepfun',
    name: '阶跃星辰',
    nameEn: 'StepFun',
    baseUrl: 'https://api.stepfun.com/v1',
    defaultModel: 'step-1-flash',
    models: ['step-1-256k', 'step-1-128k', 'step-1-32k', 'step-1-flash'],
    description: 'Step 大模型，长上下文优秀',
    color: '#7C3AED',
    needsApiKey: true,
  },
  {
    id: 'spark',
    name: '讯飞星火',
    nameEn: 'iFlytek Spark',
    baseUrl: 'https://spark-api-open.xf-yun.com/v1',
    defaultModel: 'generalv3.5',
    models: ['generalv3.5', 'generalv3', 'pro-128k'],
    description: '讯飞星火大模型，语音交互强',
    color: '#0066FF',
    needsApiKey: true,
  },
  {
    id: 'doubao',
    name: '豆包',
    nameEn: 'ByteDance Doubao',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-1.5-pro-32k',
    models: ['doubao-1.5-pro-32k', 'doubao-1.5-lite-32k', 'doubao-pro-256k'],
    description: '字节跳动大模型，抖音同款',
    color: '#FE2C55',
    needsApiKey: true,
  },
  {
    id: 'yi',
    name: '零一万物',
    nameEn: '01.AI',
    baseUrl: 'https://api.lingyiwanwu.com/v1',
    defaultModel: 'yi-lightning',
    models: ['yi-lightning', 'yi-large', 'yi-medium', 'yi-spark'],
    description: '李开复创办的 AI 公司',
    color: '#000000',
    needsApiKey: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    nameEn: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    description: '超高速推理，免费使用',
    color: '#F55036',
    needsApiKey: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    nameEn: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-2.5-pro', 'meta-llama/llama-3.3-70b'],
    description: '聚合多家 AI，统一接口',
    color: '#6366F1',
    needsApiKey: true,
  },
  {
    id: 'together',
    name: 'Together AI',
    nameEn: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    models: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    description: '开源模型聚合平台',
    color: '#6366F1',
    needsApiKey: true,
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    nameEn: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    models: ['meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-v4-pro', 'qwen/qwen2.5-coder-32b-instruct'],
    description: 'NVIDIA 免费 AI API',
    color: '#76B900',
    needsApiKey: true,
  },
  {
    id: 'custom',
    name: '自定义',
    nameEn: 'Custom',
    baseUrl: '',
    defaultModel: '',
    models: [],
    description: '自定义 OpenAI 兼容接口',
    color: '#666666',
    needsApiKey: true,
    isCustom: true,
  },
];

/**
 * 根据 provider id 获取预设配置
 */
export function getProviderPreset(id: string): AIProviderPreset | undefined {
  return AI_PROVIDER_PRESETS.find(p => p.id === id);
}

/**
 * 根据 baseUrl 推断 provider id
 */
export function inferProviderFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  for (const preset of AI_PROVIDER_PRESETS) {
    if (preset.isCustom) continue;
    if (lower.includes(preset.baseUrl.toLowerCase().replace('https://', '').replace('/v1', '').replace('/v1beta', ''))) {
      return preset.id;
    }
  }
  return null;
}
