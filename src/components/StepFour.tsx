import React, { useState } from 'react';

const ipc = window.electron.ipcRenderer;

interface Props {
  onNext: (data: any) => void;
  installData: any;
  onComplete?: () => void;
}

const CHANNELS = [
  { id: 'feishu',   name: '飞书',     icon: '📱', color: '#1890FF' },
  { id: 'wechat',   name: '微信',     icon: '💬', color: '#09B83E' },
  { id: 'qq',       name: 'QQ',       icon: '🐧', color: '#0D47A1' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0088CC' },
  { id: 'discord',  name: 'Discord',  icon: '🎮', color: '#7289DA' },
  { id: 'slack',    name: 'Slack',    icon: '⚙️', color: '#E01E5A' },
];

const StepFour: React.FC<Props> = ({ onNext, installData, onComplete }) => {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [configuring,      setConfiguring]      = useState(false);
  const [phase,            setPhase]            = useState(0);
  const [completed,        setCompleted]        = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    setConfiguring(true);
    setError(null);
    setPhase(1);

    try {
      const configResult = await ipc.invoke('configure-channels', selectedChannels);
      if (!configResult.success) throw new Error(configResult.error);

      setPhase(2);
      const serverResult = await ipc.invoke('start-openclaw-server');
      if (!serverResult.success) console.warn('Server start warning:', serverResult.error);

      setPhase(3);
      await new Promise((r) => setTimeout(r, 1500));
      await ipc.invoke('open-chat-window');

      setPhase(4);
      await ipc.invoke('generate-guide', installData.installDir || '');

      setCompleted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConfiguring(false);
      setPhase(0);
    }
  };

  if (completed) {
    return (
      <div className="completion-screen">
        <div className="completion-emoji">🎉</div>
        <div className="completion-title">安装完成！</div>
        <div className="completion-msg">OpenClaw 已成功安装并配置完成</div>

        <div className="completion-card">
          <div className="completion-card-title">已选渠道</div>
          <div className="channel-badges">
            {selectedChannels.length > 0 ? (
              selectedChannels.map((id) => {
                const ch = CHANNELS.find((c) => c.id === id);
                return (
                  <div key={id} className="channel-badge">
                    <span>{ch?.icon}</span>
                    <span>{ch?.name}</span>
                  </div>
                );
              })
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                未选择渠道（可稍后配置）
              </span>
            )}
          </div>
        </div>

        <div className="completion-actions">
          <button
            className="btn btn-primary"
            onClick={() => onComplete?.()}
          >
            ✓ 返回主界面
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => ipc.invoke('open-external', 'https://docs.openclaw.ai')}
          >
            📖 查看文档
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => ipc.invoke('open-external', 'https://discord.gg/clawd')}
          >
            💬 加入社区
          </button>
        </div>

        <div style={{ fontSize: 32, marginTop: 32, animation: 'float 3s ease-in-out infinite' }}>
          🦞
        </div>
      </div>
    );
  }

  const PHASES = [
    { label: '配置渠道',   icon: '⚙️' },
    { label: '启动服务器', icon: '🚀' },
    { label: '打开界面',   icon: '💬' },
    { label: '生成指南',   icon: '📝' },
  ];

  return (
    <div className="step-panel">
      <div className="section-header">选择接入渠道</div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
        点击选择要接入的渠道（可多选，可稍后修改）
      </p>

      <div className="channels-grid">
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            className={`channel-card ${selectedChannels.includes(ch.id) ? 'selected' : ''}`}
            onClick={() => toggleChannel(ch.id)}
          >
            <div className="channel-icon">{ch.icon}</div>
            <div className="channel-name">{ch.name}</div>
            {selectedChannels.includes(ch.id) && (
              <div className="channel-check">✓</div>
            )}
          </div>
        ))}
      </div>

      <div className="alert alert-info" style={{ marginTop: 14 }}>
        <span>💡</span>
        <span>可随时通过 openclaw onboard 修改渠道配置</span>
      </div>

      {configuring && (
        <div className="config-steps" style={{ marginTop: 20 }}>
          {PHASES.map((p, i) => (
            <div
              key={i}
              className={`config-step-item ${phase === i + 1 ? 'active' : phase > i + 1 ? 'done' : ''}`}
            >
              <span className="config-step-icon">{p.icon}</span>
              <span className="config-step-label">{p.label}...</span>
              {phase > i + 1 && <span style={{ marginLeft: 'auto', color: 'var(--success)' }}>✓</span>}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          <span>✗</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          className="btn btn-primary"
          onClick={handleComplete}
          disabled={configuring}
        >
          {configuring ? '配置中...' : '完成安装并启动 →'}
        </button>
      </div>
    </div>
  );
};

export default StepFour;
