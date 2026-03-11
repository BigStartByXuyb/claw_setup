import { create } from 'zustand';
import { gatewayAPI } from '../api/gatewayAPI';
import { GatewayStatus } from '../types/common';

/**
 * 网关状态管理 Store
 *
 * 管理 OpenClaw 网关进程的全局状态，包括启动、停止、日志查看
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
interface GatewayState {
  /** 是否正在运行 */
  isRunning: boolean;
  /** 当前端口号 */
  port: number | null;
  /** 进程 PID */
  pid: number | undefined;
  /** 网关日志内容 */
  logs: string;
  /** 是否正在执行操作 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;

  /**
   * 启动网关
   */
  start: () => Promise<void>;

  /**
   * 停止网关
   */
  stop: () => Promise<void>;

  /**
   * 刷新网关状态
   */
  refreshStatus: () => Promise<void>;

  /**
   * 刷新网关日志
   */
  refreshLogs: () => Promise<void>;

  /**
   * 清空日志
   */
  clearLogs: () => Promise<void>;

  /**
   * 清除错误状态
   */
  clearError: () => void;
}

export const useGatewayStore = create<GatewayState>((set) => ({
  isRunning: false,
  port: null,
  pid: undefined,
  logs: '',
  loading: false,
  error: null,

  start: async () => {
    set({ loading: true, error: null });
    try {
      const result = await gatewayAPI.start();
      if (result.success) {
        set({ isRunning: true, port: result.data?.port ?? null, loading: false });
      } else {
        set({ error: result.error || '启动网关失败', loading: false });
      }
    } catch (err) {
      set({ error: '启动网关失败', loading: false });
    }
  },

  stop: async () => {
    set({ loading: true, error: null });
    try {
      const result = await gatewayAPI.stop();
      if (result.success) {
        set({ isRunning: false, port: null, pid: undefined, loading: false });
      } else {
        set({ error: result.error || '停止网关失败', loading: false });
      }
    } catch (err) {
      set({ error: '停止网关失败', loading: false });
    }
  },

  refreshStatus: async () => {
    try {
      const result = await gatewayAPI.getStatus();
      if (result.success && result.data) {
        const status = result.data as GatewayStatus;
        set({ isRunning: status.isRunning, port: status.port ?? null, pid: status.pid });
      }
    } catch (err) {
      console.error('[GatewayStore] 刷新状态失败:', err);
    }
  },

  refreshLogs: async () => {
    try {
      const result = await gatewayAPI.getLogs();
      if (result.success) {
        set({ logs: result.data || '' });
      }
    } catch (err) {
      console.error('[GatewayStore] 刷新日志失败:', err);
    }
  },

  clearLogs: async () => {
    try {
      const result = await gatewayAPI.clearLogs();
      if (result.success) {
        set({ logs: '' });
      } else {
        set({ error: result.error || '清空日志失败' });
      }
    } catch (err) {
      set({ error: '清空日志失败' });
    }
  },

  clearError: () => set({ error: null }),
}));
