import { useState } from 'react';
import { Pencil, Plus, Trash2, Truck } from 'lucide-react';
import type { Quote } from '@/types/quotes';
import type { WebOrderDetails } from '@/utils/webOrder';
import { addQuoteItem, deleteQuoteItem, getQuote, updateQuoteItem } from '@/utils/quotesApi';
import {
  canEditItems,
  fleteDescription,
  hasChanges,
  needsFleteLine,
  newRow,
  planChanges,
  previewTotals,
  rowsFromItems,
  validateRows,
  type DraftRow,
} from '@/utils/quoteItemsEdit';
import QuoteItemRow from './QuoteItemRow';

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const INPUT = 'text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500';

interface Props {
  quote: Quote;
  webOrder: WebOrderDetails | null;
  onChanged: (quote: Quote) => void;
}

/** Productos de la cotización; en borrador o abierta se pueden editar y agregar líneas (p. ej. el flete). */
export default function QuoteItemsEditor({ quote, webOrder, onChanged }: Props) {
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = canEditItems(quote);
  const missingFlete = needsFleteLine(webOrder, quote.items.map((i) => i.description));

  const startEditing = (withFlete = false) => {
    const base = rowsFromItems(quote.items);
    setRows(withFlete ? [...base, newRow(fleteDescription(webOrder))] : base);
    setError(null);
  };

  const patch = (key: string, change: Partial<DraftRow>) =>
    setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, ...change } : r)) ?? prev);

  const save = async () => {
    if (!rows) return;
    const problem = validateRows(rows);
    if (problem) {
      setError(problem);
      return;
    }
    const changes = planChanges(quote.items, rows);
    if (!hasChanges(changes)) {
      setRows(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Altas primero: la cotización nunca se queda sin productos a medio guardar.
      for (const add of changes.adds) await addQuoteItem(quote.id, add);
      for (const { id, payload } of changes.updates) await updateQuoteItem(quote.id, id, payload);
      for (const id of changes.deletes) await deleteQuoteItem(quote.id, id);
      setRows(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los productos');
    } finally {
      // Lo guardado hasta el error ya está en el backend: refresca siempre.
      try {
        onChanged(await getQuote(quote.id));
      } catch {
        /* la próxima carga lo mostrará */
      }
      setSaving(false);
    }
  };

  const preview = rows ? previewTotals(rows) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Productos</h2>
        {editable && !rows && (
          <button
            onClick={() => startEditing()}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
          >
            <Pencil size={14} /> Editar productos
          </button>
        )}
      </div>

      {editable && !rows && missingFlete && (
        <div className="mb-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900">
          <span>El cliente pidió envío y la cotización todavía no cobra el flete.</span>
          <button
            onClick={() => startEditing(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-amber-900 underline"
          >
            <Truck size={14} /> Agregar flete
          </button>
        </div>
      )}

      {!rows ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Descripción</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase py-2">Cant.</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Precio</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <QuoteItemRow key={item.id} item={item} onUpdate={() => {}} onDelete={() => {}} editable={false} />
            ))}
          </tbody>
        </table>
      ) : (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            Precios unitarios <strong>sin IVA</strong>.
            {quote.access_token && ' El cliente ve los cambios en su enlace en cuanto guardes.'}
          </p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Descripción</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase py-2">Cant.</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Precio</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase py-2">IVA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.filter((r) => !r.deleted).map((r) => (
                <tr key={r.key} className="border-b border-gray-100">
                  <td className="py-2 pr-2">
                    <input
                      aria-label="Descripción"
                      value={r.description}
                      onChange={(e) => patch(r.key, { description: e.target.value })}
                      className={`w-full ${INPUT}`}
                      placeholder="Descripción (p. ej. Flete a Jiquilpan, Mich.)"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      aria-label="Cantidad"
                      value={r.quantity}
                      onChange={(e) => patch(r.key, { quantity: e.target.value })}
                      inputMode="decimal"
                      className={`w-20 text-center ${INPUT}`}
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      aria-label="Precio unitario sin IVA"
                      value={r.unit_price}
                      onChange={(e) => patch(r.key, { unit_price: e.target.value })}
                      inputMode="decimal"
                      placeholder="0.00"
                      className={`w-28 text-right ${INPUT}`}
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      aria-label="Lleva IVA"
                      checked={r.iva_applicable}
                      onChange={(e) => patch(r.key, { iva_applicable: e.target.checked })}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="py-2 pl-1 text-right">
                    <button
                      onClick={() => patch(r.key, { deleted: true })}
                      aria-label={`Quitar ${r.description || 'línea'}`}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center gap-4 mt-3">
            <button
              onClick={() => setRows((prev) => [...(prev ?? []), newRow()])}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus size={14} /> Agregar línea
            </button>
            {needsFleteLine(webOrder, rows.filter((r) => !r.deleted).map((r) => r.description)) && (
              <button
                onClick={() => setRows((prev) => [...(prev ?? []), newRow(fleteDescription(webOrder))])}
                className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900"
              >
                <Truck size={14} /> Agregar flete
              </button>
            )}
          </div>

          {preview && (
            <p className="mt-3 text-sm text-gray-600 text-right">
              Nuevo total: <strong className="text-gray-900">{money(preview.total)}</strong>
              <span className="text-gray-400"> ({money(preview.subtotal)} + IVA {money(preview.iva)})</span>
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-600 text-right">{error}</p>}
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setRows(null)}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar productos'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
