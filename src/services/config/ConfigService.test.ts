import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from './ConfigService';

// Mock PathUtils（不依赖外部变量，可安全 hoist）
vi.mock('../../utils/path', () => ({
  PathUtils: {
    getConfigFilePath: () => '/mock/.openclaw/openclaw.json',
    getOpenClawDir:    () => '/mock/.openclaw',
    isWindows:         () => false,
  },
}));

// Mock fs-extra（使用 vi.hoisted 确保 mock 对象在 hoist 后可用）
const { mockFs } = vi.hoisted(() => ({
  mockFs: {
    pathExists: vi.fn(),
    readJSON:   vi.fn(),
    writeJSON:  vi.fn(),
    ensureDir:  vi.fn(),
  },
}));
vi.mock('fs-extra', () => ({ default: mockFs }));

/**
 * ConfigService 单元测试
 */
describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService();
    vi.clearAllMocks();
  });

  // ==================== loadConfig ====================

  describe('loadConfig', () => {
    it('配置文件存在时，应返回配置对象', async () => {
      const mockConfig = { models: { providers: {} }, channels: {} };
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockResolvedValue(mockConfig);

      const result = await service.loadConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
    });

    it('配置文件不存在时，应返回空对象（非错误）', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await service.loadConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('读取失败时，应返回错误', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockRejectedValue(new Error('读取失败'));

      const result = await service.loadConfig();

      expect(result.success).toBe(false);
      expect(result.error).toContain('加载配置失败');
    });
  });

  // ==================== saveConfig ====================

  describe('saveConfig', () => {
    it('应成功保存配置', async () => {
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.writeJSON.mockResolvedValue(undefined);

      const config = { models: { providers: {} }, channels: {} } as any;
      const result = await service.saveConfig(config);

      expect(result.success).toBe(true);
      expect(mockFs.writeJSON).toHaveBeenCalledWith(
        '/mock/.openclaw/openclaw.json',
        config,
        { spaces: 2 }
      );
    });

    it('保存失败时，应返回错误', async () => {
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.writeJSON.mockRejectedValue(new Error('磁盘写入失败'));

      const result = await service.saveConfig({} as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('保存配置失败');
    });
  });

  // ==================== setConfigValue ====================

  describe('setConfigValue', () => {
    it('应正确设置嵌套配置值', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockResolvedValue({ models: {} });
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.writeJSON.mockResolvedValue(undefined);

      const result = await service.setConfigValue('models.primary', 'gpt-4');

      expect(result.success).toBe(true);
      const written = mockFs.writeJSON.mock.calls[0][1];
      expect(written.models.primary).toBe('gpt-4');
    });

    it('配置文件不存在时，应创建新配置', async () => {
      mockFs.pathExists.mockResolvedValue(false);
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.writeJSON.mockResolvedValue(undefined);

      const result = await service.setConfigValue('gateway.port', 8080);

      expect(result.success).toBe(true);
      const written = mockFs.writeJSON.mock.calls[0][1];
      expect(written.gateway.port).toBe(8080);
    });
  });

  // ==================== deleteConfigValue ====================

  describe('deleteConfigValue', () => {
    it('应正确删除配置项', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockResolvedValue({ models: { primary: 'gpt-4', providers: {} } });
      mockFs.writeJSON.mockResolvedValue(undefined);

      const result = await service.deleteConfigValue('models.primary');

      expect(result.success).toBe(true);
      const written = mockFs.writeJSON.mock.calls[0][1];
      expect(written.models.primary).toBeUndefined();
    });

    it('配置文件不存在时，应直接返回成功', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await service.deleteConfigValue('models.primary');

      expect(result.success).toBe(true);
      expect(mockFs.writeJSON).not.toHaveBeenCalled();
    });
  });

  // ==================== configExists ====================

  describe('configExists', () => {
    it('文件存在时返回 true', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      expect(await service.configExists()).toBe(true);
    });

    it('文件不存在时返回 false', async () => {
      mockFs.pathExists.mockResolvedValue(false);
      expect(await service.configExists()).toBe(false);
    });
  });

  // ==================== fixChannelsFormat ====================

  describe('fixChannelsFormat', () => {
    it('channels 为数组时，应转换为对象格式', async () => {
      const config = { channels: ['discord', 'telegram'] };
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockResolvedValue(config);
      mockFs.writeJSON.mockResolvedValue(undefined);

      const result = await service.fixChannelsFormat();

      expect(result.success).toBe(true);
      const written = mockFs.writeJSON.mock.calls[0][1];
      expect(Array.isArray(written.channels)).toBe(false);
      expect(written.channels).toHaveProperty('discord');
    });

    it('channels 已为对象格式时，不应修改', async () => {
      const config = { channels: { discord: { enabled: true } } };
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockResolvedValue(config);

      await service.fixChannelsFormat();

      expect(mockFs.writeJSON).not.toHaveBeenCalled();
    });
  });
});
