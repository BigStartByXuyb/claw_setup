import { ipcMain } from 'electron';
import fs from 'fs-extra';
import { configService } from '../../services/config/ConfigService';
import { PathUtils } from '../../utils/path';
import { execAsync } from '../../utils/exec';

/**
 * 配置管理 IPC Handlers
 *
 * 注册配置文件读写相关的 IPC 通道
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export function registerConfigHandlers(): void {
  /**
   * 读取配置文件
   */
  ipcMain.handle('read-config', async () => {
    const result = await configService.loadConfig();
    if (result.success) {
      return { success: true, config: result.data, path: PathUtils.getConfigFilePath() };
    }
    return { success: false, config: {} };
  });

  /**
   * 设置配置项（通过点路径）
   * 兼容旧版 openclaw config set 命令方式
   */
  ipcMain.handle('config-set', async (_event, dotPath: string, value: any) => {
    const result = await configService.setConfigValue(dotPath, value);
    return { success: result.success, error: result.error };
  });

  /**
   * 删除配置项
   */
  ipcMain.handle('config-unset', async (_event, dotPath: string) => {
    const result = await configService.deleteConfigValue(dotPath);
    return { success: result.success, error: result.error };
  });

  /**
   * 获取当前主模型
   */
  ipcMain.handle('get-current-model', async () => {
    const result = await configService.loadConfig();
    if (!result.success || !result.data) {
      return { success: false, message: '配置文件不存在' };
    }
    const config = result.data as any;
    const primaryModel = config.agents?.defaults?.model?.primary || null;
    return { success: true, model: primaryModel };
  });

  /**
   * 获取可用模型列表
   * 从 models.providers 和 agents.defaults.models 中聚合
   */
  ipcMain.handle('get-available-models', async () => {
    const result = await configService.loadConfig();
    if (!result.success || !result.data) {
      return { success: false, message: '配置文件不存在' };
    }

    const config = result.data as any;
    const availableModels: Array<{ provider: string; model: string; displayName: string }> = [];
    const modelSet = new Set<string>();

    // 从 models.providers[].models 读取
    if (config.models?.providers) {
      for (const [providerName, providerConfig] of Object.entries(config.models.providers)) {
        const provider = providerConfig as any;
        if (provider.models && Array.isArray(provider.models)) {
          for (const model of provider.models) {
            const modelId = typeof model === 'string' ? model : (model.id || model.name);
            if (modelId) {
              const displayName = `${providerName}/${modelId}`;
              if (!modelSet.has(displayName)) {
                modelSet.add(displayName);
                availableModels.push({ provider: providerName, model: modelId, displayName });
              }
            }
          }
        }
      }
    }

    // 从 agents.defaults.models 读取
    if (config.agents?.defaults?.models) {
      for (const modelKey of Object.keys(config.agents.defaults.models)) {
        if (modelKey.includes('/') && !modelSet.has(modelKey)) {
          const [provider, model] = modelKey.split('/');
          modelSet.add(modelKey);
          availableModels.push({ provider, model, displayName: modelKey });
        }
      }
    }

    return { success: true, models: availableModels };
  });

  /**
   * 设置主模型
   */
  ipcMain.handle('set-primary-model', async (_event, model: string) => {
    try {
      const { stdout } = await execAsync(`openclaw config set agents.defaults.model.primary "${model}"`);
      return { success: true, output: stdout };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * 检查 OpenClaw 是否已安装
   */
  ipcMain.handle('check-openclaw-installed', async () => {
    try {
      const cmd = PathUtils.isWindows() ? 'where openclaw' : 'which openclaw';
      await execAsync(cmd);
      const { stdout } = await execAsync('openclaw --version');
      return { installed: true, version: stdout.trim() };
    } catch {
      return { installed: false };
    }
  });
}
