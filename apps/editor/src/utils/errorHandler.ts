import type { App } from 'vue';
import { toast } from './toast';
import { logger } from './logger';

/**
 * 全局错误处理器
 * 捕获 Vue 组件树内的未处理异常，防止白屏
 */
export function setupGlobalErrorHandlers(app: App): void {
  // Vue 组件渲染/生命周期/事件处理中的错误
  app.config.errorHandler = (err, instance, info) => {
    logger.error('Vue', '组件异常', err);
    logger.error('Vue', `Component: ${instance?.$options?.name || instance?.$options?.__name || '<anonymous>'}`);
    logger.error('Vue', `Info: ${info}`);

    toast('页面出现异常，请刷新重试', 'error');
  };

  // 未处理的 Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Runtime', 'Unhandled rejection', event.reason);
    toast('操作失败，请检查网络后重试', 'error');
  });

  // 未被 catch 的运行时错误（兜底）
  window.addEventListener('error', (event) => {
    logger.error('Runtime', `Error at ${event.filename}:${event.lineno}`, event.message);
  });
}
