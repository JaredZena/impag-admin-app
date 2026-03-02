import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/notification';
import {
  Upload,
  Download,
  Trash2,
  Search,
  X,
  FileText,
  Image,
  File as FileIcon,
  FolderOpen,
  Pencil,
  ChevronDown,
  List,
  LayoutGrid,
  Package,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  uploadFile,
  fetchFiles,
  getFileDownloadUrl,
  updateFile,
  deleteFile,
  semanticSearch,
  uploadFilesBulk,
  reprocessFile,
} from '@/utils/filesApi';
import type {
  FileMetadata,
  FileCategory,
  FileListParams,
  FileUpdatePayload,
  SearchResult,
} from '@/types/files';
import { FILE_CATEGORY_LABELS, CATEGORY_SUBTYPES } from '@/types/files';
import SearchResults from './SearchResults';
import FileViewerPanel from './FileViewerModal';
import LogisticsPanel from './LogisticsPanel';

const ALL_CATEGORIES: FileCategory[] = [
  'cotizacion',
  'nota',
  'factura',
  'comprobante-de-pago',
  'project-image',
  'packaging-logistics',
  'whatsapp-chat',
  'ficha-tecnica',
  'imagen-de-producto',
  'infografia',
  'article',
  'control-de-ventas',
  'catalogo',
  'estado-de-cuenta',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDocDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.174-3.01.79.8-2.93-.19-.3A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" fill="#25D366"/>
    </svg>
  );
}

function getFileIcon(contentType: string, size = 20, category?: string) {
  if (category === 'whatsapp-chat') return <WhatsAppIcon size={size} />;
  if (contentType.startsWith('image/')) return <Image size={size} className="text-purple-500" />;
  if (contentType === 'application/pdf') return <FileText size={size} className="text-red-500" />;
  return <FileIcon size={size} className="text-blue-500" />;
}

function getPreviewBgColor(contentType: string, category?: string): string {
  if (category === 'whatsapp-chat') return 'bg-emerald-50';
  if (contentType.startsWith('image/')) return 'bg-purple-50';
  if (contentType === 'application/pdf') return 'bg-red-50';
  return 'bg-blue-50';
}

function isPreviewableImage(contentType: string): boolean {
  return contentType.startsWith('image/');
}

function isPreviewable(contentType: string): boolean {
  return contentType.startsWith('image/') || contentType === 'application/pdf';
}

function getCategoryColor(category: FileCategory): string {
  const colors: Record<FileCategory, string> = {
    'cotizacion': 'bg-blue-100 text-blue-700 border-blue-200',
    'nota': 'bg-amber-100 text-amber-700 border-amber-200',
    'factura': 'bg-rose-100 text-rose-700 border-rose-200',
    'comprobante-de-pago': 'bg-violet-100 text-violet-700 border-violet-200',
    'project-image': 'bg-purple-100 text-purple-700 border-purple-200',
    'packaging-logistics': 'bg-orange-100 text-orange-700 border-orange-200',
    'whatsapp-chat': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'ficha-tecnica': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'imagen-de-producto': 'bg-pink-100 text-pink-700 border-pink-200',
    'infografia': 'bg-teal-100 text-teal-700 border-teal-200',
    'article': 'bg-sky-100 text-sky-700 border-sky-200',
    'control-de-ventas': 'bg-lime-100 text-lime-700 border-lime-200',
    'catalogo': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'estado-de-cuenta': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return colors[category] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function getSubtypeLabel(category: FileCategory, subtype: string | null): string | null {
  if (!subtype) return null;
  const options = CATEGORY_SUBTYPES[category];
  if (!options) return null;
  const match = options.find(o => o.value === subtype);
  return match ? match.label : subtype;
}

function ProcessingBadge({ file }: { file: FileMetadata }) {
  if (!file.processing_status || file.processing_status === 'skipped') return null;

  if (file.processing_status === 'processing' || file.processing_status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {file.processing_status === 'processing' ? 'Procesando' : 'Pendiente'}
      </span>
    );
  }

  if (file.processing_status === 'completed' && file.chunk_count) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-200">
        {file.chunk_count} chunks
      </span>
    );
  }

  if (file.processing_status === 'failed') {
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 cursor-help"
        title={file.processing_error || 'Error de procesamiento'}
      >
        Error
      </span>
    );
  }

  return null;
}

function useLazyPreviewUrl(fileId: number, contentType: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isPreviewable(contentType) || fetchedRef.current) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          fetchedRef.current = true;
          getFileDownloadUrl(fileId)
            .then(({ url }) => setUrl(url))
            .catch(() => {});
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fileId, contentType]);

  return { ref, previewUrl: url };
}

// ─── Shared props for card components ────────────────────────
interface FileCardProps {
  file: FileMetadata;
  deleteConfirmId: number | null;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onReprocess?: () => void;
  onShowLogistics?: () => void;
  onView?: () => void;
}

// ─── List Item (lazy thumbnail for images) ───────────────────
const FileListItem: React.FC<FileCardProps> = ({
  file, deleteConfirmId, onEdit, onDownload, onDelete, onDeleteConfirm, onDeleteCancel, onReprocess, onShowLogistics, onView,
}) => {
  const { ref, previewUrl } = useLazyPreviewUrl(file.id, file.content_type);

  return (
    <Card ref={ref} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          {file.category === 'whatsapp-chat' ? (
            getFileIcon(file.content_type, 20, file.category)
          ) : isPreviewableImage(file.content_type) && previewUrl ? (
            <img src={previewUrl} alt={file.original_filename} className="w-10 h-10 rounded object-cover" />
          ) : (
            getFileIcon(file.content_type)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-slate-900 text-sm truncate hover:text-blue-600 transition-colors text-left">{file.original_filename}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(file.category)}`}>
              {FILE_CATEGORY_LABELS[file.category]}
            </span>
            {file.subtype && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                {getSubtypeLabel(file.category, file.subtype) || file.subtype}
              </span>
            )}
            <ProcessingBadge file={file} />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{formatFileSize(file.file_size_bytes)}</span>
            {file.document_date ? (
              <span className="flex items-center gap-1" title={`Fecha del documento: ${formatDocDate(file.document_date)}`}>
                <Calendar size={11} className="text-slate-400" />
                {formatDocDate(file.document_date)}
              </span>
            ) : (
              <span>{formatDate(file.created_at)}</span>
            )}
            <span>{file.uploaded_by_name || file.uploaded_by_email}</span>
            {file.description && (
              <span className="truncate max-w-[200px]" title={file.description}>{file.description}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {file.category === 'packaging-logistics' && onShowLogistics && (
            <button onClick={(e) => { e.stopPropagation(); onShowLogistics(); }} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Logistica">
              <Package size={16} />
            </button>
          )}
          {file.processing_status === 'failed' && onReprocess && (
            <button onClick={(e) => { e.stopPropagation(); onReprocess(); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reprocesar">
              <RefreshCw size={16} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
            <Pencil size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Descargar">
            <Download size={16} />
          </button>
          {deleteConfirmId === file.id ? (
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Confirmar</button>
              <button onClick={(e) => { e.stopPropagation(); onDeleteCancel(); }} className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300">Cancelar</button>
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onDeleteConfirm(); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

// ─── Grid Card (lazy preview for images + PDFs) ──────────────
const FileGridCard: React.FC<FileCardProps> = ({
  file, deleteConfirmId, onEdit, onDownload, onDelete, onDeleteConfirm, onDeleteCancel, onReprocess, onView,
}) => {
  const { ref, previewUrl } = useLazyPreviewUrl(file.id, file.content_type);

  return (
    <Card ref={ref} className="group overflow-hidden hover:shadow-lg transition-shadow">
      <div
        className={`relative aspect-[4/3] flex items-center justify-center overflow-hidden cursor-pointer ${getPreviewBgColor(file.content_type, file.category)}`}
        onClick={onView}
      >
        {isPreviewableImage(file.content_type) && previewUrl ? (
          <img src={previewUrl} alt={file.original_filename} className="w-full h-full object-cover" />
        ) : file.content_type === 'application/pdf' && previewUrl ? (
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title={file.original_filename}
            className="w-full h-full pointer-events-none"
            style={{ border: 'none', transform: 'scale(1)', transformOrigin: 'top left' }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {getFileIcon(file.content_type, 40, file.category)}
            <span className="text-xs font-medium text-slate-500 uppercase">
              {file.original_filename.split('.').pop()}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 pointer-events-none">
          <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="pointer-events-auto p-2 bg-white rounded-full shadow-md text-green-600 hover:bg-green-50 transition-colors" title="Descargar">
            <Download size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="pointer-events-auto p-2 bg-white rounded-full shadow-md text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); (deleteConfirmId === file.id ? onDelete : onDeleteConfirm)(); }}
            className={`pointer-events-auto p-2 bg-white rounded-full shadow-md transition-colors ${
              deleteConfirmId === file.id ? 'text-white bg-red-600 hover:bg-red-700' : 'text-red-600 hover:bg-red-50'
            }`}
            title={deleteConfirmId === file.id ? 'Confirmar eliminar' : 'Eliminar'}
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getCategoryColor(file.category)}`}>
            {FILE_CATEGORY_LABELS[file.category]}
          </span>
          {file.subtype && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/60 bg-white/80 text-slate-600 backdrop-blur-sm">
              {getSubtypeLabel(file.category, file.subtype) || file.subtype}
            </span>
          )}
        </div>
        {file.processing_status === 'failed' && onReprocess && (
          <button
            onClick={(e) => { e.stopPropagation(); onReprocess(); }}
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-amber-600 hover:bg-amber-50"
            title="Reprocesar"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      <div className="p-3 cursor-pointer" onClick={onView}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-medium text-slate-900 truncate flex-1 text-left hover:text-blue-600 transition-colors" title={file.original_filename}>
            {file.original_filename}
          </span>
          <ProcessingBadge file={file} />
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
          <span>{formatFileSize(file.file_size_bytes)}</span>
          {file.document_date ? (
            <span className="flex items-center gap-0.5" title={`Fecha del documento: ${formatDocDate(file.document_date)}`}>
              <Calendar size={10} className="text-slate-400" />
              {formatDocDate(file.document_date)}
            </span>
          ) : (
            <span>{formatDate(file.created_at)}</span>
          )}
        </div>
        {file.description && (
          <p className="text-xs text-slate-400 mt-1 truncate" title={file.description}>{file.description}</p>
        )}
      </div>
    </Card>
  );
};

const PAGE_SIZE = 50;

const FilesPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FileCategory | ''>('');
  const [filterSubtype, setFilterSubtype] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try { return (localStorage.getItem('files-view') as 'list' | 'grid') || 'grid'; } catch { return 'grid'; }
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingFile, setEditingFile] = useState<FileMetadata | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [logisticsFileId, setLogisticsFileId] = useState<number | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFiles = useCallback(async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params: FileListParams = { limit: PAGE_SIZE };
      if (filterCategory) params.category = filterCategory;
      if (filterSubtype) params.subtype = filterSubtype;
      if (sortBy) params.sort_by = sortBy;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (append) params.skip = files.length;
      const data = await fetchFiles(params);
      setHasMore(data.length === PAGE_SIZE);
      if (append) {
        setFiles(prev => [...prev, ...data]);
      } else {
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar los archivos' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterCategory, filterSubtype, sortBy, searchQuery, files.length, addNotification]);

  // Reset and reload when filters/search change
  const loadFilesInitial = useCallback(async () => {
    setLoading(true);
    try {
      const params: FileListParams = { limit: PAGE_SIZE };
      if (filterCategory) params.category = filterCategory;
      if (filterSubtype) params.subtype = filterSubtype;
      if (sortBy) params.sort_by = sortBy;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await fetchFiles(params);
      setHasMore(data.length === PAGE_SIZE);
      setFiles(data);
    } catch (err) {
      console.error('Failed to load files:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar los archivos' });
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterSubtype, sortBy, searchQuery, addNotification]);

  // Text search fires immediately on query/filter change
  useEffect(() => {
    loadFilesInitial();
  }, [loadFilesInitial]);

  // Semantic search with debounce (runs in parallel with text search)
  const runSemanticSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSemanticResults([]);
      return;
    }
    setSemanticLoading(true);
    try {
      const res = await semanticSearch({
        query: query.trim(),
        category: filterCategory || undefined,
        top_k: 20,
      });
      setSemanticResults(res.results);
    } catch (err) {
      console.error('Semantic search failed:', err);
    } finally {
      setSemanticLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchQuery.trim()) {
      setSemanticResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      runSemanticSearch(searchQuery);
    }, 800);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, runSemanticSearch]);

  const toggleViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('files-view', mode);
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const { url } = await getFileDownloadUrl(file.id);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo generar el enlace de descarga' });
    }
  };

  const handleDelete = async (fileId: number) => {
    try {
      await deleteFile(fileId);
      addNotification({ type: 'success', title: 'Eliminado', message: 'Archivo eliminado correctamente' });
      setDeleteConfirmId(null);
      loadFilesInitial();
    } catch (err) {
      console.error('Delete failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar el archivo' });
    }
  };

  const handleView = (file: FileMetadata) => {
    const idx = files.findIndex(f => f.id === file.id);
    if (idx !== -1) setViewerIndex(idx);
  };

  const handleReprocess = async (fileId: number) => {
    try {
      await reprocessFile(fileId);
      addNotification({ type: 'success', title: 'Reprocesando', message: 'Archivo enviado a reprocesar' });
      setTimeout(loadFilesInitial, 2000);
    } catch (err) {
      console.error('Reprocess failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo reprocesar el archivo' });
    }
  };

  return (
    <>
      <div className={`flex ${viewerIndex !== null ? 'gap-6' : ''}`}>
        {/* File list content */}
        <div className={`min-w-0 ${viewerIndex !== null ? 'w-[55%] shrink-0' : 'flex-1 max-w-7xl mx-auto'}`}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen size={28} className="text-blue-600" />
                Archivos
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {files.length} archivo{files.length !== 1 ? 's' : ''}{hasMore ? '+' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Upload size={16} />
                Subir Archivos
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value as FileCategory | ''); setFilterSubtype(''); }}
                className="appearance-none w-full sm:w-52 pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Todas las categorías</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {FILE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {filterCategory && CATEGORY_SUBTYPES[filterCategory] && (
              <div className="relative">
                <select
                  value={filterSubtype}
                  onChange={(e) => setFilterSubtype(e.target.value)}
                  className="appearance-none w-full sm:w-48 pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Todos los tipos</option>
                  {CATEGORY_SUBTYPES[filterCategory]!.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none w-full sm:w-44 pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Mas recientes</option>
                <option value="document_date_desc">Fecha doc (reciente)</option>
                <option value="document_date_asc">Fecha doc (antigua)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {/* View toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                title="Vista de lista"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => toggleViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                title="Vista de cuadrícula"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>

          {/* Logistics Panel */}
          {logisticsFileId && (
            <div className="mb-6">
              <LogisticsPanel fileId={logisticsFileId} onClose={() => setLogisticsFileId(null)} />
            </div>
          )}

          {/* File Display */}
          {searchQuery.trim() ? (
            <SearchResults
              textMatches={files}
              textLoading={loading}
              semanticResults={semanticResults}
              semanticLoading={semanticLoading}
              query={searchQuery}
              parentCategory={filterCategory}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : files.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">No hay archivos</p>
              <p className="text-slate-400 text-sm mt-1">Sube tu primer archivo para comenzar</p>
            </Card>
          ) : viewMode === 'list' ? (
            /* ── List View ── */
            <div className="space-y-2">
              {files.map((file) => (
                <FileListItem
                  key={file.id}
                  file={file}
                  deleteConfirmId={deleteConfirmId}
                  onEdit={() => setEditingFile(file)}
                  onDownload={() => handleDownload(file)}
                  onDelete={() => handleDelete(file.id)}
                  onDeleteConfirm={() => setDeleteConfirmId(file.id)}
                  onDeleteCancel={() => setDeleteConfirmId(null)}
                  onReprocess={() => handleReprocess(file.id)}
                  onShowLogistics={() => setLogisticsFileId(file.id)}
                  onView={() => handleView(file)}
                />
              ))}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => loadFiles(true)}
                    disabled={loadingMore}
                    className="px-6"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        Cargando...
                      </span>
                    ) : (
                      'Cargar más'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* ── Grid View ── */
            <div>
              <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 ${viewerIndex !== null ? 'lg:grid-cols-3' : 'lg:grid-cols-4 xl:grid-cols-5'}`}>
                {files.map((file) => (
                  <FileGridCard
                    key={file.id}
                    file={file}
                    deleteConfirmId={deleteConfirmId}
                    onEdit={() => setEditingFile(file)}
                    onDownload={() => handleDownload(file)}
                    onDelete={() => handleDelete(file.id)}
                    onDeleteConfirm={() => setDeleteConfirmId(file.id)}
                    onDeleteCancel={() => setDeleteConfirmId(null)}
                    onReprocess={() => handleReprocess(file.id)}
                    onView={() => handleView(file)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    onClick={() => loadFiles(true)}
                    disabled={loadingMore}
                    className="px-6"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        Cargando...
                      </span>
                    ) : (
                      'Cargar más'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview side panel */}
        {viewerIndex !== null && (
          <FileViewerPanel
            files={files}
            currentIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
            onNavigate={setViewerIndex}
          />
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => {
            setShowUploadModal(false);
            loadFilesInitial();
          }}
        />
      )}

      {/* Edit Modal */}
      {editingFile && (
        <EditModal
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSaved={() => {
            setEditingFile(null);
            loadFilesInitial();
          }}
        />
      )}
    </>
  );
};

// ─── Upload Modal ────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploaded }) => {
  const { addNotification } = useNotifications();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<FileCategory>('cotizacion');
  const [subtype, setSubtype] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const subtypeOptions = CATEGORY_SUBTYPES[category];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) setSelectedFiles(prev => [...prev, ...droppedFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    if (subtypeOptions && !subtype) return;
    setUploading(true);
    const trimmedTags = tags.trim() || undefined;
    const finalSubtype = subtypeOptions ? subtype : undefined;
    const finalDocDate = documentDate || undefined;
    try {
      if (selectedFiles.length === 1) {
        await uploadFile({
          file: selectedFiles[0],
          category,
          subtype: finalSubtype,
          document_date: finalDocDate,
          description: description.trim() || undefined,
          tags: trimmedTags,
        });
        addNotification({ type: 'success', title: 'Subido', message: 'Archivo subido correctamente' });
      } else {
        setUploadProgress(`Subiendo ${selectedFiles.length} archivos...`);
        const result = await uploadFilesBulk({
          files: selectedFiles,
          category,
          subtype: finalSubtype,
          document_date: finalDocDate,
          description: description.trim() || undefined,
          tags: trimmedTags,
        });
        if (result.failed > 0) {
          addNotification({
            type: 'warning',
            title: 'Carga parcial',
            message: `${result.successful} subidos, ${result.failed} fallidos`,
          });
        } else {
          addNotification({
            type: 'success',
            title: 'Subidos',
            message: `${result.successful} archivos subidos correctamente`,
          });
        }
      }
      onUploaded();
    } catch (err) {
      console.error('Upload failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudieron subir los archivos' });
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 bg-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Subir Archivos</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}
            ${selectedFiles.length > 0 ? 'border-green-400 bg-green-50' : ''}
          `}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) setSelectedFiles(prev => [...prev, ...Array.from(files)]);
            }}
          />
          {selectedFiles.length > 0 ? (
            <div>
              <FileText size={32} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium text-slate-900">
                {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))} total
              </p>
              <p className="text-xs text-blue-500 mt-1">Haz clic para agregar mas</p>
            </div>
          ) : (
            <div>
              <Upload size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">Arrastra archivos aqui o haz clic para seleccionar</p>
              <p className="text-xs text-slate-400 mt-1">Puedes seleccionar multiples archivos</p>
            </div>
          )}
        </div>

        {/* File list */}
        {selectedFiles.length > 1 && (
          <div className="mb-4 max-h-32 overflow-y-auto space-y-1">
            {selectedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded text-xs">
                <span className="truncate flex-1 text-slate-700">{file.name}</span>
                <span className="text-slate-400 mx-2">{formatFileSize(file.size)}</span>
                <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Category */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as FileCategory); setSubtype(''); }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {FILE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Subtype selector */}
        {subtypeOptions && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!subtype ? 'border-red-300' : 'border-slate-200'}`}
            >
              <option value="">Seleccionar tipo...</option>
              {subtypeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {!subtype && <p className="text-xs text-red-500 mt-1">Selecciona un tipo para continuar</p>}
          </div>
        )}

        {/* Document Date */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del documento (opcional)</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descripcion del archivo"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Etiquetas (opcional)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Separadas por comas: urgente, revision"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedFiles.length === 0 || uploading || (!!subtypeOptions && !subtype)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {uploadProgress || 'Subiendo...'}
              </span>
            ) : selectedFiles.length > 1 ? (
              `Subir ${selectedFiles.length} archivos`
            ) : (
              'Subir'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ─── Edit Modal ──────────────────────────────────────────────

interface EditModalProps {
  file: FileMetadata;
  onClose: () => void;
  onSaved: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ file, onClose, onSaved }) => {
  const { addNotification } = useNotifications();
  const [category, setCategory] = useState<FileCategory>(file.category);
  const [subtype, setSubtype] = useState(file.subtype || '');
  const [documentDate, setDocumentDate] = useState(file.document_date || '');
  const [description, setDescription] = useState(file.description || '');
  const [tags, setTags] = useState(file.tags || '');
  const [saving, setSaving] = useState(false);

  const subtypeOptions = CATEGORY_SUBTYPES[category];

  const handleSave = async () => {
    if (subtypeOptions && !subtype) return;
    setSaving(true);
    const finalSubtype = subtypeOptions ? subtype : undefined;
    try {
      const updates: FileUpdatePayload = {};
      if (category !== file.category) updates.category = category;
      if ((finalSubtype || null) !== (file.subtype || null)) updates.subtype = finalSubtype || '';
      if ((documentDate || null) !== (file.document_date || null)) updates.document_date = documentDate || null;
      if (description !== (file.description || '')) updates.description = description;
      if (tags.trim() !== (file.tags || '')) updates.tags = tags.trim();

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await updateFile(file.id, updates);
      addNotification({ type: 'success', title: 'Guardado', message: 'Archivo actualizado correctamente' });
      onSaved();
    } catch (err) {
      console.error('Update failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo actualizar el archivo' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Editar Archivo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4 truncate">{file.original_filename}</p>

        {/* Category */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as FileCategory); setSubtype(''); }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {FILE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Subtype selector */}
        {subtypeOptions && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!subtype ? 'border-red-300' : 'border-slate-200'}`}
            >
              <option value="">Seleccionar tipo...</option>
              {subtypeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {!subtype && <p className="text-xs text-red-500 mt-1">Selecciona un tipo para continuar</p>}
          </div>
        )}

        {/* Document Date */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del documento</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descripción del archivo"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Etiquetas</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Separadas por comas"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!!subtypeOptions && !subtype)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FilesPage;
