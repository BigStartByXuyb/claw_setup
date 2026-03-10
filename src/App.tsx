import React, { useState, useEffect } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import LaunchScreen from './views/LaunchScreen';
import InstallerView from './views/InstallerView';
import DashboardView from './views/DashboardView';

type AppMode = 'loading' | 'launch' | 'installer' | 'dashboard';

const ipc = window.electron.ipcRenderer;

const App: React.FC = () => {
  const [mode,    setMode]    = useState<AppMode>('loading');
  const [version, setVersion] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const result = await ipc.invoke('check-openclaw-installed');
        if (result.installed) {
          setVersion(result.version || '已安装');
          setMode('launch');
        } else {
          setMode('installer');
        }
      } catch {
        setMode('installer');
      }
    })();
  }, []);

  if (mode === 'loading') {
    return (
      <div className="app">
        <TopBar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-wrap">
            <div className="spinner" />
            <span>正在检测环境...</span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'installer') {
    return <InstallerView onComplete={() => setMode('launch')} />;
  }

  if (mode === 'dashboard') {
    return <DashboardView onBack={() => setMode('launch')} />;
  }

  // 'launch' mode
  return (
    <div className="app">
      <TopBar />
      <LaunchScreen
        version={version}
        onDashboard={() => setMode('dashboard')}
        onInstall={()   => setMode('installer')}
        onOpenChat={async () => {
          await ipc.invoke('open-chat-window');
        }}
      />
    </div>
  );
};

export default App;
