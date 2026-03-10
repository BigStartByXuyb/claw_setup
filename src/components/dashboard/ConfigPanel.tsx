import React, { useState, useEffect } from 'react';
import ModelProviderCard from './ModelProviderCard';
import ChannelCard from './ChannelCard';
import type { ModelProviderConfig, ModelProviderType } from '../../types/models';
import { MODEL_PROVIDER_METADATA } from '../../types/models';
import type { ChannelConfig, ChannelType } from '../../types/channels';
import { CHANNEL_METADATA } from '../../types/channels';

const ipc = window.electron.ipcRenderer;

const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Model providers state
  const [modelProviders, setModelProviders] = useState<Record<ModelProviderType, ModelProviderConfig>>({} as any);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [selectedProviderType, setSelectedProviderType] = useState<ModelProviderType>('anthropic');

  // Channels state
  const [channels, setChannels] = useState<Record<ChannelType, ChannelConfig>>({} as any);

  // Gateway settings
  const [port, setPort] = useState('18789');
  const [host, setHost] = useState('0.0.0.0');

  // Advanced settings
  const [workspaceDataDir, setWorkspaceDataDir] = useState('');
  const [workspaceLogsDir, setWorkspaceLogsDir] = useState('');
  const [workspaceCacheDir, setWorkspaceCacheDir] = useState('');

  const [gatewayAuth, setGatewayAuth] = useState('');
  const [gatewayTailscale, setGatewayTailscale] = useState(false);

  const [daemonEnabled, setDaemonEnabled] = useState(false);
  const [daemonAutoStart, setDaemonAutoStart] = useState(false);

  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [webSearchProvider, setWebSearchProvider] = useState<'brave' | 'perplexity' | 'grok' | 'gemini' | 'kimi'>('brave');
  const [webSearchApiKey, setWebSearchApiKey] = useState('');
  const [perplexityApiKey, setPerplexityApiKey] = useState('');
  const [grokApiKey, setGrokApiKey] = useState('');
  const [geminiSearchApiKey, setGeminiSearchApiKey] = useState('');
  const [kimiApiKey, setKimiApiKey] = useState('');

  const [webFetchEnabled, setWebFetchEnabled] = useState(true);
  const [firecrawlEnabled, setFirecrawlEnabled] = useState(false);
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');

  const [skillsDir, setSkillsDir] = useState('');
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);

  const [healthCheckEnabled, setHealthCheckEnabled] = useState(true);
  const [healthCheckInterval, setHealthCheckInterval] = useState('60');

  // Primary model state
  const [primaryModel, setPrimaryModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<Array<{ provider: string; model: string; displayName: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    loadConfig();
    loadPrimaryModel();
    loadAvailableModels();
  }, []);

  const loadConfig = async () => {
    const result = await ipc.invoke('read-config');
    if (result.success) {
      const c = result.config;
      setConfig(c);

      // Load model providers
      const providers: Record<string, ModelProviderConfig> = {};
      if (c.models?.providers) {
        Object.entries(c.models.providers).forEach(([key, value]: [string, any]) => {
          providers[key as ModelProviderType] = {
            enabled: true,
            baseUrl: value.baseUrl || '',
            apiKey: value.apiKey || '',
            auth: value.auth || 'api-key',
            api: value.api,
            headers: value.headers,
            models: value.models || [], // Required by openclaw config schema
          };
        });
      }
      setModelProviders(providers);

      // Load channels
      const channelConfigs: Record<string, ChannelConfig> = {};

      // Initialize all channels as disabled
      const allChannelTypes: ChannelType[] = Object.keys(CHANNEL_METADATA) as ChannelType[];
      allChannelTypes.forEach((channelType) => {
        channelConfigs[channelType] = {
          type: channelType,
          enabled: false,
        } as ChannelConfig;
      });

      // Update based on config file
      if (c.channels) {
        if (Array.isArray(c.channels)) {
          // Handle array format: ["wechat", "feishu", "qq"]
          c.channels.forEach((channelType: string) => {
            if (channelConfigs[channelType as ChannelType]) {
              channelConfigs[channelType as ChannelType].enabled = true;
            }
          });
        } else {
          // Handle object format: { discord: {...}, telegram: {...} }
          Object.entries(c.channels).forEach(([key, value]: [string, any]) => {
            const channelType = key as ChannelType;
            if (channelConfigs[channelType]) {
              channelConfigs[channelType] = {
                type: channelType,
                enabled: value.enabled !== false,
                dmPolicy: value.dmPolicy,
                groupPolicy: value.groupPolicy,
                streaming: value.streaming,
                allowFrom: value.allowFrom,
                ...value,
              } as ChannelConfig;
            }
          });
        }
      }
      setChannels(channelConfigs);

      // Load gateway settings
      setPort(String(c.gateway?.port || 18789));
      setHost(c.gateway?.host || '0.0.0.0');

      // Load advanced settings
      setWorkspaceDataDir(c.workspace?.dataDir || '');
      setWorkspaceLogsDir(c.workspace?.logsDir || '');
      setWorkspaceCacheDir(c.workspace?.cacheDir || '');

      setGatewayAuth(c.gateway?.auth || '');
      setGatewayTailscale(c.gateway?.tailscale?.enabled || false);

      setDaemonEnabled(c.daemon?.enabled || false);
      setDaemonAutoStart(c.daemon?.autoStart || false);

      setWebSearchEnabled(c.tools?.web?.search?.enabled !== false);
      setWebSearchProvider(c.tools?.web?.search?.provider || 'brave');
      setWebSearchApiKey(c.tools?.web?.search?.apiKey || '');
      setPerplexityApiKey(c.tools?.web?.search?.perplexity?.apiKey || '');
      setGrokApiKey(c.tools?.web?.search?.grok?.apiKey || '');
      setGeminiSearchApiKey(c.tools?.web?.search?.gemini?.apiKey || '');
      setKimiApiKey(c.tools?.web?.search?.kimi?.apiKey || '');

      setWebFetchEnabled(c.tools?.web?.fetch?.enabled !== false);
      setFirecrawlEnabled(c.tools?.web?.fetch?.firecrawl?.enabled || false);
      setFirecrawlApiKey(c.tools?.web?.fetch?.firecrawl?.apiKey || '');

      setSkillsDir(c.skills?.dir || '');
      setEnabledSkills(c.skills?.enabled || []);

      setHealthCheckEnabled(c.healthCheck?.enabled !== false);
      setHealthCheckInterval(String(c.healthCheck?.interval || 60));
    }
  };

  const loadPrimaryModel = async () => {
    const result = await ipc.invoke('get-current-model');
    if (result.success && result.model) {
      setPrimaryModel(result.model);
    }
  };

  const loadAvailableModels = async () => {
    setLoadingModels(true);
    try {
      const result = await ipc.invoke('get-available-models');
      if (result.success) {
        setAvailableModels(result.models);
      }
    } finally {
      setLoadingModels(false);
    }
  };

  const handleRefreshConfig = async () => {
    await loadConfig();
    await loadPrimaryModel();
    await loadAvailableModels();
  };

  const handleSetPrimaryModel = async (model: string) => {
    const result = await ipc.invoke('set-primary-model', model);
    if (result.success) {
      setPrimaryModel(model);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleProviderChange = (providerId: ModelProviderType, config: ModelProviderConfig) => {
    setModelProviders((prev) => ({ ...prev, [providerId]: config }));
  };

  const handleProviderRemove = (providerId: ModelProviderType) => {
    setModelProviders((prev) => {
      const newProviders = { ...prev };
      delete newProviders[providerId];
      return newProviders;
    });
  };

  const handleAddProvider = () => {
    const metadata = MODEL_PROVIDER_METADATA[selectedProviderType];
    setModelProviders((prev) => ({
      ...prev,
      [selectedProviderType]: {
        enabled: true,
        baseUrl: metadata.defaultBaseUrl,
        auth: metadata.supportedAuthModes[0],
        api: metadata.defaultApi,
        models: [], // Required by openclaw config schema
      },
    }));
    setShowAddProvider(false);
  };

  const handleChannelChange = (channelType: ChannelType, config: ChannelConfig) => {
    setChannels((prev) => ({ ...prev, [channelType]: config }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // 首先，获取配置文件中所有现有的 model providers
      const allProviderTypes = Object.keys(MODEL_PROVIDER_METADATA) as ModelProviderType[];

      // 删除所有不在当前 modelProviders 状态中的 provider
      for (const providerType of allProviderTypes) {
        if (!modelProviders[providerType]) {
          // 这个 provider 已被移除，从配置文件中删除
          await ipc.invoke('config-unset', `models.providers.${providerType}`);
        }
      }

      // Save model providers
      for (const [providerId, providerConfig] of Object.entries(modelProviders)) {
        if (providerConfig.enabled) {
          // Build the complete provider object
          const providerData: any = {
            baseUrl: providerConfig.baseUrl,
            auth: providerConfig.auth,
            models: providerConfig.models || [],
          };

          if (providerConfig.api) {
            providerData.api = providerConfig.api;
          }

          if (providerConfig.auth === 'api-key' && providerConfig.apiKey) {
            providerData.apiKey = providerConfig.apiKey;
          } else if (providerConfig.auth === 'oauth') {
            if (providerConfig.clientId) providerData.clientId = providerConfig.clientId;
            if (providerConfig.clientSecret) providerData.clientSecret = providerConfig.clientSecret;
            if (providerConfig.refreshToken) providerData.refreshToken = providerConfig.refreshToken;
          } else if (providerConfig.auth === 'aws-sdk') {
            if (providerConfig.awsRegion) providerData.awsRegion = providerConfig.awsRegion;
            if (providerConfig.awsAccessKeyId) providerData.awsAccessKeyId = providerConfig.awsAccessKeyId;
            if (providerConfig.awsSecretAccessKey) providerData.awsSecretAccessKey = providerConfig.awsSecretAccessKey;
          }

          // Save the entire provider object at once to avoid validation errors
          const result = await ipc.invoke('config-set', `models.providers.${providerId}`, providerData);
          if (!result.success) {
            console.error('Config set failed:', result.error);
            alert(`保存失败: ${result.error}`);
            return;
          }
        }
      }

      // Save channels
      for (const [channelType, channelConfig] of Object.entries(channels)) {
        await ipc.invoke('config-set', `channels.${channelType}.enabled`, channelConfig.enabled);

        if (channelConfig.enabled) {
          // Save channel-specific fields
          if (channelConfig.type === 'discord' && 'token' in channelConfig) {
            await ipc.invoke('config-set', `channels.${channelType}.token`, channelConfig.token);
          } else if (channelConfig.type === 'telegram' && 'botToken' in channelConfig) {
            await ipc.invoke('config-set', `channels.${channelType}.botToken`, channelConfig.botToken);
            if (channelConfig.webhookUrl) await ipc.invoke('config-set', `channels.${channelType}.webhookUrl`, channelConfig.webhookUrl);
            if (channelConfig.webhookSecret) await ipc.invoke('config-set', `channels.${channelType}.webhookSecret`, channelConfig.webhookSecret);
          } else if (channelConfig.type === 'slack' && 'botToken' in channelConfig) {
            await ipc.invoke('config-set', `channels.${channelType}.botToken`, channelConfig.botToken);
            if (channelConfig.appToken) await ipc.invoke('config-set', `channels.${channelType}.appToken`, channelConfig.appToken);
            if (channelConfig.signingSecret) await ipc.invoke('config-set', `channels.${channelType}.signingSecret`, channelConfig.signingSecret);
          } else if (channelConfig.type === 'feishu' && 'appId' in channelConfig) {
            await ipc.invoke('config-set', `channels.${channelType}.appId`, channelConfig.appId);
            await ipc.invoke('config-set', `channels.${channelType}.appSecret`, channelConfig.appSecret);
          }

          // Save common fields
          if (channelConfig.dmPolicy) await ipc.invoke('config-set', `channels.${channelType}.dmPolicy`, channelConfig.dmPolicy);
          if (channelConfig.groupPolicy) await ipc.invoke('config-set', `channels.${channelType}.groupPolicy`, channelConfig.groupPolicy);
          if (channelConfig.streaming) await ipc.invoke('config-set', `channels.${channelType}.streaming`, channelConfig.streaming);
          if (channelConfig.allowFrom) await ipc.invoke('config-set', `channels.${channelType}.allowFrom`, channelConfig.allowFrom);
          if ('actions' in channelConfig && channelConfig.actions) await ipc.invoke('config-set', `channels.${channelType}.actions`, channelConfig.actions);
        }
      }

      // Save gateway settings
      if (port) await ipc.invoke('config-set', 'gateway.port', parseInt(port));
      if (host) await ipc.invoke('config-set', 'gateway.host', host);

      // Save advanced settings
      if (workspaceDataDir) await ipc.invoke('config-set', 'workspace.dataDir', workspaceDataDir);
      if (workspaceLogsDir) await ipc.invoke('config-set', 'workspace.logsDir', workspaceLogsDir);
      if (workspaceCacheDir) await ipc.invoke('config-set', 'workspace.cacheDir', workspaceCacheDir);

      if (gatewayAuth) await ipc.invoke('config-set', 'gateway.auth', gatewayAuth);
      await ipc.invoke('config-set', 'gateway.tailscale.enabled', gatewayTailscale);

      await ipc.invoke('config-set', 'daemon.enabled', daemonEnabled);
      await ipc.invoke('config-set', 'daemon.autoStart', daemonAutoStart);

      await ipc.invoke('config-set', 'tools.web.search.enabled', webSearchEnabled);
      await ipc.invoke('config-set', 'tools.web.search.provider', webSearchProvider);
      if (webSearchApiKey) await ipc.invoke('config-set', 'tools.web.search.apiKey', webSearchApiKey);
      if (perplexityApiKey) await ipc.invoke('config-set', 'tools.web.search.perplexity.apiKey', perplexityApiKey);
      if (grokApiKey) await ipc.invoke('config-set', 'tools.web.search.grok.apiKey', grokApiKey);
      if (geminiSearchApiKey) await ipc.invoke('config-set', 'tools.web.search.gemini.apiKey', geminiSearchApiKey);
      if (kimiApiKey) await ipc.invoke('config-set', 'tools.web.search.kimi.apiKey', kimiApiKey);

      await ipc.invoke('config-set', 'tools.web.fetch.enabled', webFetchEnabled);
      await ipc.invoke('config-set', 'tools.web.fetch.firecrawl.enabled', firecrawlEnabled);
      if (firecrawlApiKey) await ipc.invoke('config-set', 'tools.web.fetch.firecrawl.apiKey', firecrawlApiKey);

      if (skillsDir) await ipc.invoke('config-set', 'skills.dir', skillsDir);
      if (enabledSkills.length > 0) await ipc.invoke('config-set', 'skills.enabled', enabledSkills);

      await ipc.invoke('config-set', 'healthCheck.enabled', healthCheckEnabled);
      if (healthCheckInterval) await ipc.invoke('config-set', 'healthCheck.interval', parseInt(healthCheckInterval));

      // Refresh available models after saving
      await loadAvailableModels();

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="dashboard-heading">配置</h2>

      {/* Primary Model */}
      <div className="config-section">
        <div className="config-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span>🎯</span> 主模型设置
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleRefreshConfig}
            disabled={loadingModels}
            title="刷新配置"
          >
            🔄 刷新配置
          </button>
        </div>

        <div className="config-field">
          <label className="config-label">当前主模型</label>
          {availableModels.length > 0 ? (
            <select
              className="config-input"
              value={primaryModel}
              onChange={(e) => handleSetPrimaryModel(e.target.value)}
              disabled={loadingModels}
            >
              <option value="">未设置</option>
              {availableModels.map((model) => (
                <option key={model.displayName} value={model.displayName}>
                  {model.displayName}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              {loadingModels ? '加载中...' : '暂无可用模型，请先配置模型提供商'}
            </div>
          )}
        </div>

        {primaryModel && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            当前主模型：{primaryModel}
          </div>
        )}
      </div>

      {/* Model Providers */}
      <div className="config-section">
        <div className="config-section-title">
          <span>🤖</span> 模型提供商
        </div>

        {Object.entries(modelProviders)
          .filter(([providerId]) => MODEL_PROVIDER_METADATA[providerId as ModelProviderType])
          .map(([providerId, providerConfig]) => (
            <ModelProviderCard
              key={providerId}
              providerId={providerId as ModelProviderType}
              config={providerConfig}
              metadata={MODEL_PROVIDER_METADATA[providerId as ModelProviderType]}
              onChange={(config) => handleProviderChange(providerId as ModelProviderType, config)}
              onRemove={() => handleProviderRemove(providerId as ModelProviderType)}
            />
          ))}

        {showAddProvider ? (
          <div className="add-provider-panel">
            <select
              className="config-input"
              value={selectedProviderType}
              onChange={(e) => setSelectedProviderType(e.target.value as ModelProviderType)}
              style={{ marginBottom: 12 }}
            >
              {Object.entries(MODEL_PROVIDER_METADATA).map(([key, metadata]) => (
                <option key={key} value={key}>
                  {metadata.icon} {metadata.name}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleAddProvider}>
                添加
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddProvider(false)}>
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAddProvider(true)}
            style={{ marginTop: 12 }}
          >
            + 添加提供商
          </button>
        )}
      </div>

      {/* Channels */}
      <div className="config-section">
        <div className="config-section-title">
          <span>📡</span> 消息渠道
        </div>

        {Object.entries(channels).map(([channelType, channelConfig]) => (
          <ChannelCard
            key={channelType}
            channelType={channelType as ChannelType}
            config={channelConfig}
            metadata={CHANNEL_METADATA[channelType as ChannelType]}
            onChange={(config) => handleChannelChange(channelType as ChannelType, config)}
          />
        ))}

        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          <span>⚠️</span>
          <div>
            <strong>注意：</strong>微信（WeChat）和 QQ 渠道在 OpenClaw 主项目中暂未实现。
          </div>
        </div>
      </div>

      {/* Gateway */}
      <div className="config-section">
        <div className="config-section-title">
          <span>🔌</span> 网关设置
        </div>

        <div className="config-field">
          <label className="config-label">端口号</label>
          <input
            type="number"
            className="config-input"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="18789"
          />
        </div>

        <div className="config-field">
          <label className="config-label">主机地址</label>
          <input
            type="text"
            className="config-input"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="0.0.0.0"
          />
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="config-section">
        <div className="config-section-title">
          <span>⚙️</span> 高级配置
        </div>

        {/* Workspace */}
        <div className="config-group">
          <div className="config-group-title">📁 工作区</div>

          <div className="config-field">
            <label className="config-label">数据目录</label>
            <input
              type="text"
              className="config-input"
              value={workspaceDataDir}
              onChange={(e) => setWorkspaceDataDir(e.target.value)}
              placeholder="默认: ~/.openclaw/data"
            />
          </div>

          <div className="config-field">
            <label className="config-label">日志目录</label>
            <input
              type="text"
              className="config-input"
              value={workspaceLogsDir}
              onChange={(e) => setWorkspaceLogsDir(e.target.value)}
              placeholder="默认: ~/.openclaw/logs"
            />
          </div>

          <div className="config-field">
            <label className="config-label">缓存目录</label>
            <input
              type="text"
              className="config-input"
              value={workspaceCacheDir}
              onChange={(e) => setWorkspaceCacheDir(e.target.value)}
              placeholder="默认: ~/.openclaw/cache"
            />
          </div>
        </div>

        {/* Gateway Advanced */}
        <div className="config-group">
          <div className="config-group-title">🔐 网关高级</div>

          <div className="config-field">
            <label className="config-label">认证密钥 (可选)</label>
            <input
              type="password"
              className="config-input"
              value={gatewayAuth}
              onChange={(e) => setGatewayAuth(e.target.value)}
              placeholder="留空表示无需认证"
            />
          </div>

          <div className="config-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={gatewayTailscale}
                onChange={(e) => setGatewayTailscale(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>启用 Tailscale 集成</span>
            </label>
          </div>
        </div>

        {/* Daemon */}
        <div className="config-group">
          <div className="config-group-title">🤖 守护进程</div>

          <div className="config-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={daemonEnabled}
                onChange={(e) => setDaemonEnabled(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>启用守护进程模式</span>
            </label>
          </div>

          <div className="config-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={daemonAutoStart}
                onChange={(e) => setDaemonAutoStart(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>开机自动启动</span>
            </label>
          </div>
        </div>

        {/* Web Tools */}
        <div className="config-group">
          <div className="config-group-title">🌐 Web 工具</div>

          <div className="config-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={webSearchEnabled}
                onChange={(e) => setWebSearchEnabled(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>启用 Web 搜索</span>
            </label>
          </div>

          <div className="config-field">
            <label className="config-label">搜索提供商</label>
            <select
              className="config-input"
              value={webSearchProvider}
              onChange={(e) => setWebSearchProvider(e.target.value as any)}
            >
              <option value="brave">Brave Search</option>
              <option value="perplexity">Perplexity</option>
              <option value="grok">Grok (xAI)</option>
              <option value="gemini">Google Gemini</option>
              <option value="kimi">Kimi (Moonshot)</option>
            </select>
          </div>

          {webSearchProvider === 'brave' && (
            <div className="config-field">
              <label className="config-label">Brave API Key</label>
              <input
                type="password"
                className="config-input"
                value={webSearchApiKey}
                onChange={(e) => setWebSearchApiKey(e.target.value)}
                placeholder="留空使用环境变量 BRAVE_API_KEY"
              />
            </div>
          )}

          {webSearchProvider === 'perplexity' && (
            <div className="config-field">
              <label className="config-label">Perplexity API Key</label>
              <input
                type="password"
                className="config-input"
                value={perplexityApiKey}
                onChange={(e) => setPerplexityApiKey(e.target.value)}
                placeholder="留空使用环境变量 PERPLEXITY_API_KEY"
              />
            </div>
          )}

          {webSearchProvider === 'grok' && (
            <div className="config-field">
              <label className="config-label">xAI API Key</label>
              <input
                type="password"
                className="config-input"
                value={grokApiKey}
                onChange={(e) => setGrokApiKey(e.target.value)}
                placeholder="留空使用环境变量 XAI_API_KEY"
              />
            </div>
          )}

          {webSearchProvider === 'gemini' && (
            <div className="config-field">
              <label className="config-label">Gemini API Key</label>
              <input
                type="password"
                className="config-input"
                value={geminiSearchApiKey}
                onChange={(e) => setGeminiSearchApiKey(e.target.value)}
                placeholder="留空使用环境变量 GEMINI_API_KEY"
              />
            </div>
          )}

          {webSearchProvider === 'kimi' && (
            <div className="config-field">
              <label className="config-label">Kimi API Key</label>
              <input
                type="password"
                className="config-input"
                value={kimiApiKey}
                onChange={(e) => setKimiApiKey(e.target.value)}
                placeholder="留空使用环境变量 KIMI_API_KEY"
              />
            </div>
          )}

          <div className="config-field" style={{ marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={webFetchEnabled}
                onChange={(e) => setWebFetchEnabled(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>启用 Web 抓取</span>
            </label>
          </div>

          <div className="config-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={firecrawlEnabled}
                onChange={(e) => setFirecrawlEnabled(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>启用 Firecrawl 增强抓取</span>
            </label>
          </div>

          {firecrawlEnabled && (
            <div className="config-field">
              <label className="config-label">Firecrawl API Key</label>
              <input
                type="password"
                className="config-input"
                value={firecrawlApiKey}
                onChange={(e) => setFirecrawlApiKey(e.target.value)}
                placeholder="留空使用环境变量 FIRECRAWL_API_KEY"
              />
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="config-group">
          <div className="config-group-title">🎯 技能系统</div>

          <div className="config-field">
            <label className="config-label">技能目录 (可选)</label>
            <input
              type="text"
              className="config-input"
              value={skillsDir}
              onChange={(e) => setSkillsDir(e.target.value)}
              placeholder="默认: ~/.openclaw/skills"
            />
          </div>

          <div className="config-field">
            <label className="config-label">启用的技能 (逗号分隔)</label>
            <input
              type="text"
              className="config-input"
              value={enabledSkills.join(', ')}
              onChange={(e) => setEnabledSkills(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="留空表示启用所有技能"
            />
          </div>
        </div>

        {/* Health Check */}
        <div className="config-group">
          <div className="config-group-title">💊 健康检查</div>

          <div className="config-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={healthCheckEnabled}
                onChange={(e) => setHealthCheckEnabled(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>启用健康检查</span>
            </label>
          </div>

          <div className="config-field">
            <label className="config-label">检查间隔 (秒)</label>
            <input
              type="number"
              className="config-input"
              value={healthCheckInterval}
              onChange={(e) => setHealthCheckInterval(e.target.value)}
              placeholder="60"
              min="10"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="config-save-bar">
        {saved && (
          <span style={{ fontSize: 13, color: 'var(--success)', marginRight: 14 }}>
            ✓ 已保存
          </span>
        )}
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
