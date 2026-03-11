import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DependencyChecker } from './DependencyChecker';

vi.mock('../../utils/path', () => ({
  PathUtils: {
    isWindows:   () => true,
    getUserHome: () => 'C:\\Users\\test',
  },
}));

const { mockExecAsync, mockFs } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
  mockFs: { pathExists: vi.fn() },
}));

vi.mock('../../utils/exec', () => ({ execAsync: mockExecAsync }));
vi.mock('fs-extra', () => ({ default: mockFs }));

/**
 * DependencyChecker 单元测试
 */
describe('DependencyChecker', () => {
  let checker: DependencyChecker;

  beforeEach(() => {
    checker = new DependencyChecker();
    vi.clearAllMocks();
    // 默认非测试模式
    delete process.env.OPENCLAW_TEST_MODE;
  });

  // ==================== checkAll ====================

  describe('checkAll（正常模式）', () => {
    it('所有工具已安装时，应返回正确结果', async () => {
      // Mock 所有工具的版本查询
      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('node --version')) return { stdout: 'v22.12.0\n' };
        if (cmd.includes('npm --version')) return { stdout: '10.0.0\n' };
        if (cmd.includes('git --version')) return { stdout: 'git version 2.40.0\n' };
        if (cmd.includes('pnpm --version')) return { stdout: '8.0.0\n' };
        if (cmd.includes('where')) return { stdout: 'C:\\path\\to\\tool\n' };
        // 可选工具全部失败（未安装）
        throw new Error('not found');
      });

      const result = await checker.checkAll();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const required = result.data!.required;
      const nodeItem = required.find(item => item.name === 'node');
      const npmItem  = required.find(item => item.name === 'npm');

      expect(nodeItem?.installed).toBe(true);
      expect(nodeItem?.version).toBe('v22.12.0');
      expect(npmItem?.installed).toBe(true);
    });

    it('Node.js 版本过低时，应标记为未安装', async () => {
      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('node --version')) return { stdout: 'v18.0.0\n' };
        if (cmd.includes('where')) return { stdout: 'C:\\path\\node\n' };
        throw new Error('not found');
      });

      const result = await checker.checkAll();

      expect(result.success).toBe(true);
      const nodeItem = result.data!.required.find(item => item.name === 'node');
      expect(nodeItem?.installed).toBe(false);
      expect(nodeItem?.error).toContain('低于要求');
    });

    it('工具未安装时，应标记为 installed: false', async () => {
      // 所有工具查询都失败
      mockExecAsync.mockRejectedValue(new Error('not found'));
      mockFs.pathExists.mockResolvedValue(false);

      const result = await checker.checkAll();

      expect(result.success).toBe(true);
      const nodeItem = result.data!.required.find(item => item.name === 'node');
      expect(nodeItem?.installed).toBe(false);
    });
  });

  // ==================== 测试模式 ====================

  describe('checkAll（测试模式）', () => {
    beforeEach(() => {
      process.env.OPENCLAW_TEST_MODE = '1';
    });

    it('测试模式下应在测试目录查找工具', async () => {
      // node 存在于测试目录
      mockFs.pathExists.mockImplementation(async (p: string) => {
        return p.includes('C:\\openclaw-test');
      });
      mockExecAsync.mockResolvedValue({ stdout: 'v22.12.0\n' });

      const result = await checker.checkAll();

      expect(result.success).toBe(true);
      expect(result.data?.required.find(i => i.name === 'node')?.installed).toBe(true);
    });

    it('测试模式下工具不存在时应标记为未安装', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await checker.checkAll();

      expect(result.success).toBe(true);
      expect(result.data?.required.find(i => i.name === 'node')?.installed).toBe(false);
    });
  });
});
