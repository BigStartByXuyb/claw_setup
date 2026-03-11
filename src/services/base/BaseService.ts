import { ServiceResult } from '../../types/common';
import { ServiceError } from '../../errors/AppError';

/**
 * 服务基类
 *
 * 所有服务类都应继承此基类，提供统一的错误处理和响应格式
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export abstract class BaseService {
  /**
   * 服务名称，子类必须实现
   */
  protected abstract readonly serviceName: string;

  /**
   * 创建成功响应
   *
   * @param data 返回的数据
   * @returns 成功的服务响应
   */
  protected success<T>(data?: T): ServiceResult<T> {
    return {
      success: true,
      data
    };
  }

  /**
   * 创建失败响应
   *
   * @param message 错误消息
   * @param error 错误对象或详细信息
   * @returns 失败的服务响应
   */
  protected error(message: string, error?: any): ServiceResult {
    // 记录错误日志
    console.error(`[${this.serviceName}] ${message}`, error);

    return {
      success: false,
      error: message,
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    };
  }

  /**
   * 包装异步操作，统一处理错误
   *
   * @param operation 操作名称
   * @param fn 要执行的异步函数
   * @returns 服务响应结果
   */
  protected async execute<T = void>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<ServiceResult<T>> {
    try {
      const data = await fn();
      return { success: true, data } as ServiceResult<T>;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${this.serviceName}] ${operation}失败:`, error);
      return {
        success: false,
        error: `${operation}失败: ${errorMessage}`,
        details: error instanceof Error ? { message: error.message, stack: error.stack } : error
      };
    }
  }

  /**
   * 抛出服务错误
   *
   * @param operation 操作名称
   * @param details 错误详细信息
   */
  protected throwError(operation: string, details?: any): never {
    throw new ServiceError(this.serviceName, operation, details);
  }

  /**
   * 验证参数是否为空
   *
   * @param value 要验证的值
   * @param paramName 参数名称
   * @throws {ServiceError} 如果参数为空
   */
  protected validateNotEmpty(value: any, paramName: string): void {
    if (value === null || value === undefined || value === '') {
      this.throwError('参数验证', `${paramName} 不能为空`);
    }
  }

  /**
   * 验证文件路径是否存在
   *
   * @param path 文件路径
   * @param pathName 路径名称
   * @returns 是否存在
   */
  protected async validatePathExists(path: string, pathName: string): Promise<boolean> {
    const fs = require('fs-extra');
    const exists = await fs.pathExists(path);
    if (!exists) {
      console.warn(`[${this.serviceName}] ${pathName} 不存在: ${path}`);
    }
    return exists;
  }
}
