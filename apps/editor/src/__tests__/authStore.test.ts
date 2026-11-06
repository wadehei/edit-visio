import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { UserInfo } from '../api/auth';

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  getUserInfo: vi.fn(),
}));

import * as authApi from '../api/auth';
import { useAuthStore } from '../stores/authStore';

const USER: UserInfo = {
  userId: 1,
  username: 'alice',
  nickname: 'Alice',
  email: 'a@example.com',
  phone: '13800000000',
  avatar: '',
  role: 'user',
  permissions: [],
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2024-01-02T00:00:00Z',
};

function tokenResponse(accessToken = 'access-token') {
  return {
    data: {
      code: 0,
      data: { accessToken, tokenType: 'Bearer', expiresIn: 3600, user: USER },
      message: 'ok',
    },
  } as never;
}

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('login 成功后保存 token 与用户信息', async () => {
    vi.mocked(authApi.login).mockResolvedValue(tokenResponse());
    const store = useAuthStore();

    await store.login('alice', 'secret');

    expect(store.accessToken).toBe('access-token');
    expect(store.user).toEqual(USER);
    expect(store.isLoggedIn).toBe(true);
    expect(store.username).toBe('alice');
  });

  it('register 成功后保存 token 与用户信息', async () => {
    vi.mocked(authApi.register).mockResolvedValue(tokenResponse('reg-token'));
    const store = useAuthStore();

    await store.register('alice', 'secret', 'a@example.com');

    expect(vi.mocked(authApi.register)).toHaveBeenCalledWith({
      username: 'alice',
      password: 'secret',
      confirmPassword: 'secret',
      email: 'a@example.com',
    });
    expect(store.accessToken).toBe('reg-token');
  });

  it('logout 即使接口失败也会清除本地认证状态', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new Error('net'));
    const store = useAuthStore();
    store.accessToken = 't';
    store.user = USER;

    await expect(store.logout()).rejects.toThrow('net');

    expect(store.accessToken).toBeNull();
    expect(store.user).toBeNull();
  });

  it('doRefreshToken 返回并保存新的 access token', async () => {
    vi.mocked(authApi.refreshToken).mockResolvedValue(tokenResponse('fresh'));
    const store = useAuthStore();

    const token = await store.doRefreshToken();

    expect(token).toBe('fresh');
    expect(store.accessToken).toBe('fresh');
  });

  it('fetchUserInfo 成功时更新用户', async () => {
    vi.mocked(authApi.getUserInfo).mockResolvedValue({
      data: { code: 0, data: USER, message: 'ok' },
    } as never);
    const store = useAuthStore();

    await store.fetchUserInfo();

    expect(store.user).toEqual(USER);
  });

  it('fetchUserInfo 失败时清除认证并抛出带 cause 的错误', async () => {
    const cause = new Error('401');
    vi.mocked(authApi.getUserInfo).mockRejectedValue(cause);
    const store = useAuthStore();
    store.accessToken = 't';

    await expect(store.fetchUserInfo()).rejects.toThrow('获取用户信息失败');

    expect(store.accessToken).toBeNull();
    expect(store.user).toBeNull();
  });

  it('bootstrap 成功时完成静默续期与用户拉取', async () => {
    vi.mocked(authApi.refreshToken).mockResolvedValue(tokenResponse('boot'));
    vi.mocked(authApi.getUserInfo).mockResolvedValue({
      data: { code: 0, data: USER, message: 'ok' },
    } as never);
    const store = useAuthStore();

    await store.bootstrap();

    expect(store.initialized).toBe(true);
    expect(store.accessToken).toBe('boot');
    expect(store.user).toEqual(USER);
  });

  it('bootstrap 无有效会话时保持未登录且不抛错', async () => {
    vi.mocked(authApi.refreshToken).mockRejectedValue(new Error('no session'));
    const store = useAuthStore();

    await expect(store.bootstrap()).resolves.toBeUndefined();

    expect(store.initialized).toBe(true);
    expect(store.isLoggedIn).toBe(false);
  });

  it('bootstrap 并发调用复用同一个 Promise', async () => {
    let resolveRefresh!: (value: unknown) => void;
    vi.mocked(authApi.refreshToken).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }) as never,
    );
    vi.mocked(authApi.getUserInfo).mockResolvedValue({
      data: { code: 0, data: USER, message: 'ok' },
    } as never);
    const store = useAuthStore();

    const first = store.bootstrap();
    const second = store.bootstrap();
    expect(vi.mocked(authApi.refreshToken)).toHaveBeenCalledTimes(1);

    resolveRefresh(tokenResponse('shared'));
    await Promise.all([first, second]);

    expect(vi.mocked(authApi.refreshToken)).toHaveBeenCalledTimes(1);
    expect(store.accessToken).toBe('shared');
  });

  it('bootstrap 已初始化后不再重复请求', async () => {
    vi.mocked(authApi.refreshToken).mockResolvedValue(tokenResponse());
    vi.mocked(authApi.getUserInfo).mockResolvedValue({
      data: { code: 0, data: USER, message: 'ok' },
    } as never);
    const store = useAuthStore();

    await store.bootstrap();
    await store.bootstrap();

    expect(vi.mocked(authApi.refreshToken)).toHaveBeenCalledTimes(1);
  });

  it('clearAuth 清空内存状态', () => {
    const store = useAuthStore();
    store.accessToken = 't';
    store.user = USER;

    store.clearAuth();

    expect(store.accessToken).toBeNull();
    expect(store.user).toBeNull();
    expect(store.isLoggedIn).toBe(false);
  });

  it('user 为空时 username 回退为空串', () => {
    const store = useAuthStore();

    expect(store.user).toBeNull();
    expect(store.username).toBe('');
  });
});
