import request from './request';
import type { ApiResponse } from './request';

export interface Template {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  schema: Record<string, unknown>;
  createdAt: string;
}

export interface ApplyTemplateParams {
  templateId: string;
  projectId: string;
}

/** 获取模板列表 */
export function getTemplates(params?: { category?: string }) {
  return request.get<ApiResponse<Template[]>>('/templates', { params });
}

/** 应用模板到项目 */
export function applyTemplate(params: ApplyTemplateParams) {
  return request.post<ApiResponse<null>>('/templates/apply', params);
}
