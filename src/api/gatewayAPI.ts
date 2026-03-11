import { BaseAPI } from './base/BaseAPI';
import { APIResult, GatewayStatus } from '../types/common';

/**
 * 网关管理 API
 *
 * 封装网关进程的启动、停止、状态查询和日志相关的 IPC 调用
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class GatewayAPI extends BaseAPI {
  protected readonly apiName = 'GatewayAPI';

  /**
   * 启动网关进程
   *
   * @returns 启动结果，成功时包含端口号
   */
  async start(): Promise<APIResult<{ port: number }>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('gateway-start');
      if (!result.success) {
        throw new Error(result.error || '启动网关失败');
      }
      return result.data as { port: number };
    });
  }

  /**
   * 停止网关进程
   */
  async stop(): Promise<APIResult<void>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('gateway-stop');
      if (!result.success) {
        throw new Error(result.error || '停止网关失败');
      }
    });
  }

  /**
   * 获取网关当前状态
   *
   * @returns 网关状态信息
   */
  async getStatus(): Promise<APIResult<GatewayStatus>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('gateway-status');
      if (!result.success) {
        throw new Error(result.error || '获取网关状态失败');
      }
      return result.data as GatewayStatus;
    });
  }

  /**
   * 获取网关日志
   *
   * @returns 日志内容字符串
   */
  async getLogs(): Promise<APIResult<string>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('get-gateway-logs');
      if (!result.success) {
        throw new Error(result.error || '获取日志失败');
      }
      return result.logs as string;
    });
  }

  /**
   * 清空网关日志
   */
  async clearLogs(): Promise<APIResult<void>> {
    return this.withLoading(async () => {
      const result = await this.invoke<any>('clear-gateway-logs');
      if (!result.success) {
        throw new Error(result.error || '清空日志失败');
      }
    });
  }

  /**
   * 打开聊天窗口（浏览器）
   */
  async openChatWindow(): Promise<APIResult<void>> {
    return this.withLoading(async () => {
      await this.invoke('open-chat-window');
    });
  }
}

// 导出单例
export const gatewayAPI = new GatewayAPI();
