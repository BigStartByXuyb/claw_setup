import { APIResult } from '../../types/common';
import { IPCError } from '../../errors/AppError';

/**
 * API 基类
 *
 * 所有前端 API 类都应继承此基类，提供统一的 IPC 调用和错误处理
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export abstract class BaseAPI {
  /**
   * API 名称，子类必须实现
   */
  protected abstract readonly apiName: string;

  /**
   * 创建成功响应
   *
   * @param data 返回的数据
   * @returns 成功的 API 响应
   */
  protected success<T>(data?: T): APIResult<T> {
    return {
      success: true,
      data
    };
  }

  /**
   * 创建失败响应
   *
   * @param message 错误消息
   * @returns 失败的 API 响应
   */
  protected error(message: string): APIResult<any> {
    console.error(`[${this.apiName}] ${message}`);
    return {
      success: false,
      error: message
    };
  }

  /**
   * 包装异步操作，统一处理加载状态和错误
   *
   * @param fn 要执行的异步函数
   * @returns API 响应结果
   */
  protected async withLoading<T>(
    fn: () => Promise<T>
  ): Promise<APIResult<T>> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${this.apiName}] ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 调用 IPC 方法（通过 window.electron.ipcRenderer）
   *
   * @param channel IPC 通道名称
   * @param args 参数
   * @returns IPC 调用结果
   */
  protected async invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
    try {
      if (!window.electron?.ipcRenderer) {
        throw new IPCError(channel, 'IPC 接口未初始化');
      }
      return await window.electron.ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      console.error(`[${this.apiName}] IPC 调用失败: ${channel}`, error);
      throw new IPCError(channel, error);
    }
  }

  /**
   * 处理服务层返回的结果
   *
   * 将服务层的 ServiceResult 转换为 API 层的 APIResult
   *
   * @param serviceResult 服务层返回的结果
   * @returns API 响应结果
   */
  protected handleServiceResult<T>(serviceResult: any): APIResult<T> {
    if (serviceResult.success) {
      return { success: true, data: serviceResult.data };
    } else {
      return { success: false, error: serviceResult.error || '操作失败' };
    }
  }
}
