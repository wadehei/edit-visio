import request from './request';
import type { ApiResponse } from './request';

export interface LoginParams {
  login: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserInfo;
}

export interface UserInfo {
  userId: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  permissions: string[];
  createdAt: string;
  lastLoginAt: string;
}

/** 登录 */
export function login(params: LoginParams) {
  return request.post<ApiResponse<TokenData>>('/auth/login', params);
}

/** 注册 */
export function register(params: RegisterParams) {
  return request.post<ApiResponse<TokenData>>('/auth/register', params);
}

/** 退出登录 */
export function logout() {
  return request.post<ApiResponse<null>>('/auth/logout');
}

/** 刷新 token */
export function refreshToken(refreshToken: string) {
  return request.post<ApiResponse<TokenData>>('/auth/refresh', { refreshToken });
}

/** 获取当前用户信息 */
export function getUserInfo() {
  return request.get<ApiResponse<UserInfo>>('/auth/me');
}
