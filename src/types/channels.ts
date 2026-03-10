// Channel configuration types based on OpenClaw's config system

export type DmPolicy = 'pairing' | 'allowlist' | 'open' | 'disabled';
export type GroupPolicy = 'open' | 'disabled' | 'allowlist';
export type StreamingMode = 'off' | 'partial' | 'block' | 'progress';

export interface BaseChannelConfig {
  enabled: boolean;
  dmPolicy?: DmPolicy;
  groupPolicy?: GroupPolicy;
  streaming?: StreamingMode;
  allowFrom?: string[];
}

export interface DiscordChannelConfig extends BaseChannelConfig {
  type: 'discord';
  token: string;
  actions?: {
    reactions?: boolean;
    threads?: boolean;
    deleteMessage?: boolean;
    editMessage?: boolean;
    pins?: boolean;
    search?: boolean;
  };
  voice?: {
    enabled?: boolean;
  };
  autoPresence?: {
    enabled?: boolean;
  };
}

export interface TelegramChannelConfig extends BaseChannelConfig {
  type: 'telegram';
  botToken: string;
  webhookUrl?: string;
  webhookSecret?: string;
  actions?: {
    reactions?: boolean;
    sendMessage?: boolean;
    deleteMessage?: boolean;
    editMessage?: boolean;
    sticker?: boolean;
  };
}

export interface SlackChannelConfig extends BaseChannelConfig {
  type: 'slack';
  botToken: string;
  appToken?: string;
  signingSecret?: string;
  mode?: 'socket' | 'http';
}

export interface FeishuChannelConfig extends BaseChannelConfig {
  type: 'feishu';
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
  domain?: string;
  connectionMode?: 'webhook' | 'longpoll';
}

export interface WhatsAppChannelConfig extends BaseChannelConfig {
  type: 'whatsapp';
  authDir?: string;
  selfChatMode?: boolean;
  ackReaction?: string;
}

export interface SignalChannelConfig extends BaseChannelConfig {
  type: 'signal';
  account: string;
  httpUrl?: string;
  cliPath?: string;
  autoStart?: boolean;
  reactionNotifications?: boolean;
}

export interface IMessageChannelConfig extends BaseChannelConfig {
  type: 'imessage';
  cliPath?: string;
  dbPath?: string;
  service?: 'imessage' | 'sms' | 'auto';
}

export interface MSTeamsChannelConfig extends BaseChannelConfig {
  type: 'msteams';
  appId: string;
  appPassword: string;
  tenantId?: string;
  webhook?: string;
}

export interface GoogleChatChannelConfig extends BaseChannelConfig {
  type: 'googlechat';
  serviceAccount: string;
  webhookUrl?: string;
  audience?: string;
}

export interface IRCChannelConfig extends BaseChannelConfig {
  type: 'irc';
  host: string;
  port?: number;
  nick: string;
  password?: string;
  channels?: string[];
}

export interface MatrixChannelConfig extends BaseChannelConfig {
  type: 'matrix';
  homeserverUrl: string;
  accessToken: string;
  userId: string;
}

export interface MattermostChannelConfig extends BaseChannelConfig {
  type: 'mattermost';
  url: string;
  token: string;
  teamId?: string;
}

export interface LineChannelConfig extends BaseChannelConfig {
  type: 'line';
  channelSecret: string;
  channelAccessToken: string;
}

export type ChannelConfig =
  | DiscordChannelConfig
  | TelegramChannelConfig
  | SlackChannelConfig
  | FeishuChannelConfig
  | WhatsAppChannelConfig
  | SignalChannelConfig
  | IMessageChannelConfig
  | MSTeamsChannelConfig
  | GoogleChatChannelConfig
  | IRCChannelConfig
  | MatrixChannelConfig
  | MattermostChannelConfig
  | LineChannelConfig;

export type ChannelType = ChannelConfig['type'] | 'wechat' | 'qq';

export interface ChannelMetadata {
  name: string;
  icon: string;
  description: string;
  experimental?: boolean;
  notImplemented?: boolean;
}

export const CHANNEL_METADATA: Record<ChannelType, ChannelMetadata> = {
  discord: {
    name: 'Discord',
    icon: '🎮',
    description: 'Discord bot integration with voice support',
  },
  telegram: {
    name: 'Telegram',
    icon: '✈️',
    description: 'Telegram bot with webhook support',
  },
  slack: {
    name: 'Slack',
    icon: '⚙️',
    description: 'Slack workspace integration',
  },
  feishu: {
    name: '飞书',
    icon: '📱',
    description: '飞书企业通讯集成',
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: '💬',
    description: 'WhatsApp integration (experimental)',
    experimental: true,
  },
  signal: {
    name: 'Signal',
    icon: '🔒',
    description: 'Signal messenger integration',
  },
  imessage: {
    name: 'iMessage',
    icon: '💬',
    description: 'Apple iMessage integration (macOS only)',
  },
  msteams: {
    name: 'MS Teams',
    icon: '👥',
    description: 'Microsoft Teams integration',
  },
  googlechat: {
    name: 'Google Chat',
    icon: '💬',
    description: 'Google Chat workspace integration',
  },
  irc: {
    name: 'IRC',
    icon: '💻',
    description: 'Internet Relay Chat integration',
  },
  matrix: {
    name: 'Matrix',
    icon: '🔷',
    description: 'Matrix protocol integration',
  },
  mattermost: {
    name: 'Mattermost',
    icon: '💬',
    description: 'Mattermost team chat integration',
  },
  line: {
    name: 'LINE',
    icon: '💚',
    description: 'LINE messenger integration',
  },
  wechat: {
    name: '微信',
    icon: '💬',
    description: '微信集成（暂未实现）',
    notImplemented: true,
  },
  qq: {
    name: 'QQ',
    icon: '🐧',
    description: 'QQ 集成（暂未实现）',
    notImplemented: true,
  },
};
