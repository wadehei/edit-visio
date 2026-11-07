import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { App } from 'vue';
import { logger } from '../utils/logger';
import { setupGlobalErrorHandlers } from '../utils/errorHandler';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('error 始终输出带标签前缀的日志', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('API', 'boom', { code: 1 });

    expect(spy).toHaveBeenCalledWith('[API] boom', { code: 1 });
  });

  it('debug / info / warn 仅在开发环境输出', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expected = import.meta.env.DEV ? 1 : 0;

    logger.debug('T', 'd');
    logger.info('T', 'i');
    logger.warn('T', 'w');

    expect(debugSpy).toHaveBeenCalledTimes(expected);
    expect(infoSpy).toHaveBeenCalledTimes(expected);
    expect(warnSpy).toHaveBeenCalledTimes(expected);
  });

  it('开发环境下 debug / info / warn 输出到 console', async () => {
    vi.stubEnv('DEV', true);
    vi.resetModules();
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { logger: devLogger } = await import('../utils/logger');

    devLogger.debug('T', 'd');
    devLogger.info('T', 'i');
    devLogger.warn('T', 'w');

    expect(debugSpy).toHaveBeenCalledWith('[T] d');
    expect(infoSpy).toHaveBeenCalledWith('[T] i');
    expect(warnSpy).toHaveBeenCalledWith('[T] w');
  });

  it('非开发环境下 debug / info / warn 直接返回不输出', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { logger: prodLogger } = await import('../utils/logger');

    prodLogger.debug('T', 'd');
    prodLogger.info('T', 'i');
    prodLogger.warn('T', 'w');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('toast', () => {
  // 每次用例重新加载模块，隔离模块级 toastContainer 单例状态
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function importToast() {
    const mod = await import('../utils/toast');
    return mod.toast;
  }

  it('应把消息渲染进容器并带上类型样式', async () => {
    const toast = await importToast();

    toast('操作成功', 'success');

    const container = document.body.querySelector<HTMLDivElement>('div.fixed');
    expect(container).not.toBeNull();
    const el = container!.firstElementChild as HTMLDivElement;
    expect(el.textContent).toBe('操作成功');
    expect(el.className).toContain('bg-green-500');
  });

  it('默认类型为 info，默认时长 3000ms 后移除并销毁空容器', async () => {
    const toast = await importToast();

    toast('提示');

    const el = document.body.querySelector('div.fixed')!.firstElementChild as HTMLDivElement;
    expect(el.className).toContain('bg-blue-500');

    vi.advanceTimersByTime(2999);
    expect(document.body.querySelector('div.fixed')).not.toBeNull();

    vi.advanceTimersByTime(1);
    // 退出动画期间元素仍在，容器尚未销毁
    expect(document.body.textContent).toContain('提示');

    vi.advanceTimersByTime(300);
    expect(document.body.querySelector('div.fixed')).toBeNull();
  });

  it('多个 toast 复用同一容器', async () => {
    const toast = await importToast();

    toast('一');
    toast('二');

    const containers = document.body.querySelectorAll('div.fixed');
    expect(containers).toHaveLength(1);
    expect(containers[0].childElementCount).toBe(2);
  });

  it('自定义时长生效，且容器尚有内容时不被销毁', async () => {
    const toast = await importToast();

    toast('短', 'info', 1000);
    toast('长', 'info', 5000);

    // 短时长先到期并移除，但容器内仍有第二个 toast，容器保留
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(300);
    const container = document.body.querySelector<HTMLDivElement>('div.fixed');
    expect(container).not.toBeNull();
    expect(container!.childElementCount).toBe(1);

    // 第二个到期后容器清空并销毁
    vi.advanceTimersByTime(4000);
    vi.advanceTimersByTime(300);
    expect(document.body.querySelector('div.fixed')).toBeNull();
  });

  it('error 类型使用红色样式', async () => {
    const toast = await importToast();

    toast('出错', 'error');

    const el = document.body.querySelector('div.fixed')!.firstElementChild as HTMLDivElement;
    expect(el.className).toContain('bg-red-500');
  });

  it('warning 类型使用黄色样式', async () => {
    const toast = await importToast();

    toast('警告', 'warning');

    const el = document.body.querySelector('div.fixed')!.firstElementChild as HTMLDivElement;
    expect(el.className).toContain('bg-yellow-500');
  });

  it('入场动画：执行 requestAnimationFrame 回调后切换入场类名', async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const toast = await importToast();

    toast('动画', 'success');

    const el = document.body.querySelector('div.fixed')!.firstElementChild as HTMLDivElement;
    // 初始态：处于屏幕外且透明
    expect(el.classList.contains('translate-x-full')).toBe(true);
    expect(el.classList.contains('opacity-0')).toBe(true);
    expect(el.classList.contains('translate-x-0')).toBe(false);
    expect(rafCallbacks).toHaveLength(1);

    rafCallbacks.forEach((cb) => cb(0));

    // 回调执行后应移除入场初始类并添加入场终态类
    expect(el.classList.contains('translate-x-full')).toBe(false);
    expect(el.classList.contains('opacity-0')).toBe(false);
    expect(el.classList.contains('translate-x-0')).toBe(true);
    expect(el.classList.contains('opacity-100')).toBe(true);
  });
});

describe('errorHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function installHandler() {
    const app: {
      config: { errorHandler?: (err: unknown, instance: unknown, info: string) => void };
    } = { config: {} };
    setupGlobalErrorHandlers(app as unknown as App);
    return app;
  }

  it('instance 为 null 时组件名回退为 <anonymous> 且不抛错', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = installHandler();

    expect(() => app.config.errorHandler?.(new Error('x'), null, 'render')).not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith('[Vue] Component: <anonymous>');
  });

  it('instance 缺少 $options 时组件名回退为 <anonymous> 且不抛错', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = installHandler();

    expect(() => app.config.errorHandler?.(new Error('x'), {}, 'setup')).not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith('[Vue] Component: <anonymous>');
  });

  it('注册 unhandledrejection 监听器，事件触发时记录原因', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    installHandler();
    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new Error('nope');

    window.dispatchEvent(event);

    expect(errorSpy).toHaveBeenCalledWith('[Runtime] Unhandled rejection', event.reason);
  });

  it('注册 error 监听器，事件触发时记录位置与信息', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    installHandler();

    window.dispatchEvent(
      new ErrorEvent('error', { message: 'oops', filename: 'app.js', lineno: 42 }),
    );

    expect(errorSpy).toHaveBeenCalledWith('[Runtime] Error at app.js:42', 'oops');
  });
});
