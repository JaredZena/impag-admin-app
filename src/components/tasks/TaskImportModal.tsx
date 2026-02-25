import React, { useState } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import { importTasks } from '@/utils/tasksApi';
import type { Task, ImportResult } from '@/types/tasks';

interface TaskImportModalProps {
  onClose: () => void;
  onImported: (tasks: Task[]) => void;
}

type ModalStep = 'input' | 'importing' | 'results';

const TaskImportModal: React.FC<TaskImportModalProps> = ({ onClose, onImported }) => {
  const [text, setText] = useState('');
  const [step, setStep] = useState<ModalStep>('input');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lineCount = text.trim() ? text.trim().split('\n').filter(l => l.trim()).length : 0;

  const handleImport = async () => {
    if (!text.trim()) return;

    setStep('importing');
    setError(null);

    try {
      const res = await importTasks(text);
      setResult(res.data);
      setStep('results');

      if (res.data.created.length > 0) {
        onImported(res.data.created);
      }
    } catch (err: any) {
      setError(err.message || 'Error al importar tareas');
      setStep('input');
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
      }
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Importar Tareas</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pega las tareas en formato exportado</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`Pega las tareas aquí...\n\nFormato esperado:\n1\tComprar materiales\n2\tEnviar factura (URGENTE)\n3\tRevisar cotización`}
                  rows={10}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none font-mono"
                  autoFocus
                />
                {!text && (
                  <button
                    onClick={handlePaste}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <Copy size={12} />
                    Pegar
                  </button>
                )}
              </div>

              {text.trim() && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-slate-500">
                    {lineCount} {lineCount === 1 ? 'tarea detectada' : 'tareas detectadas'}
                  </span>
                  <button
                    onClick={() => setText('')}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Limpiar
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Las tareas se asignarán a <strong>Hernan</strong> por defecto.
                  El sistema usará IA para detectar tareas duplicadas y omitirlas automáticamente.
                </p>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-600 mt-4">Analizando tareas...</p>
              <p className="text-xs text-slate-400 mt-1">Detectando duplicados con IA</p>
            </div>
          )}

          {step === 'results' && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
                  <span className="text-2xl font-bold text-green-600">{result.total_created}</span>
                  <p className="text-xs text-green-600 mt-0.5">Creadas</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
                  <span className="text-2xl font-bold text-amber-600">{result.total_duplicates}</span>
                  <p className="text-xs text-amber-600 mt-0.5">Duplicadas</p>
                </div>
              </div>

              {/* Created tasks */}
              {result.created.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    Tareas creadas
                  </h3>
                  <div className="space-y-1.5">
                    {result.created.map(task => (
                      <div key={task.id} className="flex items-center gap-2 bg-green-50/50 border border-green-100/50 rounded-lg px-3 py-2">
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 rounded px-1.5 py-0.5 tabular-nums shrink-0">
                          #{task.task_number}
                        </span>
                        <span className="text-sm text-slate-700 truncate">{task.title}</span>
                        {task.priority === 'urgent' && (
                          <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full shrink-0">
                            Urgente
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {result.duplicates.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    Duplicadas (omitidas)
                  </h3>
                  <div className="space-y-1.5">
                    {result.duplicates.map((dup, i) => (
                      <div key={i} className="flex items-start gap-2 bg-amber-50/50 border border-amber-100/50 rounded-lg px-3 py-2">
                        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-sm text-slate-600 line-clamp-1">{dup.title}</span>
                          {dup.reason && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{dup.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          {step === 'input' && (
            <button
              onClick={handleImport}
              disabled={!text.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Upload size={18} />
              Importar {lineCount > 0 ? `${lineCount} tareas` : ''}
            </button>
          )}
          {step === 'results' && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskImportModal;
