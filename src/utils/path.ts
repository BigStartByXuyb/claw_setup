import path from 'path';
import os from 'os';

/**
 * 路径管理工具类
 *
 * 提供跨平台路径处理，集中管理应用相关路径
 * 设计原则：所有路径均通过此类获取，便于后续跨平台扩展
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class PathUtils {
  /**
   * 获取用户主目录
   * 优先使用环境变量，回退到 os.homedir()
   */
  static getUserHome(): string {
    return process.env.USERPROFILE || process.env.HOME || os.homedir();
  }

  /**
   * 获取 OpenClaw 配置目录
   */
  static getOpenClawDir(): string {
    return path.join(PathUtils.getUserHome(), '.openclaw');
  }

  /**
   * 获取 OpenClaw 主配置文件路径
   */
  static getConfigFilePath(): string {
    return path.join(PathUtils.getOpenClawDir(), 'openclaw.json');
  }

  /**
   * 获取网关日志文件路径
   */
  static getGatewayLogPath(): string {
    return path.join(PathUtils.getOpenClawDir(), 'installer-gateway.log');
  }

  /**
   * 获取 npm 全局安装目录（Windows）
   */
  static getNpmGlobalDir(): string {
    return path.join(process.env.APPDATA || PathUtils.getUserHome(), 'npm');
  }

  /**
   * 获取 OpenClaw npm 全局安装路径
   */
  static getOpenClawNpmPath(): string {
    return path.join(PathUtils.getNpmGlobalDir(), 'node_modules', 'openclaw');
  }

  /**
   * 获取插件目录
   *
   * @param pluginName 插件名称
   */
  static getPluginDir(pluginName: string): string {
    return path.join(PathUtils.getOpenClawDir(), 'extensions', pluginName);
  }

  /**
   * 获取临时目录（用于下载安装文件）
   */
  static getTempDir(): string {
    return path.join(os.tmpdir(), 'openclaw-installer');
  }

  /**
   * 获取当前平台名称
   */
  static getPlatform(): 'windows' | 'macos' | 'linux' {
    switch (process.platform) {
      case 'win32': return 'windows';
      case 'darwin': return 'macos';
      default: return 'linux';
    }
  }

  /**
   * 是否为 Windows 平台
   */
  static isWindows(): boolean {
    return process.platform === 'win32';
  }

  /**
   * 是否为 macOS 平台
   */
  static isMacOS(): boolean {
    return process.platform === 'darwin';
  }

  /**
   * 是否为 Linux 平台
   */
  static isLinux(): boolean {
    return process.platform === 'linux';
  }

  /**
   * 根据平台选择命令
   *
   * 便于跨平台支持，按平台返回不同命令或路径
   *
   * @param options 平台对应的值
   * @returns 当前平台对应的值
   */
  static byPlatform<T>(options: {
    windows: T;
    macos?: T;
    linux?: T;
    default?: T;
  }): T {
    const platform = PathUtils.getPlatform();
    if (platform === 'windows' && options.windows !== undefined) return options.windows;
    if (platform === 'macos' && options.macos !== undefined) return options.macos!;
    if (platform === 'linux' && options.linux !== undefined) return options.linux!;
    if (options.default !== undefined) return options.default!;
    // 回退到 windows 定义
    return options.windows;
  }
}
