import {
  ServiceResult,
  SystemInfo,
  DependencyCheckResult,
  InstallResult,
  GatewayStatus,
  OpenClawConfig
} from '../../types/common';

/**
 * IPC 通道定义
 *
 * 提供类型安全的 IPC 调用接口
 * 所有 IPC 通道都在此定义，确保前后端类型一致
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export interface IPCChannels {
  // ==================== 系统信息 ====================
  /**
   * 检查系统信息
   * @returns 系统信息对象
   */
  'system:check-info': () => Promise<ServiceResult<SystemInfo>>;

  // ==================== 依赖检查 ====================
  /**
   * 检查所有依赖项
   * @returns 依赖检查结果
   */
  'dependency:check': () => Promise<ServiceResult<DependencyCheckResult>>;

  /**
   * 安装指定工具
   * @param tool 工具名称（如 'pnpm'）
   * @returns 安装结果
   */
  'dependency:install-tool': (tool: string) => Promise<ServiceResult<InstallResult>>;

  // ==================== 网关管理 ====================
  /**
   * 启动网关进程
   * @returns 启动结果
   */
  'gateway:start': () => Promise<ServiceResult<void>>;

  /**
   * 停止网关进程
   * @returns 停止结果
   */
  'gateway:stop': () => Promise<ServiceResult<void>>;

  /**
   * 获取网关状态
   * @returns 网关状态信息
   */
  'gateway:status': () => Promise<ServiceResult<GatewayStatus>>;

  /**
   * 获取网关日志
   * @returns 日志数组
   */
  'gateway:logs': () => Promise<ServiceResult<string[]>>;

  /**
   * 在浏览器中打开聊天窗口
   * @returns 操作结果
   */
  'gateway:open-chat': () => Promise<ServiceResult<void>>;

  // ==================== 配置管理 ====================
  /**
   * 加载配置文件
   * @returns 配置对象
   */
  'config:load': () => Promise<ServiceResult<OpenClawConfig>>;

  /**
   * 保存配置文件
   * @param config 完整的配置对象
   * @returns 保存结果
   */
  'config:save': (config: OpenClawConfig) => Promise<ServiceResult<void>>;

  /**
   * 获取配置项的值
   * @param path 配置路径（如 'models.primary'）
   * @returns 配置值
   */
  'config:get': (path: string) => Promise<ServiceResult<any>>;

  /**
   * 设置配置项的值
   * @param path 配置路径
   * @param value 配置值
   * @returns 设置结果
   */
  'config:set': (path: string, value: any) => Promise<ServiceResult<void>>;

  /**
   * 删除配置项
   * @param path 配置路径
   * @returns 删除结果
   */
  'config:delete': (path: string) => Promise<ServiceResult<void>>;

  /**
   * 获取当前主要模型
   * @returns 模型名称
   */
  'config:get-current-model': () => Promise<ServiceResult<string>>;

  /**
   * 获取可用的模型列表
   * @returns 模型列表
   */
  'config:get-available-models': () => Promise<ServiceResult<string[]>>;

  /**
   * 设置主要模型
   * @param model 模型名称
   * @returns 设置结果
   */
  'config:set-primary-model': (model: string) => Promise<ServiceResult<void>>;

  // ==================== 安装流程 ====================
  /**
   * 安装 OpenClaw
   * @param method 安装方式（'prebuilt' | 'source'）
   * @param installPath 安装路径
   * @returns 安装结果
   */
  'install:openclaw': (method: string, installPath: string) => Promise<ServiceResult<void>>;

  /**
   * 配置频道
   * @param channels 频道配置对象
   * @returns 配置结果
   */
  'install:configure-channels': (channels: Record<string, any>) => Promise<ServiceResult<void>>;

  /**
   * 生成使用指南
   * @returns 指南内容
   */
  'install:generate-guide': () => Promise<ServiceResult<string>>;

  // ==================== 其他功能 ====================
  /**
   * 选择目录
   * @param title 对话框标题
   * @returns 选择的目录路径
   */
  'dialog:select-directory': (title: string) => Promise<ServiceResult<string | null>>;

  /**
   * 显示消息框
   * @param message 消息内容
   * @param type 消息类型（'info' | 'warning' | 'error'）
   * @returns 操作结果
   */
  'dialog:show-message': (message: string, type: string) => Promise<ServiceResult<void>>;
}

/**
 * IPC 通道名称类型
 * 用于类型检查，确保只能使用已定义的通道
 */
export type IPCChannelName = keyof IPCChannels;

/**
 * 获取 IPC 通道的参数类型
 */
export type IPCChannelParams<K extends IPCChannelName> = Parameters<IPCChannels[K]>;

/**
 * 获取 IPC 通道的返回类型
 */
export type IPCChannelReturn<K extends IPCChannelName> = ReturnType<IPCChannels[K]>;
