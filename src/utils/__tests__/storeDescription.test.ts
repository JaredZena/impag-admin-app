import { describe, expect, it } from 'vitest';
import { sameStoreRows, storeLines, storeRows } from '../storeDescription';

describe('storeRows', () => {
  it('reads headings, spec rows, bullets and paragraphs like the store page', () => {
    const text = [
      'Trampa para la mosca del gusano barrenador.',
      '',
      'Especificaciones:',
      '  Material:   PET ',
      'Capacidad: 2 L',
      '- Reutilizable',
      '- Incluye   gancho',
      'Sustantivo:',
      'Hecha en México',
    ].join('\n');
    expect(storeRows(text)).toEqual([
      { type: 'text', text: 'Trampa para la mosca del gusano barrenador.' },
      { type: 'header', text: 'Especificaciones' },
      { type: 'spec', label: 'Material', value: 'PET' },
      { type: 'spec', label: 'Capacidad', value: '2 L' },
      { type: 'bullets', items: ['Reutilizable', 'Incluye gancho'] },
      { type: 'text', text: 'Hecha en México' },
    ]);
  });

  it('keeps a line with a number before the colon as a paragraph, like the store', () => {
    // The store treats "Clave:" as a heading only without digits or dashes.
    expect(storeRows('Modelo 2024:')).toEqual([{ type: 'text', text: 'Modelo 2024:' }]);
  });

  it('turns angle brackets into look-alikes the page will not strip', () => {
    expect(storeLines('Presión: <2 bar>')).toEqual(['Presión: ‹2 bar›']);
  });
});

describe('sameStoreRows', () => {
  it('ignores spacing and blank lines', () => {
    expect(sameStoreRows('Material:  PET\n\n- Reutilizable ', 'Material: PET\n- Reutilizable')).toBe(true);
    expect(sameStoreRows('Material: PET', 'Material: PVC')).toBe(false);
  });
});
