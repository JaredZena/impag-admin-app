import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/notification';
import { X, Upload, MessageSquare, Users, Calendar, FileArchive, FileText, Tag, Zap } from 'lucide-react';
import { importWhatsAppChat, importWhatsAppBulk } from '@/utils/filesApi';
import type { WhatsAppImportResponse, WhatsAppBulkResponse } from '@/types/files';

interface WhatsAppImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

type ImportMode = 'simple' | 'bulk';

const WhatsAppImportModal: React.FC<WhatsAppImportModalProps> = ({ onClose, onImported }) => {
  const { addNotification } = useNotifications();
  const [mode, setMode] = useState<ImportMode>('bulk');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [skipClassification, setSkipClassification] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [simpleResult, setSimpleResult] = useState<WhatsAppImportResponse | null>(null);
  const [bulkResult, setBulkResult] = useState<WhatsAppBulkResponse | null>(null);

  const acceptedExtensions = mode === 'bulk' ? ['.txt', '.zip'] : ['.txt'];
  const acceptString = mode === 'bulk' ? '.txt,.zip' : '.txt';

  const isValidFile = (name: string) => {
    const lower = name.toLowerCase();
    return acceptedExtensions.some(ext => lower.endsWith(ext));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValidFile(dropped.name)) {
      setFile(dropped);
    } else {
      addNotification({
        type: 'error',
        title: 'Formato invalido',
        message: mode === 'bulk'
          ? 'Solo se aceptan archivos .txt o .zip de WhatsApp'
          : 'Solo se aceptan archivos .txt de WhatsApp',
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (isValidFile(selected.name)) {
        setFile(selected);
      } else {
        addNotification({
          type: 'error',
          title: 'Formato invalido',
          message: mode === 'bulk'
            ? 'Solo se aceptan archivos .txt o .zip de WhatsApp'
            : 'Solo se aceptan archivos .txt de WhatsApp',
        });
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      if (mode === 'bulk' || file.name.toLowerCase().endsWith('.zip')) {
        const res = await importWhatsAppBulk(file, skipClassification);
        setBulkResult(res);
        const { summary } = res;
        addNotification({
          type: 'success',
          title: 'Importacion completada',
          message: `${summary.messages_new} mensajes nuevos de ${summary.conversations_count} conversacion(es). ${summary.messages_skipped} duplicados omitidos.`,
        });
      } else {
        const res = await importWhatsAppChat(
          file,
          description.trim() || undefined,
          tags.trim() || undefined,
        );
        setSimpleResult(res);
        addNotification({ type: 'success', title: 'Importado', message: `Chat importado: ${res.messages_parsed} mensajes` });
      }
    } catch (err) {
      console.error('WhatsApp import failed:', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo importar el chat de WhatsApp' });
    } finally {
      setImporting(false);
    }
  };

  const isZip = file?.name.toLowerCase().endsWith('.zip');

  // ─── Bulk result view ───────────────────────────────────────
  if (bulkResult) {
    const { summary, conversations } = bulkResult;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <Card className="w-full max-w-2xl p-6 bg-white max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileArchive size={20} className="text-emerald-500" />
              <h2 className="text-lg font-semibold text-slate-900">Importacion Completada</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {/* Summary stats */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-700">{summary.messages_new}</p>
                <p className="text-xs text-emerald-600">mensajes nuevos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-500">{summary.messages_skipped}</p>
                <p className="text-xs text-slate-500">duplicados omitidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{summary.media_refs_found}</p>
                <p className="text-xs text-blue-500">archivos detectados</p>
              </div>
            </div>
          </div>

          {/* Conversations */}
          <div className="space-y-3">
            {conversations.map((conv, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{conv.chat_name}</p>
                    {conv.conversation_classification && (
                      <p className="text-xs text-slate-500 mt-1">
                        {conv.conversation_classification.summary}
                      </p>
                    )}
                  </div>
                  {conv.messages_new > 0 ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      +{conv.messages_new} nuevos
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      sin cambios
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {conv.messages_total} msgs
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {conv.participants.length}
                  </span>
                  {conv.media_refs_count > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText size={12} />
                      {conv.media_refs_count} archivos
                    </span>
                  )}
                </div>

                {/* Classification tags */}
                {conv.conversation_classification?.tags && conv.conversation_classification.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conv.conversation_classification.tags.slice(0, 6).map((tag, j) => (
                      <span key={j} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Media classification summary */}
                {conv.media_classifications.length > 0 && (
                  <div className="mt-2 text-xs text-slate-400">
                    Archivos clasificados: {conv.media_classifications.filter(m => m.classification).length}/{conv.media_refs_count}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={onImported} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Cerrar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Simple result view ─────────────────────────────────────
  if (simpleResult) {
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <p className="text-emerald-800 font-medium text-sm mb-3">Chat importado exitosamente</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-emerald-600" />
                <span className="text-sm text-emerald-700">{simpleResult.messages_parsed} mensajes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-emerald-700">{simpleResult.chunks_created} chunks</span>
              </div>
              {simpleResult.participants.length > 0 && (
                <div className="col-span-2 flex items-start gap-2">
                  <Users size={14} className="text-emerald-600 mt-0.5" />
                  <span className="text-sm text-emerald-700">{simpleResult.participants.join(', ')}</span>
                </div>
              )}
              {(simpleResult.date_range.start || simpleResult.date_range.end) && (
                <div className="col-span-2 flex items-center gap-2">
                  <Calendar size={14} className="text-emerald-600" />
                  <span className="text-sm text-emerald-700">
                    {simpleResult.date_range.start || '?'} — {simpleResult.date_range.end || '?'}
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
        </Card>
      </div>
    );
  }

  // ─── Import form ────────────────────────────────────────────
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

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('bulk'); setFile(null); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'bulk'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Zap size={14} />
            Importacion Semanal
          </button>
          <button
            onClick={() => { setMode('simple'); setFile(null); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'simple'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileText size={14} />
            Chat Individual
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          {mode === 'bulk' ? (
            <>Exporta el chat de WhatsApp <strong>con multimedia</strong> (zip) o solo texto (txt). Los mensajes duplicados se omiten automaticamente.</>
          ) : (
            <>Exporta un chat de WhatsApp como archivo .txt y subelo aqui.</>
          )}
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
            accept={acceptString}
            className="hidden"
            onChange={handleFileSelect}
          />
          {file ? (
            <div>
              {isZip ? (
                <FileArchive size={28} className="mx-auto text-emerald-500 mb-2" />
              ) : (
                <MessageSquare size={28} className="mx-auto text-emerald-500 mb-2" />
              )}
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {file.size > 1024 * 1024
                  ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                  : `${(file.size / 1024).toFixed(1)} KB`}
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
              <p className="text-sm text-slate-600">
                {mode === 'bulk'
                  ? 'Arrastra un archivo .zip o .txt de WhatsApp'
                  : 'Arrastra un archivo .txt de WhatsApp'}
              </p>
              <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar</p>
            </div>
          )}
        </div>

        {/* Bulk mode options */}
        {mode === 'bulk' && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={skipClassification}
                onChange={(e) => setSkipClassification(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Tag size={14} />
              Omitir clasificacion con IA (mas rapido)
            </label>
          </div>
        )}

        {/* Simple mode optional fields */}
        {mode === 'simple' && (
          <>
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
          </>
        )}

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
                {mode === 'bulk' ? 'Procesando...' : 'Importando...'}
              </span>
            ) : (
              mode === 'bulk' ? 'Importar y Clasificar' : 'Importar Chat'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WhatsAppImportModal;
