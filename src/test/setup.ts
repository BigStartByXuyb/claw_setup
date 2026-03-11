/**
 * Vitest 测试环境初始化
 *
 * 在所有测试运行前执行，设置全局 mock 和测试环境
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// ==================== Mock Electron IPC ====================

/**
 * 模拟 window.electron 对象
 * 用于前端 API 层和组件的测试
 */
Object.defineProperty(window, 'electron', {
  writable: true,
  value: {
    ipcRenderer: {
      invoke: vi.fn().mockResolvedValue({ success: true }),
      on:     vi.fn(),
      off:    vi.fn(),
      send:   vi.fn(),
    },
  },
});

// ==================== Mock Node.js 模块（前端测试用）====================

/**
 * 在前端测试环境中 mock Node.js 特有模块
 * 这些模块在浏览器环境中不可用
 */
vi.mock('fs-extra', () => ({
  default: {
    pathExists:  vi.fn().mockResolvedValue(false),
    readJSON:    vi.fn().mockResolvedValue({}),
    writeJSON:   vi.fn().mockResolvedValue(undefined),
    ensureDir:   vi.fn().mockResolvedValue(undefined),
    ensureFile:  vi.fn().mockResolvedValue(undefined),
    appendFile:  vi.fn().mockResolvedValue(undefined),
    readFile:    vi.fn().mockResolvedValue(''),
    stat:        vi.fn().mockResolvedValue({ size: 0 }),
    move:        vi.fn().mockResolvedValue(undefined),
    copy:        vi.fn().mockResolvedValue(undefined),
    remove:      vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  ipcRenderer: {
    invoke:  vi.fn().mockResolvedValue({ success: true }),
    on:      vi.fn(),
    off:     vi.fn(),
    send:    vi.fn(),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/mock/path'),
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ filePaths: [] }),
  },
  BrowserWindow: vi.fn(),
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
}));

// ==================== 全局测试工具 ====================

/**
 * 重置所有 mock 状态
 * 在每个测试用例后自动调用
 */
beforeEach(() => {
  vi.clearAllMocks();
});
