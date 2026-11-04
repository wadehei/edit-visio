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
  /**
   * 刷新令牌。前端不再持久化该值：后端应通过 Set-Cookie 下发 httpOnly Cookie。
   * 字段保留为可选，用于兼容仍返回该字段的旧响应。
   */
  refreshToken?: string;
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

/** 刷新 token（刷新令牌由 httpOnly Cookie 携带，前端无需传参） */
export function refreshToken() {
  return request.post<ApiResponse<TokenData>>('/auth/refresh');
}

/** 获取当前用户信息 */
export function getUserInfo() {
  return request.get<ApiResponse<UserInfo>>('/auth/me');
}
