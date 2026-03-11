import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  FileText,
  File as FileIcon,
  Loader2,
  Calendar,
  User,
  Tag,
  Info,
} from 'lucide-react';
import { getFileViewUrl, getFileDownloadUrl } from '@/utils/filesApi';
import { FILE_CATEGORY_LABELS, CATEGORY_SUBTYPES } from '@/types/files';
import type { FileMetadata, FileCategory } from '@/types/files';

function getCategoryColor(category: FileCategory): string {
  const colors: Record<FileCategory, string> = {
    'cotizacion': 'bg-blue-100 text-blue-700',
    'nota': 'bg-amber-100 text-amber-700',
    'factura': 'bg-rose-100 text-rose-700',
    'comprobante-de-pago': 'bg-violet-100 text-violet-700',
    'project-image': 'bg-purple-100 text-purple-700',
    'packaging-logistics': 'bg-orange-100 text-orange-700',
    'whatsapp-chat': 'bg-emerald-100 text-emerald-700',
    'ficha-tecnica': 'bg-cyan-100 text-cyan-700',
    'imagen-de-producto': 'bg-pink-100 text-pink-700',
    'infografia': 'bg-teal-100 text-teal-700',
    'article': 'bg-sky-100 text-sky-700',
    'control-de-ventas': 'bg-lime-100 text-lime-700',
    'catalogo': 'bg-indigo-100 text-indigo-700',
    'estado-de-cuenta': 'bg-yellow-100 text-yellow-700',
  };
  return colors[category] || 'bg-slate-100 text-slate-700';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDocDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getSubtypeLabel(category: FileCategory, subtype: string | null): string | null {
  if (!subtype) return null;
  const options = CATEGORY_SUBTYPES[category];
  if (!options) return null;
  const match = options.find(o => o.value === subtype);
  return match ? match.label : subtype;
}

function getStatusBadge(status: string | null): { label: string; className: string } | null {
  if (!status || status === 'skipped') return null;
  switch (status) {
    case 'pending': return { label: 'Pendiente', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    case 'processing': return { label: 'Procesando', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    case 'completed': return { label: 'Completado', className: 'bg-green-50 text-green-700 border-green-200' };
    case 'failed': return { label: 'Error', className: 'bg-red-50 text-red-700 border-red-200' };
    default: return null;
  }
}

interface FileViewerPanelProps {
  files: FileMetadata[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const FileViewerPanel: React.FC<FileViewerPanelProps> = ({
  files,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [showMeta, setShowMeta] = useState(false);

  const file = files[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const isImage = file.content_type.startsWith('image/');
  const isPdf = file.content_type === 'application/pdf';
  const isText = file.content_type.startsWith('text/') ||
    file.content_type === 'application/json' ||
    file.original_filename.endsWith('.txt') ||
    file.original_filename.endsWith('.csv') ||
    file.original_filename.endsWith('.json');
  const canPreview = isImage || isPdf || isText;

  // Fetch view URL when file changes
  useEffect(() => {
    let cancelled = false;
    setViewUrl(null);
    setTextContent(null);
    setLoading(true);

    getFileViewUrl(file.id)
      .then(async (res) => {
        if (cancelled) return;
        setViewUrl(res.url);

        if (isText) {
          try {
            const textRes = await fetch(res.url);
            const text = await textRes.text();
            if (!cancelled) setTextContent(text);
          } catch {
            if (!cancelled) setTextContent('Error al cargar el contenido del archivo');
          }
        }
      })
      .catch(() => {
        if (!cancelled) setViewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [file.id, isText]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowUp' && hasPrev) { e.preventDefault(); onNavigate(currentIndex - 1); }
    if (e.key === 'ArrowDown' && hasNext) { e.preventDefault(); onNavigate(currentIndex + 1); }
  }, [onClose, onNavigate, currentIndex, hasPrev, hasNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleDownload = async () => {
    try {
      const { url } = await getFileDownloadUrl(file.id);
      window.open(url, '_blank');
    } catch {
      // silently fail
    }
  };

  return (
    <>
      {/* Mobile: fullscreen overlay with backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />

      <div className={
        // Mobile: fullscreen fixed overlay. Desktop: inline side panel.
        'fixed inset-0 z-50 bg-white flex flex-col ' +
        'md:relative md:inset-auto md:z-auto md:flex-1 md:min-w-[360px] md:border-l md:border-slate-200 md:rounded-l-lg md:h-[calc(100vh-96px)] md:sticky md:top-0'
      }>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${getCategoryColor(file.category)}`}>
              {FILE_CATEGORY_LABELS[file.category]}
            </span>
            <span className="text-slate-500 text-xs shrink-0">
              {currentIndex + 1}/{files.length}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => hasPrev && onNavigate(currentIndex - 1)}
              disabled={!hasPrev}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Anterior (↑)"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => hasNext && onNavigate(currentIndex + 1)}
              disabled={!hasNext}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Siguiente (↓)"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Descargar"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
              title="Cerrar (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* File info + metadata */}
        <div className="border-b border-slate-100">
          <div className="px-4 py-2.5">
            <p className="text-sm font-medium text-slate-900 truncate" title={file.original_filename}>
              {file.original_filename}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatFileSize(file.file_size_bytes)} · {file.content_type}
            </p>
          </div>

          {/* Metadata toggle */}
          <button
            onClick={() => setShowMeta(!showMeta)}
            className="w-full flex items-center gap-1.5 px-4 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={12} className={`transition-transform ${showMeta ? 'rotate-90' : ''}`} />
            <Info size={12} />
            Metadata
          </button>

          {/* Collapsible metadata */}
          {showMeta && (
            <div className="px-4 pb-3 space-y-2 text-xs">
              {/* Document date */}
              <div className="flex items-start gap-2">
                <Calendar size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400">Fecha documento:</span>{' '}
                  <span className="text-slate-700 font-medium">
                    {formatDocDate(file.document_date) || 'Sin fecha'}
                  </span>
                </div>
              </div>

              {/* Subtype */}
              {file.subtype && (
                <div className="flex items-start gap-2">
                  <Tag size={12} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-400">Tipo:</span>{' '}
                    <span className="text-slate-700">{getSubtypeLabel(file.category, file.subtype) || file.subtype}</span>
                  </div>
                </div>
              )}

              {/* Description */}
              {file.description && (
                <div className="flex items-start gap-2">
                  <FileText size={12} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-400">Descripción:</span>{' '}
                    <span className="text-slate-700">{file.description}</span>
                  </div>
                </div>
              )}

              {/* Tags */}
              {file.tags && (
                <div className="flex items-start gap-2">
                  <Tag size={12} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-400">Tags:</span>{' '}
                    <span className="text-slate-700">{file.tags}</span>
                  </div>
                </div>
              )}

              {/* Uploaded by */}
              <div className="flex items-start gap-2">
                <User size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400">Subido por:</span>{' '}
                  <span className="text-slate-700">{file.uploaded_by_name || file.uploaded_by_email}</span>
                </div>
              </div>

              {/* Created at */}
              <div className="flex items-start gap-2">
                <Calendar size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400">Creado:</span>{' '}
                  <span className="text-slate-700">{formatDate(file.created_at)}</span>
                </div>
              </div>

              {/* Processing status */}
              {(() => {
                const badge = getStatusBadge(file.processing_status);
                if (!badge) return null;
                return (
                  <div className="flex items-start gap-2">
                    <Info size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Procesamiento:</span>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] ${badge.className}`}>
                        {badge.label}
                      </span>
                      {file.chunk_count ? (
                        <span className="text-slate-500">({file.chunk_count} chunks)</span>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              {/* Processing error */}
              {file.processing_status === 'failed' && file.processing_error && (
                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-[11px]">
                  {file.processing_error}
                </div>
              )}

              {/* IDs (supplier, quotation, task) */}
              {(file.supplier_id || file.quotation_id || file.task_id) && (
                <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                  <Info size={12} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-2 text-slate-500">
                    {file.supplier_id && <span>Proveedor #{file.supplier_id}</span>}
                    {file.quotation_id && <span>Cotización #{file.quotation_id}</span>}
                    {file.task_id && <span>Tarea #{file.task_id}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview content */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-50">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-slate-300" />
              <span className="text-slate-400 text-sm">Cargando vista previa...</span>
            </div>
          ) : !canPreview ? (
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <FileIcon size={48} className="text-slate-300" />
              <div>
                <p className="text-slate-500 text-sm">Vista previa no disponible</p>
                <p className="text-slate-400 text-xs mt-1">{file.content_type}</p>
              </div>
              <button
                onClick={handleDownload}
                className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} />
                Descargar para ver
              </button>
            </div>
          ) : isImage && viewUrl ? (
            <img
              src={viewUrl}
              alt={file.original_filename}
              className="max-w-full max-h-full object-contain select-none p-2"
              draggable={false}
            />
          ) : isPdf && viewUrl ? (
            <iframe
              src={viewUrl}
              title={file.original_filename}
              className="w-full h-full bg-white"
              style={{ border: 'none' }}
            />
          ) : isText && textContent !== null ? (
            <div className="w-full h-full overflow-auto p-4">
              <pre className="text-slate-800 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {textContent}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileText size={36} className="text-slate-300" />
              <p className="text-slate-400 text-sm">Error al cargar la vista previa</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FileViewerPanel;
