import React, { useState } from 'react';

const ipc = window.electron.ipcRenderer;

interface Props {
  onNext: (data: any) => void;
}

const StepThree: React.FC<Props> = ({ onNext }) => {
  const [installMethod, setInstallMethod] = useState<'prebuilt' | 'source'>('prebuilt');
  const [installDir,    setInstallDir]    = useState('C:\\Users');
  const [installing,    setInstalling]    = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [status,        setStatus]        = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);

  const handleSelectDirectory = async () => {
    const result = await ipc.invoke('show-open-dialog');
    if (!result.canceled) setInstallDir(result.filePaths[0]);
  };

  const handleCopyError = () => {
    if (error) {
      const fullError = `OpenClaw 安装失败\n\n安装方法: ${installMethod === 'prebuilt' ? '预构建安装' : '源码编译'}\n安装目录: ${installDir}\n\n错误信息:\n${error}`;
      navigator.clipboard.writeText(fullError).then(() => {
        alert('错误信息已复制到剪贴板');
      }).catch((err) => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      });
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    setProgress(0);
    setStatus('正在安装 OpenClaw...');

    const interval = setInterval(() => {
      setProgress((p) => (p < 88 ? p + Math.random() * 8 : p));
    }, 600);

    try {
      const result = await ipc.invoke('install-openclaw', {
        installDir,
        method: installMethod,
      });
      clearInterval(interval);
      setProgress(100);

      if (result.success) {
        setStatus('✓ 安装成功！');
        setTimeout(() => onNext({ installMethod, installDir }), 1200);
      } else {
        setError(`安装失败: ${result.error}`);
        setProgress(0);
        setStatus(null);
      }
    } catch (err) {
      clearInterval(interval);
      setError((err as Error).message);
      setProgress(0);
      setStatus(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="step-panel">
      <div className="method-cards">
        {/* Prebuilt */}
        <div
          className={`method-card ${installMethod === 'prebuilt' ? 'selected' : ''}`}
          onClick={() => setInstallMethod('prebuilt')}
        >
          <div className="method-card-header">
            <input
              type="radio"
              className="method-radio"
              name="method"
              value="prebuilt"
              checked={installMethod === 'prebuilt'}
              onChange={() => setInstallMethod('prebuilt')}
            />
            <span className="method-card-title">预构建安装</span>
            <span className="method-tag method-tag-rec">推荐</span>
          </div>
          <p className="method-desc">安装已编译版本，无需克隆源码。最快捷的方式。</p>
          <ul className="method-features">
            <li>⚡ 快速安装（~5 分钟）</li>
            <li>📦 无需源代码</li>
            <li>🔄 自动更新支持</li>
          </ul>
        </div>

        {/* Source */}
        <div
          className={`method-card ${installMethod === 'source' ? 'selected' : ''}`}
          onClick={() => setInstallMethod('source')}
        >
          <div className="method-card-header">
            <input
              type="radio"
              className="method-radio"
              name="method"
              value="source"
              checked={installMethod === 'source'}
              onChange={() => setInstallMethod('source')}
            />
            <span className="method-card-title">源码编译</span>
            <span className="method-tag method-tag-dev">开发者</span>
          </div>
          <p className="method-desc">从源代码编译，可修改与参与开发。</p>
          <ul className="method-features">
            <li>🔧 完整源代码</li>
            <li>🔄 热重载开发</li>
            <li>🛠️ 可自定义功能</li>
          </ul>
        </div>
      </div>

      {installMethod === 'source' && (
        <div className="dir-picker">
          <div className="dir-picker-label">安装位置</div>
          <div className="dir-input-row">
            <input
              type="text"
              className="dir-input"
              value={installDir}
              onChange={(e) => setInstallDir(e.target.value)}
              placeholder="C:\Users\YourName\Projects"
            />
            <button className="btn btn-ghost btn-sm" onClick={handleSelectDirectory}>
              浏览
            </button>
          </div>
        </div>
      )}

      {installing && (
        <div className="install-progress">
          <div className="install-progress-text">
            <span>{status}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="install-progress-bar-track">
            <div
              className="install-progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <div style={{ fontWeight: 600 }}>安装失败</div>
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

      <div style={{ marginTop: 24 }}>
        <button
          className="btn btn-primary"
          onClick={handleInstall}
          disabled={installing || !installDir}
        >
          {installing ? '安装中...' : '开始安装 OpenClaw →'}
        </button>
      </div>
    </div>
  );
};

export default StepThree;
