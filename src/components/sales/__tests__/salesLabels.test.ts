import { describe, expect, test } from 'vitest';
import { daysAgoLabel, saleReasonLabel, ventaNumberLabel } from '../salesLabels';

describe('saleReasonLabel', () => {
  test('translates the sheet sync reasons to Spanish', () => {
    expect(saleReasonLabel('missing/zero amount')).toBe('falta el monto');
    expect(saleReasonLabel('future date (2027-03-05)')).toBe('fecha en el futuro (05 mar 2027)');
    expect(saleReasonLabel('parser error: list index out of range; boom')).toBe('no se pudo leer la fila');
    expect(saleReasonLabel('missing/unparseable date (32 de sep)')).toBe('falta la fecha o no se entiende («32 de sep»)');
  });

  test('joins several reasons and keeps unknown or Spanish text as is', () => {
    expect(saleReasonLabel('missing/unparseable date; missing/zero amount')).toBe(
      'falta la fecha o no se entiende · falta el monto',
    );
    expect(saleReasonLabel('duplicado: capturado en POS')).toBe('duplicado: capturado en POS');
    expect(saleReasonLabel('something new')).toBe('something new');
    expect(saleReasonLabel(null)).toBe('—');
  });
});

describe('ventaNumberLabel', () => {
  test('reads Venta NN_MM_YYYY as the sale number of the month', () => {
    expect(ventaNumberLabel('Venta 11_09_2026')).toBe('#11 · sep 2026');
    expect(ventaNumberLabel('duplicado: registrada desde WhatsApp (Venta 01_10_2026)')).toBe('#1 · oct 2026');
  });

  test('ignores text without a Venta reference', () => {
    expect(ventaNumberLabel('110926DGO')).toBeNull();
    expect(ventaNumberLabel('Venta 11_13_2026')).toBeNull();
    expect(ventaNumberLabel(null)).toBeNull();
  });
});

test('daysAgoLabel counts whole days since the sale', () => {
  const today = new Date('2026-10-03T15:00:00');
  expect(daysAgoLabel('2026-10-03', today)).toBe('hoy');
  expect(daysAgoLabel('2026-10-02', today)).toBe('ayer');
  expect(daysAgoLabel('2026-09-11', today)).toBe('hace 22 días');
});
