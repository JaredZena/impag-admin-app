import { describe, expect, test } from 'vitest';
import type { QuoteItem } from '@/types/quotes';
import type { WebOrderDetails } from '@/utils/webOrder';
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
} from '../quoteItemsEdit';

function item(overrides: Partial<QuoteItem> = {}): QuoteItem {
  return {
    id: 1,
    quote_id: 29,
    product_id: null,
    supplier_product_id: null,
    description: 'Bolsa de geomembrana PVC 10,000 L',
    sku: null,
    quantity: 1,
    unit: null,
    unit_price: 12600,
    iva_applicable: true,
    discount_percent: null,
    discount_amount: null,
    notes: null,
    sort_order: 0,
    line_total: 12600,
    ...overrides,
  };
}

const FLETE_ORDER = {
  delivery: {
    method: 'flete',
    address: { street: 'Carretera Nacional', number: 'KM 202', colonia: null, cp: '59514', municipio: 'Jiquilpan', estado: 'Michoacán', references: null },
    cost_total: 0,
  },
} as unknown as WebOrderDetails;

describe('quoteItemsEdit', () => {
  test('items are editable while the quote is open and unpaid', () => {
    expect(canEditItems({ status: 'draft', payment_status: null })).toBe(true);
    expect(canEditItems({ status: 'viewed', payment_status: 'checkout' })).toBe(true);
    expect(canEditItems({ status: 'needs_work', payment_status: null })).toBe(true);
    expect(canEditItems({ status: 'accepted', payment_status: null })).toBe(false);
    expect(canEditItems({ status: 'sent', payment_status: 'approved' })).toBe(false);
    expect(canEditItems({ status: 'expired', payment_status: null })).toBe(false);
  });

  test('plans only what changed: price an item, add the flete, drop a line', () => {
    const items = [item(), item({ id: 2, description: 'Sin precio', unit_price: 0, sort_order: 1 })];
    const rows = rowsFromItems(items);
    rows[0].unit_price = '12600';
    rows[1].deleted = true;
    const flete = { ...newRow('Flete a Jiquilpan, Michoacán'), unit_price: '4,500' };
    const changes = planChanges(items, [...rows, flete]);
    expect(changes.updates).toEqual([]);
    expect(changes.deletes).toEqual([2]);
    expect(changes.adds).toEqual([
      { description: 'Flete a Jiquilpan, Michoacán', quantity: 1, unit_price: 4500, iva_applicable: true, sort_order: 2 },
    ]);
    const priced = rowsFromItems(items);
    priced[1].unit_price = '350.5';
    expect(planChanges(items, priced).updates).toEqual([{ id: 2, payload: { unit_price: 350.5 } }]);
    expect(hasChanges(planChanges(items, rowsFromItems(items)))).toBe(false);
  });

  test('validation catches empty, zero and negative lines', () => {
    const rows = rowsFromItems([item()]);
    expect(validateRows(rows)).toBeNull();
    expect(validateRows([{ ...rows[0], deleted: true }])).toMatch(/al menos un producto/);
    expect(validateRows([{ ...rows[0], description: ' ' }])).toMatch(/descripción/);
    expect(validateRows([{ ...rows[0], quantity: '0' }])).toMatch(/Cantidad/);
    expect(validateRows([{ ...rows[0], unit_price: '' }])).toMatch(/Precio/);
    expect(validateRows([{ ...rows[0], unit_price: '-5' }])).toMatch(/Precio/);
  });

  test('preview totals match the backend (16% IVA only where it applies)', () => {
    const rows = [
      { ...newRow('a'), quantity: '2', unit_price: '100' },
      { ...newRow('b'), quantity: '1', unit_price: '50', iva_applicable: false },
    ];
    expect(previewTotals(rows)).toEqual({ subtotal: 250, iva: 32, total: 282 });
  });

  test('a flete request without a flete line is flagged, with a ready description', () => {
    expect(needsFleteLine(FLETE_ORDER, ['Bolsa de geomembrana'])).toBe(true);
    expect(needsFleteLine(FLETE_ORDER, ['Bolsa', 'Flete a Jiquilpan'])).toBe(false);
    expect(needsFleteLine(null, ['Bolsa'])).toBe(false);
    expect(fleteDescription(FLETE_ORDER)).toBe('Flete a Jiquilpan, Michoacán');
    expect(fleteDescription(null)).toBe('Flete');
  });
});
