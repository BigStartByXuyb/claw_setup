import { create } from 'zustand';

/**
 * UI 全局状态管理 Store
 *
 * 管理全局 UI 状态，包括通知消息、全局加载状态、对话框等
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */

/** 通知消息类型 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/** 通知消息 */
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  /** 自动关闭时间（毫秒），0 表示不自动关闭 */
  duration: number;
}

interface UIState {
  /** 通知消息列表 */
  notifications: Notification[];
  /** 是否显示全局加载遮罩 */
  globalLoading: boolean;
  /** 全局加载描述文字 */
  globalLoadingMessage: string;

  /**
   * 显示成功通知
   */
  showSuccess: (message: string, duration?: number) => void;

  /**
   * 显示错误通知
   */
  showError: (message: string, duration?: number) => void;

  /**
   * 显示信息通知
   */
  showInfo: (message: string, duration?: number) => void;

  /**
   * 显示警告通知
   */
  showWarning: (message: string, duration?: number) => void;

  /**
   * 关闭通知
   */
  dismissNotification: (id: string) => void;

  /**
   * 显示全局加载状态
   */
  showGlobalLoading: (message?: string) => void;

  /**
   * 隐藏全局加载状态
   */
  hideGlobalLoading: () => void;
}

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useUIStore = create<UIState>((set) => ({
  notifications: [],
  globalLoading: false,
  globalLoadingMessage: '',

  showSuccess: (message, duration = 3000) => {
    const id = generateId();
    set(state => ({
      notifications: [...state.notifications, { id, type: 'success', message, duration }]
    }));
    // 自动关闭
    if (duration > 0) {
      setTimeout(() => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      }, duration);
    }
  },

  showError: (message, duration = 5000) => {
    const id = generateId();
    set(state => ({
      notifications: [...state.notifications, { id, type: 'error', message, duration }]
    }));
    if (duration > 0) {
      setTimeout(() => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      }, duration);
    }
  },

  showInfo: (message, duration = 3000) => {
    const id = generateId();
    set(state => ({
      notifications: [...state.notifications, { id, type: 'info', message, duration }]
    }));
    if (duration > 0) {
      setTimeout(() => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      }, duration);
    }
  },

  showWarning: (message, duration = 4000) => {
    const id = generateId();
    set(state => ({
      notifications: [...state.notifications, { id, type: 'warning', message, duration }]
    }));
    if (duration > 0) {
      setTimeout(() => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      }, duration);
    }
  },

  dismissNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  showGlobalLoading: (message = '加载中...') => {
    set({ globalLoading: true, globalLoadingMessage: message });
  },

  hideGlobalLoading: () => {
    set({ globalLoading: false, globalLoadingMessage: '' });
  },
}));
