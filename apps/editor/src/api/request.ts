import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

// 统一响应结构
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

const request = axios.create({
  baseURL: 'http://localhost:8088/api/v1',
  timeout: 15000,
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
  (error) => Promise.reject(error),
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
    const originalRequest = error.config;

    // 401 处理：尝试刷新 token
    if (error.response?.status === 401 && !originalRequest._retry) {
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
        // 刷新失败，跳转登录
        refreshSubscribers = [];
        const authStore = useAuthStore();
        authStore.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 非 401 错误：提取业务错误信息
    const message = error.response?.data?.message || error.message || '网络错误';
    return Promise.reject(new Error(message));
  },
);

export default request;
