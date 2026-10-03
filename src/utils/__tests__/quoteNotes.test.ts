import { describe, expect, test } from 'vitest';
import { parseQuoteNotes, whatsappLink } from '../quoteNotes';

describe('parseQuoteNotes', () => {
  test('splits what is quoted from the history', () => {
    const p = parseQuoteNotes(
      [
        'Material/Proyecto: Sistema de Riego e Invernadero 1 ha',
        'Datos: Área: 1 Ha Cultivo: Jitomate',
        '[Solicitud] 01/10/2026 desde mensaje de WhatsApp (carga)',
        'Contexto: Proyecto nuevo desde cero',
        '[Reenvío] 02/10/2026 Material/Proyecto: otra cosa (x)',
      ].join('\n')
    );
    expect(p.material).toBe('Sistema de Riego e Invernadero 1 ha');
    expect(p.fields).toEqual([
      { label: 'Datos', value: 'Área: 1 Ha Cultivo: Jitomate' },
      { label: 'Contexto', value: 'Proyecto nuevo desde cero' },
    ]);
    expect(p.history).toHaveLength(2);
  });

  test('plain notes stay as other lines; dash material is ignored', () => {
    const p = parseQuoteNotes('Material/Proyecto: —\nLlamar el lunes');
    expect(p.material).toBeNull();
    expect(p.other).toEqual(['Llamar el lunes']);
    expect(parseQuoteNotes(null).material).toBeNull();
  });
});

test('whatsappLink only for real numbers', () => {
  expect(whatsappLink('+523931312326')).toBe('https://wa.me/523931312326');
  expect(whatsappLink('S/N')).toBeNull();
  expect(whatsappLink(null)).toBeNull();
});
