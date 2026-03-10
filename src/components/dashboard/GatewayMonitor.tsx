import React, { useState, useEffect, useRef } from 'react';

const ipc = window.electron.ipcRenderer;

interface LogLine {
  type: 'stdout' | 'stderr' | 'system';
  text: string;
  ts: number;
}

const GatewayMonitor: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load historical logs from backend
    const loadLogs = async () => {
      if (!ipc) return;

      const result = await ipc.invoke('get-gateway-logs');
      if (result.success && result.logs) {
        // Parse log file content into LogLine array
        const lines = result.logs.split('\n').filter((line: string) => line.trim());
        const parsedLogs: LogLine[] = lines.map((line: string) => {
          // Parse format: [timestamp] [type] text
          const match = line.match(/^\[(.*?)\] \[(.*?)\] (.*)$/);
          if (match) {
            return {
              type: match[2] as 'stdout' | 'stderr' | 'system',
              text: match[3],
              ts: new Date(match[1]).getTime(),
            };
          }
          // Fallback for unparseable lines
          return { type: 'system', text: line, ts: Date.now() };
        });
        setLogs(parsedLogs);
      }
    };

    loadLogs();

    // Check initial status
    ipc?.invoke('gateway-status').then((r: any) => setRunning(r.running));

    // Listen for log events
    ipc?.on('gateway-log', (msg: { type: 'stdout' | 'stderr' | 'system'; text: string }) => {
      setLogs((prev) => [...prev, { ...msg, ts: Date.now() }]);

      // 检测插件依赖错误
      if (msg.text.includes('Cannot find module')) {
        const match = msg.text.match(/Cannot find module '([^']+)'/);
        if (match) {
          const missingModule = match[1];
          setLogs((prev) => [
            ...prev,
            {
              type: 'system',
              text: `💡 提示: 缺少依赖 ${missingModule}，请在配置面板中检查并安装插件依赖`,
              ts: Date.now(),
            },
          ]);
        }
      }

      // 检测网关退出
      if (msg.type === 'system' && msg.text.includes('exited')) {
        setRunning(false);
        setLogs((prev) => [
          ...prev,
          {
            type: 'system',
            text: '💡 提示: 网关已停止。请检查上方日志中的错误信息',
            ts: Date.now(),
          },
        ]);
      }
    });
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStart = async () => {
    // 启动前先停止可能存在的网关进程
    setLogs((prev) => [
      ...prev,
      { type: 'system', text: '🔍 检查现有网关进程...', ts: Date.now() },
    ]);

    await ipc.invoke('gateway-stop');

    // 使用 forceKill 选项，自动强制关闭占用端口的进程
    const result = await ipc.invoke('gateway-start', { forceKill: true });

    if (result.success) {
      setRunning(true);
      setLogs((prev) => [
        ...prev,
        { type: 'system', text: `▶ Gateway starting on port ${result.port}...`, ts: Date.now() },
      ]);
    } else {
      setLogs((prev) => [
        ...prev,
        { type: 'system', text: `! 启动失败: ${result.message || result.error || '未知错误'}`, ts: Date.now() },
      ]);
    }
  };

  const handleStop = async () => {
    await ipc.invoke('gateway-stop');
    setRunning(false);
    setLogs((prev) => [
      ...prev,
      { type: 'system', text: '■ Gateway stopped.', ts: Date.now() },
    ]);
  };

  const handleClear = async () => {
    if (!ipc) return;

    await ipc.invoke('clear-gateway-logs');
    setLogs([]);
  };

  const handleCopyLogs = async () => {
    const logText = logs.map(line => line.text).join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div>
      <h2 className="dashboard-heading">网关监控</h2>

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>网关监控说明</h3>

            <div className="help-section">
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>什么是网关监控？</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                网关监控显示 OpenClaw 网关进程的实时日志。
                点击"启动"按钮会启动一个独立的网关进程，
                监控面板会显示该进程的输出。
              </p>
            </div>

            <div className="help-section">
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>与 pnpm gateway:watch 的区别</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
                <strong>pnpm gateway:watch</strong>:
                开发模式，代码改动时自动重启网关
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>网关监控</strong>:
                启动生产模式的网关进程，仅显示日志
              </p>
            </div>

            <div className="help-section">
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>为什么网关会停止？</h4>
              <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginLeft: 20 }}>
                <li>插件加载失败（缺少依赖）</li>
                <li>配置错误（端口占用、权限问题）</li>
                <li>进程崩溃（未捕获的异常）</li>
              </ul>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                <strong>解决方法</strong>:
                检查日志中的错误信息，修复问题后重新启动
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowHelp(false)}
              style={{ marginTop: 16 }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <div className="config-section">
        <div className="monitor-header">
          <div className={`status-dot ${running ? 'running' : 'stopped'}`} />
          <span className="monitor-status-text">
            {running ? '运行中' : '已停止'}
          </span>
          <div className="monitor-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowHelp(true)}>
              ❓ 帮助
            </button>
            {!running ? (
              <button className="btn btn-primary btn-sm" onClick={handleStart}>
                ▶ 启动
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={handleStop}>
                ■ 停止
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleCopyLogs}>
              📋 复制日志
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleClear}>
              清除日志
            </button>
          </div>
          {showCopySuccess && (
            <div className="copy-success-toast">
              ✓ 日志已复制到剪贴板
            </div>
          )}
        </div>

        <div className="log-area">
          {logs.length === 0 && (
            <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              暂无日志。点击"启动"以开始网关。
            </div>
          )}
          {logs.map((line, i) => (
            <div key={i} className={`log-line ${line.type}`}>
              {line.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

export default GatewayMonitor;
