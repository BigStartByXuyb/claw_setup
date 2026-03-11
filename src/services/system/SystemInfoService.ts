import os from 'os';
import { BaseService } from '../base/BaseService';
import { ServiceResult, SystemInfo } from '../../types/common';
import { PathUtils } from '../../utils/path';

/**
 * 系统信息服务
 *
 * 检查运行环境是否满足 OpenClaw 安装要求：
 * - 操作系统：Windows（后续可扩展支持 macOS / Linux）
 * - 系统架构：64 位
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class SystemInfoService extends BaseService {
  protected readonly serviceName = 'SystemInfoService';

  /**
   * 获取系统信息并检查是否满足安装要求
   *
   * @returns 系统信息对象
   */
  async getSystemInfo(): Promise<ServiceResult<SystemInfo>> {
    return this.execute('获取系统信息', async () => {
      const platform = os.platform();
      const arch = os.arch();
      const osVersion = os.release();

      const isWindows = platform === 'win32';
      const is64Bit = arch === 'x64' || arch === 'arm64';

      return {
        platform,
        arch,
        osVersion,
        isWindows,
        is64Bit,
      };
    });
  }

  /**
   * 检查系统是否满足安装要求
   *
   * 当前要求：Windows 64 位
   * 后续扩展：macOS、Linux 支持
   *
   * @returns 是否满足要求
   */
  async checkRequirements(): Promise<ServiceResult<{ met: boolean; reasons: string[] }>> {
    return this.execute('检查系统要求', async () => {
      const infoResult = await this.getSystemInfo();
      if (!infoResult.success || !infoResult.data) {
        return { met: false, reasons: ['无法获取系统信息'] };
      }

      const { isWindows, is64Bit } = infoResult.data;
      const reasons: string[] = [];

      if (!isWindows) {
        reasons.push(`当前系统 ${PathUtils.getPlatform()} 暂不支持，请使用 Windows`);
      }
      if (!is64Bit) {
        reasons.push('需要 64 位操作系统');
      }

      return { met: reasons.length === 0, reasons };
    });
  }
}

// 导出单例
export const systemInfoService = new SystemInfoService();
