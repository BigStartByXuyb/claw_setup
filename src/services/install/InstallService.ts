import fs from 'fs-extra';
import path from 'path';
import { BaseService } from '../base/BaseService';
import { ServiceResult } from '../../types/common';
import { PathUtils } from '../../utils/path';
import { execAsync } from '../../utils/exec';
import { configService } from '../config/ConfigService';

/** 默认频道配置 */
const DEFAULT_CHANNELS: Record<string, any> = {
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

/**
 * OpenClaw 安装服务
 *
 * 负责 OpenClaw 的安装流程：
 * - prebuilt：通过 npm install -g openclaw 安装预编译版本
 * - source：从 GitHub 克隆源码，本地构建
 *
 * 安装后自动修复配置文件格式
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class InstallService extends BaseService {
  protected readonly serviceName = 'InstallService';

  /**
   * 安装 OpenClaw
   *
   * @param method 安装方式：'prebuilt' 或 'source'
   * @param installDir 安装目录（source 模式下使用）
   * @returns 安装结果
   */
  async install(method: 'prebuilt' | 'source', installDir?: string): Promise<ServiceResult<void>> {
    return this.execute(`安装 OpenClaw (${method})`, async () => {
      if (method === 'prebuilt') {
        await this.installPrebuilt();
      } else {
        await this.installFromSource(installDir || PathUtils.getUserHome());
      }

      // 安装后修复配置文件
      await configService.fixChannelsFormat();
    });
  }

  /**
   * 配置频道
   *
   * 根据用户选择的频道列表，更新配置文件中的 channels 字段
   *
   * @param selectedChannels 用户选择启用的频道列表
   * @returns 配置结果
   */
  async configureChannels(selectedChannels: string[]): Promise<ServiceResult<void>> {
    return this.execute('配置频道', async () => {
      // 加载现有配置
      const loadResult = await configService.loadConfig();
      const config = loadResult.data || ({} as any);

      // 基于默认频道配置，启用用户选择的频道
      const channels = { ...DEFAULT_CHANNELS };
      for (const channel of selectedChannels) {
        if (channels[channel]) {
          channels[channel] = { ...channels[channel], enabled: true };
        }
      }

      config.channels = channels;
      config.meta = config.meta || {};
      config.meta.lastTouchedAt = new Date().toISOString();

      await configService.saveConfig(config);
    });
  }

  /**
   * 检查 OpenClaw 是否已安装
   *
   * @returns 安装状态和版本信息
   */
  async checkInstalled(): Promise<ServiceResult<{ installed: boolean; version?: string }>> {
    return this.execute('检查安装状态', async () => {
      try {
        // 使用 where/which 检查是否在 PATH 中
        const cmd = PathUtils.isWindows() ? 'where openclaw' : 'which openclaw';
        await execAsync(cmd);
        const { stdout } = await execAsync('openclaw --version');
        return { installed: true, version: stdout.trim() };
      } catch {
        return { installed: false };
      }
    });
  }

  /**
   * 生成使用指南
   *
   * @param outputDir 输出目录
   * @returns 生成的文件路径
   */
  async generateGuide(outputDir?: string): Promise<ServiceResult<string>> {
    return this.execute('生成使用指南', async () => {
      const guideContent = [
        '# OpenClaw 使用指南',
        '',
        '## 安装完成！',
        '',
        '你已成功安装 OpenClaw。',
        '',
        '## 启动网关',
        '',
        '```bash',
        'openclaw gateway --port 18789 --verbose',
        '```',
        '',
        `**安装日期**: ${new Date().toLocaleString()}`,
        '',
      ].join('\n');

      const dir = outputDir || PathUtils.getUserHome();
      const guidePath = path.join(dir, 'OpenClaw-使用指南.md');
      await fs.writeFile(guidePath, guideContent, 'utf-8');
      return guidePath;
    });
  }

  // ==================== 私有方法 ====================

  /**
   * 安装预编译版本
   *
   * 配置 git 使用 HTTPS，避免 SSH 密钥问题，然后通过 npm 全局安装
   */
  private async installPrebuilt(): Promise<void> {
    // 配置 git 使用 HTTPS 协议，避免 SSH 密钥问题
    await this.configureGitHttps();

    console.log('[InstallService] 开始安装 openclaw@latest...');
    await execAsync('npm install -g openclaw@latest', { timeout: 600000 }); // 10 分钟超时
  }

  /**
   * 从源码安装
   *
   * 克隆仓库，安装依赖，执行构建
   *
   * @param installDir 安装目录
   */
  private async installFromSource(installDir: string): Promise<void> {
    await fs.ensureDir(installDir);

    console.log('[InstallService] 克隆 OpenClaw 仓库...');
    await execAsync(`cd "${installDir}" && git clone https://github.com/openclaw/openclaw.git`);

    console.log('[InstallService] 安装依赖...');
    await execAsync(`cd "${installDir}/openclaw" && pnpm install`);

    console.log('[InstallService] 构建项目...');
    await execAsync(`cd "${installDir}/openclaw" && pnpm ui:build && pnpm build`);
  }

  /**
   * 配置 git 使用 HTTPS 协议
   *
   * 解决某些依赖包使用 SSH URL 导致的安装失败问题
   */
  private async configureGitHttps(): Promise<void> {
    try {
      await execAsync('npm config delete git').catch(() => {});

      const gitConfigs = [
        'git config --global url."https://github.com/".insteadOf ssh://git@github.com/',
        'git config --global url."https://github.com/".insteadOf git@github.com:',
        'git config --global url."https://".insteadOf ssh://',
      ];

      for (const cmd of gitConfigs) {
        await execAsync(cmd);
      }

      console.log('[InstallService] 已配置 git 使用 HTTPS 协议');
    } catch (error) {
      console.warn('[InstallService] 配置 git HTTPS 失败（不影响安装）:', error);
    }
  }
}

// 导出单例
export const installService = new InstallService();
