// Channel to plugin mapping for dependency management

export const CHANNEL_PLUGIN_MAP: Record<string, string | null> = {
  discord: 'discord',
  telegram: 'telegram',
  slack: 'slack',
  feishu: 'feishu',
  whatsapp: 'whatsapp',
  signal: 'signal',
  imessage: 'imessage',
  msteams: 'msteams',
  googlechat: 'googlechat',
  irc: 'irc',
  matrix: 'matrix',
  mattermost: 'mattermost',
  line: 'line',
  wechat: null,  // Not implemented
  qq: null,      // Not implemented
};
