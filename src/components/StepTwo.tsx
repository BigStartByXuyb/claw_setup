import React, { useState, useEffect } from 'react';

const ipc = window.electron.ipcRenderer;

interface DependencyStatus {
  installed: boolean;
  version?: string;
  path?: string;
  description?: string;
}

interface DependenciesResult {
  required: { [key: string]: DependencyStatus };
  optional: { [key: string]: DependencyStatus };
  envVars: { [key: string]: any };
}

interface Props {
  onReadyChange: (ready: boolean, data?: any) => void;
}

const StepTwo: React.FC<Props> = ({ onReadyChange }) => {
  const [checking,     setChecking]     = useState(true);
  const [required,     setRequired]     = useState<{ [key: string]: DependencyStatus }>({});
  const [optional,     setOptional]     = useState<{ [key: string]: DependencyStatus }>({});
  const [envVars,      setEnvVars]      = useState<{ [key: string]: any }>({});
  const [installing,   setInstalling]   = useState<Set<string>>(new Set());

  useEffect(() => {
    checkDependencies();
  }, []);

  useEffect(() => {
    if (!checking) {
      const missing = Object.values(required).some((d) => !d.installed);
      onReadyChange(!missing, { required, optional });
    }
  }, [required, optional, checking]);

  const checkDependencies = async () => {
    setChecking(true);
    onReadyChange(false);
    try {
      const result: DependenciesResult = await ipc.invoke('check-dependencies');
      setRequired(result.required);
      setOptional(result.optional);
      setEnvVars(result.envVars);
    } catch (err) {
      console.error('Dependency check error:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleAutoInstall = async (tool: string) => {
    if (installing.has(tool)) return;

    setInstalling(prev => new Set(prev).add(tool));

    try {
      const result = await ipc.invoke('install-tool', tool);

      if (result.alreadyInstalled) {
        alert(`${tool} 已安装 (版本: ${result.version})`);
        await checkDependencies();
      } else if (result.installing) {
        alert(result.message);
      } else if (result.newlyInstalled) {
        alert(`${tool} 安装成功！`);
        await checkDependencies();
      } else if (!result.success) {
        alert(`无法自动安装 ${tool}: ${result.message || result.error}`);
      }
    } finally {
      setInstalling(prev => {
        const next = new Set(prev);
        next.delete(tool);
        return next;
      });
    }
  };

  const handleManualInstall = (tool: string) => {
    const urls: Record<string, string> = {
      node: 'https://nodejs.org/',
      npm:  'https://www.npmjs.com/',
      git:  'https://git-scm.com/',
      pnpm: 'https://pnpm.io/',
    };
    if (urls[tool]) ipc.invoke('open-external', urls[tool]);
  };

  if (checking) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <span>正在检查依赖...</span>
      </div>
    );
  }

  const missingCount = Object.values(required).filter((d) => !d.installed).length;
  const optionalInstalledCount = Object.values(optional).filter((d) => d.installed).length;
  const optionalTotalCount = Object.values(optional).length;

  return (
    <div className="step-panel">
      {/* 必需依赖 */}
      <div className="section-header">必需依赖</div>
      <div className="dep-list">
        {Object.entries(required).map(([tool, status]) => (
          <div key={tool} className={`dep-item ${status.installed ? 'installed' : 'missing'}`}>
            <div className="dep-header">
              <div className={`dep-status-dot ${status.installed ? 'ok' : 'err'}`} />
              <span className="dep-name">{tool}</span>
              {status.installed && (
                <span className="dep-version">{status.version}</span>
              )}
            </div>

            <div className="dep-details">
              {status.installed ? (
                <>
                  <div className="dep-detail-row">
                    <span className="dep-detail-key">路径</span>
                    <span className="dep-detail-val">{status.path}</span>
                  </div>
                </>
              ) : (
                <div className="dep-actions">
                  {tool === 'pnpm' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAutoInstall(tool)}
                      disabled={installing.has(tool)}
                    >
                      {installing.has(tool) ? '安装中...' : '自动安装'}
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleManualInstall(tool)}
                    >
                      打开官网下载
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={checkDependencies}>
                    检查
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 可选依赖 */}
      <div className="section-header" style={{ marginTop: 24 }}>
        可选依赖 ({optionalInstalledCount}/{optionalTotalCount} 已安装)
      </div>
      <div className="alert alert-info" style={{ marginBottom: 12, fontSize: 12 }}>
        <span>ℹ️</span>
        <span>以下依赖为可选，安装后可启用额外功能</span>
      </div>
      <div className="dep-list">
        {Object.entries(optional).map(([tool, status]) => (
          <div key={tool} className={`dep-item ${status.installed ? 'installed' : 'optional-missing'}`}>
            <div className="dep-header">
              <div className={`dep-status-dot ${status.installed ? 'ok' : 'neutral'}`} />
              <span className="dep-name">{tool}</span>
              {status.installed && (
                <span className="dep-version">{status.version}</span>
              )}
            </div>

            <div className="dep-details">
              {status.description && (
                <div className="dep-detail-row" style={{ marginBottom: 8 }}>
                  <span className="dep-detail-val" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {status.description}
                  </span>
                </div>
              )}
              {status.installed && status.path && (
                <div className="dep-detail-row">
                  <span className="dep-detail-key">路径</span>
                  <span className="dep-detail-val">{status.path}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 环境变量 */}
      <div className="section-header" style={{ marginTop: 24 }}>环境变量</div>
      <div className="dep-list">
        {Object.entries(envVars).map(([varName, varData]) => (
          <div key={varName} className={`dep-item ${varData.set ? 'installed' : 'missing'}`}>
            <div className="dep-header">
              <div className={`dep-status-dot ${varData.set ? 'ok' : 'err'}`} />
              <span className="dep-name" style={{ textTransform: 'none', fontSize: 12 }}>{varName}</span>
              {varData.set && (
                <span className="dep-version" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {varData.value?.substring(0, 40)}...
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 状态提示 */}
      {missingCount > 0 ? (
        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          <span>⚠️</span>
          <span>发现 {missingCount} 个缺失的必需工具，请先安装后继续。</span>
        </div>
      ) : (
        <div className="alert alert-success" style={{ marginTop: 16 }}>
          <span>✓</span>
          <span>所有必需依赖已满足！可选依赖：{optionalInstalledCount}/{optionalTotalCount} 已安装</span>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={checkDependencies} disabled={checking}>
          重新检查
        </button>
      </div>
    </div>
  );
};

export default StepTwo;
