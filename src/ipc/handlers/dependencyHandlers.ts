import { ipcMain } from 'electron';
import { dependencyChecker } from '../../services/dependency/DependencyChecker';
import { toolInstaller } from '../../services/dependency/ToolInstaller';

/**
 * 依赖管理 IPC Handlers
 *
 * 注册依赖检查和工具安装相关的 IPC 通道
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export function registerDependencyHandlers(): void {
  /**
   * 检查所有依赖项
   * 返回必需工具、可选工具、环境变量的安装状态
   */
  ipcMain.handle('check-dependencies', async () => {
    const result = await dependencyChecker.checkAll();
    if (!result.success || !result.data) {
      return { success: false, required: {}, optional: {}, envVars: {} };
    }

    // 将数组格式转换为对象格式（保持前端兼容性）
    const required: Record<string, any> = {};
    const optional: Record<string, any> = {};

    for (const item of result.data.required) {
      required[item.name] = {
        installed: item.installed,
        version: item.version,
        path: item.path,
        description: item.error,
      };
    }

    for (const item of result.data.optional) {
      optional[item.name] = {
        installed: item.installed,
        version: item.version,
        path: item.path,
        description: item.error,
      };
    }

    return { success: true, required, optional, envVars: result.data.envVars };
  });

  /**
   * 安装指定工具（目前支持 pnpm、node）
   */
  ipcMain.handle('install-tool', async (_event, tool: string) => {
    // 检查工具是否已安装
    const alreadyInstalled = await toolInstaller.isInstalled(tool);
    if (alreadyInstalled) {
      return { success: true, message: `${tool} 已安装`, alreadyInstalled: true };
    }

    const result = await toolInstaller.install(tool);

    if (!result.success) {
      return { success: false, error: result.error, message: result.error };
    }

    const data = result.data;
    return {
      success: data?.success ?? true,
      newlyInstalled: true,
      error: data?.error,
      message: data?.error,
    };
  });

  /**
   * 检查 Node.js 版本（兼容旧接口）
   */
  ipcMain.handle('check-node-version', async () => {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    return { version, meetsRequirement: major >= 22 };
  });
}
