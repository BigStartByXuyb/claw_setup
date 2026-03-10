import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import isDev from 'electron-is-dev';
import path from 'path';
import os from 'os';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import net from 'net';

const execAsync = promisify(exec);

// 安装锁，防止重复安装
const installLocks = new Map<string, boolean>();

// 检测端口是否被占用
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// 查找占用端口的进程 PID
async function findProcessByPort(port: number): Promise<number | null> {
  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows
      ? `netstat -ano | findstr :${port}`
      : `lsof -ti :${port}`;

    const { stdout } = await execAsync(command);

    if (isWindows) {
      // Windows: 解析 netstat 输出
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1]);
          if (!isNaN(pid)) return pid;
        }
      }
    } else {
      // Unix: lsof 直接返回 PID
      const pid = parseInt(stdout.trim().split('\n')[0]);
      if (!isNaN(pid)) return pid;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// 关闭指定 PID 的进程
async function killProcess(pid: number): Promise<boolean> {
  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;

    await execAsync(command);
    return true;
  } catch (error) {
    return false;
  }
}

let mainWindow: BrowserWindow | null = null;
let gatewayProcess: ChildProcess | null = null;
let gatewayLogs: string[] = []; // 保存网关日志
let gatewayPort: number | null = null; // 保存网关运行的端口
const MAX_LOG_SIZE = 1024 * 1024 * 1024; // 1GB
const LOG_FILE_PATH = path.join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'installer-gateway.log');

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 975,
    minWidth: 720,
    minHeight: 780,
    resizable: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1C1C1E',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ==================== IPC 处理 ====================

// 工具：打开外部链接
ipcMain.handle('open-external', async (event, url: string) => {
  await shell.openExternal(url);
});

// 工具：显示文件夹选择对话框
ipcMain.handle('show-open-dialog', async () => {
  return dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
});

// 窗口控制
ipcMain.handle('window-minimize', () => { mainWindow?.minimize(); });
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window-close', () => { mainWindow?.close(); });

// 第一步：检查系统信息
ipcMain.handle('check-system-info', async () => {
  try {
    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();

    const isWindows = platform === 'win32';
    const is64bit = arch === 'x64';

    return {
      success: isWindows && is64bit,
      platform,
      arch,
      release,
      nodeVersion: process.version,
      requirements: {
        isWindows: { met: isWindows, message: 'Windows OS' },
        is64bit: { met: is64bit, message: '64-bit Architecture' },
      },
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 第二步：检查依赖和环境变量
ipcMain.handle('check-dependencies', async () => {
  const required: { [key: string]: { installed: boolean; version?: string; path?: string } } = {};
  const optional: { [key: string]: { installed: boolean; version?: string; path?: string; description?: string } } = {};
  const envVars: { [key: string]: { set: boolean; value?: string } } = {};

  const requiredEnvVars = ['PATH', 'USERPROFILE', 'TEMP'];
  for (const envVar of requiredEnvVars) {
    envVars[envVar] = {
      set: !!process.env[envVar],
      value: process.env[envVar],
    };
  }

  // 必需依赖
  const requiredTools = ['node', 'npm', 'git', 'pnpm'];
  for (const tool of requiredTools) {
    try {
      const { stdout } = await execAsync(`${tool} --version`);
      required[tool] = {
        installed: true,
        version: stdout.trim(),
        path: await getToolPath(tool),
      };
    } catch {
      required[tool] = { installed: false };
    }
  }

  // 可选依赖
  const optionalTools = [
    { name: 'python', cmd: 'python --version', description: '用于 Python 技能和脚本执行' },
    { name: 'python3', cmd: 'python3 --version', description: '用于 Python 技能和脚本执行' },
    { name: 'docker', cmd: 'docker --version', description: '用于容器化部署和沙箱环境' },
    { name: 'docker-compose', cmd: 'docker-compose --version', description: '用于多容器应用编排' },
    { name: 'ffmpeg', cmd: 'ffmpeg -version', description: '用于音视频处理功能' },
    { name: 'magick', cmd: 'magick --version', description: '用于图像处理功能 (ImageMagick)' },
  ];

  for (const tool of optionalTools) {
    try {
      const { stdout } = await execAsync(tool.cmd);
      const versionMatch = stdout.match(/[\d.]+/);
      optional[tool.name] = {
        installed: true,
        version: versionMatch ? versionMatch[0] : stdout.split('\n')[0].trim(),
        path: await getToolPath(tool.name),
        description: tool.description,
      };
    } catch {
      optional[tool.name] = {
        installed: false,
        description: tool.description,
      };
    }
  }

  return { required, optional, envVars };
});

async function getToolPath(tool: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`where ${tool}`);
    return stdout.trim().split('\n')[0];
  } catch {
    return 'Not found';
  }
}

// 检查 Node.js 版本
ipcMain.handle('check-node-version', async () => {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    return { version, meetsRequirement: major >= 22 };
  } catch (error) {
    return { error: (error as Error).message };
  }
});

// 自动安装工具
ipcMain.handle('install-tool', async (event, tool: string) => {
  try {
    // 1. 检查是否正在安装
    if (installLocks.get(tool)) {
      return { success: false, message: `${tool} 正在安装中，请稍候...`, installing: true };
    }

    // 2. 检查工具是否已安装并验证版本
    try {
      const { stdout } = await execAsync(`${tool} --version`);
      const version = stdout.trim();

      // 对于 Node.js，检查版本是否满足 >=22.12.0
      if (tool === 'node') {
        const versionMatch = version.match(/v?(\d+)\.(\d+)\.(\d+)/);
        if (versionMatch) {
          const [, major, minor, patch] = versionMatch.map(Number);
          const currentVersion = major * 10000 + minor * 100 + patch;
          const requiredVersion = 22 * 10000 + 12 * 100 + 0; // 22.12.0

          if (currentVersion >= requiredVersion) {
            return { success: true, message: `${tool} 已安装 (版本: ${version})`, alreadyInstalled: true, version };
          } else {
            // 版本过低，继续安装流程
            console.log(`Node.js 版本 ${version} 低于要求的 22.12.0，需要升级`);
          }
        }
      } else {
        return { success: true, message: `${tool} 已安装 (版本: ${version})`, alreadyInstalled: true, version };
      }
    } catch {
      // 工具未安装，继续安装流程
    }

    // 3. 设置安装锁
    installLocks.set(tool, true);

    try {
      if (tool === 'pnpm') {
        try {
          // 使用用户当前配置的 npm registry
          const { stdout } = await execAsync('npm install -g pnpm@latest', {
            encoding: 'utf8',
            env: { ...process.env, LANG: 'en_US.UTF-8' }
          });
          return { success: true, output: stdout, newlyInstalled: true };
        } catch (error: any) {
          return {
            success: false,
            message: `安装失败。请尝试：\n1. 检查 npm 是否正常（运行 npm --version）\n2. 检查网络连接\n3. 如果网络慢，可配置镜像源：\n   npm config set registry https://registry.npmmirror.com\n\n错误详情：${error.message}`,
            error: error.message
          };
        }
      } else if (tool === 'node') {
        try {
          // 自动下载并安装 Node.js 22.12.0+
          const nodeVersion = '22.12.0';
          const arch = os.arch() === 'x64' ? 'x64' : 'x86';
          const installerUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-${arch}.msi`;
          const tempDir = path.join(os.tmpdir(), 'openclaw-installer');
          const installerPath = path.join(tempDir, `node-v${nodeVersion}-${arch}.msi`);

          await fs.ensureDir(tempDir);

          // 下载安装包
          console.log(`正在下载 Node.js ${nodeVersion}...`);
          const https = require('https');
          const file = require('fs').createWriteStream(installerPath);

          await new Promise<void>((resolve, reject) => {
            https.get(installerUrl, (response: any) => {
              if (response.statusCode === 302 || response.statusCode === 301) {
                // 处理重定向
                https.get(response.headers.location, (redirectResponse: any) => {
                  redirectResponse.pipe(file);
                  file.on('finish', () => {
                    file.close();
                    resolve();
                  });
                }).on('error', reject);
              } else {
                response.pipe(file);
                file.on('finish', () => {
                  file.close();
                  resolve();
                });
              }
            }).on('error', reject);
          });

          console.log('下载完成，开始安装...');

          // 静默安装 Node.js
          // /quiet: 静默安装，不显示UI
          // /norestart: 安装后不重启
          // ADDLOCAL=ALL: 安装所有功能
          const installCommand = `msiexec /i "${installerPath}" /quiet /norestart ADDLOCAL=ALL`;

          await execAsync(installCommand, { timeout: 300000 }); // 5分钟超时

          console.log('Node.js 安装完成');

          // 清理临时文件
          try {
            await fs.remove(installerPath);
          } catch (cleanupError) {
            console.warn('清理临时文件失败:', cleanupError);
          }

          return {
            success: true,
            message: `Node.js ${nodeVersion} 安装成功！\n\n重要提示：\n1. 请关闭并重新打开此安装程序\n2. 或者重启电脑以使环境变量生效\n3. 然后重新运行安装向导`,
            newlyInstalled: true,
            requiresRestart: true
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Node.js 自动安装失败。\n\n请手动下载安装：\n1. 访问 https://nodejs.org/\n2. 下载 Node.js 22.12.0 或更高版本\n3. 安装后重启此程序\n\n错误详情：${error.message}`,
            error: error.message
          };
        }
      } else if (tool === 'git') {
        return { success: false, message: 'Please download Git from https://git-scm.com/' };
      }
      return { success: false, message: 'Unknown tool' };
    } finally {
      // 4. 释放安装锁
      installLocks.delete(tool);
    }
  } catch (error) {
    installLocks.delete(tool);
    return { success: false, error: (error as Error).message };
  }
});

// 第三步：安装 OpenClaw
ipcMain.handle('install-openclaw', async (event, options: {
  installDir: string;
  method: 'prebuilt' | 'source';
}) => {
  try {
    if (options.method === 'prebuilt') {
      // 配置 git 使用 HTTPS 协议而不是 SSH 协议，避免 SSH 密钥问题
      // 这样可以解决某些依赖包使用 SSH URL 导致的安装失败
      try {
        await execAsync('git config --global url."https://github.com/".insteadOf ssh://git@github.com/');
        console.log('已配置 git 使用 HTTPS 协议');
      } catch (gitConfigError) {
        console.warn('配置 git HTTPS 协议失败:', gitConfigError);
        // 继续安装，即使配置失败
      }

      const { stdout } = await execAsync('npm install -g openclaw@latest');
    } else {
      const installPath = options.installDir;
      await fs.ensureDir(installPath);
      await execAsync(`cd "${installPath}" && git clone https://github.com/openclaw/openclaw.git`);
      await execAsync(`cd "${installPath}/openclaw" && pnpm install`);
      await execAsync(`cd "${installPath}/openclaw" && pnpm ui:build && pnpm build`);
    }

    // 安装完成后，自动修复配置文件中的 channels 字段
    const configPath = path.join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
    try {
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJSON(configPath);

        // 如果 channels 是数组，转换为对象
        if (Array.isArray(config.channels)) {
          config.channels = {
            whatsapp: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist', debounceMs: 0, mediaMaxMb: 50 },
            telegram: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist', streaming: 'partial' },
            discord: { enabled: false, groupPolicy: 'allowlist', streaming: 'off' },
            irc: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
            googlechat: { enabled: false, groupPolicy: 'allowlist', streamMode: 'replace' },
            slack: { mode: 'socket', webhookPath: '/slack/events', enabled: false, userTokenReadOnly: true, groupPolicy: 'allowlist', streaming: 'partial', nativeStreaming: true },
            signal: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
            imessage: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
            msteams: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
            feishu: { enabled: false, dmPolicy: 'allowlist', groupPolicy: 'allowlist' },
            matrix: { enabled: false },
            mattermost: { enabled: false },
            line: { enabled: false }
          };

          await fs.writeJSON(configPath, config, { spaces: 2 });
          console.log('已自动修复配置文件中的 channels 字段');
        }
      }
    } catch (configError) {
      console.warn('修复配置文件失败:', configError);
      // 不影响安装成功的返回
    }

    return { success: true, output: 'Installation completed' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 第四步：配置集成
ipcMain.handle('configure-channels', async (event, channels: string[]) => {
  try {
    const configPath = path.join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
    await fs.ensureDir(path.dirname(configPath));

    // 读取现有配置，而不是覆盖
    let config: any = {};
    try {
      config = await fs.readJSON(configPath);
    } catch (error) {
      // 配置文件不存在，使用空对象
    }

    // 将字符串数组转换为对象格式（OpenClaw 期望的格式）
    const channelsObject: any = {
      whatsapp: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist', debounceMs: 0, mediaMaxMb: 50 },
      telegram: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist', streaming: 'partial' },
      discord: { enabled: false, groupPolicy: 'allowlist', streaming: 'off' },
      irc: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
      googlechat: { enabled: false, groupPolicy: 'allowlist', streamMode: 'replace' },
      slack: { mode: 'socket', webhookPath: '/slack/events', enabled: false, userTokenReadOnly: true, groupPolicy: 'allowlist', streaming: 'partial', nativeStreaming: true },
      signal: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
      imessage: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
      msteams: { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
      feishu: { enabled: false, dmPolicy: 'allowlist', groupPolicy: 'allowlist' },
      matrix: { enabled: false },
      mattermost: { enabled: false },
      line: { enabled: false }
    };

    // 启用用户选择的 channels
    for (const channel of channels) {
      if (channelsObject[channel]) {
        channelsObject[channel].enabled = true;
      }
    }

    config.channels = channelsObject;
    config.meta = config.meta || {};
    config.meta.lastTouchedAt = new Date().toISOString();

    await fs.writeJSON(configPath, config, { spaces: 2 });
    return { success: true, configPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 启动 OpenClaw 服务（旧版，保留兼容）
ipcMain.handle('start-openclaw-server', async () => {
  try {
    exec('openclaw gateway --port 18789 --verbose');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 打开聊天窗口
ipcMain.handle('open-chat-window', async () => {
  try {
    // 检查 OpenClaw Control UI 是否已构建
    const openclawPath = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'openclaw');
    const controlUIPath = path.join(openclawPath, 'dist', 'control-ui', 'index.html');

    console.log(`检查 Control UI: ${controlUIPath}`);

    if (!await fs.pathExists(controlUIPath)) {
      console.log('Control UI 未构建，开始自动构建...');

      // 检查 OpenClaw 是否安装
      if (!await fs.pathExists(openclawPath)) {
        return {
          success: false,
          error: 'OpenClaw 未安装，请先运行安装向导'
        };
      }

      // 运行 pnpm ui:build
      try {
        console.log('执行: pnpm ui:build');
        await execAsync('pnpm ui:build', {
          cwd: openclawPath,
          timeout: 300000 // 5分钟超时
        });
        console.log('Control UI 构建完成');
      } catch (buildError) {
        console.error('构建 Control UI 失败:', buildError);
        return {
          success: false,
          error: `构建 Control UI 失败: ${(buildError as Error).message}`
        };
      }
    } else {
      console.log('Control UI 已存在，跳过构建');
    }

    // 始终从配置文件读取端口和 token，不依赖 gatewayPort 变量
    const configPath = path.join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
    let port = 18789; // 默认端口
    let token = '';

    try {
      const config = await fs.readJSON(configPath);
      if (config.gateway?.port) {
        port = config.gateway.port;
      }
      if (config.gateway?.auth?.token) {
        token = config.gateway.auth.token;
      }
      console.log(`读取配置: port=${port}, token=${token ? '已设置' : '未设置'}`);
    } catch (error) {
      console.error('读取配置文件失败:', error);
      // 配置文件不存在或读取失败，使用默认端口
    }

    // 构建 URL，如果有 token 就添加到 URL 参数中
    const url = token
      ? `http://localhost:${port}?token=${token}`
      : `http://localhost:${port}`;

    console.log(`打开聊天窗口: ${url}`);
    exec(`start ${url}`);
    return { success: true, port, url };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 生成使用指南
ipcMain.handle('generate-guide', async (event, installDir: string) => {
  try {
    const guideContent = `# OpenClaw 使用指南\n\n## 安装完成！\n\n你已成功安装 OpenClaw。\n\n\`\`\`bash\nopenclaw gateway --port 18789 --verbose\n\`\`\`\n\n**安装日期**: ${new Date().toLocaleString()}\n`;
    const guideDir = installDir || process.env.USERPROFILE || os.homedir();
    const guidePath = path.join(guideDir, 'OpenClaw-使用指南.md');
    await fs.writeFile(guidePath, guideContent);
    return { success: true, guidePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// ==================== 新增 IPC 处理 ====================

// 检测 openclaw 是否已安装
ipcMain.handle('check-openclaw-installed', async () => {
  try {
    await execAsync('where openclaw');
    const { stdout } = await execAsync('openclaw --version');
    return { installed: true, version: stdout.trim() };
  } catch {
    return { installed: false };
  }
});

// 读取配置文件
ipcMain.handle('read-config', async () => {
  const configPath = path.join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
  try {
    const content = await fs.readJSON(configPath);
    return { success: true, config: content, path: configPath };
  } catch {
    return { success: false, config: {} };
  }
});

// 获取当前主模型
ipcMain.handle('get-current-model', async () => {
  const configPath = path.join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
  try {
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJSON(configPath);
      const primaryModel = config.agents?.defaults?.model?.primary || null;
      return { success: true, model: primaryModel };
    }
    return { success: false, message: '配置文件不存在' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 获取可用模型列表
ipcMain.handle('get-available-models', async () => {
  const configPath = path.join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
  try {
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJSON(configPath);
      const availableModels: Array<{ provider: string; model: string; displayName: string }> = [];
      const modelSet = new Set<string>(); // 用于去重

      // 1. 从 models.providers[].models 读取
      if (config.models?.providers) {
        for (const [providerName, providerConfig] of Object.entries(config.models.providers)) {
          const provider = providerConfig as any;
          if (provider.models && Array.isArray(provider.models)) {
            provider.models.forEach((model: any) => {
              const modelId = typeof model === 'string' ? model : (model.id || model.name);
              if (modelId) {
                const displayName = `${providerName}/${modelId}`;
                if (!modelSet.has(displayName)) {
                  modelSet.add(displayName);
                  availableModels.push({
                    provider: providerName,
                    model: modelId,
                    displayName,
                  });
                }
              }
            });
          }
        }
      }

      // 2. 从 agents.defaults.models 读取
      if (config.agents?.defaults?.models) {
        for (const modelKey of Object.keys(config.agents.defaults.models)) {
          if (modelKey.includes('/')) {
            if (!modelSet.has(modelKey)) {
              const [provider, model] = modelKey.split('/');
              modelSet.add(modelKey);
              availableModels.push({
                provider,
                model,
                displayName: modelKey,
              });
            }
          }
        }
      }

      return { success: true, models: availableModels };
    }
    return { success: false, message: '配置文件不存在' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 设置主模型
ipcMain.handle('set-primary-model', async (event, model: string) => {
  try {
    // 使用 openclaw config set 命令设置主模型
    const { stdout } = await execAsync(`openclaw config set agents.defaults.model.primary "${model}"`);
    return { success: true, output: stdout };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 设置配置项
ipcMain.handle('config-set', async (event, dotPath: string, value: any) => {
  try {
    let serializedValue: string;

    // 根据值的类型进行序列化
    if (typeof value === 'string') {
      // 字符串: 转义引号并用双引号包裹
      serializedValue = `"${value.replace(/"/g, '\\"')}"`;
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      // 布尔值和数字: 直接转换为字符串
      serializedValue = String(value);
    } else if (Array.isArray(value) || typeof value === 'object') {
      // 数组和对象: JSON 序列化后用双引号包裹并转义
      const jsonStr = JSON.stringify(value);
      // 在 Windows 上使用双引号，并转义内部的双引号
      serializedValue = `"${jsonStr.replace(/"/g, '\\"')}"`;
    } else {
      // 其他类型: 转换为字符串
      serializedValue = `"${String(value)}"`;
    }

    const { stdout } = await execAsync(`openclaw config set ${dotPath} ${serializedValue}`);
    return { success: true, output: stdout };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 删除配置项
ipcMain.handle('config-unset', async (event, dotPath: string) => {
  try {
    const { stdout } = await execAsync(`openclaw config unset ${dotPath}`);
    return { success: true, output: stdout };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 启动网关监控
ipcMain.handle('gateway-start', async (event, options?: { forceKill?: boolean }) => {
  if (gatewayProcess && !gatewayProcess.killed) {
    return { success: false, message: 'Already running' };
  }

  try {
    // 读取配置中的端口
    const configPath = path.join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
    let port = 18789; // 默认端口

    try {
      const config = await fs.readJSON(configPath);
      if (config.gateway?.port) {
        port = config.gateway.port;
      }
    } catch (error) {
      // 配置文件不存在或读取失败，使用默认端口
    }

    // 检测端口是否被占用（直接使用 findProcessByPort 更可靠）
    const pid = await findProcessByPort(port);

    if (pid) {
      // 前端已经传递了 forceKill: true，所以直接强制关闭
      console.log(`检测到端口 ${port} 被进程 ${pid} 占用，正在强制关闭...`);

      // 先尝试优雅停止
      try {
        await execAsync('openclaw gateway stop', { timeout: 3000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 验证进程是否真的停止了
        const stillRunningPid = await findProcessByPort(port);
        if (!stillRunningPid) {
          console.log('优雅停止成功');
        } else {
          throw new Error('优雅停止失败，需要强制杀死');
        }
      } catch (error) {
        // 优雅停止失败，强制杀死进程
        console.log('优雅停止失败，正在强制杀死进程...');
        const killed = await killProcess(pid);
        if (!killed) {
          return {
            success: false,
            error: `无法关闭占用端口 ${port} 的进程 (PID: ${pid})。请手动运行: taskkill /F /PID ${pid}`,
          };
        }
        // 等待端口释放
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 再次验证
        const stillRunningPid = await findProcessByPort(port);
        if (stillRunningPid) {
          return {
            success: false,
            error: `进程已杀死但端口 ${port} 仍被占用。请等待几秒后重试。`,
          };
        }
      }
    }

    // 启动网关
    gatewayProcess = spawn('openclaw', ['gateway', '--port', String(port), '--verbose'], {
      shell: true,
    });

    // 保存日志的辅助函数
    const saveLog = async (type: 'stdout' | 'stderr' | 'system', text: string) => {
      const logEntry = `[${new Date().toISOString()}] [${type}] ${text}\n`;
      gatewayLogs.push(logEntry);

      // 发送到前端
      mainWindow?.webContents.send('gateway-log', { type, text });

      // 写入文件
      try {
        await fs.ensureFile(LOG_FILE_PATH);
        const stats = await fs.stat(LOG_FILE_PATH);

        // 如果文件超过1GB，进行轮转
        if (stats.size > MAX_LOG_SIZE) {
          const backupPath = LOG_FILE_PATH.replace('.log', `-${Date.now()}.log`);
          await fs.move(LOG_FILE_PATH, backupPath);
          gatewayLogs = []; // 清空内存日志
        }

        await fs.appendFile(LOG_FILE_PATH, logEntry);
      } catch (error) {
        console.error('Failed to write log:', error);
      }
    };

    gatewayProcess.stdout?.on('data', (data: Buffer) => {
      saveLog('stdout', data.toString());
    });

    gatewayProcess.stderr?.on('data', (data: Buffer) => {
      saveLog('stderr', data.toString());
    });

    gatewayProcess.on('exit', (code: number | null) => {
      saveLog('system', `Gateway exited with code ${code}`);
      gatewayProcess = null;
      gatewayPort = null; // 清除保存的端口
    });

    // 保存网关端口
    gatewayPort = port;

    return { success: true, port };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 停止网关
ipcMain.handle('gateway-stop', async () => {
  if (gatewayProcess) {
    gatewayProcess.kill();
    gatewayProcess = null;
  }
  gatewayPort = null; // 清除保存的端口
  return { success: true };
});

// 网关状态
ipcMain.handle('gateway-status', async () => {
  return { running: gatewayProcess !== null && !gatewayProcess.killed };
});

// 获取网关日志
ipcMain.handle('get-gateway-logs', async () => {
  try {
    // 先尝试从文件读取
    if (await fs.pathExists(LOG_FILE_PATH)) {
      const content = await fs.readFile(LOG_FILE_PATH, 'utf-8');
      return { success: true, logs: content };
    }
    // 如果文件不存在，返回内存中的日志
    return { success: true, logs: gatewayLogs.join('') };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 清除网关日志
ipcMain.handle('clear-gateway-logs', async () => {
  try {
    gatewayLogs = [];
    if (await fs.pathExists(LOG_FILE_PATH)) {
      await fs.remove(LOG_FILE_PATH);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// ==================== 插件依赖管理 ====================

// 渠道到插件的映射
const CHANNEL_PLUGIN_MAP: Record<string, string | null> = {
  discord: 'discord',
  telegram: 'telegram',
  slack: 'slack',
  feishu: 'feishu',
  whatsapp: 'whatsapp',
  signal: 'signal',
  imessage: 'imessage',
  msteams: 'msteams',
  googlechat: 'googlechat',
  irc: 'irc',
  matrix: 'matrix',
  mattermost: 'mattermost',
  line: 'line',
  wechat: null,
  qq: null,
};

// 获取插件信息
ipcMain.handle('get-plugin-info', async (event, { channelType }: { channelType: string }) => {
  try {
    const pluginName = CHANNEL_PLUGIN_MAP[channelType];
    if (!pluginName) {
      return { success: false, hasPlugin: false, pluginName: channelType };
    }

    // 查找插件目录
    const userHome = process.env.USERPROFILE || os.homedir();
    const possiblePaths = [
      path.join(userHome, '.openclaw', 'extensions', pluginName),
      path.join(process.cwd(), 'extensions', pluginName),
    ];

    for (const pluginPath of possiblePaths) {
      if (await fs.pathExists(pluginPath)) {
        const packageJsonPath = path.join(pluginPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJSON(packageJsonPath);
          return {
            success: true,
            pluginName,
            pluginPath,
            hasPlugin: true,
            packageJson,
          };
        }
      }
    }

    return { success: false, hasPlugin: false, pluginName };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 检查插件依赖
ipcMain.handle('check-plugin-dependencies', async (event, { pluginName }: { pluginName: string }) => {
  try {
    const userHome = process.env.USERPROFILE || os.homedir();
    const possiblePaths = [
      path.join(userHome, '.openclaw', 'extensions', pluginName),
      path.join(process.cwd(), 'extensions', pluginName),
    ];

    let pluginPath = '';
    for (const p of possiblePaths) {
      if (await fs.pathExists(p)) {
        pluginPath = p;
        break;
      }
    }

    if (!pluginPath) {
      return { success: false, error: 'Plugin directory not found' };
    }

    const packageJsonPath = path.join(pluginPath, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      return { success: false, error: 'package.json not found' };
    }

    const packageJson = await fs.readJSON(packageJsonPath);
    const dependencies = packageJson.dependencies || {};

    const dependencyStatus = await Promise.all(
      Object.entries(dependencies).map(async ([name, version]) => {
        const depPath = path.join(pluginPath, 'node_modules', name);
        const installed = await fs.pathExists(depPath);
        return {
          name,
          version: version as string,
          installed,
          path: installed ? depPath : undefined,
        };
      })
    );

    return {
      success: true,
      plugin: pluginName,
      dependencies: dependencyStatus,
      pluginPath,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 安装插件依赖
ipcMain.handle('install-plugin-dependencies', async (event, { pluginName }: { pluginName: string }) => {
  try {
    const userHome = process.env.USERPROFILE || os.homedir();
    const targetPluginPath = path.join(userHome, '.openclaw', 'extensions', pluginName);

    const possiblePaths = [
      targetPluginPath,
      path.join(process.cwd(), 'extensions', pluginName),
    ];

    let pluginPath = '';
    for (const p of possiblePaths) {
      if (await fs.pathExists(p)) {
        pluginPath = p;
        break;
      }
    }

    // 如果插件目录不存在，尝试自动查找和安装
    if (!pluginPath) {
      // 尝试从全局 npm 安装的 openclaw 中查找插件
      try {
        const { stdout: npmRoot } = await execAsync('npm root -g');
        const globalPluginPath = path.join(
          npmRoot.trim(),
          'openclaw',
          'extensions',
          pluginName
        );

        if (await fs.pathExists(globalPluginPath)) {
          // 找到全局插件，复制到用户目录
          await fs.ensureDir(path.dirname(targetPluginPath));
          await fs.copy(globalPluginPath, targetPluginPath);
          pluginPath = targetPluginPath;
        }
      } catch (error) {
        // 全局查找失败，继续尝试其他方式
      }

      // 如果还是没找到，尝试从 npm 安装
      if (!pluginPath) {
        const possiblePackageNames = [
          `@openclaw/plugin-${pluginName}`,
          `openclaw-plugin-${pluginName}`,
        ];

        for (const packageName of possiblePackageNames) {
          try {
            await fs.ensureDir(targetPluginPath);
            await execAsync(`npm install ${packageName}`, {
              cwd: path.dirname(targetPluginPath),
            });

            // 检查是否安装成功
            const installedPath = path.join(
              path.dirname(targetPluginPath),
              'node_modules',
              packageName
            );

            if (await fs.pathExists(installedPath)) {
              // 移动到正确的位置
              await fs.move(installedPath, targetPluginPath, { overwrite: true });
              pluginPath = targetPluginPath;
              break;
            }
          } catch (error) {
            // 尝试下一个包名
            continue;
          }
        }
      }

      // 如果所有方法都失败了
      if (!pluginPath) {
        return {
          success: false,
          error: `无法找到或安装插件 ${pluginName}。请确保 OpenClaw 已正确安装，或手动安装插件。`,
        };
      }
    }

    // 执行 pnpm install
    const { stdout, stderr } = await execAsync('pnpm install', {
      cwd: pluginPath,
    });

    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      pluginPath,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
});

// 模型认证登录
ipcMain.handle('model-auth-login', async (event, { provider }: { provider: string }) => {
  try {
    // 验证 openclaw 是否已安装
    try {
      await execAsync('where openclaw');
    } catch {
      return {
        success: false,
        error: 'OpenClaw 未安装。请先完成安装步骤。',
      };
    }

    // 提供商认证命令映射
    const PROVIDER_AUTH_MAP: Record<string, string> = {
      'qwen': 'qwen-portal',
      'github-copilot': 'github-copilot',
    };

    const authProvider = PROVIDER_AUTH_MAP[provider] || provider;
    const authCommand = `openclaw models auth login --provider ${authProvider}`;

    // 根据操作系统启动终端窗口
    const platform = process.platform;

    if (platform === 'win32') {
      // Windows: 打开新的 cmd 窗口，命令执行后保持打开
      spawn('cmd', ['/c', 'start', 'cmd', '/k', authCommand], {
        shell: true,
        detached: true,
      });
      return {
        success: true,
        message: '已打开终端窗口，请在终端中完成认证流程。',
        command: authCommand,
      };
    } else if (platform === 'darwin') {
      // macOS: 使用 AppleScript 控制 Terminal.app
      const script = `tell application "Terminal" to do script "${authCommand}"`;
      spawn('osascript', ['-e', script], { detached: true });
      return {
        success: true,
        message: '已打开终端窗口，请在终端中完成认证流程。',
        command: authCommand,
      };
    } else {
      // Linux: 尝试多个终端模拟器
      const terminals = [
        { cmd: 'gnome-terminal', args: ['--', 'bash', '-c', `${authCommand}; exec bash`] },
        { cmd: 'konsole', args: ['-e', 'bash', '-c', `${authCommand}; exec bash`] },
        { cmd: 'xfce4-terminal', args: ['-e', 'bash', '-c', `${authCommand}; exec bash`] },
        { cmd: 'xterm', args: ['-e', 'bash', '-c', `${authCommand}; exec bash`] },
      ];

      for (const terminal of terminals) {
        try {
          spawn(terminal.cmd, terminal.args, { detached: true });
          return {
            success: true,
            message: '已打开终端窗口，请在终端中完成认证流程。',
            command: authCommand,
          };
        } catch {
          continue;
        }
      }

      // 所有终端都不可用
      return {
        success: false,
        error: `无法找到可用的终端模拟器。请手动运行以下命令：\n${authCommand}`,
        command: authCommand,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
});
