import { BaseAPI } from './base/BaseAPI';
import { APIResult, DependencyCheckResult, InstallResult } from '../types/common';

/**
 * 依赖检查 API
 *
 * 封装依赖工具检查和安装相关的 IPC 调用
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class DependencyAPI extends BaseAPI {
  protected readonly apiName = 'DependencyAPI';

  /**
   * 检查所有依赖工具的安装状态
   *
   * @returns 依赖检查结果，包含必需和可选工具列表
   */
  async checkAll(): Promise<APIResult<DependencyCheckResult>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('check-dependencies');
      if (!result.success) {
        throw new Error(result.error || '依赖检查失败');
      }
      return result as DependencyCheckResult;
    });
  }

  /**
   * 安装指定工具
   *
   * @param tool 工具名称（'pnpm' | 'node' | 'git'）
   * @returns 安装结果
   */
  async installTool(tool: string): Promise<APIResult<InstallResult>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('install-tool', tool);
      if (!result.success && !result.installing) {
        throw new Error(result.error || `安装 ${tool} 失败`);
      }
      return result as InstallResult;
    });
  }

  /**
   * 检查系统信息（操作系统、架构等）
   *
   * @returns 系统信息
   */
  async checkSystemInfo(): Promise<APIResult<any>> {
    return this.withLoading(async () => {
      return await this.invoke<any>('check-system-info');
    });
  }
}

// 导出单例
export const dependencyAPI = new DependencyAPI();
