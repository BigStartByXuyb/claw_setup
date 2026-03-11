import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest 测试配置
 *
 * 测试范围：src/services、src/api、src/stores、src/utils
 * 测试环境：happy-dom（模拟浏览器环境）
 * 覆盖率：v8 provider
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export default defineConfig({
  test: {
    // 使用 happy-dom 模拟浏览器环境（React 组件测试需要）
    environment: 'happy-dom',

    // 测试初始化文件
    setupFiles: ['./src/test/setup.ts'],

    // 匹配测试文件
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
    ],

    // 排除不需要测试的目录
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'release/**',
    ],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',

      // 覆盖率收集范围（排除 stores、Electron 相关服务等难以 mock 的文件）
      include: [
        'src/services/**/*.ts',
        'src/api/**/*.ts',
        'src/utils/**/*.ts',
      ],
      exclude: [
        // Electron 主进程相关，需要 BrowserWindow/ChildProcess mock，暂不纳入
        'src/services/gateway/**',
        'src/services/install/**',
        'src/services/system/**',
        'src/services/base/**',
        // Zustand stores，依赖前端 API mock，暂不纳入
        'src/stores/**',
        // 类型和常量文件
        'src/**/*.d.ts',
      ],

      // 覆盖率目标（随测试不断完善逐步提升）
      // 当前阶段：ConfigService 80%+, DependencyChecker 85%+, configAPI 61%+
      // 目标阶段：所有服务 > 80%，API 层 > 70%
      thresholds: {
        lines: 30,
        functions: 25,
        branches: 20,
        statements: 30,
      },
    },

    // 全局变量（避免在每个测试文件中重复导入）
    globals: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
