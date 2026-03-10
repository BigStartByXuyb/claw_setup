@echo off
echo ========================================
echo 完全重启 OpenClaw Installer
echo ========================================
echo.

echo [1/4] 停止所有 Node 和 Electron 进程...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] 清理缓存...
if exist node_modules\.cache rmdir /S /Q node_modules\.cache
if exist .cache rmdir /S /Q .cache

echo [3/4] 重新编译 TypeScript...
call pnpm exec tsc -p tsconfig.electron.json

echo [4/4] 启动应用...
echo.
echo ========================================
echo 应用即将启动，请等待浏览器窗口打开
echo 然后测试"打开聊天"功能
echo ========================================
echo.
call pnpm dev
