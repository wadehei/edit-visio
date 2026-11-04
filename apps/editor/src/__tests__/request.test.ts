import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import request from '../api/request';
import { useAuthStore } from '../stores/authStore';

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
      value: { pathname: '/login', href: '/login' },
      configurable: true,
      writable: true,
    });

    try {
      queue({ status: 401, payload: { code: 401, message: 'unauthorized' } });

      await expect(request.get('/secure')).rejects.toThrow('refresh failed');
      expect(authStore.isLoggedIn).toBe(false);
      expect(authStore.accessToken).toBeNull();
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });
});
