import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
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
} from 'lucide-react';
import {
  uploadFile,
  fetchFiles,
  getFileDownloadUrl,
  updateFile,
  deleteFile,
} from '@/utils/filesApi';
import type {
  FileMetadata,
  FileCategory,
  FileListParams,
  FileUpdatePayload,
} from '@/types/files';
import { FILE_CATEGORY_LABELS } from '@/types/files';

const ALL_CATEGORIES: FileCategory[] = [
  'customer-quotation',
  'supplier-quotation',
  'nota-de-venta',
  'project-image',
  'general',
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

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return <Image size={20} className="text-purple-500" />;
  if (contentType === 'application/pdf') return <FileText size={20} className="text-red-500" />;
  return <FileIcon size={20} className="text-blue-500" />;
}

function getCategoryColor(category: FileCategory): string {
  const colors: Record<FileCategory, string> = {
    'customer-quotation': 'bg-blue-100 text-blue-700 border-blue-200',
    'supplier-quotation': 'bg-green-100 text-green-700 border-green-200',
    'nota-de-venta': 'bg-amber-100 text-amber-700 border-amber-200',
    'project-image': 'bg-purple-100 text-purple-700 border-purple-200',
    'general': 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return colors[category] || colors['general'];
}

const FilesPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<FileCategory | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingFile, setEditingFile] = useState<FileMetadata | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params: FileListParams = {};
      if (filterCategory) params.category = filterCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await fetchFiles(params);
      setFiles(data);
    } catch (err) {
      console.error('Failed to load files:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar los archivos' });
    } finally {
      setLoading(false);
    }
  }, [filterCategory, searchQuery, addNotification]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

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
      loadFiles();
    } catch (err) {
      console.error('Delete failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar el archivo' });
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FolderOpen size={28} className="text-blue-600" />
              Archivos
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {files.length} archivo{files.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Upload size={16} />
            Subir Archivo
          </Button>
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
              onChange={(e) => setFilterCategory(e.target.value as FileCategory | '')}
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
        </div>

        {/* File List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : files.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg">No hay archivos</p>
            <p className="text-slate-400 text-sm mt-1">Sube tu primer archivo para comenzar</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="shrink-0">{getFileIcon(file.content_type)}</div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 text-sm truncate">
                        {file.original_filename}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(file.category)}`}>
                        {FILE_CATEGORY_LABELS[file.category]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatFileSize(file.file_size_bytes)}</span>
                      <span>{formatDate(file.created_at)}</span>
                      <span>{file.uploaded_by_name || file.uploaded_by_email}</span>
                      {file.description && (
                        <span className="truncate max-w-[200px]" title={file.description}>
                          {file.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingFile(file)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Descargar"
                    >
                      <Download size={16} />
                    </button>
                    {deleteConfirmId === file.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(file.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => {
            setShowUploadModal(false);
            loadFiles();
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
            loadFiles();
          }}
        />
      )}
    </MainLayout>
  );
};

// ─── Upload Modal ────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploaded }) => {
  const { addNotification } = useNotifications();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<FileCategory>('general');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await uploadFile({
        file: selectedFile,
        category,
        description: description.trim() || undefined,
        tags: tags.trim() || undefined,
      });
      addNotification({ type: 'success', title: 'Subido', message: 'Archivo subido correctamente' });
      onUploaded();
    } catch (err) {
      console.error('Upload failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo subir el archivo' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Subir Archivo</h2>
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
            ${selectedFile ? 'border-green-400 bg-green-50' : ''}
          `}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSelectedFile(file);
            }}
          />
          {selectedFile ? (
            <div>
              <FileText size={32} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
              <p className="text-xs text-slate-500 mt-1">{formatFileSize(selectedFile.size)}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                className="text-xs text-red-500 hover:text-red-700 mt-2"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <div>
              <Upload size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">Arrastra un archivo aquí o haz clic para seleccionar</p>
              <p className="text-xs text-slate-400 mt-1">Máximo 25MB</p>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FileCategory)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {FILE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (opcional)</label>
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Etiquetas (opcional)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Separadas por comas: urgente, revisión"
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
            disabled={!selectedFile || uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Subiendo...
              </span>
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
  const [description, setDescription] = useState(file.description || '');
  const [tags, setTags] = useState(file.tags || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: FileUpdatePayload = {};
      if (category !== file.category) updates.category = category;
      if (description !== (file.description || '')) updates.description = description;
      if (tags !== (file.tags || '')) updates.tags = tags;

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
            onChange={(e) => setCategory(e.target.value as FileCategory)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {FILE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
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
            disabled={saving}
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
