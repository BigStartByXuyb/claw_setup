/**
 * 剪贴板工具类
 *
 * 提供剪贴板操作的工具方法
 *
 * @author OpenClaw Team
 * @since 1.0.0
 */
export class ClipboardUtils {
  /**
   * 复制文本到剪贴板
   *
   * @param text 要复制的文本
   * @returns 是否成功
   */
  static async copyText(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // 降级方案：使用 execCommand
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      }
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      return false;
    }
  }

  /**
   * 从剪贴板读取文本
   *
   * @returns 剪贴板中的文本，失败返回 null
   */
  static async readText(): Promise<string | null> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
      return null;
    } catch (error) {
      console.error('从剪贴板读取失败:', error);
      return null;
    }
  }

  /**
   * 复制错误信息到剪贴板
   *
   * 格式化错误信息，包含时间戳和堆栈信息
   *
   * @param error 错误对象
   * @param context 错误上下文描述
   * @returns 是否成功
   */
  static async copyError(error: Error, context?: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const errorText = [
      `错误时间: ${timestamp}`,
      context ? `错误上下文: ${context}` : '',
      `错误消息: ${error.message}`,
      '',
      '堆栈信息:',
      error.stack || '无堆栈信息'
    ].filter(Boolean).join('\n');

    return await this.copyText(errorText);
  }

  /**
   * 复制对象为 JSON 格式
   *
   * @param obj 要复制的对象
   * @param pretty 是否格式化输出
   * @returns 是否成功
   */
  static async copyJSON(obj: any, pretty: boolean = true): Promise<boolean> {
    try {
      const json = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
      return await this.copyText(json);
    } catch (error) {
      console.error('复制 JSON 失败:', error);
      return false;
    }
  }
}
