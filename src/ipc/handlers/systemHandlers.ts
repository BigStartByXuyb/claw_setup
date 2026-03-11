import { ipcMain } from 'electron';
import { systemInfoService } from '../../services/system/SystemInfoService';

/**
 * 系统信息 IPC Handlers
 *
 * 注册系统相关的 IPC 通道
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export function registerSystemHandlers(): void {
  /** 获取系统信息 */
  ipcMain.handle('check-system-info', async () => {
    const result = await systemInfoService.getSystemInfo();
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const { platform, arch, osVersion, isWindows, is64Bit } = result.data;

    // 保持与现有前端兼容的响应格式
    return {
      success: isWindows && is64Bit,
      platform,
      arch,
      release: osVersion,
      nodeVersion: process.version,
      requirements: {
        isWindows: { met: isWindows, message: 'Windows OS' },
        is64bit:   { met: is64Bit,   message: '64-bit Architecture' },
      },
    };
  });
}
