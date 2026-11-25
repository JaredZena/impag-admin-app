// «Nueva página»: the team makes a page of todoparaelcampo.com.mx from a
// product in the system (its photo, price, name and description).
//
// Saving goes to impag-quot storefront_new_page at once; the storefront sync
// adds the page on the next «Publicar en tienda» (or the daily 7 am publish)
// and keeps it while the row exists. Deleting the row takes an admin-made page
// off on the next publish. store-pages.json marks those pages admin_page.

import { apiRequest, ApiError } from '@/utils/api';
import type { ProductOption, StorePage } from '@/utils/storeVisibility';

export interface NewPageRow {
  handle: string;
  product_id: number;
  product_name: string | null;
  /** The page's name in the store («Nombre en la tienda», else the product name). */
  title: string | null;
  category_slug: string;
  created_by: string | null;
  created_at: string | null;
}

/** Longest address the dialog proposes; the backend allows 120. */
const HANDLE_MAX = 80;

/** The page address from its store name: plain lowercase ASCII words joined by "-". */
export function slugify(text: string): string {
  const base = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length <= HANDLE_MAX) return base;
  const cut = base.slice(0, HANDLE_MAX);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '');
}

/** An address no page uses: the slug, else slug-2, slug-3… (producto-<id> when the name has no letters). */
export function uniqueHandle(title: string, productId: number, taken: ReadonlySet<string>): string {
  let base = slugify(title);
  if (base.length < 3) base = `producto-${productId}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Why this product can't get a new page, or null when it can. */
export type NewPageBlock =
  | { kind: 'has_page'; page: StorePage }
  | { kind: 'requested'; row: NewPageRow }
  | { kind: 'no_photo' };

export function newPageBlock(
  product: Pick<ProductOption, 'id' | 'images_count'>,
  pages: readonly StorePage[],
  rows: readonly NewPageRow[],
): NewPageBlock | null {
  const row = rows.find((r) => r.product_id === product.id);
  if (row) return { kind: 'requested', row };
  const page = pages.find((p) => p.backend_id === product.id);
  if (page) return { kind: 'has_page', page };
  if (!product.images_count) return { kind: 'no_photo' };
  return null;
}

export const fetchNewPageRows = async (): Promise<NewPageRow[]> => {
  const data = await apiRequest('/storefront/pages/new');
  return Array.isArray(data?.pages) ? (data.pages as NewPageRow[]) : [];
};

export const createNewPage = async (handle: string, productId: number, categorySlug: string): Promise<NewPageRow> => {
  try {
    return await apiRequest('/storefront/pages/new', {
      method: 'POST',
      body: JSON.stringify({ handle, product_id: productId, category_slug: categorySlug }),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409 && /handle_taken/.test(err.message)) throw new HandleTakenError();
      if (err.status === 409) throw new Error('Ese producto ya tiene una página nueva por publicar.');
      if (err.status === 422 && /photo/.test(err.message)) throw new Error('El producto no tiene foto. Súbela en el producto y vuelve a intentar.');
      if (err.status === 404) throw new Error('Ese producto ya no está activo en el sistema.');
      if (err.status === 422) throw new Error('No se pudo crear: revisa el nombre y la categoría.');
    }
    throw err instanceof Error ? err : new Error('No se pudo crear la página.');
  }
};

/** The address is in use by another page; the dialog retries with the next free one. */
export class HandleTakenError extends Error {
  constructor() {
    super('Ya hay una página con esa dirección.');
    this.name = 'HandleTakenError';
  }
}

export const deleteNewPage = async (handle: string): Promise<void> => {
  try {
    await apiRequest(`/storefront/pages/new/${encodeURIComponent(handle)}`, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return; // already gone
    throw err instanceof Error ? err : new Error('No se pudo quitar la página.');
  }
};

/** The product the dialog opens with (from Productos' «Crear página en la tienda»). */
export const fetchProductOption = async (id: number): Promise<ProductOption> => {
  const res = await apiRequest(`/products/${id}`);
  const p = res?.data;
  if (!res?.success || !p) throw new Error('No se encontró el producto.');
  const images: { url?: string }[] = Array.isArray(p.images) ? p.images : [];
  return {
    id: p.id,
    name: p.name,
    sku: p.sku ?? null,
    unit: p.unit ?? null,
    price: p.price ?? null,
    calculated_price: p.calculated_price ?? null,
    storefront_title: p.storefront_title ?? null,
    images_count: images.length,
    primary_image_url: images[0]?.url ?? null,
    is_active: p.is_active !== false && !p.archived_at,
  };
};

/** Saves the store name on the product (Product.storefront_title) when it differs from what the page would use. */
export const saveStoreTitle = async (product: ProductOption, title: string): Promise<void> => {
  const current = product.storefront_title || product.name;
  if (title === current) return;
  const res = await apiRequest(`/products/${product.id}`, {
    method: 'PUT',
    body: JSON.stringify({ storefront_title: title === product.name ? '' : title }),
  });
  if (!res?.success) throw new Error(res?.error || 'No se pudo guardar el nombre en la tienda.');
};
