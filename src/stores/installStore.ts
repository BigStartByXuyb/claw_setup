import { create } from 'zustand';
import { dependencyAPI } from '../api/dependencyAPI';
import { installAPI } from '../api/installAPI';
import { DependencyCheckResult } from '../types/common';

/**
 * 安装流程状态管理 Store
 *
 * 管理四步安装向导的全局状态：系统检查、依赖安装、OpenClaw安装、频道配置
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
interface InstallState {
  /** 当前步骤（1-4） */
  currentStep: number;
  /** 系统信息 */
  systemInfo: any | null;
  /** 依赖检查结果 */
  dependencyResult: DependencyCheckResult | null;
  /** 安装方式 */
  installMethod: 'prebuilt' | 'source';
  /** 已选择的频道 */
  selectedChannels: string[];
  /** 是否正在加载 */
  loading: boolean;
  /** 当前操作描述 */
  loadingMessage: string;
  /** 错误信息 */
  error: string | null;
  /** 安装是否完成 */
  installComplete: boolean;

  /**
   * 跳转到指定步骤
   */
  goToStep: (step: number) => void;

  /**
   * 检查系统信息
   */
  checkSystemInfo: () => Promise<void>;

  /**
   * 检查依赖工具
   */
  checkDependencies: () => Promise<void>;

  /**
   * 安装指定工具
   *
   * @param tool 工具名称
   */
  installTool: (tool: string) => Promise<void>;

  /**
   * 设置安装方式
   */
  setInstallMethod: (method: 'prebuilt' | 'source') => void;

  /**
   * 执行 OpenClaw 安装
   *
   * @param installDir 安装目录（source 模式）
   */
  installOpenClaw: (installDir?: string) => Promise<void>;

  /**
   * 更新已选择的频道
   */
  setSelectedChannels: (channels: string[]) => void;

  /**
   * 配置频道
   */
  configureChannels: () => Promise<void>;

  /**
   * 清除错误
   */
  clearError: () => void;
}

export const useInstallStore = create<InstallState>((set, get) => ({
  currentStep: 1,
  systemInfo: null,
  dependencyResult: null,
  installMethod: 'prebuilt',
  selectedChannels: [],
  loading: false,
  loadingMessage: '',
  error: null,
  installComplete: false,

  goToStep: (step: number) => set({ currentStep: step }),

  checkSystemInfo: async () => {
    set({ loading: true, loadingMessage: '检查系统信息...', error: null });
    try {
      const result = await dependencyAPI.checkSystemInfo();
      if (result.success) {
        set({ systemInfo: result.data, loading: false });
      } else {
        set({ error: result.error || '系统信息检查失败', loading: false });
      }
    } catch (err) {
      set({ error: '系统信息检查失败', loading: false });
    }
  },

  checkDependencies: async () => {
    set({ loading: true, loadingMessage: '检查依赖工具...', error: null });
    try {
      const result = await dependencyAPI.checkAll();
      if (result.success) {
        set({ dependencyResult: result.data || null, loading: false });
      } else {
        set({ error: result.error || '依赖检查失败', loading: false });
      }
    } catch (err) {
      set({ error: '依赖检查失败', loading: false });
    }
  },

  installTool: async (tool: string) => {
    set({ loading: true, loadingMessage: `安装 ${tool}...`, error: null });
    try {
      const result = await dependencyAPI.installTool(tool);
      if (!result.success) {
        set({ error: result.error || `安装 ${tool} 失败`, loading: false });
        return;
      }
      set({ loading: false });
      // 重新检查依赖
      await get().checkDependencies();
    } catch (err) {
      set({ error: `安装 ${tool} 失败`, loading: false });
    }
  },

  setInstallMethod: (method) => set({ installMethod: method }),

  installOpenClaw: async (installDir?: string) => {
    const { installMethod } = get();
    set({ loading: true, loadingMessage: '安装 OpenClaw...', error: null });
    try {
      const result = await installAPI.install(installMethod, installDir);
      if (result.success) {
        set({ loading: false });
      } else {
        set({ error: result.error || '安装失败', loading: false });
      }
    } catch (err) {
      set({ error: '安装失败', loading: false });
    }
  },

  setSelectedChannels: (channels) => set({ selectedChannels: channels }),

  configureChannels: async () => {
    const { selectedChannels } = get();
    set({ loading: true, loadingMessage: '配置频道...', error: null });
    try {
      const result = await installAPI.configureChannels(selectedChannels);
      if (result.success) {
        set({ installComplete: true, loading: false });
      } else {
        set({ error: result.error || '配置频道失败', loading: false });
      }
    } catch (err) {
      set({ error: '配置频道失败', loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
