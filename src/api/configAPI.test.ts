import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigAPI } from './configAPI';

/**
 * ConfigAPI 单元测试
 *
 * 验证配置 API 层的 IPC 调用封装和错误处理逻辑
 */

describe('ConfigAPI', () => {
  let api: ConfigAPI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockInvoke: any;

  beforeEach(() => {
    api = new ConfigAPI();
    mockInvoke = vi.fn();
    // 替换 window.electron.ipcRenderer.invoke
    Object.defineProperty(window, 'electron', {
      writable: true,
      value: {
        ipcRenderer: {
          invoke: mockInvoke,
          on:     vi.fn(),
          off:    vi.fn(),
          send:   vi.fn(),
        },
      },
    });
  });

  describe('loadConfig', () => {
    it('加载成功时应返回配置对象', async () => {
      const mockConfig = { gateway: { port: 18789 } };
      mockInvoke.mockResolvedValue({ success: true, config: mockConfig });

      const result = await api.loadConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(mockInvoke).toHaveBeenCalledWith('read-config');
    });

    it('加载失败时应返回错误', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: '文件不存在' });

      const result = await api.loadConfig();

      expect(result.success).toBe(false);
      expect(result.error).toBe('文件不存在');
    });

    it('IPC 抛出异常时应返回错误', async () => {
      mockInvoke.mockRejectedValue(new Error('网络错误'));

      const result = await api.loadConfig();

      expect(result.success).toBe(false);
    });
  });

  describe('setConfigValue', () => {
    it('设置成功时应返回 success:true', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      const result = await api.setConfigValue('gateway.port', 3000);

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('config-set', 'gateway.port', 3000);
    });

    it('设置失败时应返回错误', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: '写入失败' });

      const result = await api.setConfigValue('invalid.path', null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('写入失败');
    });
  });

  describe('getCurrentModel', () => {
    it('有主模型时应返回模型标识符', async () => {
      mockInvoke.mockResolvedValue({ success: true, model: 'openai/gpt-4o' });

      const result = await api.getCurrentModel();

      expect(result.success).toBe(true);
      expect(result.data).toBe('openai/gpt-4o');
    });

    it('无主模型时应返回 null', async () => {
      mockInvoke.mockResolvedValue({ success: true, model: null });

      const result = await api.getCurrentModel();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getAvailableModels', () => {
    it('应返回模型列表', async () => {
      const mockModels = [
        { provider: 'openai', model: 'gpt-4o', displayName: 'openai/gpt-4o' },
      ];
      mockInvoke.mockResolvedValue({ success: true, models: mockModels });

      const result = await api.getAvailableModels();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].displayName).toBe('openai/gpt-4o');
    });
  });

  describe('checkInstalled', () => {
    it('已安装时应返回安装状态和版本', async () => {
      mockInvoke.mockResolvedValue({ installed: true, version: '1.0.0' });

      const result = await api.checkInstalled();

      expect(result.success).toBe(true);
      expect(result.data?.installed).toBe(true);
      expect(result.data?.version).toBe('1.0.0');
    });

    it('未安装时应返回 installed:false', async () => {
      mockInvoke.mockResolvedValue({ installed: false });

      const result = await api.checkInstalled();

      expect(result.success).toBe(true);
      expect(result.data?.installed).toBe(false);
    });
  });
});
