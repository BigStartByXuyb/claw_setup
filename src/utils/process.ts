import { ProcessError } from '../errors/AppError';
import { execAsync } from './exec';

/**
 * 进程管理工具类
 *
 * 提供进程相关的工具方法，包括端口检测、进程查找、进程终止等
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class ProcessUtils {
  /**
   * 检查端口是否被占用
   *
   * @param port 端口号
   * @returns 是否被占用
   */
  static async isPortInUse(port: number): Promise<boolean> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows: 使用 netstat 命令
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf8'
        });
        return stdout.trim().length > 0;
      } else {
        // Linux/Mac: 使用 lsof 命令
        const { stdout } = await execAsync(`lsof -i :${port}`, {
          encoding: 'utf8'
        });
        return stdout.trim().length > 0;
      }
    } catch (error) {
      // 命令执行失败通常表示端口未被占用
      return false;
    }
  }

  /**
   * 查找占用指定端口的进程 PID
   *
   * @param port 端口号
   * @returns 进程 PID，未找到返回 null
   */
  static async findProcessByPort(port: number): Promise<number | null> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows: 使用 netstat 命令
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf8'
        });

        // 解析输出，提取 PID
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(pid)) {
            return pid;
          }
        }
      } else {
        // Linux/Mac: 使用 lsof 命令
        const { stdout } = await execAsync(`lsof -ti :${port}`, {
          encoding: 'utf8'
        });

        const pid = parseInt(stdout.trim(), 10);
        if (!isNaN(pid)) {
          return pid;
        }
      }

      return null;
    } catch (error) {
      console.error(`查找端口 ${port} 的进程失败:`, error);
      return null;
    }
  }

  /**
   * 终止指定 PID 的进程
   *
   * @param pid 进程 PID
   * @throws {ProcessError} 终止失败时抛出
   */
  static async killProcess(pid: number): Promise<void> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows: 使用 taskkill 命令
        await execAsync(`taskkill /F /PID ${pid}`, {
          encoding: 'utf8'
        });
      } else {
        // Linux/Mac: 使用 kill 命令
        await execAsync(`kill -9 ${pid}`, {
          encoding: 'utf8'
        });
      }

      console.log(`成功终止进程 PID: ${pid}`);
    } catch (error) {
      throw new ProcessError('kill', `PID ${pid}`, error);
    }
  }

  /**
   * 检查进程是否正在运行
   *
   * @param pid 进程 PID
   * @returns 是否正在运行
   */
  static async isProcessRunning(pid: number): Promise<boolean> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows: 使用 tasklist 命令
        const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}"`, {
          encoding: 'utf8'
        });
        return stdout.includes(String(pid));
      } else {
        // Linux/Mac: 使用 ps 命令
        const { stdout } = await execAsync(`ps -p ${pid}`, {
          encoding: 'utf8'
        });
        return stdout.includes(String(pid));
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 根据进程名称查找进程 PID
   *
   * @param processName 进程名称
   * @returns 进程 PID 数组
   */
  static async findProcessByName(processName: string): Promise<number[]> {
    try {
      const platform = process.platform;
      const pids: number[] = [];

      if (platform === 'win32') {
        // Windows: 使用 tasklist 命令
        const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${processName}"`, {
          encoding: 'utf8'
        });

        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const match = line.match(/\s+(\d+)\s+/);
          if (match) {
            const pid = parseInt(match[1], 10);
            if (!isNaN(pid)) {
              pids.push(pid);
            }
          }
        }
      } else {
        // Linux/Mac: 使用 pgrep 命令
        const { stdout } = await execAsync(`pgrep -f ${processName}`, {
          encoding: 'utf8'
        });

        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const pid = parseInt(line.trim(), 10);
          if (!isNaN(pid)) {
            pids.push(pid);
          }
        }
      }

      return pids;
    } catch (error) {
      console.error(`查找进程 ${processName} 失败:`, error);
      return [];
    }
  }

  /**
   * 等待端口可用
   *
   * @param port 端口号
   * @param timeout 超时时间（毫秒）
   * @param interval 检查间隔（毫秒）
   * @returns 是否在超时前端口变为可用
   */
  static async waitForPortAvailable(
    port: number,
    timeout: number = 30000,
    interval: number = 1000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const inUse = await this.isPortInUse(port);
      if (!inUse) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return false;
  }

  /**
   * 等待端口被占用（进程启动完成）
   *
   * @param port 端口号
   * @param timeout 超时时间（毫秒）
   * @param interval 检查间隔（毫秒）
   * @returns 是否在超时前端口被占用
   */
  static async waitForPortInUse(
    port: number,
    timeout: number = 30000,
    interval: number = 1000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const inUse = await this.isPortInUse(port);
      if (inUse) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return false;
  }
}
