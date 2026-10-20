/**
 * 轻量级日志工具
 * - 开发环境：输出到 console
 * - 生产环境：静默（可扩展为远程上报）
 * - 统一前缀标签，方便过滤
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatMessage(tag: string, message: string): string {
  return `[${tag}] ${message}`;
}

export const logger = {
  debug(tag: string, message: string, ...data: unknown[]): void {
    if (!isDev) return;
    console.debug(formatMessage(tag, message), ...data);
  },

  info(tag: string, message: string, ...data: unknown[]): void {
    if (!isDev) return;
    console.info(formatMessage(tag, message), ...data);
  },

  warn(tag: string, message: string, ...data: unknown[]): void {
    if (!isDev) return;
    console.warn(formatMessage(tag, message), ...data);
  },

  error(tag: string, message: string, ...data: unknown[]): void {
    // error 始终输出（生产环境也需要排查问题）
    console.error(formatMessage(tag, message), ...data);
  },
};
