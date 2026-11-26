import { describe, expect, test } from 'vitest';
import type { OnlineSale } from '@/types/api';
import {
  defaultOnlineSaleInput,
  deriveSaleBadge,
  estimateStorePrice,
  isOnlineSaleDesired,
  notVerifiedLabel,
  saleReasonLabel,
  unitLabelFromProductUnit,
  validateOnlineSaleInput,
  type SaleStatusEntry,
} from '../onlineSale';

const config = (overrides: Partial<OnlineSale> = {}): OnlineSale => ({
  enabled: true,
  unit_label: 'metro',
  delivery: ['recoger'],
  min_qty: 1,
  max_qty: 50,
  stock_status: 'in_stock',
  updated_by: 'hernan@impag.mx',
  updated_at: '2026-09-29T12:00:00Z',
  ...overrides,
});

const status = (buyable: boolean, reasons: string[] = []): SaleStatusEntry => ({
  handle: 'cinta-de-riego',
  buyable,
  reasons,
});

describe('isOnlineSaleDesired', () => {
  test('saved config wins over what the store does', () => {
    expect(isOnlineSaleDesired(config({ enabled: true }), [])).toBe(true);
    expect(isOnlineSaleDesired(config({ enabled: false }), [status(true)])).toBe(false);
  });

  test('legacy products (no config) follow the store', () => {
    expect(isOnlineSaleDesired(null, [status(true)])).toBe(true);
    expect(isOnlineSaleDesired(null, [status(false, ['disabled'])])).toBe(false);
    expect(isOnlineSaleDesired(undefined, [])).toBe(false);
    expect(isOnlineSaleDesired(null, null)).toBe(false);
  });
});

describe('deriveSaleBadge', () => {
  test('buyable and desired -> En venta (green)', () => {
    expect(deriveSaleBadge(config(), [status(true)])).toEqual({ kind: 'live', label: 'En venta' });
    // the 4 products enabled outside the admin
    expect(deriveSaleBadge(null, [status(true)]).kind).toBe('live');
  });

  test('desired on but only "disabled" or no entry yet -> pending publish', () => {
    const pending = { kind: 'pending', label: 'Pendiente: pulsa Publicar' };
    expect(deriveSaleBadge(config(), [status(false, ['disabled'])])).toEqual(pending);
    expect(deriveSaleBadge(config(), [])).toEqual(pending);
    expect(deriveSaleBadge(config(), null)).toEqual(pending);
    expect(deriveSaleBadge(config(), [status(false, [])])).toEqual(pending);
  });

  test('desired on and blocked by real reasons -> red with Spanish reason', () => {
    const badge = deriveSaleBadge(config(), [status(false, ['disabled', 'not_verified'])]);
    expect(badge.kind).toBe('blocked');
    expect(badge.label).toBe(
      'No se puede vender: el precio no está verificado (revisa costo y margen)',
    );
  });

  test('multiple reasons across handles are de-duplicated and joined', () => {
    const badge = deriveSaleBadge(config(), [
      status(false, ['iva_unknown', 'currency']),
      { handle: 'otra', buyable: false, reasons: ['currency'] },
    ]);
    expect(badge.label).toBe(
      'No se puede vender: falta indicar si lleva IVA; el precio no está en pesos',
    );
  });

  test('any buyable handle counts as on sale', () => {
    const badge = deriveSaleBadge(config(), [
      status(false, ['mapping_not_confirmed']),
      { handle: 'otra', buyable: true, reasons: [] },
    ]);
    expect(badge.kind).toBe('live');
  });

  test('off and not sold -> off', () => {
    expect(deriveSaleBadge(config({ enabled: false }), [status(false, ['disabled'])]).kind).toBe('off');
    expect(deriveSaleBadge(null, []).kind).toBe('off');
  });

  test('turned off here but store still sells it -> needs publish', () => {
    const badge = deriveSaleBadge(config({ enabled: false }), [status(true)]);
    expect(badge.kind).toBe('stopping');
    expect(badge.label).toMatch(/Publicar/);
  });
});

describe('saleReasonLabel', () => {
  test('maps known codes and falls back for unknown ones', () => {
    expect(saleReasonLabel('not_tier1')).toBe(
      'este producto aún no está habilitado para venta en línea (pide a Jared)',
    );
    expect(saleReasonLabel('unit_mismatch')).toBe('falta la unidad del producto');
    expect(saleReasonLabel('algo_nuevo')).toBe('motivo: algo_nuevo');
  });
});

describe('unitLabelFromProductUnit', () => {
  test('maps ProductUnit enum values to Spanish labels', () => {
    expect(unitLabelFromProductUnit('PIEZA')).toBe('pieza');
    expect(unitLabelFromProductUnit('METRO')).toBe('metro');
    expect(unitLabelFromProductUnit('KG')).toBe('kg');
    expect(unitLabelFromProductUnit('ROLLO')).toBe('rollo');
    expect(unitLabelFromProductUnit('PAQUETE')).toBe('paquete');
    expect(unitLabelFromProductUnit('KIT')).toBe('kit');
  });

  test('missing unit defaults to pieza; unknown is lowercased', () => {
    expect(unitLabelFromProductUnit(undefined)).toBe('pieza');
    expect(unitLabelFromProductUnit('N/A')).toBe('pieza');
    expect(unitLabelFromProductUnit('LITRO')).toBe('litro');
  });
});

describe('defaultOnlineSaleInput', () => {
  test('prefills from saved config', () => {
    const input = defaultOnlineSaleInput(
      config({ unit_label: 'rollo de 100 m', min_qty: 2, max_qty: 10, stock_status: 'backorder' }),
      'METRO',
    );
    expect(input).toEqual({
      enabled: true,
      unit_label: 'rollo de 100 m',
      delivery: ['recoger'],
      min_qty: 2,
      max_qty: 10,
      stock_status: 'backorder',
    });
  });

  test('defaults when never configured', () => {
    expect(defaultOnlineSaleInput(null, 'METRO')).toEqual({
      enabled: false,
      unit_label: 'metro',
      delivery: ['recoger'],
      min_qty: 1,
      max_qty: 50,
      stock_status: 'in_stock',
    });
  });
});

describe('validateOnlineSaleInput', () => {
  const valid = defaultOnlineSaleInput(null, 'PIEZA');

  test('accepts defaults', () => {
    expect(validateOnlineSaleInput(valid)).toBeNull();
  });

  test('rejects what the backend would 422', () => {
    expect(validateOnlineSaleInput({ ...valid, unit_label: '  ' })).not.toBeNull();
    expect(validateOnlineSaleInput({ ...valid, delivery: [] })).not.toBeNull();
    expect(validateOnlineSaleInput({ ...valid, min_qty: 0 })).not.toBeNull();
    expect(validateOnlineSaleInput({ ...valid, max_qty: 10000 })).not.toBeNull();
    expect(validateOnlineSaleInput({ ...valid, min_qty: 1.5 })).not.toBeNull();
    expect(validateOnlineSaleInput({ ...valid, min_qty: NaN })).not.toBeNull();
    expect(validateOnlineSaleInput({ ...valid, min_qty: 20, max_qty: 10 })).not.toBeNull();
  });
});

describe('estimateStorePrice', () => {
  test('adds 16% IVA when the product carries IVA', () => {
    expect(estimateStorePrice(100, true, 'MXN')).toBe(116);
    expect(estimateStorePrice(12.34, true)).toBe(14.31);
  });

  test('keeps the price when it has no IVA', () => {
    expect(estimateStorePrice(100, false, 'MXN')).toBe(100);
  });

  test('null when it cannot be computed simply', () => {
    expect(estimateStorePrice(null, true)).toBeNull();
    expect(estimateStorePrice(0, true)).toBeNull();
    expect(estimateStorePrice(100, true, 'USD')).toBeNull();
    expect(estimateStorePrice(100, null)).toBeNull();
  });
});

describe('notVerifiedLabel', () => {
  test('price under cost + margin names both numbers and what to change', () => {
    // #962 malacate on 11-26: $2,500 vs floor $2,924.27 at 25%
    expect(notVerifiedLabel({ price: 2500, floor: 2924.27, margin: 0.25 })).toBe(
      'el precio $2,500.00 está abajo del mínimo $2,924.27 (costo + 25% de margen); sube el precio o baja el Margen por defecto',
    );
  });

  test('no margin known still gives the minimum', () => {
    expect(notVerifiedLabel({ price: 100, floor: 200, margin: null })).toContain('mínimo $200.00 (costo + margen)');
  });

  test('no cost linked -> link a cost', () => {
    expect(notVerifiedLabel({ price: 5689.66, floor: null, margin: 0.25 })).toBe(
      'el precio no tiene costo de proveedor ligado; liga un costo para que se verifique',
    );
    expect(notVerifiedLabel({ price: 10, floor: 0 })).toContain('costo de proveedor ligado');
  });

  test('price already at the floor (within 2%) -> publish', () => {
    expect(notVerifiedLabel({ price: 2900, floor: 2924.27, margin: 0.25 })).toContain('pulsa Publicar');
    expect(notVerifiedLabel({ price: 3000, floor: 2924.27, margin: 0.25 })).toContain('pulsa Publicar');
  });

  test('badge uses it only when the row passes pricing', () => {
    const blocked = [status(false, ['not_verified', 'iva_unknown'])];
    expect(deriveSaleBadge(config(), blocked, { price: 2500, floor: 2924.27, margin: 0.25 }).label).toBe(
      'No se puede vender: el precio $2,500.00 está abajo del mínimo $2,924.27 (costo + 25% de margen); sube el precio o baja el Margen por defecto; falta indicar si lleva IVA',
    );
    expect(deriveSaleBadge(config(), blocked).label).toBe(
      'No se puede vender: el precio no está verificado (revisa costo y margen); falta indicar si lleva IVA',
    );
  });
});
