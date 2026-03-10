# OpenClaw 安装向导 - 开发指南

## 目录

1. [开发环境设置](#开发环境设置)
2. [项目架构](#项目架构)
3. [开发工作流](#开发工作流)
4. [构建和发布](#构建和发布)
5. [调试技巧](#调试技巧)
6. [扩展应用](#扩展应用)

## 开发环境设置

### 系统需求

- **Windows**: Windows 10/11 (64-bit)
- **Node.js**: v22.0.0 或更高版本
- **包管理器**: pnpm 9.0.0+ (推荐) 或 npm 10.0.0+

### 初始化步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd openclaw-installer

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev
```

开发模式会同时启动 React 开发服务器和 Electron 应用。

## 项目架构

### 前端架构（React + TypeScript）

```
Frontend (React)
    ↓
App.tsx (主路由)
    ├── StepOne.tsx (系统检验)
    ├── StepTwo.tsx (依赖检查)
    ├── StepThree.tsx (选择安装)
    └── StepFour.tsx (配置集成)
    ↓
样式 (App.css)
    ↓
组件通过 IPC 与后端通信
```

### 后端架构（Electron）

```
Main Process (main.ts)
    ├── 窗口管理
    ├── IPC 处理器
    │   ├── check-system-info
    │   ├── check-dependencies
    │   ├── install-tool
    │   ├── install-openclaw
    │   ├── configure-channels
    │   ├── start-openclaw-server
    │   ├── open-chat-window
    │   └── generate-guide
    ├── 系统操作
    │   ├── 文件系统操作
    │   ├── 进程执行
    │   └── 环境变量检查
    └── 预加载脚本 (preload.ts)
```

### 通信流程

```
React Component
    ↓
ipcRenderer.invoke('channel-name', args)
    ↓
Electron Main Process (IPC Handler)
    ↓
执行系统操作 (spawn, exec, fs 等)
    ↓
返回结果到 React
    ↓
更新 UI 状态
```

## 开发工作流

### 1. 添加新的安装步骤

**示例：添加第五步**

```typescript
// 1. 创建新组件
// src/components/StepFive.tsx

import React, { useState } from 'react';

interface Props {
  onNext: (data: any) => void;
}

const StepFive: React.FC<Props> = ({ onNext }) => {
  const [data, setData] = useState(null);

  const handleNext = () => {
    onNext({ stepFiveData: data });
  };

  return (
    <div className="step-content">
      <h2>第五步：新功能</h2>
      {/* 你的内容 */}
    </div>
  );
};

export default StepFive;
```

```typescript
// 2. 在 App.tsx 中注册
import StepFive from './components/StepFive';

// 在 App 组件中添加：
{currentStep === 5 && (
  <StepFive onNext={handleNextStep} />
)}

// 更新进度条：将 [1, 2, 3, 4] 改为 [1, 2, 3, 4, 5]
```

### 2. 添加新的 IPC 处理器

**示例：添加新的检查**

```typescript
// src/main.ts

ipcMain.handle('new-check', async (event, args) => {
  try {
    // 执行检查逻辑
    const result = await performCheck(args);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 在前端组件中使用：
const result = await ipcRenderer.invoke('new-check', someArgs);
```

### 3. 修改样式

所有样式都在 `App.css` 中，使用 CSS 变量便于维护：

```css
/* 修改主色 */
:root {
  --primary-color: #ff6b35;      /* 龙虾红 */
  --primary-dark: #e55a2b;       /* 深龙虾红 */
  --secondary-color: #f7931e;    /* 龙虾橙 */
}

/* 添加新组件样式 */
.new-component {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  padding: 20px;
  border-radius: 8px;
}
```

## 构建和发布

### 开发构建

```bash
# 快速开发循环
pnpm dev

# 仅构建 React
pnpm build:react

# 仅构建 Electron
pnpm build:electron
```

### 生产构建

```bash
# 完整生产构建
pnpm build

# 打包为 Windows 安装程序
pnpm pack

# 打包为发布版本
pnpm dist
```

### 发布流程

1. **版本更新**
   ```bash
   # 在 package.json 中更新版本号
   # 例如：从 1.0.0 更新到 1.0.1
   ```

2. **生成发布**
   ```bash
   pnpm dist
   ```

3. **输出文件**
   ```
   dist/
   ├── OpenClaw-Installer-1.0.1.exe  # Windows 安装程序
   ├── OpenClaw-Installer-1.0.1.exe.blockmap
   └── latest.yml  # 更新元数据
   ```

### 自动更新配置

编辑 `main.ts` 中的电子更新器配置：

```typescript
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();
```

## 调试技巧

### 1. 开发者工具

按 `F12` 打开 Chromium 开发者工具：
- **Console**: 查看 JS 错误和日志
- **Network**: 检查 IPC 通信
- **Application**: 查看存储和缓存

### 2. 主进程日志

```typescript
// 在 main.ts 中添加日志
console.log('Starting system check...');
console.log('System info:', systemInfo);
console.error('Error occurred:', error);
```

### 3. 远程调试

使用 `node-inspect` 调试主进程：

```bash
electron --inspect=5858 .
# 然后访问 chrome://inspect
```

### 4. 性能分析

在 React DevTools 中使用 Profiler：
1. 打开开发者工具
2. 切换到 "Profiler" 选项卡
3. 记录性能数据

## 扩展应用

### 添加新的系统检查

```typescript
// src/main.ts

ipcMain.handle('check-custom', async () => {
  try {
    // 示例：检查 Docker
    const { stdout } = await execAsync('docker --version');
    return {
      installed: true,
      version: stdout.trim(),
    };
  } catch {
    return { installed: false };
  }
});
```

### 自定义安装脚本

```typescript
// src/main.ts

ipcMain.handle('install-openclaw', async (event, options) => {
  // 添加自定义逻辑
  if (options.method === 'custom') {
    // 执行自定义安装脚本
    await execAsync('custom-install.sh');
  }
});
```

### 本地化支持

创建语言文件：

```typescript
// src/i18n/zh-CN.json
{
  "stepOne": {
    "title": "第一步：系统检验",
    "description": "检查你的系统..."
  }
}

// src/i18n/en-US.json
{
  "stepOne": {
    "title": "Step One: System Check",
    "description": "Checking your system..."
  }
}
```

在组件中使用：

```typescript
import { useTranslation } from './hooks/useTranslation';

const StepOne = () => {
  const t = useTranslation();
  return <h2>{t('stepOne.title')}</h2>;
};
```

## 常见问题和解决方案

### 问题：React 与 Electron 通信失败

**解决方案**：
1. 检查 `main.ts` 中是否注册了 IPC 处理器
2. 确认 `preload.ts` 正确暴露了 ipcRenderer
3. 检查浏览器控制台的错误信息

### 问题：样式不加载

**解决方案**：
1. 确保 `App.css` 已导入 `App.tsx`
2. 检查 CSS 文件路径
3. 清除浏览器缓存（F5 刷新）

### 问题：安装程序过大

**解决方案**：
1. 使用 `asar` 打包压缩
2. 删除不需要的依赖
3. 启用代码分割

### 问题：系统权限不足

**解决方案**：
1. 以管理员身份运行应用
2. 使用 `sudo` 执行需要权限的命令
3. 配置 UAC 权限请求

## 性能优化

### 1. 代码分割

```typescript
const StepOne = lazy(() => import('./components/StepOne'));

<Suspense fallback={<Loading />}>
  <StepOne />
</Suspense>
```

### 2. 缓存策略

```typescript
// 缓存依赖检查结果
const [cachedDeps, setCachedDeps] = useState(null);

const checkDeps = async () => {
  if (cachedDeps) return cachedDeps;
  const result = await ipcRenderer.invoke('check-dependencies');
  setCachedDeps(result);
  return result;
};
```

### 3. 内存管理

```typescript
// 及时清理事件监听
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('resize', handler);

  return () => {
    window.removeEventListener('resize', handler);
  };
}, []);
```

## 最佳实践

1. **错误处理**：始终使用 try-catch 包装 IPC 调用
2. **加载状态**：显示加载指示器，避免重复点击
3. **进度反馈**：在长时间操作中提供进度信息
4. **用户反馈**：清晰的成功/失败消息
5. **代码注释**：为复杂逻辑添加注释
6. **日志记录**：记录重要操作的日志

## 资源链接

- [Electron 官方文档](https://www.electronjs.org/)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Electron Builder 文档](https://www.electron.build/)

---

**问题或建议？** 提交 Issue 或联系维护者。
