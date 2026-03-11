import { BaseAPI } from './base/BaseAPI';
import { APIResult } from '../types/common';

/**
 * 配置管理 API
 *
 * 封装所有配置相关的 IPC 调用，提供统一的前端接口
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class ConfigAPI extends BaseAPI {
  protected readonly apiName = 'ConfigAPI';

  /**
   * 加载配置文件
   *
   * @returns 配置对象
   */
  async loadConfig(): Promise<APIResult<any>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('read-config');
      if (!result.success) {
        throw new Error(result.error || '加载配置失败');
      }
      return result.config;
    });
  }

  /**
   * 通过点路径设置配置值
   *
   * @param dotPath 点分隔的路径，如 'models.providers.openai'
   * @param value 要设置的值
   */
  async setConfigValue(dotPath: string, value: any): Promise<APIResult<void>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('config-set', dotPath, value);
      if (!result.success) {
        throw new Error(result.error || '设置配置失败');
      }
    });
  }

  /**
   * 删除配置项
   *
   * @param dotPath 点分隔的路径
   */
  async deleteConfigValue(dotPath: string): Promise<APIResult<void>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('config-unset', dotPath);
      if (!result.success) {
        throw new Error(result.error || '删除配置失败');
      }
    });
  }

  /**
   * 获取当前主模型
   *
   * @returns 主模型标识符
   */
  async getCurrentModel(): Promise<APIResult<string | null>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('get-current-model');
      if (!result.success) {
        throw new Error(result.message || '获取模型失败');
      }
      return result.model as string | null;
    });
  }

  /**
   * 获取可用模型列表
   *
   * @returns 模型列表
   */
  async getAvailableModels(): Promise<APIResult<Array<{ provider: string; model: string; displayName: string }>>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('get-available-models');
      if (!result.success) {
        throw new Error(result.message || '获取模型列表失败');
      }
      return result.models;
    });
  }

  /**
   * 设置主模型
   *
   * @param model 模型标识符，如 'openai/gpt-4'
   */
  async setPrimaryModel(model: string): Promise<APIResult<void>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('set-primary-model', model);
      if (!result.success) {
        throw new Error(result.error || '设置模型失败');
      }
    });
  }

  /**
   * 检查 OpenClaw 是否已安装
   *
   * @returns 安装状态和版本
   */
  async checkInstalled(): Promise<APIResult<{ installed: boolean; version?: string }>> {
    return this.withLoading(async () => {
      return await this.invoke<{ installed: boolean; version?: string }>('check-openclaw-installed');
    });
  }
}

// 导出单例
export const configAPI = new ConfigAPI();
