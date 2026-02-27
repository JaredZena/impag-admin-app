import { apiRequest } from './api';
import type {
  FileMetadata,
  FileUploadPayload,
  FileDownloadResponse,
  FileListParams,
  FileUpdatePayload,
} from '@/types/files';

export const uploadFile = async (payload: FileUploadPayload): Promise<FileMetadata> => {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.category) formData.append('category', payload.category);
  if (payload.description) formData.append('description', payload.description);
  if (payload.tags) formData.append('tags', payload.tags);
  if (payload.supplier_id !== undefined) formData.append('supplier_id', String(payload.supplier_id));
  if (payload.quotation_id !== undefined) formData.append('quotation_id', String(payload.quotation_id));
  if (payload.task_id !== undefined) formData.append('task_id', String(payload.task_id));

  return apiRequest('/files/upload', { method: 'POST', body: formData });
};

export const fetchFiles = async (params?: FileListParams): Promise<FileMetadata[]> => {
  const query = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  return apiRequest(`/files/${query}`);
};

export const fetchFile = async (id: number): Promise<FileMetadata> => {
  return apiRequest(`/files/${id}`);
};

export const getFileDownloadUrl = async (id: number): Promise<FileDownloadResponse> => {
  return apiRequest(`/files/${id}/download`);
};

export const updateFile = async (id: number, updates: FileUpdatePayload): Promise<FileMetadata> => {
  return apiRequest(`/files/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteFile = async (id: number): Promise<{ message: string }> => {
  return apiRequest(`/files/${id}`, { method: 'DELETE' });
};
