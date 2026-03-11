import { spawn, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import { BrowserWindow } from 'electron';
import { BaseService } from '../base/BaseService';
import { ServiceResult, GatewayStatus } from '../../types/common';
import { ProcessUtils } from '../../utils/process';
import { PathUtils } from '../../utils/path';
import { execAsync } from '../../utils/exec';
import { GatewayLogger } from './GatewayLogger';

/**
 * 网关进程管理服务
 *
 * 负责 OpenClaw 网关进程的完整生命周期管理：
 * - 启动：检查端口、处理冲突、启动进程
 * - 停止：优雅停止或强制终止
 * - 监控：状态查询、日志管理
 *
 * 设计上支持跨平台扩展：通过 PathUtils.byPlatform() 区分平台逻辑
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class GatewayService extends BaseService {
  protected readonly serviceName = 'GatewayService';

  /** 当前运行的网关进程 */
  private process: ChildProcess | null = null;
  /** 当前使用的端口 */
  private currentPort: number | null = null;
  /** 日志管理器 */
  private logger: GatewayLogger;

  constructor() {
    super();
    this.logger = new GatewayLogger();
  }

  /**
   * 设置主窗口（用于日志推送）
   *
   * @param window Electron 主窗口
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.logger.setMainWindow(window);
  }

  /**
   * 启动网关进程
   *
   * 流程：
   * 1. 检查是否已在运行
   * 2. 读取配置中的端口
   * 3. 处理端口占用（优雅停止 → 强制杀死）
   * 4. 检测 PowerShell 执行策略，选择合适的 shell
   * 5. 启动网关进程，绑定日志
   *
   * @param options 启动选项
   * @returns 启动结果，含端口号
   */
  async start(options?: { forceKill?: boolean }): Promise<ServiceResult<{ port: number }>> {
    // 已在运行，直接返回
    if (this.process && !this.process.killed) {
      return { success: false, error: '网关已在运行' };
    }

    return this.execute<{ port: number }>('启动网关', async () => {
      // 1. 读取或初始化网关配置
      const port = await this.ensureGatewayConfig();

      // 2. 处理端口占用
      await this.handlePortConflict(port);

      // 3. 启动进程
      await this.spawnGateway(port);

      this.currentPort = port;
      return { port };
    });
  }

  /**
   * 停止网关进程
   *
   * @returns 停止结果
   */
  async stop(): Promise<ServiceResult<void>> {
    return this.execute('停止网关', async () => {
      if (this.process) {
        this.process.kill();
        this.process = null;
      }
      this.currentPort = null;
    });
  }

  /**
   * 获取网关当前状态
   *
   * @returns 网关状态信息
   */
  async getStatus(): Promise<ServiceResult<GatewayStatus>> {
    return this.execute('获取网关状态', async () => {
      const isRunning = this.process !== null && !this.process.killed;
      return {
        isRunning,
        pid: this.process?.pid,
        port: this.currentPort ?? undefined,
      };
    });
  }

  /**
   * 获取网关日志
   *
   * @returns 日志内容
   */
  async getLogs(): Promise<ServiceResult<string>> {
    return this.execute('获取网关日志', async () => {
      return await this.logger.getLogsContent();
    });
  }

  /**
   * 清空网关日志
   *
   * @returns 操作结果
   */
  async clearLogs(): Promise<ServiceResult<void>> {
    return this.execute('清空网关日志', async () => {
      await this.logger.clearLogs();
    });
  }

  // ==================== 私有方法 ====================

  /**
   * 确保网关配置存在，返回端口号
   *
   * 如果配置不存在，创建默认配置（gateway.mode=local, port=18789）
   */
  private async ensureGatewayConfig(): Promise<number> {
    const configPath = PathUtils.getConfigFilePath();
    const defaultPort = 18789;

    try {
      const config = await fs.readJSON(configPath);
      const port = config.gateway?.port || defaultPort;

      // 确保 gateway.mode 已设置
      if (!config.gateway?.mode) {
        config.gateway = { ...(config.gateway || {}), mode: 'local', port };
        await fs.writeJSON(configPath, config, { spaces: 2 });
        console.log('[GatewayService] 已自动设置 gateway.mode=local');
      }

      return port;
    } catch {
      // 配置文件不存在，创建默认配置
      await fs.ensureDir(PathUtils.getOpenClawDir());
      await fs.writeJSON(configPath, {
        gateway: { mode: 'local', port: defaultPort }
      }, { spaces: 2 });
      console.log('[GatewayService] 已创建默认配置文件');
      return defaultPort;
    }
  }

  /**
   * 处理端口冲突
   *
   * 策略：先尝试优雅停止，失败则强制杀死占用进程
   *
   * @param port 目标端口
   */
  private async handlePortConflict(port: number): Promise<void> {
    const pid = await ProcessUtils.findProcessByPort(port);
    if (!pid) return;

    console.log(`[GatewayService] 端口 ${port} 被进程 ${pid} 占用，尝试停止...`);

    // 先尝试优雅停止
    try {
      await execAsync('openclaw gateway stop', { timeout: 3000 });
      await new Promise(r => setTimeout(r, 2000));

      const stillRunning = await ProcessUtils.findProcessByPort(port);
      if (!stillRunning) {
        console.log('[GatewayService] 优雅停止成功');
        return;
      }
    } catch { /* 优雅停止失败，继续强制杀死 */ }

    // 强制杀死占用进程
    await ProcessUtils.killProcess(pid);
    await new Promise(r => setTimeout(r, 2000));

    // 验证端口已释放
    const stillRunning = await ProcessUtils.findProcessByPort(port);
    if (stillRunning) {
      throw new Error(`无法释放端口 ${port}，请手动执行: taskkill /F /PID ${pid}`);
    }
  }

  /**
   * 启动网关进程
   *
   * 跨平台处理：
   * - Windows：检测 PowerShell 执行策略，必要时回退到 cmd.exe
   * - macOS/Linux：直接使用 shell 启动
   *
   * @param port 监听端口
   */
  private async spawnGateway(port: number): Promise<void> {
    const useCmd = await this.shouldUseCmdOnWindows();

    if (PathUtils.isWindows() && useCmd) {
      // Windows 使用 cmd.exe（规避 PowerShell 执行策略问题）
      this.process = spawn('cmd', ['/c', 'openclaw', 'gateway', '--port', String(port), '--verbose']);
    } else {
      // macOS / Linux / Windows（PowerShell 可用时）
      this.process = spawn('openclaw', ['gateway', '--port', String(port), '--verbose'], {
        shell: true,
      });
    }

    // 绑定日志事件
    this.process.stdout?.on('data', (data: Buffer) => {
      this.logger.log('stdout', data.toString());
    });
    this.process.stderr?.on('data', (data: Buffer) => {
      this.logger.log('stderr', data.toString());
    });
    this.process.on('exit', (code: number | null) => {
      this.logger.log('system', `网关进程退出，退出码: ${code}`);
      this.process = null;
      this.currentPort = null;
    });
  }

  /**
   * 检测 Windows 上是否需要使用 cmd.exe
   *
   * 当 PowerShell 执行策略为 Restricted 或 AllSigned 时，使用 cmd.exe
   *
   * @returns 是否应使用 cmd.exe
   */
  private async shouldUseCmdOnWindows(): Promise<boolean> {
    if (!PathUtils.isWindows()) return false;

    try {
      const { stdout } = await execAsync('powershell -Command "Get-ExecutionPolicy"', { timeout: 3000 });
      const policy = stdout.trim();
      if (policy === 'Restricted' || policy === 'AllSigned') {
        console.log(`[GatewayService] PowerShell 执行策略为 ${policy}，使用 cmd.exe`);
        return true;
      }
      return false;
    } catch {
      // 检测失败，默认使用 cmd.exe 保证兼容性
      return true;
    }
  }
}

// 导出单例
export const gatewayService = new GatewayService();
