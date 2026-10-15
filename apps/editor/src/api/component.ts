import request from './request';
import type { ApiResponse } from './request';

export interface Component {
  id: string;
  name: string;
  label: string;
  category: string;
  icon?: string;
  defaultProps: Record<string, unknown>;
  propsSchema: Record<string, unknown>[];
  thumbnail?: string;
}

/** 获取组件列表 */
export function getComponents(params?: { category?: string }) {
  return request.get<ApiResponse<Component[]>>('/components', { params });
}
