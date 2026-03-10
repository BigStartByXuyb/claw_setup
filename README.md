# 🦞 OpenClaw Installation Wizard

一个现代化的 Windows 安装向导程序，用于轻松安装和配置 **OpenClaw**，一个多渠道 AI 助手网关。

## 特性

- 🎨 **现代化 UI** - 肌肉龙虾主题设计
- 📋 **分步骤安装** - 四个清晰的安装步骤
- ✅ **智能检查** - 自动检测系统和依赖
- 🔧 **自动安装** - 支持缺失工具的自动安装
- 🌐 **多渠道支持** - 配置飞书、微信、QQ 等集成
- 📖 **自动生成指南** - 安装完成后自动生成使用指南

## 安装步骤

### 前置条件

- Windows 10/11 (64-bit)
- Node.js 22+
- pnpm 或 npm

### 开发环境设置

```bash
# 1. 克隆项目
git clone <repo-url>
cd openclaw-installer

# 2. 安装依赖
pnpm install

# 3. 启动开发模式
pnpm dev
```

### 构建应用

```bash
# 打包为 Windows 安装程序
pnpm dist

# 输出文件会在 dist/ 目录中
```

## 项目结构

```
openclaw-installer/
├── src/
│   ├── main.ts              # Electron 主进程
│   ├── preload.ts           # Electron 预加载脚本
│   ├── App.tsx              # React 根组件
│   ├── App.css              # 应用样式
│   ├── index.tsx            # React 入口
│   ├── index.css            # 全局样式
│   └── components/
│       ├── StepOne.tsx      # 第一步：系统检验
│       ├── StepTwo.tsx      # 第二步：依赖检查
│       ├── StepThree.tsx    # 第三步：选择安装方式
│       └── StepFour.tsx     # 第四步：配置集成
├── public/
│   └── index.html           # HTML 入口
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
└── README.md                # 本文件
```

## 安装流程

### 第一步：系统检验 ✅
- 检查操作系统（Windows 64-bit）
- 验证系统版本和架构
- 显示 Node.js 版本

### 第二步：依赖检查 🔍
- 检查必需工具（Node.js, Git, pnpm）
- 显示工具版本和安装路径
- 支持自动安装 pnpm
- 验证环境变量

### 第三步：选择安装方式 📦
- **预构建安装**：快速安装，5 分钟（推荐）
- **源码编译**：完整开发环境，15 分钟
- 选择安装目录（源码编译时）

### 第四步：配置集成 🌐
- 选择要接入的消息渠道
- 支持渠道：飞书、微信、QQ、Telegram、Discord、Slack
- 启动 OpenClaw 服务
- 打开聊天窗口
- 生成使用指南 MD 文件

## UI 设计特点

### 肌肉龙虾主题
- 主色：橙红色 (#ff6b35)
- 强大的视觉层次
- 友好的交互反馈
- 响应式设计（支持不同屏幕大小）

### 交互元素
- 进度条显示安装进度
- 状态指示器（✓ 成功，✗ 失败）
- 动画反馈和过渡效果
- 清晰的错误消息

## 技术栈

- **Electron** - 桌面应用框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **CSS3** - 现代样式（包含动画和渐变）

## IPC 通信接口

### 主进程 API

```typescript
// 系统检查
await ipcRenderer.invoke('check-system-info')
// 返回: { success: boolean, platform, arch, requirements }

// 依赖检查
await ipcRenderer.invoke('check-dependencies')
// 返回: { dependencies, envVars }

// 自动安装工具
await ipcRenderer.invoke('install-tool', 'pnpm')
// 返回: { success, output/message/error }

// 安装 OpenClaw
await ipcRenderer.invoke('install-openclaw', {
  installDir: string,
  method: 'prebuilt' | 'source'
})
// 返回: { success, output/error }

// 配置渠道
await ipcRenderer.invoke('configure-channels', channels: string[])
// 返回: { success, configPath }

// 启动服务
await ipcRenderer.invoke('start-openclaw-server')
// 返回: { success, error? }

// 打开聊天窗口
await ipcRenderer.invoke('open-chat-window')
// 返回: { success, error? }

// 生成使用指南
await ipcRenderer.invoke('generate-guide', installDir: string)
// 返回: { success, guidePath }
```

## 常见问题

### Q: 安装过程中如何查看日志？
A: 在开发模式下，按 F12 打开开发者工具查看控制台输出。

### Q: 支持自动化安装吗？
A: 目前支持交互式安装。如需自动化，可修改第四步跳过某些确认。

### Q: 能否改变龙虾图标？
A: 可以，将新的 PNG 图标放在 `assets/` 目录，更新 `main.ts` 中的图标路径。

### Q: Windows 防病毒软件报警？
A: 这是普遍现象。在签名配置中添加代码签名证书可以解决。

## 开发建议

### 添加新的安装步骤
1. 创建新的 `components/StepX.tsx` 文件
2. 在 `App.tsx` 中添加对应的条件渲染
3. 更新进度条 UI

### 自定义样式
所有样式都在 `App.css` 中，使用 CSS 变量便于维护：
```css
--primary-color: #ff6b35;
--success-color: #27ae60;
--error-color: #e74c3c;
```

### 添加新的 IPC 处理
在 `main.ts` 中使用 `ipcMain.handle()` 添加新的处理器。

## 许可证

MIT

## 相关链接

- [OpenClaw 官网](https://openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw 文档](https://docs.openclaw.ai)
- [Discord 社区](https://discord.gg/clawd)

---

**祝你使用愉快！🦞**
