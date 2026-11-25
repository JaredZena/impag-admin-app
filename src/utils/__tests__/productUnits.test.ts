import { describe, expect, it } from 'vitest';
import { PRODUCT_UNITS, productUnitLabel } from '../productUnits';
import { unitLabelFromProductUnit } from '../onlineSale';

describe('product units', () => {
  it('offers kit, caja and paquete', () => {
    const values = PRODUCT_UNITS.map((u) => u.value);
    expect(values).toEqual(expect.arrayContaining(['KIT', 'CAJA', 'PAQUETE']));
  });

  it('labels a unit for the team, in any case', () => {
    expect(productUnitLabel('CAJA')).toBe('Caja');
    expect(productUnitLabel('kit')).toBe('Kit');
    expect(productUnitLabel('')).toBe('—');
    expect(productUnitLabel('LITRO')).toBe('LITRO');
  });

  it('prints «por caja» on the store side', () => {
    expect(unitLabelFromProductUnit('CAJA')).toBe('caja');
  });
});
