import { useState } from 'react';
import { AlertTriangle, MessageSquareText, X } from 'lucide-react';
import { apiRequest } from '@/utils/api';

// Mirror of POST /sales/capture (impag-quot routes/sales.py).
export interface CaptureSalePreview {
  action: 'created' | 'updated';
  label: string; // "16_09_2026"
  folio: string; // "160926DGO"
  tag: string | null;
  customer_name: string;
  location: string | null;
  sale_date: string;
  items: { description: string; quantity: number | null; unit: string | null; unit_price: number | null }[];
  total: number;
  payments: { label: string; amount: number; date: string | null; method: string | null }[];
  paid: number;
  pending: number;
  notes: string[];
  sheet_duplicates: number;
  quote: { id: number; quote_number: string; status: string; customer_name: string; total: number } | null;
}

export interface CaptureSaleResult {
  preview: CaptureSalePreview;
  warnings: string[];
  sale: { id: number } | null;
}

const PLACEHOLDER = `Venta 01_10_2026
2 Reducciones Galv Rosc 3" a 2" $350.00/ Pieza.
Total: $700.00
Anticipo 1: $40 (01/10/2026) [Efectivo]
Pendientes: $660.00
Alejandro Echeverría
Nuevo Ideal, Durango`;

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const ddmmyyyy = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

async function captureSale(text: string, linkQuote: boolean, dryRun: boolean): Promise<CaptureSaleResult> {
  const res = (await apiRequest('/sales/capture', {
    method: 'POST',
    body: JSON.stringify({ text, link_quote: linkQuote, dry_run: dryRun }),
  })) as { data: CaptureSaleResult };
  return res.data;
}

// Registrar una venta pegando el mensaje *Venta NN_MM_AAAA* que Hernán manda
// al grupo. Desde el 01/10/2026 ese mensaje es el registro de ventas: guarda
// pagos, lo que falta por cobrar y la cotización que cierra.
export default function CaptureSaleDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState('');
  const [linkQuote, setLinkQuote] = useState(true);
  const [preview, setPreview] = useState<CaptureSaleResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await captureSale(text, linkQuote, dryRun);
      if (dryRun) setPreview(result);
      else onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la venta');
    } finally {
      setBusy(false);
    }
  };

  const p = preview?.preview;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        // A stray tap outside must not throw away a pasted message; use the X.
        if (e.target === e.currentTarget && !text.trim()) onClose();
      }}
    >
      <div role="dialog" aria-label="Registrar venta desde WhatsApp" className="w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquareText size={16} className="text-green-600" />
            Registrar venta desde WhatsApp
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {!p ? (
            <div>
              <label htmlFor="sale-text" className="block text-xs font-medium text-gray-600 mb-1">
                Pega el mensaje «Venta NN_MM_AAAA»
              </label>
              <textarea
                id="sale-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={9}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Si la venta ya existe (Actualización, nuevo anticipo), se actualiza.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="font-medium text-gray-900">
                  {p.action === 'created' ? 'Nueva venta' : 'Actualiza la venta'}{' '}
                  <span className="font-mono">Venta {p.label}</span>
                  {p.tag ? ` (${p.tag})` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Folio {p.folio} · {ddmmyyyy(p.sale_date)}
                  {p.sheet_duplicates > 0 ? ' · ya está en la hoja: no se cuenta dos veces' : ''}
                </p>
              </div>
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5">
                <dt className="text-gray-500">Cliente</dt>
                <dd className="text-gray-900">{p.customer_name}</dd>
                <dt className="text-gray-500">Ubicación</dt>
                <dd className="text-gray-900">{p.location || '—'}</dd>
                <dt className="text-gray-500">Productos</dt>
                <dd className="text-gray-900">
                  <ul className="space-y-0.5">
                    {p.items.map((i, n) => (
                      <li key={n}>{i.description}{i.unit_price != null ? ` · ${money(i.unit_price)}` : ''}</li>
                    ))}
                  </ul>
                </dd>
                <dt className="text-gray-500">Total</dt>
                <dd className="text-gray-900 font-semibold">{money(p.total)}</dd>
                <dt className="text-gray-500">Pagos</dt>
                <dd className="text-gray-900">
                  {p.payments.length === 0 ? '—' : (
                    <ul className="space-y-0.5">
                      {p.payments.map((pay, n) => (
                        <li key={n}>
                          {pay.label}: {money(pay.amount)} · {ddmmyyyy(pay.date)}
                          {pay.method ? ` · ${pay.method}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
                <dt className="text-gray-500">Por cobrar</dt>
                <dd className={p.pending > 0 ? 'text-red-600 font-semibold' : 'text-green-700'}>
                  {p.pending > 0 ? money(p.pending) : 'Liquidada'}
                </dd>
              </dl>
              {p.quote && (
                <label className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50 p-3 text-green-900">
                  <input
                    type="checkbox"
                    checked={linkQuote}
                    onChange={(e) => setLinkQuote(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Cierra la cotización <span className="font-mono">{p.quote.quote_number}</span> ({p.quote.customer_name})
                    {p.quote.status !== 'accepted' ? ': pasa a Aceptada' : ''}
                  </span>
                </label>
              )}
              {preview.warnings.length > 0 && (
                <ul className="rounded-lg bg-amber-50 border border-amber-100 p-3 space-y-1">
                  {preview.warnings.map((w) => (
                    <li key={w} className="text-xs text-amber-800 flex gap-1.5">
                      <AlertTriangle size={14} className="shrink-0 mt-px" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          {!p ? (
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
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => run(false)}
                disabled={busy}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {busy ? 'Guardando...' : p.action === 'created' ? 'Registrar venta' : 'Actualizar venta'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
