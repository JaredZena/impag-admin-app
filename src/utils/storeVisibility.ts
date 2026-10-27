// «Mostrar en la tienda»: which todoparaelcampo.com.mx pages are on the store.
//
// Two sources, merged per page:
// - public/store-pages.json on the store: every page as the LAST PUBLISH left
//   it (written by the storefront sync, hidden pages included);
// - GET /storefront/pages/visibility (impag-quot): what the team switched,
//   which reaches the store on the next «Publicar en tienda».
// A page whose switch differs from the published state is "pending".

import { STORE_BASE_URL } from '@/hooks/useStoreLinks';
import { apiRequest, ApiError } from '@/utils/api';

/** What a shopper can do on the page: buy now, see a verified price, or ask an engineer. */
export type StorePageState = 'online' | 'price' | 'ask';

export interface StorePage {
  handle: string;
  title: string;
  category: string;
  category_slug: string;
  image: string | null;
  backend_id: number | null;
  state: StorePageState;
  hidden: boolean;
}

export interface VisibilityRow {
  handle: string;
  hidden: boolean;
  note: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export interface StorePageView extends StorePage {
  /** The switch: true = on the store (after the next publish). */
  shown: boolean;
  /** The switch differs from what the store shows today. */
  pending: boolean;
  row: VisibilityRow | null;
}

const STATES: readonly StorePageState[] = ['online', 'price', 'ask'];

function isStorePage(p: unknown): p is StorePage {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.handle === 'string' &&
    typeof o.title === 'string' &&
    typeof o.hidden === 'boolean' &&
    STATES.includes(o.state as StorePageState)
  );
}

/** store-pages.json → pages; anything malformed is dropped, a bad file is []. */
export function parseStorePages(data: unknown): StorePage[] {
  const pages = data && typeof data === 'object' ? (data as { pages?: unknown }).pages : undefined;
  if (!Array.isArray(pages)) return [];
  return pages.filter(isStorePage).map((p) => ({
    ...p,
    category: typeof p.category === 'string' ? p.category : '',
    category_slug: typeof p.category_slug === 'string' ? p.category_slug : '',
    image: typeof p.image === 'string' ? p.image : null,
    backend_id: Number.isInteger(p.backend_id) ? p.backend_id : null,
  }));
}

export function mergeVisibility(pages: readonly StorePage[], rows: readonly VisibilityRow[]): StorePageView[] {
  const byHandle = new Map(rows.map((r) => [r.handle, r]));
  return pages.map((p) => {
    const row = byHandle.get(p.handle) ?? null;
    const shown = row ? !row.hidden : !p.hidden;
    return { ...p, shown, pending: shown === p.hidden, row };
  });
}

export type VisibilityFilter = 'all' | 'shown' | 'hidden' | 'pending';

/** Accent- and case-insensitive search over title and handle, plus the filter chips. */
export function filterPages(
  pages: readonly StorePageView[],
  query: string,
  filter: VisibilityFilter,
  category: string,
): StorePageView[] {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  return pages.filter((p) => {
    if (category && p.category_slug !== category) return false;
    if (filter === 'shown' && !p.shown) return false;
    if (filter === 'hidden' && p.shown) return false;
    if (filter === 'pending' && !p.pending) return false;
    const text = fold(`${p.title} ${p.handle}`);
    return words.every((w) => text.includes(w));
  });
}

export const fetchStorePages = async (): Promise<StorePage[]> => {
  const res = await fetch(`${STORE_BASE_URL}/store-pages.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo leer la lista de la tienda.');
  return parseStorePages(await res.json());
};

export const fetchVisibilityRows = async (): Promise<VisibilityRow[]> => {
  const data = await apiRequest('/storefront/pages/visibility');
  return Array.isArray(data?.pages) ? (data.pages as VisibilityRow[]) : [];
};

export const saveVisibility = async (handle: string, hidden: boolean, note?: string): Promise<VisibilityRow> => {
  try {
    return await apiRequest('/storefront/pages/visibility', {
      method: 'PUT',
      body: JSON.stringify({ handle, hidden, note: note ?? null }),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) throw new Error('No se pudo guardar: la página no es válida.');
    throw err instanceof Error ? err : new Error('No se pudo guardar.');
  }
};
