import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import request from '../api/request';
import { useAuthStore } from '../stores/authStore';

const loggerError = vi.hoisted(() => vi.fn());
vi.mock('../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: loggerError },
}));

/** 测试用例预先编排的响应序列，adapter 按顺序消费 */
interface PlannedResponse {
  status: number;
  payload?: unknown;
}

const DEFAULT_OK: PlannedResponse = {
  status: 200,
  payload: { code: 0, data: null, message: 'ok' },
};

let planned: PlannedResponse[] = [];
/** 记录每次请求实际附加的 Authorization 头 */
let seenAuthHeaders: Array<string | undefined> = [];

function queue(...plans: PlannedResponse[]) {
  planned.push(...plans);
}

function makeResponse(config: InternalAxiosRequestConfig, plan: PlannedResponse): AxiosResponse {
  return {
    data: plan.payload,
    status: plan.status,
    statusText: String(plan.status),
    headers: {},
    config,
  };
}

/** 可控 adapter：按 planned 队列依次返回成功响应或 4xx 错误 */
const planAdapter: AxiosAdapter = (config) => {
  seenAuthHeaders.push(config.headers?.Authorization as string | undefined);
  const plan = planned.shift() ?? DEFAULT_OK;
  if (plan.status >= 400) {
    const error = new Error(`Request failed with status code ${plan.status}`) as Error & {
      config: InternalAxiosRequestConfig;
      response: AxiosResponse;
    };
    error.config = config;
    error.response = makeResponse(config, plan);
    return Promise.reject(error);
  }
  return Promise.resolve(makeResponse(config, plan));
};

describe('request 拦截器', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    planned = [];
    seenAuthHeaders = [];
    request.defaults.adapter = planAdapter;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('请求拦截器应附加 Bearer token', async () => {
    const authStore = useAuthStore();
    authStore.accessToken = 'token-abc';
    queue({ status: 200, payload: { code: 0, data: { ok: true }, message: 'ok' } });

    const res = await request.get('/ping');

    expect(res.data.data).toEqual({ ok: true });
    expect(seenAuthHeaders.at(-1)).toBe('Bearer token-abc');
  });

  it('业务 code 非 0 时应 reject 并携带 message', async () => {
    queue({ status: 200, payload: { code: 1, data: null, message: '参数错误' } });

    await expect(request.get('/x')).rejects.toThrow('参数错误');
  });

  it('业务 code 非 0 且 message 为空时使用默认文案', async () => {
    queue({ status: 200, payload: { code: 1, data: null, message: '' } });

    await expect(request.get('/x')).rejects.toThrow('请求失败');
  });

  it('401 时应刷新 token 并重放原请求', async () => {
    const authStore = useAuthStore();
    const refreshSpy = vi.spyOn(authStore, 'doRefreshToken').mockResolvedValue('new-token');
    queue(
      { status: 401, payload: { code: 401, message: 'unauthorized' } },
      { status: 200, payload: { code: 0, data: { retried: true }, message: 'ok' } },
    );

    const res = await request.get('/secure');

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(res.data.data).toEqual({ retried: true });
    expect(seenAuthHeaders.at(-1)).toBe('Bearer new-token');
  });

  it('并发 401 只触发一次刷新，其余请求排队复用新 token', async () => {
    const authStore = useAuthStore();
    let resolveRefresh: (token: string) => void = () => {};
    const refreshSpy = vi.spyOn(authStore, 'doRefreshToken').mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    queue(
      { status: 401, payload: { code: 401, message: 'unauthorized' } },
      { status: 401, payload: { code: 401, message: 'unauthorized' } },
      { status: 200, payload: { code: 0, data: 'a', message: 'ok' } },
      { status: 200, payload: { code: 0, data: 'b', message: 'ok' } },
    );

    const first = request.get('/a');
    const second = request.get('/b');

    // 等两个请求都进入 401 分支（第一个开始刷新，第二个排队等待）
    await vi.waitFor(() => expect(refreshSpy).toHaveBeenCalledTimes(1));
    resolveRefresh('shared-token');

    const [r1, r2] = await Promise.all([first, second]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect([r1.data.data, r2.data.data].sort()).toEqual(['a', 'b']);
    // 排队请求重放时同样应带 Bearer 前缀（覆盖排队分支的鉴权头）
    expect(seenAuthHeaders.filter((h) => h === 'Bearer shared-token')).toHaveLength(2);
  });

  it('重放后再次 401 时不再触发刷新（_retry 防死循环）', async () => {
    const authStore = useAuthStore();
    const refreshSpy = vi.spyOn(authStore, 'doRefreshToken').mockResolvedValue('new-token');
    queue(
      { status: 401, payload: { code: 401, message: 'unauthorized' } },
      { status: 401, payload: { code: 401, message: 'unauthorized' } },
    );

    await expect(request.get('/secure')).rejects.toThrow('unauthorized');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('刷新失败会清空排队订阅者，后续刷新不再误触', async () => {
    const authStore = useAuthStore();
    let rejectRefresh: (reason: unknown) => void = () => {};
    const refreshSpy = vi
      .spyOn(authStore, 'doRefreshToken')
      .mockImplementationOnce(
        () =>
          new Promise<string>((_, reject) => {
            rejectRefresh = reject;
          }),
      )
      .mockResolvedValueOnce('recovered-token');

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login', href: '/login' },
      configurable: true,
      writable: true,
    });

    try {
      queue(
        { status: 401, payload: { code: 401, message: 'unauthorized' } }, // A：触发刷新
        { status: 401, payload: { code: 401, message: 'unauthorized' } }, // B：排队等待
      );
      const first = request.get('/a');
      const second = request.get('/b');
      second.catch(() => {});

      // 等两个请求都进入 401 分支、B 已加入排队
      await vi.waitFor(() => expect(seenAuthHeaders).toHaveLength(2));
      await Promise.resolve();

      rejectRefresh(new Error('refresh failed'));
      await expect(first).rejects.toThrow('refresh failed');

      // 第二次刷新成功：若刷新失败时未清空订阅者，残留项会在此抛错
      queue(
        { status: 401, payload: { code: 401, message: 'unauthorized' } },
        { status: 200, payload: { code: 0, data: { ok: true }, message: 'ok' } },
      );
      const third = request.get('/c');

      await expect(third).resolves.toBeDefined();
      expect(refreshSpy).toHaveBeenCalledTimes(2);
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('刷新接口自身 401 时不进入刷新重试循环', async () => {
    const authStore = useAuthStore();
    const refreshSpy = vi.spyOn(authStore, 'doRefreshToken');
    queue({ status: 401, payload: { code: 401, message: 'unauthorized' } });

    await expect(request.post('/auth/refresh')).rejects.toThrow('unauthorized');
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('刷新失败时应清空认证状态', async () => {
    const authStore = useAuthStore();
    authStore.accessToken = 'stale-token';
    vi.spyOn(authStore, 'doRefreshToken').mockRejectedValue(new Error('refresh failed'));

    // 让 pathname 为 /login，避免 jsdom 因 window.location.href 赋值触发导航未实现告警
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login', href: '/login-original' },
      configurable: true,
      writable: true,
    });

    try {
      queue({ status: 401, payload: { code: 401, message: 'unauthorized' } });

      await expect(request.get('/secure')).rejects.toThrow('refresh failed');
      expect(authStore.isLoggedIn).toBe(false);
      expect(authStore.accessToken).toBeNull();
      // 已在登录页，不应再触发跳转
      expect(window.location.href).toBe('/login-original');
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('刷新失败且不在登录页时应跳转到登录页', async () => {
    const authStore = useAuthStore();
    vi.spyOn(authStore, 'doRefreshToken').mockRejectedValue(new Error('refresh failed'));

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard', href: '/dashboard' },
      configurable: true,
      writable: true,
    });

    try {
      queue({ status: 401, payload: { code: 401, message: 'unauthorized' } });

      await expect(request.get('/secure')).rejects.toThrow('refresh failed');
      expect(window.location.href).toBe('/login');
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });
});

describe('request 实例默认配置', () => {
  it('默认超时 15s 且携带凭证', () => {
    expect(request.defaults.timeout).toBe(15_000);
    expect(request.defaults.withCredentials).toBe(true);
  });

  it('配置了 VITE_API_BASE_URL 时使用该值且不告警', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    loggerError.mockClear();
    vi.resetModules();

    const mod = await import('../api/request');

    expect(mod.default.defaults.baseURL).toBe('https://api.example.com');
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('未配置 VITE_API_BASE_URL 时回退 /api/v1 并记录错误', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    loggerError.mockClear();
    vi.resetModules();

    const mod = await import('../api/request');

    expect(mod.default.defaults.baseURL).toBe('/api/v1');
    expect(loggerError).toHaveBeenCalledWith('API', expect.stringContaining('VITE_API_BASE_URL'));
  });
});

describe('request 请求拦截器错误分支', () => {
  function requestRejectHandler(): (error: unknown) => Promise<unknown> {
    const manager = request.interceptors.request as unknown as {
      handlers: Array<{ rejected?: (error: unknown) => Promise<unknown> }> | null;
    };
    const handler = manager.handlers?.[0];
    if (!handler?.rejected) throw new Error('请求错误拦截器未注册');
    return handler.rejected;
  }

  it('非 Error 值被归一化为 Error 后 reject', async () => {
    const onRejected = requestRejectHandler();

    await expect(onRejected('plain-failure')).rejects.toThrow('plain-failure');
  });

  it('Error 实例原样透传', async () => {
    const onRejected = requestRejectHandler();
    const original = new Error('boom');

    await expect(onRejected(original)).rejects.toBe(original);
  });
});

describe('request 非 401 错误信息提取', () => {
  /** 构造无响应体的网络错误（保留 config，模拟真实 adapter 行为） */
  function networkAdapter(message: string): AxiosAdapter {
    return (config) => {
      const error = new Error(message) as Error & { config?: unknown };
      error.config = config;
      return Promise.reject(error);
    };
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    planned = [];
    seenAuthHeaders = [];
    request.defaults.adapter = planAdapter;
  });

  it('优先使用响应体 message', async () => {
    queue({ status: 500, payload: { code: 500, message: 'server boom' } });

    await expect(request.get('/boom')).rejects.toThrow('server boom');
  });

  it('响应体 data 缺失时回退到 error.message', async () => {
    queue({ status: 500 });

    await expect(request.get('/x')).rejects.toThrow('Request failed with status code 500');
  });

  it('无响应且无 message 时回退到 网络错误', async () => {
    request.defaults.adapter = networkAdapter('');

    await expect(request.get('/x')).rejects.toThrow('网络错误');
  });

  it('无响应但存在 message 时使用 error.message', async () => {
    request.defaults.adapter = networkAdapter('network down');

    await expect(request.get('/x')).rejects.toThrow('network down');
  });
});
