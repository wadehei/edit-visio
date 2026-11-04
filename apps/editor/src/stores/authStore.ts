import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authApi from '../api/auth';
import type { UserInfo } from '../api/auth';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  // access token 仅存内存，不落 localStorage，避免 XSS 窃取；
  // 刷新令牌由后端通过 httpOnly Cookie 下发，前端不接触。
  const accessToken = ref<string | null>(null);
  const user = ref<UserInfo | null>(null);
  /** 是否已完成首次鉴权引导（用 httpOnly Cookie 静默续期） */
  const initialized = ref(false);

  // --- Getters ---
  const isLoggedIn = computed(() => !!accessToken.value);
  const username = computed(() => user.value?.username ?? '');

  // --- Actions ---

  /** 保存 access token 到内存（刷新令牌由后端 httpOnly Cookie 管理） */
  function setAccessToken(access: string) {
    accessToken.value = access;
  }

  /** 清除所有认证状态（均为内存状态） */
  function clearAuth() {
    accessToken.value = null;
    user.value = null;
  }

  /** 登录 */
  async function login(login: string, password: string) {
    const { data } = await authApi.login({ login, password });
    setAccessToken(data.data.accessToken);
    user.value = data.data.user;
  }

  /** 注册 */
  async function register(username: string, password: string, email?: string) {
    const { data } = await authApi.register({
      username,
      password,
      confirmPassword: password,
      email,
    });
    setAccessToken(data.data.accessToken);
    user.value = data.data.user;
  }

  /** 获取用户信息 */
  async function fetchUserInfo() {
    try {
      const { data } = await authApi.getUserInfo();
      user.value = data.data;
    } catch (error) {
      clearAuth();
      throw new Error('获取用户信息失败', { cause: error });
    }
  }

  /** 刷新 token，返回新的 accessToken（刷新令牌由 httpOnly Cookie 携带） */
  async function doRefreshToken(): Promise<string> {
    const { data } = await authApi.refreshToken();
    setAccessToken(data.data.accessToken);
    return data.data.accessToken;
  }

  let bootstrapPromise: Promise<void> | null = null;

  /**
   * 首次鉴权引导：access token 仅存内存，页面刷新即丢失，
   * 因此需先用 httpOnly Cookie 静默续期，再拉取用户信息。
   * 并发调用会复用同一个 Promise。
   */
  async function bootstrap(): Promise<void> {
    if (initialized.value) return;
    if (bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (async () => {
      try {
        await doRefreshToken();
        await fetchUserInfo();
      } catch {
        // 无有效会话（无 Cookie 或已过期），保持未登录
        clearAuth();
      } finally {
        initialized.value = true;
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  }

  /** 退出登录 */
  async function logout() {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
    }
  }

  return {
    accessToken,
    user,
    initialized,
    isLoggedIn,
    username,
    bootstrap,
    clearAuth,
    login,
    register,
    fetchUserInfo,
    doRefreshToken,
    logout,
  };
});
