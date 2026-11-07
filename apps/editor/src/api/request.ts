import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { logger } from '../utils/logger';

// 统一响应结构
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

/** 携带重试标记的请求配置：401 刷新后重放时用于防死循环 */
interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  logger.error('API', 'VITE_API_BASE_URL is not configured. Check your .env file.');
}

/** API 请求超时时间（毫秒） */
const API_TIMEOUT_MS = 15_000;

const request = axios.create({
  baseURL: API_BASE_URL || '/api/v1',
  timeout: API_TIMEOUT_MS,
  // 携带 httpOnly Cookie 中的刷新令牌
  withCredentials: true,
});

// 请求拦截器：自动附加 Bearer token
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore();
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
);

// 是否正在刷新 token
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

// 响应拦截器：处理业务错误和 401 自动刷新 token
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response;
    if (data.code !== 0) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return response;
  },
  async (error) => {
    // error.config 在非 axios 抛出的错误（如自定义 adapter / 事件回调）中可能缺失，
    // 因此这里必须判空，否则下方读取 originalRequest.url 会抛 TypeError 而非走统一错误分支。
    const originalRequest = error?.config as RetriableRequestConfig | undefined;

    // 401 处理：尝试刷新 token。
    // 刷新/登录/登出接口自身返回 401 时不重试，避免死循环。
    // Stryker disable next-line StringLiteral: 空串仅为缺省占位，与任意不匹配鉴权路径的串行为等价
    const isAuthEndpoint = /\/auth\/(refresh|login|logout)\b/.test(originalRequest?.url ?? '');
    if (
      originalRequest &&
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // 正在刷新，排队等待
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(request(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const authStore = useAuthStore();
        const newToken = await authStore.doRefreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        onTokenRefreshed(newToken);
        return request(originalRequest);
      } catch (refreshError) {
        // 刷新失败：清除内存中的认证状态并跳转登录
        refreshSubscribers = [];
        const authStore = useAuthStore();
        authStore.clearAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(
          refreshError instanceof Error ? refreshError : new Error(String(refreshError)),
        );
      } finally {
        isRefreshing = false;
      }
    }

    // 非 401 错误：提取业务错误信息
    const message = error?.response?.data?.message || error?.message || '网络错误';
    return Promise.reject(new Error(message));
  },
);

export default request;
