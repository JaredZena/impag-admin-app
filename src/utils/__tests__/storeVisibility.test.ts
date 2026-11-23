import { describe, expect, it } from 'vitest';
import {
  filterPages,
  mergeVisibility,
  parseStorePages,
  priceBlocker,
  searchSeed,
  type StorePage,
} from '@/utils/storeVisibility';

const page = (handle: string, extra: Partial<StorePage> = {}): StorePage => ({
  handle,
  title: handle,
  category: 'Climatización Agrícola',
  category_slug: 'climatizacion-agricola',
  image: null,
  backend_id: null,
  state: 'ask',
  hidden: false,
  ...extra,
});

const row = (handle: string, hidden: boolean) => ({ handle, hidden, note: null, updated_by: 'h@x', updated_at: null });

describe('store visibility', () => {
  it('parses store-pages.json and drops malformed rows', () => {
    const pages = parseStorePages({
      pages: [page('a'), { handle: 'b' }, page('c', { state: 'online', backend_id: 3 }), null, { ...page('d'), state: 'x' }],
    });
    expect(pages.map((p) => p.handle)).toEqual(['a', 'c']);
    expect(pages[1].backend_id).toBe(3);
    for (const bad of [null, {}, { pages: 'x' }, []]) expect(parseStorePages(bad)).toEqual([]);
  });

  it('the switch wins over the published state and marks the difference as pending', () => {
    const views = mergeVisibility(
      [page('hl400'), page('k175', { hidden: true }), page('bloom'), page('k210', { hidden: true })],
      [row('hl400', true), row('k175', false), row('bloom', false), row('no-existe', true)],
    );
    const by = Object.fromEntries(views.map((v) => [v.handle, v]));
    expect([by.hl400.shown, by.hl400.pending]).toEqual([false, true]); // hidden on next publish
    expect([by.k175.shown, by.k175.pending]).toEqual([true, true]); // back on next publish
    expect([by.bloom.shown, by.bloom.pending]).toEqual([true, false]);
    expect([by.k210.shown, by.k210.pending]).toEqual([false, false]); // no row: published state
    expect(views).toHaveLength(4); // rows for unknown pages are ignored
  });

  it('filters by words (accents and case folded), state chip and category', () => {
    const views = mergeVisibility(
      [page('calefactor-hl400', { title: 'Calefactor a Gas HL400' }), page('malla', { title: 'Malla Sombra', category_slug: 'invernaderos' })],
      [row('calefactor-hl400', true)],
    );
    expect(filterPages(views, 'CALEFACTOR gas', 'all', '').map((p) => p.handle)).toEqual(['calefactor-hl400']);
    expect(filterPages(views, 'climatización', 'all', '')).toEqual([]);
    expect(filterPages(views, '', 'hidden', '').map((p) => p.handle)).toEqual(['calefactor-hl400']);
    expect(filterPages(views, '', 'pending', '').map((p) => p.handle)).toEqual(['calefactor-hl400']);
    expect(filterPages(views, '', 'shown', 'invernaderos').map((p) => p.handle)).toEqual(['malla']);
  });
});

describe('«Ligar producto»', () => {
  const link = (handle: string, product_id: number | null) => ({
    handle,
    product_id,
    product_name: product_id ? `P${product_id}` : null,
    updated_by: 'h@x',
    updated_at: null,
  });

  it('the picked product wins over the published one and waits for the publish', () => {
    const views = mergeVisibility(
      [page('plantadora'), page('lay-flat', { backend_id: 499 }), page('trampa', { backend_id: 371 }), page('rafia')],
      [],
      [link('plantadora', 135), link('lay-flat', null), link('trampa', 371), link('no-existe', 9)],
    );
    const by = Object.fromEntries(views.map((v) => [v.handle, v]));
    expect([by.plantadora.productId, by.plantadora.linkPending, by.plantadora.pending]).toEqual([135, true, true]);
    expect([by['lay-flat'].productId, by['lay-flat'].linkPending]).toEqual([null, true]); // unlinked on publish
    expect([by.trampa.productId, by.trampa.linkPending, by.trampa.pending]).toEqual([371, false, false]); // already published
    expect([by.rafia.productId, by.rafia.linkPending]).toEqual([null, false]); // no row: published link
    expect(views).toHaveLength(4);
  });

  it('«Sin ligar» lists pages with no product after the next publish', () => {
    const views = mergeVisibility(
      [page('plantadora'), page('lay-flat', { backend_id: 499 }), page('rafia'), page('trampa', { backend_id: 371 })],
      [],
      [link('plantadora', 135), link('lay-flat', null)],
    );
    expect(filterPages(views, '', 'unlinked', '').map((p) => p.handle)).toEqual(['lay-flat', 'rafia']);
    expect(filterPages(views, '', 'pending', '').map((p) => p.handle)).toEqual(['plantadora', 'lay-flat']);
  });

  it('says why a product would keep the page «a cotizar»', () => {
    const opt = (price: number | null, calculated_price: number | null) => ({
      id: 1,
      name: 'x',
      sku: null,
      unit: 'PIEZA',
      price,
      calculated_price,
    });
    expect(priceBlocker(opt(2500, 1321.05))).toBeNull();
    expect(priceBlocker(opt(1321.05, 1321.05))).toBeNull();
    expect(priceBlocker(opt(2322.88, null))).toMatch(/costo de proveedor/);
    expect(priceBlocker(opt(null, null))).toMatch(/Sin precio/);
    expect(priceBlocker(opt(0, 10))).toMatch(/Sin precio/);
    expect(priceBlocker(opt(500, 600))).toMatch(/abajo del costo/);
  });

  it('starts the search from the first words of the store title', () => {
    expect(searchSeed('Plástico Blanco Lechoso 25% Sombra – Protección y Control de Luz para Invernaderos')).toBe(
      'Plástico Blanco Lechoso 25% Sombra',
    );
    expect(searchSeed('Manguera Lay Flat Wade Rain de 2" (Rollo 91.5 m)')).toBe('Manguera Lay Flat Wade Rain');
    expect(searchSeed('Charola de Alto Rendimiento 338 Cavidades — Caja 50 Piezas')).toBe('Charola de Alto Rendimiento 338');
    expect(searchSeed('KIT CERCO GANADERO SOLAR 3 JOULES')).toBe('KIT CERCO GANADERO SOLAR 3');
    expect(searchSeed('Tubería RD-21 para riego')).toBe('Tubería RD-21 para riego');
    expect(searchSeed('')).toBe('');
  });
});
