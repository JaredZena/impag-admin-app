// Edición de productos de una cotización ya creada (QuoteItemsEditor).
// El backend (impag-quot routes/quotes.py) recalcula los totales en cada cambio
// y rechaza con 409 los cambios a una cotización aceptada, pagada o cerrada.
import type { CreateQuoteItemPayload, Quote, QuoteItem } from '@/types/quotes';
import type { WebOrderDetails } from '@/utils/webOrder';

export interface DraftRow {
  key: string;
  /** null = línea nueva. */
  id: number | null;
  description: string;
  quantity: string;
  unit_price: string;
  iva_applicable: boolean;
  deleted: boolean;
}

const EDITABLE_STATUSES = ['draft', 'sent', 'viewed', 'needs_work'];
const IVA = 0.16;

export function canEditItems(quote: Pick<Quote, 'status' | 'payment_status'>): boolean {
  return (
    EDITABLE_STATUSES.includes(quote.status) &&
    !['approved', 'mismatch'].includes(String(quote.payment_status ?? ''))
  );
}

export function rowsFromItems(items: QuoteItem[]): DraftRow[] {
  return [...items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      key: `item-${item.id}`,
      id: item.id,
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
      iva_applicable: item.iva_applicable,
      deleted: false,
    }));
}

let newKey = 0;
export function newRow(description = ''): DraftRow {
  newKey += 1;
  return { key: `new-${newKey}`, id: null, description, quantity: '1', unit_price: '', iva_applicable: true, deleted: false };
}

function num(value: string): number {
  const n = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/** Primer problema que impide guardar, o null. */
export function validateRows(rows: DraftRow[]): string | null {
  const live = rows.filter((r) => !r.deleted);
  if (live.length === 0) return 'La cotización necesita al menos un producto.';
  for (const r of live) {
    if (!r.description.trim()) return 'Cada línea necesita una descripción.';
    const q = num(r.quantity);
    if (!(q > 0)) return `Cantidad no válida en «${r.description.trim()}».`;
    const p = num(r.unit_price);
    if (r.unit_price.trim() === '' || !(p >= 0)) return `Precio no válido en «${r.description.trim()}».`;
  }
  return null;
}

export interface ItemChanges {
  adds: CreateQuoteItemPayload[];
  updates: { id: number; payload: Partial<CreateQuoteItemPayload> }[];
  deletes: number[];
}

/** Lo que hay que mandar al backend para que los productos queden como `rows`. */
export function planChanges(items: QuoteItem[], rows: DraftRow[]): ItemChanges {
  const byId = new Map(items.map((i) => [i.id, i]));
  const changes: ItemChanges = { adds: [], updates: [], deletes: [] };
  let nextOrder = Math.max(0, ...items.map((i) => i.sort_order)) + 1;
  for (const r of rows) {
    if (r.id === null) {
      if (r.deleted) continue;
      changes.adds.push({
        description: r.description.trim(),
        quantity: num(r.quantity),
        unit_price: num(r.unit_price),
        iva_applicable: r.iva_applicable,
        sort_order: nextOrder++,
      });
      continue;
    }
    if (r.deleted) {
      changes.deletes.push(r.id);
      continue;
    }
    const item = byId.get(r.id);
    if (!item) continue;
    const payload: Partial<CreateQuoteItemPayload> = {};
    if (r.description.trim() !== item.description) payload.description = r.description.trim();
    if (num(r.quantity) !== item.quantity) payload.quantity = num(r.quantity);
    if (num(r.unit_price) !== item.unit_price) payload.unit_price = num(r.unit_price);
    if (r.iva_applicable !== item.iva_applicable) payload.iva_applicable = r.iva_applicable;
    if (Object.keys(payload).length > 0) changes.updates.push({ id: r.id, payload });
  }
  return changes;
}

export function hasChanges(changes: ItemChanges): boolean {
  return changes.adds.length + changes.updates.length + changes.deletes.length > 0;
}

/** Totales como los calcula el backend (recalculate_totals), para la vista previa. */
export function previewTotals(rows: DraftRow[]): { subtotal: number; iva: number; total: number } {
  let subtotal = 0;
  let iva = 0;
  for (const r of rows) {
    if (r.deleted) continue;
    const line = (num(r.quantity) || 0) * (num(r.unit_price) || 0);
    subtotal += line;
    if (r.iva_applicable) iva += line * IVA;
  }
  return { subtotal, iva, total: subtotal + iva };
}

/** El cliente pidió flete y ninguna línea lo cobra todavía. */
export function needsFleteLine(details: WebOrderDetails | null, descriptions: string[]): boolean {
  if (details?.delivery?.method !== 'flete') return false;
  return !descriptions.some((d) => /flete|env[ií]o/i.test(d));
}

export function fleteDescription(details: WebOrderDetails | null): string {
  const a = details?.delivery?.address;
  const place = [a?.municipio, a?.estado].filter(Boolean).join(', ');
  return place ? `Flete a ${place}` : 'Flete';
}
