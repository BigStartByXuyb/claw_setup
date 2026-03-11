import { ipcMain, BrowserWindow, shell } from 'electron';
import { exec } from 'child_process';
import fs from 'fs-extra';
import { gatewayService } from '../../services/gateway/GatewayService';
import { PathUtils } from '../../utils/path';

/**
 * 网关管理 IPC Handlers
 *
 * 注册网关进程管理相关的 IPC 通道
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export function registerGatewayHandlers(getMainWindow: () => BrowserWindow | null): void {
  // 初始化日志推送窗口
  gatewayService.setMainWindow(getMainWindow());

  /**
   * 启动网关进程
   */
  ipcMain.handle('gateway-start', async (_event, options?: { forceKill?: boolean }) => {
    // 每次调用时更新窗口引用
    gatewayService.setMainWindow(getMainWindow());

    const result = await gatewayService.start(options);
    if (result.success) {
      return { success: true, port: result.data?.port };
    }
    return { success: false, message: result.error, error: result.error };
  });

  /**
   * 停止网关进程
   */
  ipcMain.handle('gateway-stop', async () => {
    const result = await gatewayService.stop();
    return { success: result.success, error: result.error };
  });

  /**
   * 获取网关运行状态
   */
  ipcMain.handle('gateway-status', async () => {
    const result = await gatewayService.getStatus();
    return { running: result.data?.isRunning ?? false };
  });

  /**
   * 获取网关日志
   */
  ipcMain.handle('get-gateway-logs', async () => {
    const result = await gatewayService.getLogs();
    if (result.success) {
      return { success: true, logs: result.data };
    }
    return { success: false, error: result.error };
  });

  /**
   * 清空网关日志
   */
  ipcMain.handle('clear-gateway-logs', async () => {
    const result = await gatewayService.clearLogs();
    return { success: result.success, error: result.error };
  });

  /**
   * 打开聊天窗口
   * 读取配置中的端口和 token，在浏览器中打开
   */
  ipcMain.handle('open-chat-window', async () => {
    try {
      const configPath = PathUtils.getConfigFilePath();
      let port = 18789;
      let token = '';

      // 读取配置中的端口和认证 token
      try {
        const config = await fs.readJSON(configPath);
        if (config.gateway?.port) port = config.gateway.port;
        if (config.gateway?.auth?.token) token = config.gateway.auth.token;
      } catch {
        // 配置读取失败，使用默认端口
      }

      const url = token
        ? `http://localhost:${port}?token=${token}`
        : `http://localhost:${port}`;

      console.log(`[GatewayHandlers] 打开聊天窗口: ${url}`);
      exec(`start ${url}`);
      return { success: true, port, url };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * 旧版启动接口（保留兼容）
   */
  ipcMain.handle('start-openclaw-server', async () => {
    const result = await gatewayService.start();
    return { success: result.success, error: result.error };
  });
}
