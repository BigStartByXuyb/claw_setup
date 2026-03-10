import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import ConfigPanel from '../components/dashboard/ConfigPanel';
import GatewayMonitor from '../components/dashboard/GatewayMonitor';

type DashboardTab = 'config' | 'monitor';

interface DashboardViewProps {
  onBack: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onBack }) => {
  const [tab, setTab] = useState<DashboardTab>('config');

  return (
    <div className="app">
      <TopBar
        onSettings={() => {}}
      />
      <div className="dashboard">
        <div className="dashboard-sidebar">
          <div className="sidebar-logo">🦞</div>

          <button
            className={`sidebar-item ${tab === 'config' ? 'active' : ''}`}
            onClick={() => setTab('config')}
            title="配置"
          >
            <span>⚙</span>
            <span className="sidebar-label">配置</span>
          </button>

          <button
            className={`sidebar-item ${tab === 'monitor' ? 'active' : ''}`}
            onClick={() => setTab('monitor')}
            title="监控"
          >
            <span>📡</span>
            <span className="sidebar-label">监控</span>
          </button>

          <div style={{ flex: 1 }} />

          <button
            className="sidebar-item back-button"
            onClick={onBack}
            title="返回"
          >
            <span>←</span>
            <span className="sidebar-label">返回</span>
          </button>
        </div>

        <div className="dashboard-content">
          {tab === 'config'  && <ConfigPanel />}
          {tab === 'monitor' && <GatewayMonitor />}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
