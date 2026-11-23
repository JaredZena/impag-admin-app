// «Mostrar en la tienda»: which todoparaelcampo.com.mx pages are on the store.
//
// Two sources, merged per page:
// - public/store-pages.json on the store: every page as the LAST PUBLISH left
//   it (written by the storefront sync, hidden pages included);
// - GET /storefront/pages/visibility (impag-quot): what the team switched,
//   which reaches the store on the next «Publicar en tienda».
// A page whose switch differs from the published state is "pending".
//
// «Ligar producto» works the same way: GET /storefront/pages/links holds the
// product the team picked for a page (or "none"), store-pages.json's
// backend_id is the link the last publish used.

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

/** A link picked in the admin; product_id null = the page has no product. */
export interface LinkRow {
  handle: string;
  product_id: number | null;
  product_name: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export interface StorePageView extends StorePage {
  /** The switch: true = on the store (after the next publish). */
  shown: boolean;
  /** The switch differs from what the store shows today. */
  shownPending: boolean;
  /** The product that prices the page after the next publish (null = none). */
  productId: number | null;
  /** The picked product differs from the one the store uses today. */
  linkPending: boolean;
  /** Either of the above: something waits for «Publicar en tienda». */
  pending: boolean;
  row: VisibilityRow | null;
  linkRow: LinkRow | null;
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

export function mergeVisibility(
  pages: readonly StorePage[],
  rows: readonly VisibilityRow[],
  links: readonly LinkRow[] = [],
): StorePageView[] {
  const byHandle = new Map(rows.map((r) => [r.handle, r]));
  const linkByHandle = new Map(links.map((l) => [l.handle, l]));
  return pages.map((p) => {
    const row = byHandle.get(p.handle) ?? null;
    const linkRow = linkByHandle.get(p.handle) ?? null;
    const shown = row ? !row.hidden : !p.hidden;
    const shownPending = shown === p.hidden;
    const productId = linkRow ? linkRow.product_id : p.backend_id;
    const linkPending = productId !== p.backend_id;
    return { ...p, shown, shownPending, productId, linkPending, pending: shownPending || linkPending, row, linkRow };
  });
}

export type VisibilityFilter = 'all' | 'shown' | 'hidden' | 'unlinked' | 'pending';

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
    if (filter === 'unlinked' && p.productId !== null) return false;
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

export const fetchLinkRows = async (): Promise<LinkRow[]> => {
  const data = await apiRequest('/storefront/pages/links');
  return Array.isArray(data?.links) ? (data.links as LinkRow[]) : [];
};

export const saveLink = async (handle: string, productId: number | null): Promise<LinkRow> => {
  try {
    return await apiRequest('/storefront/pages/link', {
      method: 'PUT',
      body: JSON.stringify({ handle, product_id: productId }),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw new Error('Ese producto ya no está activo en el sistema.');
    if (err instanceof ApiError && err.status === 422) throw new Error('No se pudo guardar: la página no es válida.');
    throw err instanceof Error ? err : new Error('No se pudo guardar.');
  }
};

/** A product the picker offers (GET /products?name=…, the same fuzzy search as Productos). */
export interface ProductOption {
  id: number;
  name: string;
  sku: string | null;
  unit: string | null;
  price: number | null;
  calculated_price: number | null;
}

/** Why a linked page would still say «Precio a cotizar» after publishing, or null when it shows the price. */
export function priceBlocker(p: ProductOption): string | null {
  const price = p.price ?? 0;
  const cost = p.calculated_price ?? 0;
  if (price <= 0) return 'Sin precio: seguirá «a cotizar»';
  if (cost <= 0) return 'Sin costo de proveedor: seguirá «a cotizar»';
  if (price < cost * 0.98) return 'Precio abajo del costo + margen: seguirá «a cotizar»';
  return null;
}

/** First words of a store title, without the marketing tail ("– Para Invernaderos"), to start the search. */
export function searchSeed(title: string): string {
  const head = title.split(/\s[–—|-]\s|\(/)[0];
  return head.split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
}

export const searchProducts = async (q: string, signal?: AbortSignal): Promise<ProductOption[]> => {
  const params = new URLSearchParams({ name: q, is_active: 'true', limit: '12' });
  const data = await apiRequest(`/products?${params.toString()}`, { signal });
  const rows = Array.isArray(data?.data) ? (data.data as ProductOption[]) : [];
  return rows.filter((r) => Number.isInteger(r.id) && typeof r.name === 'string');
};
