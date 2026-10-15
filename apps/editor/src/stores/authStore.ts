import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authApi from '../api/auth';
import type { UserInfo } from '../api/auth';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  const user = ref<UserInfo | null>(null);

  // --- Getters ---
  const isLoggedIn = computed(() => !!accessToken.value);
  const username = computed(() => user.value?.username ?? '');

  // --- Actions ---

  /** 保存 token 到 state 和 localStorage */
  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  /** 清除所有认证状态 */
  function clearAuth() {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  /** 登录 */
  async function login(login: string, password: string) {
    const { data } = await authApi.login({ login, password });
    setTokens(data.data.accessToken, data.data.refreshToken);
    user.value = data.data.user;
  }

  /** 注册 */
  async function register(username: string, password: string, email?: string) {
    const { data } = await authApi.register({ username, password, confirmPassword: password, email });
    setTokens(data.data.accessToken, data.data.refreshToken);
    user.value = data.data.user;
  }

  /** 获取用户信息 */
  async function fetchUserInfo() {
    try {
      const { data } = await authApi.getUserInfo();
      user.value = data.data;
    } catch {
      clearAuth();
      throw new Error('获取用户信息失败');
    }
  }

  /** 初始化：有 token 但无用户信息时自动获取 */
  async function initAuth() {
    if (accessToken.value && !user.value) {
      try {
        await fetchUserInfo();
      } catch {
        // fetchUserInfo 内部已调用 clearAuth
      }
    }
  }

  /** 刷新 token，返回新的 accessToken */
  async function doRefreshToken(): Promise<string> {
    if (!refreshToken.value) {
      throw new Error('无刷新令牌');
    }
    const { data } = await authApi.refreshToken(refreshToken.value);
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
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
    refreshToken,
    user,
    isLoggedIn,
    username,
    initAuth,
    login,
    register,
    fetchUserInfo,
    doRefreshToken,
    logout,
  };
});
