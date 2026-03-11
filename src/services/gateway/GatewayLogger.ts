import fs from 'fs-extra';
import { BrowserWindow } from 'electron';
import { PathUtils } from '../../utils/path';

/** 最大日志文件大小（1GB） */
const MAX_LOG_SIZE = 1024 * 1024 * 1024;

/**
 * 网关日志类型
 */
export type LogType = 'stdout' | 'stderr' | 'system';

/**
 * 网关日志管理器
 *
 * 负责网关进程的日志收集、存储和推送
 * - 内存缓存：快速访问最近的日志
 * - 文件持久化：支持日志轮转，防止文件过大
 * - 实时推送：通过 IPC 推送到前端
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class GatewayLogger {
  /** 内存中的日志缓存 */
  private logs: string[] = [];
  /** 日志文件路径 */
  private readonly logFilePath = PathUtils.getGatewayLogPath();
  /** 主窗口引用（用于推送日志到前端） */
  private mainWindow: BrowserWindow | null = null;

  /**
   * 设置主窗口引用
   *
   * @param window Electron 主窗口
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * 记录一条日志
   *
   * @param type 日志类型
   * @param text 日志内容
   */
  async log(type: LogType, text: string): Promise<void> {
    const entry = `[${new Date().toISOString()}] [${type}] ${text}\n`;
    this.logs.push(entry);

    // 推送到前端
    this.mainWindow?.webContents.send('gateway-log', { type, text });

    // 持久化到文件
    await this.writeToFile(entry);
  }

  /**
   * 获取所有内存中的日志
   *
   * @returns 日志数组
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * 获取日志内容（优先从文件读取）
   *
   * @returns 日志字符串
   */
  async getLogsContent(): Promise<string> {
    try {
      if (await fs.pathExists(this.logFilePath)) {
        return await fs.readFile(this.logFilePath, 'utf-8');
      }
    } catch (error) {
      console.error('[GatewayLogger] 读取日志文件失败:', error);
    }
    return this.logs.join('');
  }

  /**
   * 清空日志
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    try {
      if (await fs.pathExists(this.logFilePath)) {
        await fs.remove(this.logFilePath);
      }
    } catch (error) {
      console.error('[GatewayLogger] 清空日志文件失败:', error);
    }
  }

  /**
   * 将日志写入文件，支持日志轮转
   *
   * @param entry 日志条目
   */
  private async writeToFile(entry: string): Promise<void> {
    try {
      await fs.ensureFile(this.logFilePath);
      const stats = await fs.stat(this.logFilePath);

      // 文件超过 1GB 时进行日志轮转
      if (stats.size > MAX_LOG_SIZE) {
        const backupPath = this.logFilePath.replace('.log', `-${Date.now()}.log`);
        await fs.move(this.logFilePath, backupPath);
        this.logs = [];
        console.log(`[GatewayLogger] 日志轮转: ${backupPath}`);
      }

      await fs.appendFile(this.logFilePath, entry);
    } catch (error) {
      console.error('[GatewayLogger] 写入日志失败:', error);
    }
  }
}
