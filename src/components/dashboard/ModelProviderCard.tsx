import React, { useState } from 'react';
import type {
  ModelProviderConfig,
  ModelProviderType,
  ModelProviderAuthMode,
} from '../../types/models';
import { MODEL_PROVIDER_METADATA } from '../../types/models';

interface ModelProviderCardProps {
  providerId: ModelProviderType;
  config: ModelProviderConfig;
  metadata: typeof MODEL_PROVIDER_METADATA[ModelProviderType];
  onChange: (config: ModelProviderConfig) => void;
  onRemove: () => void;
}

const ModelProviderCard: React.FC<ModelProviderCardProps> = ({
  providerId,
  config,
  metadata,
  onChange,
  onRemove,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleEnabled = () => {
    onChange({ ...config, enabled: !config.enabled });
  };

  const handleAuthModeChange = (auth: ModelProviderAuthMode) => {
    onChange({ ...config, auth });
  };

  const handleFieldChange = (field: keyof ModelProviderConfig, value: string) => {
    onChange({ ...config, [field]: value });
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const ipc = (window as any).electron.ipcRenderer;
      const result = await ipc.invoke('model-auth-login', { provider: providerId });

      if (result.success) {
        setAuthMessage({ type: 'success', text: result.message });
      } else {
        setAuthMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setAuthMessage({ type: 'error', text: `认证失败：${(error as Error).message}` });
    } finally {
      setAuthLoading(false);
    }
  };

  const renderAuthFields = () => {
    switch (config.auth) {
      case 'api-key':
        return (
          <div className="config-field">
            <label className="config-label">API Key</label>
            <input
              type="password"
              className="config-input"
              value={config.apiKey || ''}
              onChange={(e) => handleFieldChange('apiKey', e.target.value)}
              placeholder="Enter API key..."
            />
          </div>
        );

      case 'oauth':
        return (
          <>
            <div className="config-field">
              <label className="config-label">Client ID</label>
              <input
                type="text"
                className="config-input"
                value={config.clientId || ''}
                onChange={(e) => handleFieldChange('clientId', e.target.value)}
                placeholder="Enter client ID..."
              />
            </div>
            <div className="config-field">
              <label className="config-label">Client Secret</label>
              <input
                type="password"
                className="config-input"
                value={config.clientSecret || ''}
                onChange={(e) => handleFieldChange('clientSecret', e.target.value)}
                placeholder="Enter client secret..."
              />
            </div>
            <div className="config-field">
              <label className="config-label">Refresh Token</label>
              <input
                type="password"
                className="config-input"
                value={config.refreshToken || ''}
                onChange={(e) => handleFieldChange('refreshToken', e.target.value)}
                placeholder="Enter refresh token..."
              />
            </div>
          </>
        );

      case 'token':
        return (
          <div className="config-field">
            <label className="config-label">Bearer Token</label>
            <input
              type="password"
              className="config-input"
              value={config.apiKey || ''}
              onChange={(e) => handleFieldChange('apiKey', e.target.value)}
              placeholder="Enter bearer token..."
            />
          </div>
        );

      case 'aws-sdk':
        return (
          <>
            <div className="config-field">
              <label className="config-label">AWS Region</label>
              <input
                type="text"
                className="config-input"
                value={config.awsRegion || ''}
                onChange={(e) => handleFieldChange('awsRegion', e.target.value)}
                placeholder="us-east-1"
              />
            </div>
            <div className="config-field">
              <label className="config-label">AWS Access Key ID</label>
              <input
                type="password"
                className="config-input"
                value={config.awsAccessKeyId || ''}
                onChange={(e) => handleFieldChange('awsAccessKeyId', e.target.value)}
                placeholder="Enter access key ID..."
              />
            </div>
            <div className="config-field">
              <label className="config-label">AWS Secret Access Key</label>
              <input
                type="password"
                className="config-input"
                value={config.awsSecretAccessKey || ''}
                onChange={(e) => handleFieldChange('awsSecretAccessKey', e.target.value)}
                placeholder="Enter secret access key..."
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="provider-card">
      <div
        className="provider-card-header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span className="provider-icon">{metadata.icon}</span>
          <div style={{ flex: 1 }}>
            <div className="provider-name">{metadata.name}</div>
            <div className="provider-desc">{metadata.description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label
            className="toggle"
            onClick={(e) => e.stopPropagation()}
          >
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
        <div className="provider-card-body">
          <div className="config-field">
            <label className="config-label">认证方式</label>
            <select
              className="config-input"
              value={config.auth}
              onChange={(e) => handleAuthModeChange(e.target.value as ModelProviderAuthMode)}
            >
              {metadata.supportedAuthModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === 'api-key' && 'API Key'}
                  {mode === 'oauth' && 'OAuth'}
                  {mode === 'token' && 'Bearer Token'}
                  {mode === 'aws-sdk' && 'AWS SDK'}
                </option>
              ))}
            </select>
          </div>

          <div className="config-field">
            <label className="config-label">Base URL</label>
            <input
              type="text"
              className="config-input"
              value={config.baseUrl}
              onChange={(e) => handleFieldChange('baseUrl', e.target.value)}
              placeholder={metadata.defaultBaseUrl}
            />
          </div>

          {renderAuthFields()}

          {/* 认证按钮区域 */}
          {metadata.supportedAuthModes.includes('oauth') && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAuth}
                disabled={authLoading}
                style={{ width: '100%' }}
              >
                {authLoading ? '正在打开终端...' : '一键认证登录'}
              </button>

              {authMessage && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    backgroundColor: authMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: authMessage.type === 'success' ? '#22c55e' : '#ef4444',
                  }}
                >
                  {authMessage.text}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onRemove}
              style={{ color: 'var(--error)' }}
            >
              移除提供商
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelProviderCard;
