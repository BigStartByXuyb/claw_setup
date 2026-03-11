/**
 * Electron 主进程入口
 *
 * 职责：
 * 1. 创建和管理主窗口
 * 2. 注册所有 IPC Handlers（委托给各 handler 模块）
 * 3. 处理窗口控制（最小化、最大化、关闭）
 * 4. 处理对话框（文件夹选择）
 *
 * 架构说明：
 * - 业务逻辑全部在 src/services/ 中实现
 * - IPC Handlers 在 src/ipc/handlers/ 中注册
 * - 工具函数在 src/utils/ 中
 * - 此文件只做初始化和组装，保持精简
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import isDev from 'electron-is-dev';
import path from 'path';

// IPC Handler 注册函数
import { registerSystemHandlers }     from './ipc/handlers/systemHandlers';
import { registerDependencyHandlers } from './ipc/handlers/dependencyHandlers';
import { registerGatewayHandlers }    from './ipc/handlers/gatewayHandlers';
import { registerConfigHandlers }     from './ipc/handlers/configHandlers';
import { registerInstallHandlers }    from './ipc/handlers/installHandlers';
import { registerPluginHandlers }     from './ipc/handlers/pluginHandlers';

/** 主窗口实例 */
let mainWindow: BrowserWindow | null = null;

/** 获取主窗口（供 handler 模块使用） */
const getMainWindow = () => mainWindow;

/**
 * 创建主窗口
 */
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

// ==================== 应用生命周期 ====================

app.on('ready', () => {
  createWindow();
  registerAllHandlers();
});

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

// ==================== IPC Handler 注册 ====================

/**
 * 注册所有 IPC Handlers
 *
 * 每个功能模块独立注册，便于维护和扩展
 */
function registerAllHandlers(): void {
  // 系统信息
  registerSystemHandlers();

  // 依赖检查与安装
  registerDependencyHandlers();

  // 网关管理
  registerGatewayHandlers(getMainWindow);

  // 配置管理
  registerConfigHandlers();

  // 安装流程
  registerInstallHandlers();

  // 插件和模型认证
  registerPluginHandlers();

  // 窗口控制
  registerWindowHandlers();
}

/**
 * 注册窗口控制 IPC Handlers
 *
 * 最小化、最大化、关闭、对话框等窗口级操作
 */
function registerWindowHandlers(): void {
  ipcMain.handle('window-minimize', () => { mainWindow?.minimize(); });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });

  ipcMain.handle('window-close', () => { mainWindow?.close(); });

  ipcMain.handle('show-open-dialog', async () => {
    return dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });
  });
}
