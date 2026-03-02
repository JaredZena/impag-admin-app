export type FileCategory =
  | 'cotizacion'
  | 'nota'
  | 'factura'
  | 'comprobante-de-pago'
  | 'project-image'
  | 'packaging-logistics'
  | 'whatsapp-chat'
  | 'ficha-tecnica'
  | 'imagen-de-producto'
  | 'infografia'
  | 'article'
  | 'control-de-ventas'
  | 'catalogo'
  | 'estado-de-cuenta';

export interface FileMetadata {
  id: number;
  file_key: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  category: FileCategory;
  subtype: string | null;
  document_date: string | null;
  description: string | null;
  tags: string | null;
  supplier_id: number | null;
  quotation_id: number | null;
  task_id: number | null;
  uploaded_by_email: string;
  uploaded_by_name: string | null;
  created_at: string;
  last_updated: string | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | null;
  chunk_count: number | null;
  processing_error: string | null;
  processed_at: string | null;
}

export interface FileUploadPayload {
  file: File;
  category?: FileCategory;
  subtype?: string;
  document_date?: string;
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

export interface FileViewResponse {
  url: string;
  filename: string;
  content_type: string;
  expires_in: number;
}

export interface FileListParams {
  category?: FileCategory;
  subtype?: string;
  supplier_id?: number;
  quotation_id?: number;
  task_id?: number;
  search?: string;
  sort_by?: string;
  skip?: number;
  limit?: number;
}

export interface FileUpdatePayload {
  description?: string;
  tags?: string;
  category?: FileCategory;
  subtype?: string;
  document_date?: string | null;
  supplier_id?: number;
  quotation_id?: number;
  task_id?: number;
}

export interface SemanticSearchRequest {
  query: string;
  namespaces?: string[];
  category?: string;
  supplier_id?: number;
  top_k?: number;
}

export interface SearchResult {
  file_id: number;
  original_filename: string;
  category: string;
  content_type: string;
  score: number;
  snippet: string;
  chunk_index: number;
  namespace: string;
  supplier_id: number | null;
}

export interface SemanticSearchResponse {
  results: SearchResult[];
  query: string;
  total_results: number;
}

export interface BulkUploadPayload {
  files: File[];
  category?: FileCategory;
  subtype?: string;
  document_date?: string;
  description?: string;
  tags?: string;
  supplier_id?: number;
}

export interface BulkUploadResponse {
  total_files: number;
  successful: number;
  failed: number;
  files: FileMetadata[];
  errors: { filename: string; error: string }[];
}

export interface WhatsAppImportResponse {
  file_id: number;
  messages_parsed: number;
  chunks_created: number;
  participants: string[];
  date_range: { start?: string; end?: string };
}

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  'cotizacion': 'Cotización',
  'nota': 'Nota',
  'factura': 'Factura',
  'comprobante-de-pago': 'Comprobante de Pago',
  'project-image': 'Imagen de Proyecto',
  'packaging-logistics': 'Empaque/Logística',
  'whatsapp-chat': 'Chat WhatsApp',
  'ficha-tecnica': 'Ficha Técnica',
  'imagen-de-producto': 'Imagen de Producto',
  'infografia': 'Infografía',
  'article': 'Article',
  'control-de-ventas': 'Control de Ventas',
  'catalogo': 'Catálogo',
  'estado-de-cuenta': 'Estado de Cuenta',
};

/** Categories that support tipo: subtags, with their options */
export const CATEGORY_SUBTYPES: Partial<Record<FileCategory, { value: string; label: string }[]>> = {
  'cotizacion': [
    { value: 'interna', label: 'Cotización Interna' },
    { value: 'proveedor', label: 'Cotización Proveedor' },
    { value: 'cliente', label: 'Cotización Cliente' },
  ],
  'nota': [
    { value: 'venta', label: 'Nota de Venta' },
    { value: 'compra', label: 'Nota de Compra' },
  ],
  'factura': [
    { value: 'proveedor', label: 'Factura Proveedor' },
    { value: 'cliente', label: 'Factura Cliente' },
  ],
  'comprobante-de-pago': [
    { value: 'proveedor', label: 'Comprobante a Proveedor' },
    { value: 'cliente', label: 'Comprobante de Cliente' },
  ],
  'whatsapp-chat': [
    { value: 'interno', label: 'Chat Interno' },
    { value: 'proveedor', label: 'Chat Proveedor' },
    { value: 'cliente', label: 'Chat Cliente' },
  ],
};
