import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/notification';
import { X, Upload, MessageSquare, Users, Calendar } from 'lucide-react';
import { importWhatsAppChat } from '@/utils/filesApi';
import type { WhatsAppImportResponse } from '@/types/files';

interface WhatsAppImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

const WhatsAppImportModal: React.FC<WhatsAppImportModalProps> = ({ onClose, onImported }) => {
  const { addNotification } = useNotifications();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState<WhatsAppImportResponse | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.txt')) {
      setFile(dropped);
    } else {
      addNotification({ type: 'error', title: 'Formato invalido', message: 'Solo se aceptan archivos .txt de WhatsApp' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.name.endsWith('.txt')) {
        setFile(selected);
      } else {
        addNotification({ type: 'error', title: 'Formato invalido', message: 'Solo se aceptan archivos .txt de WhatsApp' });
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await importWhatsAppChat(
        file,
        description.trim() || undefined,
        tags.trim() || undefined,
      );
      setResult(res);
      addNotification({ type: 'success', title: 'Importado', message: `Chat importado: ${res.messages_parsed} mensajes` });
    } catch (err) {
      console.error('WhatsApp import failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo importar el chat de WhatsApp' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900">Importar Chat WhatsApp</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {result ? (
          /* Success summary */
          <div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <p className="text-emerald-800 font-medium text-sm mb-3">Chat importado exitosamente</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-emerald-600" />
                  <span className="text-sm text-emerald-700">{result.messages_parsed} mensajes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-700">{result.chunks_created} chunks</span>
                </div>
                {result.participants.length > 0 && (
                  <div className="col-span-2 flex items-start gap-2">
                    <Users size={14} className="text-emerald-600 mt-0.5" />
                    <span className="text-sm text-emerald-700">{result.participants.join(', ')}</span>
                  </div>
                )}
                {(result.date_range.start || result.date_range.end) && (
                  <div className="col-span-2 flex items-center gap-2">
                    <Calendar size={14} className="text-emerald-600" />
                    <span className="text-sm text-emerald-700">
                      {result.date_range.start || '?'} — {result.date_range.end || '?'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onImported} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          /* Import form */
          <div>
            <p className="text-sm text-slate-500 mb-4">
              Exporta un chat de WhatsApp como archivo .txt y subelo aqui. Los mensajes seran parseados, indexados y seran buscables por contenido.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4
                ${isDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400'}
                ${file ? 'border-emerald-400 bg-emerald-50' : ''}
              `}
              onClick={() => document.getElementById('whatsapp-file-input')?.click()}
            >
              <input
                id="whatsapp-file-input"
                type="file"
                accept=".txt"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div>
                  <MessageSquare size={28} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-xs text-red-500 hover:text-red-700 mt-2"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">Arrastra un archivo .txt de WhatsApp</p>
                  <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar</p>
                </div>
              )}
            </div>

            {/* Optional fields */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ej: Chat con proveedor ABC sobre pedido #123"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Etiquetas (opcional)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Separadas por comas"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={importing}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || importing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Importando...
                  </span>
                ) : (
                  'Importar Chat'
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WhatsAppImportModal;
