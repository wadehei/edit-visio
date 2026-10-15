import request from './request';
import type { ApiResponse } from './request';

export interface Project {
  projectId: number;
  name: string;
  description: string;
  coverImage: string;
  status: number;
  settings: Record<string, unknown>;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
  coverImage?: string;
}

export interface UpdateProjectParams {
  name?: string;
  description?: string;
  coverImage?: string;
}

export interface PaginationResult<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** 获取项目列表 */
export function getProjects(params?: { page?: number; pageSize?: number; keyword?: string }) {
  return request.get<ApiResponse<PaginationResult<Project>>>('/projects', { params });
}

/** 获取单个项目详情 */
export function getProject(id: string) {
  return request.get<ApiResponse<Project>>(`/projects/${id}`);
}

/** 创建项目 */
export function createProject(params: CreateProjectParams) {
  return request.post<ApiResponse<Project>>('/projects', params);
}

/** 更新项目 */
export function updateProject(id: string, params: UpdateProjectParams) {
  return request.put<ApiResponse<Project>>(`/projects/${id}`, params);
}

/** 删除项目 */
export function deleteProject(id: string) {
  return request.delete<ApiResponse<null>>(`/projects/${id}`);
}

/** 复制项目 */
export function copyProject(id: string) {
  return request.post<ApiResponse<Project>>(`/projects/${id}/copy`);
}
