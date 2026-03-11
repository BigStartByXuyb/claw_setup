import { create } from 'zustand';
import { configAPI } from '../api/configAPI';

/**
 * 配置状态管理 Store
 *
 * 管理 OpenClaw 配置文件的全局状态，包括读取、保存、更新各配置项
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
interface ConfigState {
  /** 当前配置对象（null 表示未加载） */
  config: any | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 是否正在保存 */
  saving: boolean;
  /** 错误信息 */
  error: string | null;

  /**
   * 加载配置文件
   */
  loadConfig: () => Promise<void>;

  /**
   * 通过点路径设置配置值
   *
   * @param dotPath 点分隔的路径
   * @param value 值
   */
  setConfigValue: (dotPath: string, value: any) => Promise<void>;

  /**
   * 删除配置项
   *
   * @param dotPath 点分隔的路径
   */
  deleteConfigValue: (dotPath: string) => Promise<void>;

  /**
   * 设置主模型
   *
   * @param model 模型标识符
   */
  setPrimaryModel: (model: string) => Promise<void>;

  /**
   * 清除错误状态
   */
  clearError: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  loading: false,
  saving: false,
  error: null,

  loadConfig: async () => {
    set({ loading: true, error: null });
    try {
      const result = await configAPI.loadConfig();
      if (result.success) {
        set({ config: result.data, loading: false });
      } else {
        set({ error: result.error || '加载配置失败', loading: false });
      }
    } catch (err) {
      set({ error: '加载配置失败', loading: false });
    }
  },

  setConfigValue: async (dotPath: string, value: any) => {
    set({ saving: true, error: null });
    try {
      const result = await configAPI.setConfigValue(dotPath, value);
      if (!result.success) {
        set({ error: result.error || '保存失败', saving: false });
        return;
      }
      set({ saving: false });
    } catch (err) {
      set({ error: '保存失败', saving: false });
    }
  },

  deleteConfigValue: async (dotPath: string) => {
    set({ saving: true, error: null });
    try {
      const result = await configAPI.deleteConfigValue(dotPath);
      if (!result.success) {
        set({ error: result.error || '删除失败', saving: false });
        return;
      }
      set({ saving: false });
    } catch (err) {
      set({ error: '删除失败', saving: false });
    }
  },

  setPrimaryModel: async (model: string) => {
    set({ saving: true, error: null });
    try {
      const result = await configAPI.setPrimaryModel(model);
      if (!result.success) {
        set({ error: result.error || '设置模型失败', saving: false });
        return;
      }
      set({ saving: false });
    } catch (err) {
      set({ error: '设置模型失败', saving: false });
    }
  },

  clearError: () => set({ error: null }),
}));
