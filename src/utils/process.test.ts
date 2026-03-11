import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessUtils } from './process';

const { mockExecAsync } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
}));

vi.mock('./exec', () => ({ execAsync: mockExecAsync }));

/**
 * ProcessUtils 单元测试
 */
describe('ProcessUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPortInUse', () => {
    it('端口被占用时应返回 true', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
      mockExecAsync.mockResolvedValue({ stdout: 'TCP  0.0.0.0:3000  LISTENING  1234\n' });

      const result = await ProcessUtils.isPortInUse(3000);
      expect(result).toBe(true);
    });

    it('命令执行失败时应返回 false', async () => {
      mockExecAsync.mockRejectedValue(new Error('command failed'));
      const result = await ProcessUtils.isPortInUse(3000);
      expect(result).toBe(false);
    });

    it('输出为空时应返回 false', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });
      const result = await ProcessUtils.isPortInUse(3000);
      expect(result).toBe(false);
    });
  });

  describe('findProcessByPort', () => {
    it('应正确解析 Windows netstat 输出中的 PID', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
      mockExecAsync.mockResolvedValue({
        stdout: 'TCP  0.0.0.0:18789  0.0.0.0:0  LISTENING  5678\n'
      });

      const pid = await ProcessUtils.findProcessByPort(18789);
      expect(pid).toBe(5678);
    });

    it('查找失败时应返回 null', async () => {
      mockExecAsync.mockRejectedValue(new Error('no process'));
      const pid = await ProcessUtils.findProcessByPort(3000);
      expect(pid).toBeNull();
    });
  });

  describe('isProcessRunning', () => {
    it('进程存在时应返回 true', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '1234 node.exe\n' });
      const result = await ProcessUtils.isProcessRunning(1234);
      expect(result).toBe(true);
    });

    it('进程不存在时应返回 false', async () => {
      mockExecAsync.mockRejectedValue(new Error('not found'));
      const result = await ProcessUtils.isProcessRunning(9999);
      expect(result).toBe(false);
    });
  });
});
