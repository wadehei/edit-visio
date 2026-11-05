import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { logger } from '../utils/logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
