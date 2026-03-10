// Model provider types based on OpenClaw's config system

export type ModelProviderAuthMode = 'api-key' | 'aws-sdk' | 'oauth' | 'token';

export type ModelApi =
  | 'openai-completions'
  | 'openai-responses'
  | 'anthropic-messages'
  | 'google-generative-ai'
  | 'github-copilot'
  | 'bedrock-converse-stream'
  | 'ollama';

export interface ModelProviderConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  auth: ModelProviderAuthMode;
  api?: ModelApi;
  headers?: Record<string, string>;
  models?: any[]; // Required by openclaw config schema
  // OAuth specific
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  // AWS specific
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

export type ModelProviderType =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'github-copilot'
  | 'bedrock'
  | 'ollama'
  | 'minimax'
  | 'xiaomi'
  | 'moonshot'
  | 'qwen'
  | 'byteplus'
  | 'doubao'
  | 'huggingface'
  | 'together'
  | 'venice'
  | 'kilocode'
  | 'cloudflare';

export interface ModelProviderMetadata {
  name: string;
  icon: string;
  description: string;
  defaultBaseUrl: string;
  supportedAuthModes: ModelProviderAuthMode[];
  defaultApi?: ModelApi;
}

export const MODEL_PROVIDER_METADATA: Record<ModelProviderType, ModelProviderMetadata> = {
  anthropic: {
    name: 'Anthropic',
    icon: '🤖',
    description: 'Claude models (Opus, Sonnet, Haiku)',
    defaultBaseUrl: 'https://api.anthropic.com',
    supportedAuthModes: ['api-key'],
    defaultApi: 'anthropic-messages',
  },
  openai: {
    name: 'OpenAI',
    icon: '🔮',
    description: 'GPT models (GPT-4, GPT-3.5)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    supportedAuthModes: ['api-key'],
    defaultApi: 'openai-completions',
  },
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    description: 'Gemini models (Pro, Flash)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    supportedAuthModes: ['api-key'],
    defaultApi: 'google-generative-ai',
  },
  'github-copilot': {
    name: 'GitHub Copilot',
    icon: '🐙',
    description: 'GitHub Copilot models',
    defaultBaseUrl: 'https://api.githubcopilot.com',
    supportedAuthModes: ['oauth', 'token'],
    defaultApi: 'github-copilot',
  },
  bedrock: {
    name: 'AWS Bedrock',
    icon: '☁️',
    description: 'AWS Bedrock models',
    defaultBaseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    supportedAuthModes: ['aws-sdk', 'api-key'],
    defaultApi: 'bedrock-converse-stream',
  },
  ollama: {
    name: 'Ollama',
    icon: '🦙',
    description: 'Local Ollama models',
    defaultBaseUrl: 'http://localhost:11434',
    supportedAuthModes: ['api-key'],
    defaultApi: 'ollama',
  },
  minimax: {
    name: 'Minimax',
    icon: '🇨🇳',
    description: 'Minimax models',
    defaultBaseUrl: 'https://api.minimax.chat',
    supportedAuthModes: ['api-key'],
  },
  xiaomi: {
    name: 'Xiaomi (Mimo)',
    icon: '📱',
    description: 'Xiaomi Mimo models',
    defaultBaseUrl: 'https://api.xiaomi.com',
    supportedAuthModes: ['api-key'],
  },
  moonshot: {
    name: 'Moonshot (Kimi)',
    icon: '🌙',
    description: 'Moonshot Kimi models',
    defaultBaseUrl: 'https://api.moonshot.cn',
    supportedAuthModes: ['api-key'],
  },
  qwen: {
    name: 'Qwen',
    icon: '🔷',
    description: 'Alibaba Qwen models',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    supportedAuthModes: ['api-key', 'oauth'],
  },
  byteplus: {
    name: 'BytePlus',
    icon: '🎯',
    description: 'BytePlus models',
    defaultBaseUrl: 'https://api.byteplus.com',
    supportedAuthModes: ['api-key'],
  },
  doubao: {
    name: 'Doubao',
    icon: '🔥',
    description: 'Doubao models',
    defaultBaseUrl: 'https://api.doubao.com',
    supportedAuthModes: ['api-key'],
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    description: 'Hugging Face models',
    defaultBaseUrl: 'https://api-inference.huggingface.co',
    supportedAuthModes: ['api-key', 'token'],
  },
  together: {
    name: 'Together',
    icon: '🤝',
    description: 'Together AI models',
    defaultBaseUrl: 'https://api.together.xyz',
    supportedAuthModes: ['api-key'],
  },
  venice: {
    name: 'Venice',
    icon: '🎭',
    description: 'Venice AI models',
    defaultBaseUrl: 'https://api.venice.ai',
    supportedAuthModes: ['api-key'],
  },
  kilocode: {
    name: 'Kilocode',
    icon: '💻',
    description: 'Kilocode models',
    defaultBaseUrl: 'https://api.kilocode.com',
    supportedAuthModes: ['api-key'],
  },
  cloudflare: {
    name: 'Cloudflare AI Gateway',
    icon: '☁️',
    description: 'Cloudflare AI Gateway',
    defaultBaseUrl: 'https://gateway.ai.cloudflare.com',
    supportedAuthModes: ['api-key'],
  },
};
