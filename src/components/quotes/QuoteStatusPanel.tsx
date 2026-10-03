import { useState } from 'react';
import { changeQuoteStatus } from '@/utils/quotesApi';
import type { ManualQuoteStatus, Quote } from '@/types/quotes';

interface QuoteStatusPanelProps {
  quote: Quote;
  onChanged: (quote: Quote) => void;
}

const OPTIONS: { value: ManualQuoteStatus; label: string; active: string }[] = [
  { value: 'sent', label: 'Enviada', active: 'bg-blue-600 text-white border-blue-600' },
  { value: 'needs_work', label: 'Por ajustar', active: 'bg-orange-500 text-white border-orange-500' },
  { value: 'accepted', label: 'Aceptada', active: 'bg-green-600 text-white border-green-600' },
  { value: 'rejected', label: 'Perdida', active: 'bg-red-600 text-white border-red-600' },
  { value: 'expired', label: 'Expirada', active: 'bg-gray-500 text-white border-gray-500' },
];

// Motivos rápidos: el motivo es lo que hace útil saber por qué se pierde o se
// atora una cotización.
const QUICK_REASONS: Partial<Record<ManualQuoteStatus, string[]>> = {
  needs_work: ['Busca algo más económico', 'Cambiar producto o marca', 'Ajustar cantidades', 'Cotizar flete'],
  rejected: ['Muy caro', 'Compró en otro lado', 'Sin respuesta', 'Ya no le interesa'],
};

const NEEDS_REASON: ManualQuoteStatus[] = ['needs_work', 'rejected'];

// Estado manual de una cotización (POST /quotes/{id}/status). "Por ajustar" y
// "Perdida" piden motivo; cada cambio queda como línea en las notas.
export default function QuoteStatusPanel({ quote, onChanged }: QuoteStatusPanelProps) {
  const current = quote.status === 'viewed' ? 'sent' : quote.status;
  const [target, setTarget] = useState<ManualQuoteStatus | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (value: ManualQuoteStatus) => {
    setError(null);
    setReason('');
    setTarget(value === target ? null : value);
  };

  const needsReason = target !== null && NEEDS_REASON.includes(target);
  const label = OPTIONS.find((o) => o.value === target)?.label;

  const handleSave = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      onChanged(await changeQuoteStatus(quote.id, target, reason.trim()));
      setTarget(null);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Estado</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cambiar estado">
        {OPTIONS.map((o) => {
          const isCurrent = current === o.value;
          const isTarget = target === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              aria-pressed={isCurrent || isTarget}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                isCurrent || isTarget
                  ? o.active
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              } ${isTarget && !isCurrent ? 'ring-2 ring-offset-1 ring-gray-300' : ''}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {target && (
        <div className="mt-4 space-y-3">
          {QUICK_REASONS[target] && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS[target]!.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-2.5 py-1 text-xs rounded-md border ${
                    reason === r
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            aria-label="Motivo"
            placeholder={needsReason ? 'Motivo (obligatorio)' : 'Comentario (opcional)'}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTarget(null)}
              disabled={busy}
              className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || (needsReason && !reason.trim())}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {busy ? 'Guardando...' : `Marcar como ${label}`}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
