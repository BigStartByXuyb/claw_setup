import path from 'path';
import fs from 'fs-extra';
import { BaseService } from '../base/BaseService';
import { ServiceResult, DependencyCheckResult, DependencyItem } from '../../types/common';
import { PathUtils } from '../../utils/path';
import { execAsync } from '../../utils/exec';

/** Node.js 最低版本要求 */
const NODE_MIN_VERSION = { major: 22, minor: 12, patch: 0 };

/** 必需工具列表 */
const REQUIRED_TOOLS = ['node', 'npm', 'git', 'pnpm'];

/** 可选工具列表 */
const OPTIONAL_TOOLS = [
  { name: 'python',         cmd: 'python --version',        description: '用于 Python 技能和脚本执行' },
  { name: 'python3',        cmd: 'python3 --version',       description: '用于 Python 技能和脚本执行' },
  { name: 'docker',         cmd: 'docker --version',        description: '用于容器化部署和沙箱环境' },
  { name: 'docker-compose', cmd: 'docker-compose --version',description: '用于多容器应用编排' },
  { name: 'ffmpeg',         cmd: 'ffmpeg -version',         description: '用于音视频处理功能' },
  { name: 'magick',         cmd: 'magick --version',        description: '用于图像处理功能 (ImageMagick)' },
];

/** 必要的环境变量 */
const REQUIRED_ENV_VARS = ['PATH', 'USERPROFILE', 'TEMP'];

/**
 * 依赖检查服务
 *
 * 检查 OpenClaw 运行所需的系统依赖：
 * - 必需工具：node (>=22.12.0)、npm、git、pnpm
 * - 可选工具：python、docker 等
 * - 环境变量：PATH、USERPROFILE、TEMP
 *
 * 支持测试模式（OPENCLAW_TEST_MODE=1），在测试目录下检查工具
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class DependencyChecker extends BaseService {
  protected readonly serviceName = 'DependencyChecker';

  /**
   * 检查所有依赖项
   *
   * @returns 完整的依赖检查结果
   */
  async checkAll(): Promise<ServiceResult<DependencyCheckResult>> {
    return this.execute('检查依赖', async () => {
      const isTestMode = process.env.OPENCLAW_TEST_MODE === '1';

      if (isTestMode) {
        return await this.checkTestMode();
      }

      const [required, optional, envVars] = await Promise.all([
        this.checkRequiredTools(),
        this.checkOptionalTools(),
        this.checkEnvVars(),
      ]);

      return { required, optional, envVars };
    });
  }

  /**
   * 测试模式下的依赖检查
   *
   * 在测试目录（C:\openclaw-test）下检查工具
   */
  private async checkTestMode(): Promise<DependencyCheckResult> {
    const testDir = 'C:\\openclaw-test';
    console.log(`[DependencyChecker] 测试模式：检测目录 ${testDir}`);

    // 测试目录下的工具路径映射
    const testToolPaths: Record<string, string[]> = {
      node: [path.join(testDir, 'nodejs', 'node.exe')],
      npm:  [path.join(testDir, 'nodejs', 'npm.cmd')],
      git:  [path.join(testDir, 'git', 'bin', 'git.exe')],
      pnpm: [
        path.join(testDir, 'pnpm', 'pnpm.cmd'),
        path.join(testDir, 'pnpm', 'bin', 'pnpm.cmd'),
        path.join(testDir, 'pnpm', 'pnpm'),
      ],
    };

    const required: Record<string, DependencyItem> = {};

    for (const tool of REQUIRED_TOOLS) {
      const paths = testToolPaths[tool] || [];
      let found = false;

      for (const p of paths) {
        if (await fs.pathExists(p)) {
          try {
            const { stdout } = await execAsync(`"${p}" --version`);
            required[tool] = { name: tool, installed: true, version: stdout.trim(), path: p };
          } catch {
            required[tool] = { name: tool, installed: true, path: p };
          }
          found = true;
          break;
        }
      }

      if (!found) {
        required[tool] = { name: tool, installed: false };
      }
    }

    // 测试模式下可选工具不检查，直接标记为未安装
    const optional: Record<string, DependencyItem> = {};
    for (const tool of OPTIONAL_TOOLS) {
      optional[tool.name] = { name: tool.name, installed: false };
    }

    const envVars = await this.checkEnvVars();
    return { required: Object.values(required), optional: Object.values(optional), envVars };
  }

  /**
   * 检查必需工具
   *
   * @returns 必需工具的检查结果
   */
  private async checkRequiredTools(): Promise<DependencyItem[]> {
    const results: DependencyItem[] = [];

    for (const tool of REQUIRED_TOOLS) {
      const item = await this.checkSingleTool(tool);
      results.push(item);
    }

    return results;
  }

  /**
   * 检查单个必需工具
   *
   * @param tool 工具名称
   * @returns 工具检查结果
   */
  private async checkSingleTool(tool: string): Promise<DependencyItem> {
    try {
      const { stdout } = await execAsync(`${tool} --version`);
      const version = stdout.trim();

      // Node.js 需要额外验证版本
      if (tool === 'node') {
        return this.validateNodeVersion(version, await this.getToolPath(tool));
      }

      return {
        name: tool,
        installed: true,
        version,
        path: await this.getToolPath(tool),
      };
    } catch {
      // PATH 中找不到，尝试已知安装路径（仅 Windows）
      if (PathUtils.isWindows() && (tool === 'node' || tool === 'npm')) {
        return await this.checkToolInKnownPaths(tool);
      }
      return { name: tool, installed: false };
    }
  }

  /**
   * 验证 Node.js 版本是否满足最低要求
   *
   * @param version 版本字符串
   * @param toolPath 工具路径
   * @returns 工具检查结果
   */
  private validateNodeVersion(version: string, toolPath: string): DependencyItem {
    const match = version.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return { name: 'node', installed: false, version, error: '无法解析版本号' };
    }

    const [, major, minor, patch] = match.map(Number);
    const current = major * 10000 + minor * 100 + patch;
    const required = NODE_MIN_VERSION.major * 10000 + NODE_MIN_VERSION.minor * 100 + NODE_MIN_VERSION.patch;
    const reqStr = `${NODE_MIN_VERSION.major}.${NODE_MIN_VERSION.minor}.${NODE_MIN_VERSION.patch}`;

    if (current >= required) {
      return { name: 'node', installed: true, version, path: toolPath };
    }

    return {
      name: 'node',
      installed: false,
      version,
      path: toolPath,
      error: `版本 ${version} 低于要求的 ${reqStr}，请升级`,
    };
  }

  /**
   * 在已知安装路径中查找工具（Windows 专用）
   *
   * 当工具未加入 PATH 时，尝试在常见安装位置查找
   *
   * @param tool 工具名称
   * @returns 工具检查结果
   */
  private async checkToolInKnownPaths(tool: string): Promise<DependencyItem> {
    const userHome = PathUtils.getUserHome();
    const exe = tool === 'node' ? 'node.exe' : 'npm.cmd';

    const knownPaths = [
      path.join(userHome, 'AppData', 'Local', 'openclaw', 'nodejs', exe),
      path.join('C:\\Program Files\\openclaw\\nodejs', exe),
    ];

    for (const toolPath of knownPaths) {
      if (!await fs.pathExists(toolPath)) continue;

      try {
        const { stdout } = await execAsync(`"${toolPath}" --version`);
        const version = stdout.trim();

        if (tool === 'node') {
          const result = this.validateNodeVersion(version, toolPath);
          if (result.installed) {
            return { ...result, error: '已安装但未在 PATH 中，请重启终端或电脑' };
          }
        } else {
          return {
            name: tool,
            installed: true,
            version,
            path: toolPath,
            error: '已安装但未在 PATH 中，请重启终端或电脑',
          };
        }
      } catch { /* 继续下一个路径 */ }
    }

    return { name: tool, installed: false };
  }

  /**
   * 检查可选工具
   *
   * @returns 可选工具的检查结果
   */
  private async checkOptionalTools(): Promise<DependencyItem[]> {
    const results = await Promise.all(
      OPTIONAL_TOOLS.map(async (tool) => {
        try {
          const { stdout } = await execAsync(tool.cmd);
          const versionMatch = stdout.match(/[\d.]+/);
          return {
            name: tool.name,
            installed: true,
            version: versionMatch ? versionMatch[0] : stdout.split('\n')[0].trim(),
            path: await this.getToolPath(tool.name),
          } as DependencyItem;
        } catch {
          return { name: tool.name, installed: false } as DependencyItem;
        }
      })
    );
    return results;
  }

  /**
   * 检查环境变量
   *
   * @returns 环境变量状态
   */
  private async checkEnvVars(): Promise<Record<string, string>> {
    const envVars: Record<string, string> = {};
    for (const varName of REQUIRED_ENV_VARS) {
      envVars[varName] = process.env[varName] || '';
    }
    return envVars;
  }

  /**
   * 获取工具的可执行文件路径
   *
   * @param tool 工具名称
   * @returns 路径字符串
   */
  private async getToolPath(tool: string): Promise<string> {
    try {
      // Windows 使用 where，Unix 使用 which
      const cmd = PathUtils.isWindows() ? `where ${tool}` : `which ${tool}`;
      const { stdout } = await execAsync(cmd);
      return stdout.trim().split('\n')[0];
    } catch {
      return '';
    }
  }
}

// 导出单例
export const dependencyChecker = new DependencyChecker();
