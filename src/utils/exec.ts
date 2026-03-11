import { exec } from 'child_process';
import { promisify } from 'util';

/**
 * 异步执行 shell 命令
 *
 * 封装 child_process.exec，提供 Promise 接口
 * 独立文件便于测试时 mock
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export const execAsync = promisify(exec);

/**
 * 执行命令并返回 stdout
 *
 * @param cmd 命令字符串
 * @param options 执行选项
 * @returns stdout 内容
 */
export async function runCommand(
  cmd: string,
  options: Parameters<typeof execAsync>[1] = {}
): Promise<string> {
  const result = await execAsync(cmd, options as any) as unknown as { stdout: string; stderr: string };
  return typeof result.stdout === 'string' ? result.stdout.trim() : '';
}
