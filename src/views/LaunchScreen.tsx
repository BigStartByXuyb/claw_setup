import React from 'react';

interface LaunchScreenProps {
  version: string;
  onInstall: () => void;
  onDashboard: () => void;
  onOpenChat: () => void;
}

const LaunchScreen: React.FC<LaunchScreenProps> = ({ version, onInstall, onDashboard, onOpenChat }) => {
  return (
    <div className="launch-screen">
      <div className="launch-logo">🦞</div>
      <div className="launch-title">Claw</div>
      <div className="launch-version">
        已检测到安装 · {version}
      </div>

      <div className="launch-actions">
        <div className="launch-card" onClick={onDashboard}>
          <div className="launch-card-icon">⚡</div>
          <div className="launch-card-body">
            <div className="launch-card-title">进入监控与配置</div>
            <div className="launch-card-desc">管理网关、查看日志、编辑配置</div>
          </div>
        </div>

        <div className="launch-card" onClick={onInstall}>
          <div className="launch-card-icon" style={{ background: 'rgba(10,132,255,0.1)' }}>🔄</div>
          <div className="launch-card-body">
            <div className="launch-card-title">重新安装 / 更新</div>
            <div className="launch-card-desc">运行安装向导更新到最新版本</div>
          </div>
        </div>

        <div className="launch-card" onClick={onOpenChat}>
          <div className="launch-card-icon" style={{ background: 'rgba(52,199,89,0.1)' }}>💬</div>
          <div className="launch-card-body">
            <div className="launch-card-title">打开聊天页面</div>
            <div className="launch-card-desc">在浏览器中打开 Claw Web UI</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchScreen;
