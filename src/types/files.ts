export type FileCategory =
  | 'customer-quotation'
  | 'supplier-quotation'
  | 'nota-de-venta'
  | 'project-image'
  | 'general';

export interface FileMetadata {
  id: number;
  file_key: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  category: FileCategory;
  description: string | null;
  tags: string | null;
  supplier_id: number | null;
  quotation_id: number | null;
  task_id: number | null;
  uploaded_by_email: string;
  uploaded_by_name: string | null;
  created_at: string;
  last_updated: string | null;
}

export interface FileUploadPayload {
  file: File;
  category?: FileCategory;
  description?: string;
  tags?: string;
  supplier_id?: number;
  quotation_id?: number;
  task_id?: number;
}

export interface FileDownloadResponse {
  url: string;
  filename: string;
  expires_in: number;
}

export interface FileListParams {
  category?: FileCategory;
  supplier_id?: number;
  quotation_id?: number;
  task_id?: number;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface FileUpdatePayload {
  description?: string;
  tags?: string;
  category?: FileCategory;
  supplier_id?: number;
  quotation_id?: number;
  task_id?: number;
}

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  'customer-quotation': 'Cotización Cliente',
  'supplier-quotation': 'Cotización Proveedor',
  'nota-de-venta': 'Nota de Venta',
  'project-image': 'Imagen de Proyecto',
  'general': 'General',
};
