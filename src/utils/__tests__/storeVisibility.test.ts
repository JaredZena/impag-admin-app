import { describe, expect, it } from 'vitest';
import { filterPages, mergeVisibility, parseStorePages, type StorePage } from '@/utils/storeVisibility';

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
