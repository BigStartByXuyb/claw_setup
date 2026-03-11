import { ipcMain } from 'electron';
import { installService } from '../../services/install/InstallService';

/**
 * 安装流程 IPC Handlers
 *
 * 注册 OpenClaw 安装、频道配置、指南生成相关的 IPC 通道
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export function registerInstallHandlers(): void {
  /**
   * 安装 OpenClaw
   */
  ipcMain.handle('install-openclaw', async (_event, options: {
    installDir: string;
    method: 'prebuilt' | 'source';
  }) => {
    const result = await installService.install(options.method, options.installDir);

    if (result.success) {
      return { success: true, output: 'Installation completed' };
    }

    const errorMsg = result.error || '安装失败';

    // 网络错误提示
    if (errorMsg.includes('Failed to connect') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('ETIMEDOUT')) {
      return {
        success: false,
        error: `网络连接失败，无法访问 GitHub。\n\n可能的解决方案：\n1. 检查网络连接是否正常\n2. 如果在中国大陆，可能需要配置代理或使用镜像源\n3. 配置 npm 代理：\n   npm config set proxy http://代理地址:端口\n   npm config set https-proxy http://代理地址:端口\n4. 或使用国内镜像源：\n   npm config set registry https://registry.npmmirror.com\n\n原始错误：${errorMsg}`
      };
    }

    return { success: false, error: errorMsg };
  });

  /**
   * 配置频道
   */
  ipcMain.handle('configure-channels', async (_event, channels: string[]) => {
    const result = await installService.configureChannels(channels);
    return {
      success: result.success,
      error: result.error,
      configPath: result.success ? require('../../utils/path').PathUtils.getConfigFilePath() : undefined,
    };
  });

  /**
   * 生成使用指南
   */
  ipcMain.handle('generate-guide', async (_event, installDir: string) => {
    const result = await installService.generateGuide(installDir);
    return {
      success: result.success,
      guidePath: result.data,
      error: result.error,
    };
  });
}
