/**
 * 应用错误基类
 *
 * 提供统一的错误处理机制，所有自定义错误都应继承此类
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class AppError extends Error {
  /**
   * 创建应用错误实例
   *
   * @param code 错误代码，用于标识错误类型
   * @param message 错误消息，用于描述错误详情
   * @param details 错误详细信息，可选的额外数据
   */
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';

    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 转换为 JSON 格式
   * 便于日志记录和错误传输
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * 服务层错误
 *
 * 用于标识服务层操作失败的错误
 */
export class ServiceError extends AppError {
  /**
   * 创建服务层错误实例
   *
   * @param service 服务名称（如 ConfigService、GatewayService）
   * @param operation 操作名称（如 load、save、start）
   * @param details 错误详细信息
   */
  constructor(service: string, operation: string, details?: any) {
    super(
      'SERVICE_ERROR',
      `${service} 服务执行 ${operation} 操作失败`,
      details
    );
    this.name = 'ServiceError';
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * IPC 通信错误
 *
 * 用于标识 IPC 调用失败的错误
 */
export class IPCError extends AppError {
  /**
   * 创建 IPC 错误实例
   *
   * @param channel IPC 通道名称
   * @param details 错误详细信息
   */
  constructor(channel: string, details?: any) {
    super(
      'IPC_ERROR',
      `IPC 调用失败: ${channel}`,
      details
    );
    this.name = 'IPCError';
    Object.setPrototypeOf(this, IPCError.prototype);
  }
}

/**
 * 配置错误
 *
 * 用于标识配置文件读写失败的错误
 */
export class ConfigError extends AppError {
  /**
   * 创建配置错误实例
   *
   * @param operation 操作类型（read、write、validate）
   * @param details 错误详细信息
   */
  constructor(operation: string, details?: any) {
    super(
      'CONFIG_ERROR',
      `配置${operation}失败`,
      details
    );
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * 进程管理错误
 *
 * 用于标识进程启动、停止等操作失败的错误
 */
export class ProcessError extends AppError {
  /**
   * 创建进程错误实例
   *
   * @param operation 操作类型（start、stop、kill）
   * @param processName 进程名称
   * @param details 错误详细信息
   */
  constructor(operation: string, processName: string, details?: any) {
    super(
      'PROCESS_ERROR',
      `进程 ${processName} ${operation}失败`,
      details
    );
    this.name = 'ProcessError';
    Object.setPrototypeOf(this, ProcessError.prototype);
  }
}
