import { BaseAPI } from './base/BaseAPI';
import { APIResult } from '../types/common';

/**
 * 安装管理 API
 *
 * 封装 OpenClaw 安装、频道配置和使用指南生成相关的 IPC 调用
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class InstallAPI extends BaseAPI {
  protected readonly apiName = 'InstallAPI';

  /**
   * 安装 OpenClaw
   *
   * @param method 安装方式：'prebuilt'（预编译包）或 'source'（源码编译）
   * @param installDir 安装目录（source 模式下使用）
   */
  async install(method: 'prebuilt' | 'source', installDir?: string): Promise<APIResult<void>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('install-openclaw', method, installDir);
      if (!result.success) {
        throw new Error(result.error || '安装失败');
      }
    });
  }

  /**
   * 配置通讯频道
   *
   * @param selectedChannels 用户选择启用的频道列表
   */
  async configureChannels(selectedChannels: string[]): Promise<APIResult<void>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('configure-channels', selectedChannels);
      if (!result.success) {
        throw new Error(result.error || '配置频道失败');
      }
    });
  }

  /**
   * 生成使用指南文件
   *
   * @param outputDir 输出目录
   * @returns 生成的文件路径
   */
  async generateGuide(outputDir?: string): Promise<APIResult<string>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('generate-guide', outputDir);
      if (!result.success) {
        throw new Error(result.error || '生成指南失败');
      }
      return result.path as string;
    });
  }

  /**
   * 获取插件信息
   *
   * @param channelType 频道类型
   */
  async getPluginInfo(channelType: string): Promise<APIResult<any>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('get-plugin-info', { channelType });
      if (!result.success && !result.hasPlugin) {
        return result;
      }
      return result;
    });
  }

  /**
   * 安装插件依赖
   *
   * @param pluginName 插件名称
   */
  async installPluginDependencies(pluginName: string): Promise<APIResult<any>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('install-plugin-dependencies', { pluginName });
      if (!result.success) {
        throw new Error(result.error || `安装插件 ${pluginName} 依赖失败`);
      }
      return result;
    });
  }

  /**
   * 模型认证登录
   *
   * 在新终端窗口中启动认证流程
   *
   * @param provider 提供商标识符，如 'qwen', 'github-copilot'
   */
  async modelAuthLogin(provider: string): Promise<APIResult<{ message: string; command: string }>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('model-auth-login', { provider });
      if (!result.success) {
        throw new Error(result.error || '启动认证失败');
      }
      return { message: result.message, command: result.command };
    });
  }
}

// 导出单例
export const installAPI = new InstallAPI();
