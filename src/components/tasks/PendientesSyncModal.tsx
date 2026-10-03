import { useState } from 'react';
import { MessageSquareText, X } from 'lucide-react';
import { syncPendientes } from '@/utils/tasksApi';
import type { PendientesSyncPreview } from '@/types/tasks';

interface PendientesSyncModalProps {
  onClose: () => void;
  onSynced: () => void;
}

const PLACEHOLDER = `PENDIENTES 021026

COTIZACIONES Y NOTAS
1. Cotizacion Invernadero Camila Jalisco

PAGOS PENDIENTES
debe IMPAG
1. Internet $349
…`;

// Pegar la lista *PENDIENTES* que Hernán manda al grupo: el tablero queda
// igual a la lista (nuevas se crean, las que ya no están se cierran).
export default function PendientesSyncModal({ onClose, onSynced }: PendientesSyncModalProps) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<PendientesSyncPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await syncPendientes(text, dryRun);
      if (dryRun) setPreview(res.data);
      else onSynced();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la lista');
    } finally {
      setBusy(false);
    }
  };

  const Section = ({ title, items, tone }: { title: string; items: string[]; tone: string }) =>
    items.length === 0 ? null : (
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${tone}`}>
          {title} ({items.length})
        </p>
        <ul className="text-sm text-gray-700 space-y-0.5">
          {items.map((t, i) => (
            <li key={i} className="truncate" title={t}>
              {t}
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        // A stray tap outside must not throw away a pasted message; use the X.
        if (e.target === e.currentTarget && !text.trim()) onClose();
      }}
    >
      <div role="dialog" aria-label="Sincronizar pendientes" className="w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquareText size={16} className="text-green-600" />
            Sincronizar con la lista de WhatsApp
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {!preview ? (
            <div>
              <label htmlFor="pendientes-text" className="block text-xs font-medium text-gray-600 mb-1">
                Pega el mensaje «PENDIENTES ddmmaa»
              </label>
              <textarea
                id="pendientes-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={12}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Lo que esté en la lista queda abierto; lo que ya no aparezca se marca como terminado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-900">
                Lista {preview.stamp ? `del ${preview.stamp.slice(0, 2)}/${preview.stamp.slice(2, 4)}` : ''}: {preview.total} pendientes
              </p>
              <Section title="Nuevas" items={preview.create.map((c) => `${c.title} · ${c.section}`)} tone="text-blue-700" />
              <Section title="Se cierran (ya no están en la lista)" items={preview.close.map((c) => c.title)} tone="text-green-700" />
              <Section title="Cambian de sección" items={preview.move.map((m) => `${m.title} → ${m.section}`)} tone="text-amber-700" />
              <Section title="Siguen igual" items={preview.keep.map((k) => k.title)} tone="text-gray-500" />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          {!preview ? (
            <button
              type="button"
              onClick={() => run(true)}
              disabled={busy || !text.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Leyendo...' : 'Revisar'}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setPreview(null)} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
                Editar
              </button>
              <button
                type="button"
                onClick={() => run(false)}
                disabled={busy}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {busy ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
