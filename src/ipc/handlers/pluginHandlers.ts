import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { exec, spawn } from 'child_process';
import { PathUtils } from '../../utils/path';
import { execAsync } from '../../utils/exec';

/** 渠道到插件名称的映射表 */
const CHANNEL_PLUGIN_MAP: Record<string, string | null> = {
  discord:    'discord',
  telegram:   'telegram',
  slack:      'slack',
  feishu:     'feishu',
  whatsapp:   'whatsapp',
  signal:     'signal',
  imessage:   'imessage',
  msteams:    'msteams',
  googlechat: 'googlechat',
  irc:        'irc',
  matrix:     'matrix',
  mattermost: 'mattermost',
  line:       'line',
  wechat:     null,
  qq:         null,
};

/** 提供商认证命令映射 */
const PROVIDER_AUTH_MAP: Record<string, string> = {
  'qwen':           'qwen-portal',
  'github-copilot': 'github-copilot',
};

/**
 * 插件和模型认证 IPC Handlers
 *
 * 注册插件依赖管理和模型认证相关的 IPC 通道
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export function registerPluginHandlers(): void {
  /**
   * 获取插件信息
   */
  ipcMain.handle('get-plugin-info', async (_event, { channelType }: { channelType: string }) => {
    try {
      const pluginName = CHANNEL_PLUGIN_MAP[channelType];
      if (!pluginName) {
        return { success: false, hasPlugin: false, pluginName: channelType };
      }

      const pluginPaths = [
        PathUtils.getPluginDir(pluginName),
        path.join(process.cwd(), 'extensions', pluginName),
      ];

      for (const pluginPath of pluginPaths) {
        if (!await fs.pathExists(pluginPath)) continue;

        const packageJsonPath = path.join(pluginPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJSON(packageJsonPath);
          return { success: true, pluginName, pluginPath, hasPlugin: true, packageJson };
        }
      }

      return { success: false, hasPlugin: false, pluginName };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * 检查插件依赖安装状态
   */
  ipcMain.handle('check-plugin-dependencies', async (_event, { pluginName }: { pluginName: string }) => {
    try {
      const pluginPath = await findPluginPath(pluginName);
      if (!pluginPath) return { success: false, error: 'Plugin directory not found' };

      const packageJson = await fs.readJSON(path.join(pluginPath, 'package.json'));
      const dependencies = packageJson.dependencies || {};

      const dependencyStatus = await Promise.all(
        Object.entries(dependencies).map(async ([name, version]) => {
          const depPath = path.join(pluginPath, 'node_modules', name);
          const installed = await fs.pathExists(depPath);
          return { name, version: version as string, installed, path: installed ? depPath : undefined };
        })
      );

      return { success: true, plugin: pluginName, dependencies: dependencyStatus, pluginPath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * 安装插件依赖
   */
  ipcMain.handle('install-plugin-dependencies', async (_event, { pluginName }: { pluginName: string }) => {
    try {
      let pluginPath = await findPluginPath(pluginName);

      if (!pluginPath) {
        // 尝试从全局 npm 包中查找并复制
        pluginPath = await tryInstallPlugin(pluginName);
      }

      if (!pluginPath) {
        return { success: false, error: `无法找到或安装插件 ${pluginName}` };
      }

      const { stdout, stderr } = await execAsync('pnpm install', { cwd: pluginPath });
      return { success: true, output: stdout, error: stderr || undefined, pluginPath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * 模型认证登录
   * 在新终端窗口中启动认证流程
   */
  ipcMain.handle('model-auth-login', async (_event, { provider }: { provider: string }) => {
    try {
      // 验证 openclaw 是否已安装
      try {
        const cmd = PathUtils.isWindows() ? 'where openclaw' : 'which openclaw';
        await execAsync(cmd);
      } catch {
        return { success: false, error: 'OpenClaw 未安装，请先完成安装步骤' };
      }

      const authProvider = PROVIDER_AUTH_MAP[provider] || provider;
      const authCommand = `openclaw models auth login --provider ${authProvider}`;

      // 根据平台在新终端中启动认证
      if (PathUtils.isWindows()) {
        spawn('cmd', ['/c', 'start', 'cmd', '/k', authCommand], { shell: true, detached: true });
        return { success: true, message: '已打开终端窗口，请在终端中完成认证流程', command: authCommand };
      } else if (PathUtils.isMacOS()) {
        const script = `tell application "Terminal" to do script "${authCommand}"`;
        exec(`osascript -e '${script}'`);
        return { success: true, message: '已打开 Terminal，请完成认证流程', command: authCommand };
      } else {
        // Linux：尝试常见终端
        const terminals = ['gnome-terminal', 'xterm', 'konsole'];
        for (const terminal of terminals) {
          try {
            spawn(terminal, ['--', 'bash', '-c', `${authCommand}; read`], { detached: true });
            return { success: true, message: `已在 ${terminal} 中启动认证`, command: authCommand };
          } catch { /* 尝试下一个终端 */ }
        }
        return { success: false, error: '无法找到可用终端，请手动运行: ' + authCommand };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * 打开外部链接
   */
  ipcMain.handle('open-external', async (_event, url: string) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
  });
}

// ==================== 工具函数 ====================

/**
 * 查找插件目录
 *
 * @param pluginName 插件名称
 * @returns 插件目录路径，未找到返回 null
 */
async function findPluginPath(pluginName: string): Promise<string | null> {
  const paths = [
    PathUtils.getPluginDir(pluginName),
    path.join(process.cwd(), 'extensions', pluginName),
  ];

  for (const p of paths) {
    if (await fs.pathExists(p)) return p;
  }
  return null;
}

/**
 * 尝试从全局安装的 openclaw 中安装插件
 *
 * @param pluginName 插件名称
 * @returns 插件目录路径，失败返回 null
 */
async function tryInstallPlugin(pluginName: string): Promise<string | null> {
  const targetPath = PathUtils.getPluginDir(pluginName);

  try {
    // 从全局 npm 包中查找
    const { stdout: npmRoot } = await execAsync('npm root -g');
    const globalPluginPath = path.join(npmRoot.trim(), 'openclaw', 'extensions', pluginName);

    if (await fs.pathExists(globalPluginPath)) {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(globalPluginPath, targetPath);
      return targetPath;
    }
  } catch { /* 继续尝试 npm 安装 */ }

  // 尝试从 npm 安装插件包
  const packageNames = [`@openclaw/plugin-${pluginName}`, `openclaw-plugin-${pluginName}`];

  for (const packageName of packageNames) {
    try {
      await fs.ensureDir(targetPath);
      await execAsync(`npm install ${packageName}`, { cwd: path.dirname(targetPath) });

      const installedPath = path.join(path.dirname(targetPath), 'node_modules', packageName);
      if (await fs.pathExists(installedPath)) {
        await fs.move(installedPath, targetPath, { overwrite: true });
        return targetPath;
      }
    } catch { /* 尝试下一个包名 */ }
  }

  return null;
}
