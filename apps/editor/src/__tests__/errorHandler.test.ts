/* eslint-disable @typescript-eslint/unbound-method -- 断言 mock 方法调用需引用方法本身，非真实 this 绑定场景 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { App } from 'vue';

vi.mock('../utils/toast', () => ({ toast: vi.fn() }));
vi.mock('../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { setupGlobalErrorHandlers } from '../utils/errorHandler';
import { toast } from '../utils/toast';
import { logger } from '../utils/logger';

// 取回被 mock 的 logger，简化断言书写
const loggerMock = vi.mocked(logger);

type VueErrorHandler = (err: unknown, instance: unknown, info: string) => void;

describe('setupGlobalErrorHandlers', () => {
  let app: { config: { errorHandler?: VueErrorHandler } };

  beforeAll(() => {
    app = { config: {} };
    setupGlobalErrorHandlers(app as unknown as App);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Vue 组件异常应记录日志并提示用户', () => {
    const error = new Error('boom');

    app.config.errorHandler?.(error, { $options: { name: 'MyComp' } }, 'render');

    expect(loggerMock.error).toHaveBeenCalledWith('Vue', '组件异常', error);
    expect(loggerMock.error).toHaveBeenCalledWith('Vue', 'Component: MyComp');
    expect(loggerMock.error).toHaveBeenCalledWith('Vue', 'Info: render');
    expect(toast).toHaveBeenCalledWith('页面出现异常，请刷新重试', 'error');
  });

  it('无法获取组件名时应回退为 <anonymous>', () => {
    app.config.errorHandler?.(new Error('x'), { $options: {} }, 'setup');

    expect(loggerMock.error).toHaveBeenCalledWith('Vue', 'Component: <anonymous>');
  });

  it('未处理的 Promise rejection 应记录并提示', () => {
    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new Error('nope');

    window.dispatchEvent(event);

    expect(loggerMock.error).toHaveBeenCalledWith('Runtime', 'Unhandled rejection', event.reason);
    expect(toast).toHaveBeenCalledWith('操作失败，请检查网络后重试', 'error');
  });

  it('未被捕获的运行时错误应记录', () => {
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'oops', filename: 'app.js', lineno: 42 }),
    );

    expect(loggerMock.error).toHaveBeenCalledWith('Runtime', 'Error at app.js:42', 'oops');
  });
});
