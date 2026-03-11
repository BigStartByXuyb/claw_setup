import { vi } from 'vitest';

/**
 * Electron IPC Mock 工厂
 *
 * 提供可配置的 IPC mock，用于测试需要自定义 IPC 返回值的场景
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */

/**
 * 创建 IPC invoke mock
 *
 * @param responses 通道名到响应的映射
 */
export function createIPCMock(responses: Record<string, any> = {}) {
  return {
    invoke: vi.fn(async (channel: string, ...args: any[]) => {
      if (channel in responses) {
        const response = responses[channel];
        return typeof response === 'function' ? response(...args) : response;
      }
      return { success: true };
    }),
  };
}

/**
 * 模拟成功的 IPC 响应
 *
 * @param data 返回数据
 */
export function mockIPCSuccess<T>(data?: T) {
  return { success: true, data };
}

/**
 * 模拟失败的 IPC 响应
 *
 * @param error 错误消息
 */
export function mockIPCError(error: string) {
  return { success: false, error };
}

/**
 * 设置 window.electron.ipc mock
 *
 * @param responses 通道响应配置
 */
export function setupElectronMock(responses: Record<string, any> = {}) {
  const mock = createIPCMock(responses);
  Object.defineProperty(window, 'electron', {
    writable: true,
    value: { ipc: mock },
  });
  return mock;
}
