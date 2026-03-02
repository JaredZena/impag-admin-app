import { apiRequest } from './api';
import type {
  FileMetadata,
  FileUploadPayload,
  FileDownloadResponse,
  FileListParams,
  FileUpdatePayload,
  SemanticSearchRequest,
  SemanticSearchResponse,
  BulkUploadPayload,
  BulkUploadResponse,
  WhatsAppImportResponse,
  FileViewResponse,
} from '@/types/files';

export const uploadFile = async (payload: FileUploadPayload): Promise<FileMetadata> => {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.category) formData.append('category', payload.category);
  if (payload.subtype) formData.append('subtype', payload.subtype);
  if (payload.document_date) formData.append('document_date', payload.document_date);
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

export const getFileViewUrl = async (id: number): Promise<FileViewResponse> => {
  return apiRequest(`/files/${id}/view`);
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

export const getProcessingStatus = async (id: number): Promise<{ processing_status: string; chunk_count: number | null; processing_error: string | null }> => {
  return apiRequest(`/files/${id}/processing-status`);
};

export const reprocessFile = async (id: number): Promise<{ message: string }> => {
  return apiRequest(`/files/${id}/reprocess`, { method: 'POST' });
};

export const semanticSearch = async (request: SemanticSearchRequest): Promise<SemanticSearchResponse> => {
  return apiRequest('/files/search', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

export const uploadFilesBulk = async (payload: BulkUploadPayload): Promise<BulkUploadResponse> => {
  const formData = new FormData();
  payload.files.forEach((file) => formData.append('files', file));
  if (payload.category) formData.append('category', payload.category);
  if (payload.subtype) formData.append('subtype', payload.subtype);
  if (payload.document_date) formData.append('document_date', payload.document_date);
  if (payload.description) formData.append('description', payload.description);
  if (payload.tags) formData.append('tags', payload.tags);
  if (payload.supplier_id !== undefined) formData.append('supplier_id', String(payload.supplier_id));
  return apiRequest('/files/upload-bulk', { method: 'POST', body: formData });
};

export const importWhatsAppChat = async (file: File, description?: string, tags?: string, supplierId?: number): Promise<WhatsAppImportResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (description) formData.append('description', description);
  if (tags) formData.append('tags', tags);
  if (supplierId !== undefined) formData.append('supplier_id', String(supplierId));
  return apiRequest('/files/import-whatsapp', { method: 'POST', body: formData });
};

export const fetchLogisticsByFile = async (fileId: number) => {
  return apiRequest(`/logistics/by-file/${fileId}`);
};

export const updateLogistics = async (logisticsId: number, updates: Record<string, unknown>) => {
  return apiRequest(`/logistics/${logisticsId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};
