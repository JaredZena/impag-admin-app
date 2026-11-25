import { describe, expect, it } from 'vitest';
import { newPageBlock, slugify, uniqueHandle, type NewPageRow } from '@/utils/storeNewPage';
import { parseStorePages, type StorePage } from '@/utils/storeVisibility';

const page = (handle: string, extra: Partial<StorePage> = {}): StorePage => ({
  handle,
  title: handle,
  category: 'Invernaderos y Cubiertas Agrícolas',
  category_slug: 'invernaderos-cubiertas',
  image: null,
  backend_id: null,
  state: 'ask',
  hidden: false,
  admin_page: false,
  ...extra,
});

const row = (handle: string, productId: number): NewPageRow => ({
  handle,
  product_id: productId,
  product_name: 'x',
  title: 'x',
  category_slug: 'invernaderos-cubiertas',
  created_by: 'hernan@x',
  created_at: null,
});

describe('«Nueva página» addresses', () => {
  it('turns a store name into a plain ASCII address', () => {
    expect(slugify('PLÁSTICOS VERDE CLOROFILA AL 30% DE SOMBRA ANCHO 6.2')).toBe(
      'plasticos-verde-clorofila-al-30-de-sombra-ancho-6-2',
    );
    expect(slugify('  Piñón — Calefactor® L.B. White K175™  ')).toBe('pinon-calefactor-l-b-white-k175');
    expect(slugify('Ñandú «Ácido» Fosfórico 85%')).toBe('nandu-acido-fosforico-85');
  });

  it('cuts very long names at a word', () => {
    const long = slugify('Malla '.repeat(40));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith('-')).toBe(false);
    expect(long.startsWith('malla-malla')).toBe(true);
  });

  it('never reuses an address and falls back when the name has no letters', () => {
    const taken = new Set(['plastico-verde', 'plastico-verde-2']);
    expect(uniqueHandle('Plástico verde', 9, taken)).toBe('plastico-verde-3');
    expect(uniqueHandle('Plástico azul', 9, taken)).toBe('plastico-azul');
    expect(uniqueHandle('®™', 946, taken)).toBe('producto-946');
    expect(uniqueHandle('', 946, new Set(['producto-946']))).toBe('producto-946-2');
  });
});

describe('«Nueva página» checks', () => {
  const pages = [page('ya-esta', { backend_id: 463, title: 'Plástico blanco' })];

  it('blocks a product that already has a page, was already requested or has no photo', () => {
    expect(newPageBlock({ id: 463, images_count: 2 }, pages, [])).toMatchObject({ kind: 'has_page' });
    expect(newPageBlock({ id: 946, images_count: 1 }, pages, [row('nueva', 946)])).toMatchObject({ kind: 'requested' });
    expect(newPageBlock({ id: 946, images_count: 0 }, pages, [])).toEqual({ kind: 'no_photo' });
    expect(newPageBlock({ id: 946 }, pages, [])).toEqual({ kind: 'no_photo' });
    expect(newPageBlock({ id: 946, images_count: 1 }, pages, [])).toBeNull();
  });

  it('reads admin_page from store-pages.json', () => {
    const parsed = parseStorePages({ pages: [page('a', { admin_page: true }), { ...page('b'), admin_page: 'yes' }] });
    expect(parsed.map((p) => p.admin_page)).toEqual([true, false]);
  });
});
