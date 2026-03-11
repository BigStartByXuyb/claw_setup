import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { BaseService } from '../base/BaseService';
import { ServiceResult, InstallResult } from '../../types/common';
import { PathUtils } from '../../utils/path';
import { execAsync } from '../../utils/exec';

/** Node.js 安装版本 */
const NODE_VERSION = '22.12.0';

/**
 * 工具安装服务
 *
 * 支持自动安装的工具：
 * - pnpm：通过 npm install -g 安装
 * - node：通过下载 MSI 安装（仅 Windows）
 *
 * 使用安装锁防止并发安装同一工具
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class ToolInstaller extends BaseService {
  protected readonly serviceName = 'ToolInstaller';

  /** 安装锁：防止同一工具并发安装 */
  private readonly installLocks = new Map<string, boolean>();

  /**
   * 安装指定工具
   *
   * @param tool 工具名称（'pnpm' | 'node'）
   * @returns 安装结果
   */
  async install(tool: string): Promise<ServiceResult<InstallResult>> {
    // 检查安装锁
    if (this.installLocks.get(tool)) {
      return this.success({ success: false, installing: true });
    }

    this.installLocks.set(tool, true);

    try {
      if (tool === 'pnpm') return await this.installPnpm();
      if (tool === 'node') return await this.installNode();
      if (tool === 'git') {
        return this.success<InstallResult>({ success: false, error: '请从 https://git-scm.com/ 下载安装 Git' });
      }
      return this.error(`不支持自动安装工具: ${tool}`) as ServiceResult<InstallResult>;
    } finally {
      this.installLocks.delete(tool);
    }
  }

  /**
   * 检查工具是否已安装且版本满足要求
   *
   * @param tool 工具名称
   * @returns 是否已安装
   */
  async isInstalled(tool: string): Promise<boolean> {
    try {
      const isTestMode = process.env.OPENCLAW_TEST_MODE === '1';
      if (isTestMode) return false; // 测试模式下强制重新安装

      const { stdout } = await execAsync(`${tool} --version`);
      if (tool === 'node') {
        return this.isNodeVersionSatisfied(stdout.trim());
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 安装 pnpm
   *
   * 测试模式下安装到测试目录，正常模式全局安装
   */
  private async installPnpm(): Promise<ServiceResult<InstallResult>> {
    return this.execute<InstallResult>('安装 pnpm', async () => {
      const isTestMode = process.env.OPENCLAW_TEST_MODE === '1';

      if (isTestMode) {
        // 测试模式：安装到测试目录
        const testDir = 'C:\\openclaw-test\\pnpm';
        await fs.ensureDir(testDir);
        await execAsync(`npm install -g --prefix "${testDir}" pnpm@latest`, {
          encoding: 'utf8',
          env: { ...process.env, LANG: 'en_US.UTF-8' }
        });
        return { success: true };
      }

      // 正常模式：全局安装
      // 使用 chcp 65001 确保 UTF-8 编码，避免 Windows 乱码
      const cmd = PathUtils.byPlatform({
        windows: 'chcp 65001 >nul && npm install -g pnpm@latest',
        default: 'npm install -g pnpm@latest',
      });

      const shellOpts = PathUtils.isWindows()
        ? { shell: 'cmd.exe' as const }
        : {};

      await execAsync(cmd, {
        encoding: 'utf8',
        ...shellOpts,
        env: { ...process.env, LANG: 'en_US.UTF-8' }
      });

      return { success: true };
    });
  }

  /**
   * 安装 Node.js
   *
   * Windows：下载并静默安装 MSI
   * 其他平台：提示手动安装
   */
  private async installNode(): Promise<ServiceResult<InstallResult>> {
    if (!PathUtils.isWindows()) {
      return this.success<InstallResult>({
        success: false,
        error: `请访问 https://nodejs.org/ 下载 Node.js ${NODE_VERSION} 或更高版本`,
      });
    }

    return this.execute<InstallResult>('安装 Node.js', async () => {
      const arch = os.arch() === 'x64' ? 'x64' : 'x86';
      const msiUrl = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${arch}.msi`;
      const tempDir = PathUtils.getTempDir();
      const installerPath = path.join(tempDir, `node-v${NODE_VERSION}-${arch}.msi`);

      await fs.ensureDir(tempDir);

      // 下载 MSI 安装包
      console.log(`[ToolInstaller] 下载 Node.js ${NODE_VERSION}...`);
      await this.downloadFile(msiUrl, installerPath);

      // 静默安装
      console.log('[ToolInstaller] 开始静默安装 Node.js...');
      await execAsync(`msiexec /i "${installerPath}" /quiet /norestart`, {
        timeout: 300000 // 5 分钟超时
      });

      // 清理临时文件
      await fs.remove(installerPath).catch(() => {});

      console.log('[ToolInstaller] Node.js 安装完成');
      return { success: true };
    });
  }

  /**
   * 下载文件（支持 HTTP 重定向）
   *
   * @param url 下载地址
   * @param destPath 保存路径
   */
  private downloadFile(url: string, destPath: string): Promise<void> {
    const https = require('https');
    const fsModule = require('fs');

    return new Promise((resolve, reject) => {
      const file = fsModule.createWriteStream(destPath);

      const handleResponse = (response: any) => {
        // 处理重定向
        if (response.statusCode === 301 || response.statusCode === 302) {
          https.get(response.headers.location, handleResponse).on('error', reject);
          return;
        }
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      };

      https.get(url, handleResponse).on('error', reject);
    });
  }

  /**
   * 检查 Node.js 版本是否满足要求（>=22.12.0）
   *
   * @param version 版本字符串
   * @returns 是否满足
   */
  private isNodeVersionSatisfied(version: string): boolean {
    const match = version.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (!match) return false;

    const [, major, minor, patch] = match.map(Number);
    const current = major * 10000 + minor * 100 + patch;
    const required = 22 * 10000 + 12 * 100 + 0;
    return current >= required;
  }
}

// 导出单例
export const toolInstaller = new ToolInstaller();
