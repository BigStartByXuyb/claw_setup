import fs from 'fs-extra';
import { BaseService } from '../base/BaseService';
import { ServiceResult, OpenClawConfig } from '../../types/common';
import { PathUtils } from '../../utils/path';

/**
 * 配置文件管理服务
 *
 * 负责 OpenClaw 配置文件的读取、写入和管理
 * 配置文件统一保存在 ~/.openclaw/openclaw.json
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class ConfigService extends BaseService {
  protected readonly serviceName = 'ConfigService';

  /** 配置文件路径，统一从 PathUtils 获取 */
  private readonly configPath = PathUtils.getConfigFilePath();

  /**
   * 加载配置文件
   *
   * @returns 配置对象，文件不存在时返回空配置
   */
  async loadConfig(): Promise<ServiceResult<OpenClawConfig>> {
    return this.execute('加载配置', async () => {
      if (!await fs.pathExists(this.configPath)) {
        // 配置文件不存在，返回空配置（非错误）
        return {} as OpenClawConfig;
      }
      const config = await fs.readJSON(this.configPath);
      return config as OpenClawConfig;
    });
  }

  /**
   * 保存配置文件
   *
   * @param config 完整的配置对象
   * @returns 保存结果
   */
  async saveConfig(config: OpenClawConfig): Promise<ServiceResult<void>> {
    return this.execute('保存配置', async () => {
      // 确保目录存在
      await fs.ensureDir(PathUtils.getOpenClawDir());
      await fs.writeJSON(this.configPath, config, { spaces: 2 });
    });
  }

  /**
   * 获取指定路径的配置值
   *
   * @param dotPath 点分隔的配置路径（如 'models.primary'）
   * @returns 配置值
   */
  async getConfigValue(dotPath: string): Promise<ServiceResult<any>> {
    return this.execute('获取配置值', async () => {
      const config = await fs.readJSON(this.configPath);
      // 按点路径逐层获取值
      return dotPath.split('.').reduce((obj, key) => obj?.[key], config);
    });
  }

  /**
   * 设置指定路径的配置值
   *
   * @param dotPath 点分隔的配置路径
   * @param value 要设置的值
   * @returns 设置结果
   */
  async setConfigValue(dotPath: string, value: any): Promise<ServiceResult<void>> {
    return this.execute('设置配置值', async () => {
      // 确保目录和文件存在
      await fs.ensureDir(PathUtils.getOpenClawDir());
      let config: any = {};
      if (await fs.pathExists(this.configPath)) {
        config = await fs.readJSON(this.configPath);
      }

      // 按点路径逐层设置值
      const keys = dotPath.split('.');
      let current = config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      await fs.writeJSON(this.configPath, config, { spaces: 2 });
    });
  }

  /**
   * 删除指定路径的配置项
   *
   * @param dotPath 点分隔的配置路径
   * @returns 删除结果
   */
  async deleteConfigValue(dotPath: string): Promise<ServiceResult<void>> {
    return this.execute('删除配置项', async () => {
      if (!await fs.pathExists(this.configPath)) return;

      const config = await fs.readJSON(this.configPath);
      const keys = dotPath.split('.');
      let current = config;

      // 定位到父节点
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) return;
        current = current[keys[i]];
      }

      // 删除目标键
      delete current[keys[keys.length - 1]];
      await fs.writeJSON(this.configPath, config, { spaces: 2 });
    });
  }

  /**
   * 检查配置文件是否存在
   *
   * @returns 是否存在
   */
  async configExists(): Promise<boolean> {
    return fs.pathExists(this.configPath);
  }

  /**
   * 确保配置文件目录存在，并初始化默认配置
   *
   * @param defaults 默认配置值
   * @returns 操作结果
   */
  async ensureConfig(defaults: Partial<OpenClawConfig> = {}): Promise<ServiceResult<void>> {
    return this.execute('初始化配置', async () => {
      await fs.ensureDir(PathUtils.getOpenClawDir());

      if (!await fs.pathExists(this.configPath)) {
        await fs.writeJSON(this.configPath, defaults, { spaces: 2 });
        console.log(`[${this.serviceName}] 已创建默认配置文件: ${this.configPath}`);
      }
    });
  }

  /**
   * 修复配置中 channels 字段格式
   *
   * OpenClaw 要求 channels 为对象格式，而非数组
   * 安装后自动检查并修复
   *
   * @returns 修复结果
   */
  async fixChannelsFormat(): Promise<ServiceResult<void>> {
    return this.execute('修复频道格式', async () => {
      if (!await fs.pathExists(this.configPath)) return;

      const config = await fs.readJSON(this.configPath);

      // 如果 channels 是数组，转换为标准对象格式
      if (Array.isArray(config.channels)) {
        config.channels = this.getDefaultChannels();
        await fs.writeJSON(this.configPath, config, { spaces: 2 });
        console.log(`[${this.serviceName}] 已修复 channels 字段格式`);
      }
    });
  }

  /**
   * 获取默认频道配置
   *
   * 定义所有支持的频道及其默认值
   */
  private getDefaultChannels(): Record<string, any> {
    return {
      whatsapp:   { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist', debounceMs: 0, mediaMaxMb: 50 },
      telegram:   { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist', streaming: 'partial' },
      discord:    { enabled: false, groupPolicy: 'allowlist', streaming: 'off' },
      irc:        { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
      googlechat: { enabled: false, groupPolicy: 'allowlist', streamMode: 'replace' },
      slack:      { mode: 'socket', webhookPath: '/slack/events', enabled: false, userTokenReadOnly: true, groupPolicy: 'allowlist', streaming: 'partial', nativeStreaming: true },
      signal:     { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
      imessage:   { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
      msteams:    { enabled: false, dmPolicy: 'pairing', groupPolicy: 'allowlist' },
      feishu:     { enabled: false, dmPolicy: 'allowlist', groupPolicy: 'allowlist' },
      matrix:     { enabled: false },
      mattermost: { enabled: false },
      line:       { enabled: false },
    };
  }
}

// 导出单例
export const configService = new ConfigService();
