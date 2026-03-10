import React, { useState, useEffect } from 'react';

const ipc = window.electron.ipcRenderer;

interface Props {
  onReadyChange: (ready: boolean, data?: any) => void;
}

const StepOne: React.FC<Props> = ({ onReadyChange }) => {
  const [checking, setChecking]     = useState(true);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    checkSystem();
  }, []);

  const checkSystem = async () => {
    setChecking(true);
    setError(null);
    onReadyChange(false);
    try {
      const result = await ipc.invoke('check-system-info');
      setSystemInfo(result);
      if (result.success) {
        onReadyChange(true, { systemInfo: result });
      } else {
        setError('系统不满足最低要求（需要 Windows 64-bit）');
        onReadyChange(false);
      }
    } catch (err) {
      setError((err as Error).message);
      onReadyChange(false);
    } finally {
      setChecking(false);
    }
  };

  const handleCopyError = () => {
    if (error) {
      const fullError = `系统检查失败\n\n错误信息:\n${error}`;
      navigator.clipboard.writeText(fullError).then(() => {
        alert('错误信息已复制到剪贴板');
      }).catch((err) => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      });
    }
  };

  if (checking) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <span>正在检查系统信息...</span>
      </div>
    );
  }

  return (
    <div className="step-panel">
      {error && (
        <div className="alert alert-error">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <div style={{ fontWeight: 600 }}>系统检查失败</div>
            <pre style={{
              margin: 0,
              padding: 8,
              background: 'rgba(0,0,0,0.1)',
              borderRadius: 4,
              fontSize: 11,
              overflow: 'auto',
              maxHeight: 200,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {error}
            </pre>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleCopyError}>
                复制错误详情
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {systemInfo && (
        <>
          <div className="section-header">系统信息</div>
          <div className="system-check-grid">
            <div className={`check-card ${systemInfo.requirements.isWindows.met ? 'pass' : 'fail'}`}>
              <div className={`check-card-icon ${systemInfo.requirements.isWindows.met ? 'pass' : 'fail'}`}>
                {systemInfo.requirements.isWindows.met ? '💻' : '⚠️'}
              </div>
              <div className="check-card-info">
                <div className="check-card-label">操作系统</div>
                <div className="check-card-value">{systemInfo.platform}</div>
              </div>
              <span className={`check-card-badge ${systemInfo.requirements.isWindows.met ? 'pass' : 'fail'}`}>
                {systemInfo.requirements.isWindows.met ? '✓ 符合' : '✗ 不符合'}
              </span>
            </div>

            <div className={`check-card ${systemInfo.requirements.is64bit.met ? 'pass' : 'fail'}`}>
              <div className={`check-card-icon ${systemInfo.requirements.is64bit.met ? 'pass' : 'fail'}`}>
                {systemInfo.requirements.is64bit.met ? '🔧' : '⚠️'}
              </div>
              <div className="check-card-info">
                <div className="check-card-label">系统架构</div>
                <div className="check-card-value">{systemInfo.arch}</div>
              </div>
              <span className={`check-card-badge ${systemInfo.requirements.is64bit.met ? 'pass' : 'fail'}`}>
                {systemInfo.requirements.is64bit.met ? '✓ 64-bit' : '✗ 32-bit'}
              </span>
            </div>

            <div className="check-card pass">
              <div className="check-card-icon pass">📋</div>
              <div className="check-card-info">
                <div className="check-card-label">系统版本</div>
                <div className="check-card-value">{systemInfo.release}</div>
              </div>
            </div>

            <div className="check-card pass">
              <div className="check-card-icon pass">🟢</div>
              <div className="check-card-info">
                <div className="check-card-label">Node.js</div>
                <div className="check-card-value">{systemInfo.nodeVersion}</div>
              </div>
            </div>
          </div>

          {systemInfo.success && (
            <div className="alert alert-success" style={{ marginTop: 16 }}>
              <span>✓</span>
              <span>你的系统满足所有要求，可以继续安装。</span>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={checkSystem}>
          重新检查
        </button>
      </div>
    </div>
  );
};

export default StepOne;
