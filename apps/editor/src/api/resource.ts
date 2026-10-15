import request from './request';
import type { ApiResponse } from './request';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/** 上传文件 */
export function uploadFile(file: File, onProgress?: (percent: number) => void) {
  const formData = new FormData();
  formData.append('file', file);

  return request.post<ApiResponse<UploadResult>>('/resources/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress(progressEvent) {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
}
