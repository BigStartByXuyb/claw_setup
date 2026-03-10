import React from 'react';

const ipc = window.electron?.ipcRenderer;

interface TopBarProps {
  showInstallAction?: boolean;
  onDiscord?: () => void;
  onSettings?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ showInstallAction, onDiscord, onSettings }) => {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="topbar-logo">🦞</span>
        <span className="topbar-title">Claw</span>
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        {showInstallAction && (
          <button
            className="topbar-btn"
            onClick={() => onDiscord?.()}
          >
            <span>⊕</span>
            <span>Discord</span>
          </button>
        )}

        {onSettings && (
          <button className="topbar-btn-icon" title="设置" onClick={onSettings}>
            ⚙
          </button>
        )}

        <div className="topbar-wincontrols">
          <button className="win-btn win-btn-close"  onClick={() => ipc.invoke('window-close')}    title="关闭" />
          <button className="win-btn win-btn-min"    onClick={() => ipc.invoke('window-minimize')} title="最小化" />
          <button className="win-btn win-btn-max"    onClick={() => ipc.invoke('window-maximize')} title="最大化" />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
