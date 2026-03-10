import React, { useState } from 'react';
import type {
  ChannelConfig,
  ChannelType,
  ChannelMetadata,
  DmPolicy,
  GroupPolicy,
  StreamingMode,
} from '../../types/channels';
import { CHANNEL_PLUGIN_MAP } from '../../types/channel-plugin-map';

interface ChannelCardProps {
  channelType: ChannelType;
  config: ChannelConfig;
  metadata: ChannelMetadata;
  onChange: (config: ChannelConfig) => void;
}

const ipc = window.electron?.ipcRenderer;

const ChannelCard: React.FC<ChannelCardProps> = ({
  channelType,
  config,
  metadata,
  onChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [checkingDeps, setCheckingDeps] = useState(false);
  const [depsStatus, setDepsStatus] = useState<{
    checked: boolean;
    dependencies: Array<{ name: string; installed: boolean }>;
    allInstalled: boolean;
    message?: string;
  } | null>(null);
  const [installingDeps, setInstallingDeps] = useState(false);

  const handleToggleEnabled = () => {
    onChange({ ...config, enabled: !config.enabled });
  };

  const handleFieldChange = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handleCheckDependencies = async () => {
    setCheckingDeps(true);
    try {
      // 首先检查插件是否在映射表中定义
      const mappedPluginName = CHANNEL_PLUGIN_MAP[channelType];

      if (mappedPluginName === null) {
        // 插件未实现
        setDepsStatus({
          checked: true,
          dependencies: [],
          allInstalled: false,
          message: '此渠道的插件尚未实现',
        });
        setCheckingDeps(false);
        return;
      }

      const pluginInfo = await ipc.invoke('get-plugin-info', { channelType });

      if (!pluginInfo.hasPlugin) {
        // 插件已定义但目录不存在
        setDepsStatus({
          checked: true,
          dependencies: [],
          allInstalled: false,
          message: `插件目录不存在。请确保 OpenClaw 已正确安装，或手动创建插件目录：~/.openclaw/extensions/${mappedPluginName}`,
        });
        setCheckingDeps(false);
        return;
      }

      const result = await ipc.invoke('check-plugin-dependencies', {
        pluginName: pluginInfo.pluginName,
      });

      if (result.success) {
        setDepsStatus({
          checked: true,
          dependencies: result.dependencies,
          allInstalled: result.dependencies.every((d: any) => d.installed),
        });
      }
    } catch (error) {
      console.error('Check dependencies failed:', error);
    } finally {
      setCheckingDeps(false);
    }
  };

  const handleInstallDependencies = async () => {
    setInstallingDeps(true);
    try {
      if (!ipc) {
        alert('错误：应用必须在 Electron 环境中运行。请关闭浏览器窗口，使用 Electron 窗口。');
        setInstallingDeps(false);
        return;
      }

      // 首先检查插件是否在映射表中定义
      const mappedPluginName = CHANNEL_PLUGIN_MAP[channelType];

      if (mappedPluginName === null) {
        alert('此渠道的插件尚未实现，无法安装依赖');
        setInstallingDeps(false);
        return;
      }

      // 直接调用后端安装依赖，后端会自动处理插件不存在的情况
      const result = await ipc.invoke('install-plugin-dependencies', {
        pluginName: mappedPluginName,
      });

      if (result.success) {
        alert(`依赖安装成功！${result.pluginPath ? `\n插件路径: ${result.pluginPath}` : ''}`);
        // 重新检查依赖状态
        await handleCheckDependencies();
      } else {
        alert(`依赖安装失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Install dependencies failed:', error);
      alert(`依赖安装失败: ${error}`);
    } finally {
      setInstallingDeps(false);
    }
  };

  const renderAuthConfig = () => {
    switch (config.type) {
      case 'discord':
        return (
          <div className="config-field">
            <label className="config-label">Bot Token</label>
            <input
              type="password"
              className="config-input"
              value={config.token || ''}
              onChange={(e) => handleFieldChange('token', e.target.value)}
              placeholder="Enter Discord bot token..."
            />
          </div>
        );

      case 'telegram':
        return (
          <>
            <div className="config-field">
              <label className="config-label">Bot Token</label>
              <input
                type="password"
                className="config-input"
                value={config.botToken || ''}
                onChange={(e) => handleFieldChange('botToken', e.target.value)}
                placeholder="Enter Telegram bot token..."
              />
            </div>
            <div className="config-field">
              <label className="config-label">Webhook URL (可选)</label>
              <input
                type="text"
                className="config-input"
                value={config.webhookUrl || ''}
                onChange={(e) => handleFieldChange('webhookUrl', e.target.value)}
                placeholder="https://your-domain.com/webhook"
              />
            </div>
            <div className="config-field">
              <label className="config-label">Webhook Secret (可选)</label>
              <input
                type="password"
                className="config-input"
                value={config.webhookSecret || ''}
                onChange={(e) => handleFieldChange('webhookSecret', e.target.value)}
                placeholder="Enter webhook secret..."
              />
            </div>
          </>
        );

      case 'slack':
        return (
          <>
            <div className="config-field">
              <label className="config-label">Bot Token</label>
              <input
                type="password"
                className="config-input"
                value={config.botToken || ''}
                onChange={(e) => handleFieldChange('botToken', e.target.value)}
                placeholder="xoxb-..."
              />
            </div>
            <div className="config-field">
              <label className="config-label">App Token (可选)</label>
              <input
                type="password"
                className="config-input"
                value={config.appToken || ''}
                onChange={(e) => handleFieldChange('appToken', e.target.value)}
                placeholder="xapp-..."
              />
            </div>
            <div className="config-field">
              <label className="config-label">Signing Secret (可选)</label>
              <input
                type="password"
                className="config-input"
                value={config.signingSecret || ''}
                onChange={(e) => handleFieldChange('signingSecret', e.target.value)}
                placeholder="Enter signing secret..."
              />
            </div>
          </>
        );

      case 'feishu':
        return (
          <>
            <div className="config-field">
              <label className="config-label">App ID</label>
              <input
                type="text"
                className="config-input"
                value={config.appId || ''}
                onChange={(e) => handleFieldChange('appId', e.target.value)}
                placeholder="cli_..."
              />
            </div>
            <div className="config-field">
              <label className="config-label">App Secret</label>
              <input
                type="password"
                className="config-input"
                value={config.appSecret || ''}
                onChange={(e) => handleFieldChange('appSecret', e.target.value)}
                placeholder="Enter app secret..."
              />
            </div>
          </>
        );

      case 'signal':
        return (
          <div className="config-field">
            <label className="config-label">Account (Phone Number)</label>
            <input
              type="text"
              className="config-input"
              value={config.account || ''}
              onChange={(e) => handleFieldChange('account', e.target.value)}
              placeholder="+1234567890"
            />
          </div>
        );

      case 'msteams':
        return (
          <>
            <div className="config-field">
              <label className="config-label">App ID</label>
              <input
                type="text"
                className="config-input"
                value={config.appId || ''}
                onChange={(e) => handleFieldChange('appId', e.target.value)}
                placeholder="Enter app ID..."
              />
            </div>
            <div className="config-field">
              <label className="config-label">App Password</label>
              <input
                type="password"
                className="config-input"
                value={config.appPassword || ''}
                onChange={(e) => handleFieldChange('appPassword', e.target.value)}
                placeholder="Enter app password..."
              />
            </div>
          </>
        );

      default:
        return (
          <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            此渠道的详细配置暂未实现
          </div>
        );
    }
  };

  const renderPolicyConfig = () => {
    return (
      <>
        <div className="config-field">
          <label className="config-label">DM 策略</label>
          <select
            className="config-input"
            value={config.dmPolicy || 'pairing'}
            onChange={(e) => handleFieldChange('dmPolicy', e.target.value as DmPolicy)}
          >
            <option value="pairing">配对模式（需要配对码）</option>
            <option value="allowlist">白名单模式</option>
            <option value="open">开放模式（允许所有）</option>
            <option value="disabled">禁用</option>
          </select>
        </div>

        <div className="config-field">
          <label className="config-label">群组策略</label>
          <select
            className="config-input"
            value={config.groupPolicy || 'open'}
            onChange={(e) => handleFieldChange('groupPolicy', e.target.value as GroupPolicy)}
          >
            <option value="open">开放模式</option>
            <option value="allowlist">白名单模式</option>
            <option value="disabled">禁用</option>
          </select>
        </div>

        <div className="config-field">
          <label className="config-label">白名单 (可选，逗号分隔)</label>
          <input
            type="text"
            className="config-input"
            value={config.allowFrom?.join(', ') || ''}
            onChange={(e) =>
              handleFieldChange(
                'allowFrom',
                e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
              )
            }
            placeholder="user1, user2, user3"
          />
        </div>
      </>
    );
  };

  const renderStreamingConfig = () => {
    return (
      <div className="config-field">
        <label className="config-label">流式模式</label>
        <select
          className="config-input"
          value={config.streaming || 'off'}
          onChange={(e) => handleFieldChange('streaming', e.target.value as StreamingMode)}
        >
          <option value="off">关闭</option>
          <option value="partial">部分流式</option>
          <option value="block">块流式</option>
          <option value="progress">进度流式</option>
        </select>
      </div>
    );
  };

  const renderActionsConfig = () => {
    // Only Discord and Telegram have actions
    if (config.type !== 'discord' && config.type !== 'telegram') {
      return null;
    }

    const actions = config.actions || {};

    const handleActionToggle = (action: string, value: boolean) => {
      handleFieldChange('actions', { ...actions, [action]: value });
    };

    const actionsList = (() => {
      switch (config.type) {
        case 'discord':
          return [
            { key: 'reactions', label: '反应表情' },
            { key: 'threads', label: '线程管理' },
            { key: 'deleteMessage', label: '删除消息' },
            { key: 'editMessage', label: '编辑消息' },
            { key: 'pins', label: '置顶消息' },
            { key: 'search', label: '搜索消息' },
          ];
        case 'telegram':
          return [
            { key: 'reactions', label: '反应表情' },
            { key: 'sendMessage', label: '发送消息' },
            { key: 'deleteMessage', label: '删除消息' },
            { key: 'editMessage', label: '编辑消息' },
            { key: 'sticker', label: '贴纸' },
          ];
        default:
          return [];
      }
    })();

    if (actionsList.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {actionsList.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={(actions as any)[key] !== false}
              onChange={(e) => handleActionToggle(key, e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>{label}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <div className="channel-card">
      <div
        className="channel-card-header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span className="channel-icon">{metadata.icon}</span>
          <div style={{ flex: 1 }}>
            <div className="channel-name">
              {metadata.name}
              {metadata.experimental && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--warning)' }}>
                  实验性
                </span>
              )}
              {metadata.notImplemented && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--error)' }}>
                  未实现
                </span>
              )}
            </div>
            <div className="channel-desc">{metadata.description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label className="toggle" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={handleToggleEnabled}
            />
            <span className="toggle-slider" />
          </label>
          <span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="channel-card-body">
          <div className="config-group">
            <div className="config-group-title">🔐 认证配置</div>
            {renderAuthConfig()}
          </div>

          <div className="config-group">
            <div className="config-group-title">📋 策略配置</div>
            {renderPolicyConfig()}
          </div>

          <div className="config-group">
            <div className="config-group-title">⚡ 流式配置</div>
            {renderStreamingConfig()}
          </div>

          {renderActionsConfig() && (
            <div className="config-group">
              <div className="config-group-title">🎯 功能开关</div>
              {renderActionsConfig()}
            </div>
          )}

          <div className="config-group">
            <div className="config-group-title">📦 插件依赖</div>
            {!depsStatus?.checked ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCheckDependencies}
                disabled={checkingDeps}
              >
                {checkingDeps ? '检查中...' : '检查依赖'}
              </button>
            ) : (
              <>
                {depsStatus.message ? (
                  <>
                    <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>
                      ⚠️ {depsStatus.message}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleInstallDependencies}
                      disabled={installingDeps}
                      style={{ marginBottom: 8 }}
                    >
                      {installingDeps ? '安装中...' : '安装依赖'}
                    </button>
                  </>
                ) : depsStatus.allInstalled ? (
                  <div style={{ color: 'var(--success)', fontSize: 13 }}>
                    ✓ 所有依赖已安装
                  </div>
                ) : (
                  <>
                    <div style={{ color: 'var(--warning)', fontSize: 13, marginBottom: 8 }}>
                      ⚠️ 缺少以下依赖:
                    </div>
                    <ul style={{ marginLeft: 20, fontSize: 13, marginBottom: 12 }}>
                      {depsStatus.dependencies
                        .filter((d) => !d.installed)
                        .map((d) => (
                          <li key={d.name} style={{ color: 'var(--text-secondary)' }}>
                            {d.name}
                          </li>
                        ))}
                    </ul>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleInstallDependencies}
                      disabled={installingDeps}
                      style={{ marginBottom: 8 }}
                    >
                      {installingDeps ? '安装中...' : '安装依赖'}
                    </button>
                  </>
                )}
                {!depsStatus.message && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleCheckDependencies}
                    disabled={checkingDeps}
                    style={{ marginTop: 8 }}
                  >
                    重新检查
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelCard;
