# 🚀 快速开始指南

## 5 分钟快速启动

### 前置条件检查

```bash
# 1. 检查 Node.js (需要 ≥22)
node --version

# 2. 检查 pnpm (如果没有，安装一下)
npm install -g pnpm

# 3. 确保有 Git
git --version
```

### 启动开发环境

```bash
# 1. 进入项目目录
cd openclaw-installer

# 2. 安装依赖 (~2 分钟)
pnpm install

# 3. 启动开发模式
pnpm dev
```

**就这样！** 应用会自动打开，显示漂亮的龙虾安装向导界面。

## 项目文件一览

```
📦 openclaw-installer/
├─ 📁 src/
│  ├─ main.ts                 ← Electron 后端（处理系统操作）
│  ├─ App.tsx                 ← React 主组件（路由和状态管理）
│  ├─ App.css                 ← 龙虾主题样式
│  └─ components/
│     ├─ StepOne.tsx          ← 系统检验界面
│     ├─ StepTwo.tsx          ← 依赖检查界面
│     ├─ StepThree.tsx        ← 安装方式选择
│     └─ StepFour.tsx         ← 渠道配置 + 启动
├─ 📄 package.json            ← 项目配置和脚本
├─ 📄 README.md               ← 项目说明
├─ 📄 DEVELOPMENT.md          ← 详细开发指南
└─ 📄 PROJECT-OVERVIEW.md     ← 项目完整描述
```

## 核心功能演示

### 第一步：系统检验
```
输入：检查 Windows、架构、Node.js
输出：✓ 通过或 ✗ 失败
```

### 第二步：依赖检查
```
检查项：Node.js ✓ | npm ✓ | Git ✗ | pnpm ✓
操作：可自动安装 pnpm，其他工具提供下载链接
```

### 第三步：选择安装方式
```
选项 A：预构建（5 分钟） - npm install -g openclaw@latest
选项 B：源码编译（15 分钟）- git clone + pnpm build
```

### 第四步：配置集成
```
选择渠道：飞书 ☑ | 微信 ☐ | QQ ☑ | Telegram ☐ | Discord ☐ | Slack ☐
完成：启动服务 → 打开聊天 → 生成指南
```

## 开发常见任务

### 运行开发服务器
```bash
pnpm dev
```
- React: http://localhost:3000
- Electron: 自动打开应用窗口
- 热重载：修改代码会自动刷新

### 构建发布版本
```bash
# 快速验证构建
pnpm build:strict-smoke

# 完整生产构建
pnpm build

# 打包 Windows 安装程序
pnpm dist
```

### 调试技巧
```bash
# 打开开发者工具（F12）
# - Console: 查看日志和错误
# - Network: 监控 IPC 通信
# - Profiler: 性能分析

# 主进程日志直接输出到控制台
```

### 修改样式
```css
/* App.css 顶部有 CSS 变量 */
:root {
  --primary-color: #ff6b35;    /* 龙虾红 */
  --secondary-color: #f7931e;  /* 龙虾橙 */
  /* 修改这里就能改主题 */
}
```

### 添加新的安装步骤
```typescript
// 1. 创建 components/StepFive.tsx
// 2. 在 App.tsx 中加入 {currentStep === 5 && <StepFive />}
// 3. 更新进度条步数
```

## 代码结构速览

### 数据流
```
用户交互
  ↓
React 组件状态更新
  ↓
调用 ipcRenderer.invoke('channel-name', args)
  ↓
Electron 主进程 IPC 处理器
  ↓
执行系统操作（spawn、exec、fs 等）
  ↓
返回结果到 React
  ↓
更新 UI 显示
```

### IPC 通信示例
```typescript
// 在 React 组件中：
const result = await ipcRenderer.invoke('check-system-info');

// 在 Electron 主进程中：
ipcMain.handle('check-system-info', async () => {
  // 执行检查逻辑
  return { success: true, ... };
});
```

## 项目配置文件说明

| 文件 | 用途 |
|------|------|
| `package.json` | 依赖和脚本定义 |
| `tsconfig.json` | TypeScript 配置 |
| `tsconfig.electron.json` | Electron 编译配置 |
| `src/main.ts` | Electron 主进程 |
| `src/preload.ts` | 安全隔离层 |
| `public/index.html` | HTML 模板 |

## 常见问题

**Q: 如何改龙虾图标？**
A: 替换 `assets/lobster-icon.png`，在 `main.ts` 中更新路径。

**Q: 如何添加新的消息渠道？**
A: 修改 `StepFour.tsx` 中的 `channels` 数组，添加新频道对象。

**Q: 样式太丑了，怎么改？**
A: 编辑 `App.css`，所有颜色都是 CSS 变量，易于修改。

**Q: 能否支持 macOS/Linux？**
A: 代码架构支持，但需要调整一些 Windows 特定逻辑。

**Q: 如何发布应用？**
A: 运行 `pnpm dist`，生成 `.exe` 安装程序在 `dist/` 目录。

## 完整项目文件列表

```
openclaw-installer/
├── src/
│   ├── main.ts                    (380 行) Electron 主进程
│   ├── preload.ts                 (30 行)  预加载脚本
│   ├── App.tsx                    (80 行)  React 主组件
│   ├── App.css                    (1200 行) 完整样式
│   ├── index.tsx                  (15 行)  React 入口
│   ├── index.css                  (30 行)  全局样式
│   └── components/
│       ├── StepOne.tsx            (110 行) 系统检验
│       ├── StepTwo.tsx            (180 行) 依赖检查
│       ├── StepThree.tsx          (160 行) 安装方式
│       └── StepFour.tsx           (200 行) 渠道配置
├── public/
│   └── index.html                 (20 行)  HTML 模板
├── assets/
│   └── lobster-icon.png           龙虾图标
├── package.json                   项目配置
├── tsconfig.json                  TS 配置
├── tsconfig.electron.json         Electron TS 配置
├── .gitignore                     Git 忽略
├── README.md                      项目说明
├── DEVELOPMENT.md                 开发指南
├── PROJECT-OVERVIEW.md            项目概览
└── GETTING-STARTED.md             本文件
```

## 技术栈概览

```
Frontend Layer (React + TypeScript)
├─ UI Components (4 Step Components)
├─ State Management (useState hooks)
├─ Styling (CSS with Variables)
└─ IPC Communication

Communication Layer (Electron IPC)
├─ ipcRenderer (Frontend)
└─ ipcMain (Backend)

Backend Layer (Node.js + Electron)
├─ System Checks
├─ Tool Installation
├─ File Operations
└─ Process Execution

System Level
├─ Windows API
├─ Environment Variables
└─ Shell Commands
```

## 下一步

1. **运行应用**: `pnpm dev`
2. **浏览代码**: 打开 `src/App.tsx` 了解主流程
3. **修改样式**: 编辑 `App.css` 中的 CSS 变量
4. **添加功能**: 参考 `DEVELOPMENT.md` 了解如何扩展
5. **打包发布**: `pnpm dist` 生成 Windows 安装程序

## 获取帮助

- 📖 **详细开发指南**: 查看 `DEVELOPMENT.md`
- 🎯 **项目完整描述**: 查看 `PROJECT-OVERVIEW.md`
- 💬 **问题反馈**: 提交 GitHub Issue
- 🦞 **OpenClaw 社区**: https://discord.gg/clawd

---

## 项目统计

- ✨ **总代码行数**: 2500+
- 🎨 **CSS 样式**: 1200+ 行
- ⚛️ **React 组件**: 4 个安装步骤
- 🔌 **IPC 接口**: 8 个主要接口
- 🌐 **支持渠道**: 6 个（可扩展）
- 📱 **响应式设计**: 支持多种屏幕尺寸

---

**准备好了吗？运行 `pnpm dev` 开始体验肌肉龙虾的安装向导吧！** 🦞

祝安装愉快！
