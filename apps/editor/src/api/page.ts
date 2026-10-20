import request from './request';
import type { ApiResponse } from './request';
import type { PageSchema } from '@page-builder/shared';

export interface PageVO {
  pageId: number;
  projectId: number;
  title: string;
  path: string;
  isHome: boolean;
  status: number;
  version: number;
  schema: Record<string, unknown>;
  schemaSize: number;
  componentCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 将 API 返回的裸 schema 安全转换为 PageSchema（带默认值兜底）
 */
export function toPageSchema(raw: Record<string, unknown>): PageSchema {
  return {
    id: (raw.id as string) || 'page-unknown',
    name: (raw.name as string) || '未命名页面',
    version: (raw.version as string) || '1.0.0',
    props: (raw.props as PageSchema['props']) || { title: '', backgroundColor: '#ffffff' },
    children: (raw.children as PageSchema['children']) || [],
  };
}

export interface PageListResult {
  list: PageVO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePageParams {
  title: string;
  path?: string;
  isHome?: boolean;
}

export interface SavePageSchemaParams {
  schema: Record<string, unknown>;
}

/** 获取项目下的页面列表 */
export function getPages(projectId: string) {
  return request.get<ApiResponse<PageListResult>>(`/projects/${projectId}/pages`);
}

/** 获取单个页面详情 */
export function getPage(projectId: string, pageId: string) {
  return request.get<ApiResponse<PageVO>>(`/projects/${projectId}/pages/${pageId}`);
}

/** 创建页面 */
export function createPage(projectId: string, params: CreatePageParams) {
  return request.post<ApiResponse<PageVO>>(`/projects/${projectId}/pages`, params);
}

/** 保存页面 schema（编辑器内容） */
export function savePageSchema(projectId: string, pageId: string, params: SavePageSchemaParams) {
  return request.put<ApiResponse<PageVO>>(`/projects/${projectId}/pages/${pageId}/schema`, params);
}

/** 删除页面 */
export function deletePage(projectId: string, pageId: string) {
  return request.delete<ApiResponse<null>>(`/projects/${projectId}/pages/${pageId}`);
}
