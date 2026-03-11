/**
 * 统一的服务响应结果类型
 *
 * 所有服务层方法都应返回此类型，确保响应格式统一
 */
export interface ServiceResult<T = void> {
  /** 操作是否成功 */
  success: boolean;
  /** 成功时返回的数据 */
  data?: T;
  /** 失败时的错误消息 */
  error?: string;
  /** 错误详细信息 */
  details?: any;
}

/**
 * 统一的 API 响应结果类型
 *
 * 前端 API 层使用此类型
 */
export interface APIResult<T = void> {
  /** 操作是否成功 */
  success: boolean;
  /** 成功时返回的数据 */
  data?: T;
  /** 失败时的错误消息 */
  error?: string;
}

/**
 * 系统信息类型
 */
export interface SystemInfo {
  /** 操作系统平台 */
  platform: string;
  /** 系统架构 */
  arch: string;
  /** 操作系统版本 */
  osVersion: string;
  /** 是否为 Windows 系统 */
  isWindows: boolean;
  /** 是否为 64 位系统 */
  is64Bit: boolean;
}

/**
 * 依赖检查结果
 */
export interface DependencyCheckResult {
  /** 必需的依赖项 */
  required: DependencyItem[];
  /** 可选的依赖项 */
  optional: DependencyItem[];
  /** 环境变量 */
  envVars: Record<string, string>;
}

/**
 * 单个依赖项信息
 */
export interface DependencyItem {
  /** 依赖名称 */
  name: string;
  /** 是否已安装 */
  installed: boolean;
  /** 已安装的版本 */
  version?: string;
  /** 安装路径 */
  path?: string;
  /** 检查时的错误信息 */
  error?: string;
}

/**
 * 工具安装结果
 */
export interface InstallResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  error?: string;
  /** 是否正在安装中 */
  installing?: boolean;
}

/**
 * 网关状态
 */
export interface GatewayStatus {
  /** 是否正在运行 */
  isRunning: boolean;
  /** 进程 PID */
  pid?: number;
  /** 监听端口 */
  port?: number;
  /** 启动时间 */
  startTime?: Date;
}

/**
 * OpenClaw 配置类型
 */
export interface OpenClawConfig {
  /** 模型配置 */
  models: {
    /** 主要模型 */
    primary?: string;
    /** 模型提供商配置 */
    providers: Record<string, ModelProvider>;
  };
  /** 频道配置 */
  channels: Record<string, ChannelConfig>;
  /** 网关设置 */
  gateway?: GatewaySettings;
  /** 高级设置 */
  advanced?: AdvancedSettings;
}

/**
 * 模型提供商配置
 */
export interface ModelProvider {
  /** 提供商类型 */
  type: string;
  /** API Key */
  apiKey?: string;
  /** API 端点 */
  endpoint?: string;
  /** 可用的模型列表 */
  models?: string[];
  /** 是否启用 */
  enabled: boolean;
  /** 其他配置项 */
  [key: string]: any;
}

/**
 * 频道配置
 */
export interface ChannelConfig {
  /** 频道类型 */
  type: string;
  /** 是否启用 */
  enabled: boolean;
  /** 频道特定配置 */
  config: Record<string, any>;
}

/**
 * 网关设置
 */
export interface GatewaySettings {
  /** 监听端口 */
  port?: number;
  /** 主机地址 */
  host?: string;
  /** 其他设置 */
  [key: string]: any;
}

/**
 * 高级设置
 */
export interface AdvancedSettings {
  /** 工作区路径 */
  workspace?: string;
  /** 是否启用守护进程 */
  daemon?: boolean;
  /** 其他高级配置 */
  [key: string]: any;
}
