// «Nueva página»: make a page of todoparaelcampo.com.mx from a product in the
// system. Pick the product, check its photo and store name, choose the
// category; the page appears on the next «Publicar en tienda». See
// src/utils/storeNewPage.ts.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { STORE_BASE_URL } from '@/hooks/useStoreLinks';
import {
  createNewPage,
  fetchProductOption,
  HandleTakenError,
  newPageBlock,
  saveStoreTitle,
  uniqueHandle,
  type NewPageRow,
} from '@/utils/storeNewPage';
import { priceBlocker, searchProducts, type ProductOption, type StorePage } from '@/utils/storeVisibility';
import { productUnitLabel } from '@/utils/productUnits';

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const TITLE_MAX = 200;
const STORE_HOST = STORE_BASE_URL.replace(/^https?:\/\//, '');

interface Props {
  pages: readonly StorePage[];
  rows: readonly NewPageRow[];
  /** [slug, name] of the store's categories. */
  categories: readonly [string, string][];
  /** Open straight on this product (Productos → «Crear página en la tienda»). */
  initialProductId?: number | null;
  onCreated: (row: NewPageRow, title: string) => void;
  onClose: () => void;
}

const NewPageDialog: React.FC<Props> = ({ pages, rows, categories, initialProductId, onCreated, onClose }) => {
  const [product, setProduct] = useState<ProductOption | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(Boolean(initialProductId));
  const [productError, setProductError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Kept here so «Elegir otro producto» comes back to the same results.
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  useEffect(() => {
    if (!initialProductId) return;
    let active = true;
    fetchProductOption(initialProductId)
      .then((p) => active && setProduct(p))
      .catch((err) => active && setProductError((err instanceof Error && err.message) || 'No se encontró el producto.'))
      .finally(() => active && setLoadingProduct(false));
    return () => {
      active = false;
    };
  }, [initialProductId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-page-title"
        className="flex max-h-[92vh] w-full sm:max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="new-page-title" className="text-base font-semibold text-gray-900">
            Nueva página en la tienda
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            La página toma la foto, el precio y las especificaciones del producto. Sale en la tienda al pulsar «Publicar en
            tienda».
          </p>
        </div>

        {loadingProduct ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Cargando el producto…</p>
        ) : product ? (
          <PageForm
            product={product}
            pages={pages}
            rows={rows}
            categories={categories}
            saving={saving}
            setSaving={setSaving}
            onBack={() => setProduct(null)}
            onCreated={onCreated}
            onClose={onClose}
          />
        ) : (
          <ProductSearch
            pages={pages}
            rows={rows}
            query={query}
            setQuery={setQuery}
            note={productError}
            onPick={(p) => {
              setProductError(null);
              setProduct(p);
            }}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

function ProductSearch({
  pages,
  rows,
  query,
  setQuery,
  note,
  onPick,
  onClose,
}: {
  pages: readonly StorePage[];
  rows: readonly NewPageRow[];
  query: string;
  setQuery: (q: string) => void;
  note: string | null;
  onPick: (p: ProductOption) => void;
  onClose: () => void;
}) {
  const [results, setResults] = useState<ProductOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      setError(null);
      searchProducts(q, ctrl.signal)
        .then((found) => {
          if (!ctrl.signal.aborted) setResults(found);
        })
        .catch((err) => {
          if (!ctrl.signal.aborted) setError((err instanceof Error && err.message) || 'No se pudo buscar.');
        });
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <>
      <div className="px-4 pt-3">
        {note && <p className="mb-2 text-sm text-red-600">{note}</p>}
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar el producto en Productos…"
          aria-label="Buscar el producto en Productos"
        />
      </div>
      <div className="min-h-[12rem] flex-1 overflow-y-auto px-2 py-2" aria-live="polite">
        {query.trim().length < 2 ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500">Escribe al menos 2 letras del producto.</p>
        ) : error ? (
          <p className="px-2 py-6 text-center text-sm text-red-600">{error}</p>
        ) : results === null ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500">Buscando…</p>
        ) : results.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-gray-500">
            <p>Ningún producto activo coincide.</p>
            <p className="mt-1">
              Prueba con otra palabra o{' '}
              <Link to="/product-admin/new" className="text-emerald-700 underline">
                crea el producto
              </Link>{' '}
              primero.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((p) => {
              const block = newPageBlock(p, pages, rows);
              const price = p.price ?? p.calculated_price;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onPick(p)}
                    className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-2.5 text-left font-normal hover:bg-emerald-50"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {p.primary_image_url && <img src={p.primary_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        #{p.id}
                        {p.sku ? ` · ${p.sku}` : ''}
                        {price ? ` · ${money(price)}` : ''}
                        {p.unit ? ` por ${productUnitLabel(p.unit).toLowerCase()}` : ''}
                      </p>
                      {block?.kind === 'has_page' && <p className="mt-0.5 text-xs text-gray-600">Ya está en la tienda</p>}
                      {block?.kind === 'requested' && <p className="mt-0.5 text-xs text-amber-700">Página pedida, falta publicar</p>}
                      {block?.kind === 'no_photo' && <p className="mt-0.5 text-xs text-amber-700">Sin foto</p>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex justify-end border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border-0 bg-gray-100 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-200"
        >
          Cerrar
        </button>
      </div>
    </>
  );
}

function PageForm({
  product,
  pages,
  rows,
  categories,
  saving,
  setSaving,
  onBack,
  onCreated,
  onClose,
}: {
  product: ProductOption;
  pages: readonly StorePage[];
  rows: readonly NewPageRow[];
  categories: readonly [string, string][];
  saving: boolean;
  setSaving: (v: boolean) => void;
  onBack: () => void;
  onCreated: (row: NewPageRow, title: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(() => (product.storefront_title || product.name).slice(0, TITLE_MAX));
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const block = newPageBlock(product, pages, rows);
  const cleanTitle = title.split(/\s+/).filter(Boolean).join(' ');
  const taken = useMemo(() => new Set([...pages.map((p) => p.handle), ...rows.map((r) => r.handle)]), [pages, rows]);
  const handle = uniqueHandle(cleanTitle, product.id, taken);
  const blocker = priceBlocker(product);
  const price = product.price ?? product.calculated_price;
  const inactive = product.is_active === false;
  const canCreate = !block && !inactive && cleanTitle.length > 0 && category !== '' && !saving;

  const create = async () => {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      await saveStoreTitle(product, cleanTitle);
      // Another page may hold the address without being in the list yet
      // (made since this screen loaded): try the next free one.
      const used = new Set(taken);
      let address = handle;
      for (let attempt = 0; ; attempt += 1) {
        try {
          const row = await createNewPage(address, product.id, category);
          onCreated(row, cleanTitle);
          break;
        } catch (err) {
          if (!(err instanceof HandleTakenError) || attempt >= 2) throw err;
          used.add(address);
          address = uniqueHandle(cleanTitle, product.id, used);
        }
      }
    } catch (err) {
      setError((err instanceof Error && err.message) || 'No se pudo crear la página.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="border-0 bg-transparent p-0 text-sm font-normal text-emerald-700 underline disabled:opacity-50"
        >
          ← Elegir otro producto
        </button>

        <div className="flex gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {product.primary_image_url && <img src={product.primary_image_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{product.name}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              <Link to={`/product-admin/${product.id}`} className="text-emerald-700 underline">
                Producto #{product.id}
              </Link>
              {product.images_count ? ` · ${product.images_count} foto${product.images_count === 1 ? '' : 's'}` : ''}
            </p>
            <p className="mt-1 text-xs text-gray-700">
              {price ? `${money(price)} + IVA` : 'Sin precio'}
              {product.unit ? ` por ${productUnitLabel(product.unit).toLowerCase()}` : ''}
            </p>
          </div>
        </div>

        {inactive ? (
          <Notice tone="red">Este producto está archivado o inactivo. Actívalo en Productos para ponerlo en la tienda.</Notice>
        ) : block?.kind === 'has_page' ? (
          <Notice tone="gray">
            Este producto ya está en la tienda como «{block.page.title}».{' '}
            {!block.page.hidden && (
              <a href={`${STORE_BASE_URL}/producto/${block.page.handle}`} target="_blank" rel="noopener noreferrer" className="underline">
                Ver la página
              </a>
            )}
          </Notice>
        ) : block?.kind === 'requested' ? (
          <Notice tone="amber">Ya pediste la página de este producto. Sale en la tienda al pulsar «Publicar en tienda».</Notice>
        ) : block?.kind === 'no_photo' ? (
          <Notice tone="amber">
            La tienda no muestra páginas sin foto.{' '}
            <Link to={`/product-admin/${product.id}`} className="underline">
              Sube una foto en el producto
            </Link>{' '}
            y vuelve aquí.
          </Notice>
        ) : (
          <>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Nombre en la tienda</span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX}
                disabled={saving}
                className="mt-1"
              />
              <span className="mt-1 block text-xs text-gray-500">
                Así lo ve el cliente. Se guarda en el producto («Nombre en la tienda»).
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Categoría</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={saving}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">Elige la categoría…</option>
                {categories.map(([slug, name]) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <p>
                Dirección: <span className="break-all font-mono text-gray-800">{STORE_HOST}/producto/{handle}</span>
              </p>
              <p className="mt-1">
                {blocker ? (
                  <span className="text-amber-700">{blocker.replace('seguirá', 'saldrá')}. Puedes crearla igual.</span>
                ) : (
                  <span className="text-teal-800">Sale con su precio publicado.</span>
                )}
              </p>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-md border-0 bg-gray-100 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-200 disabled:opacity-50"
        >
          Cancelar
        </button>
        {!block && !inactive && (
          <button
            type="button"
            onClick={create}
            disabled={!canCreate}
            className="rounded-md border-0 bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Creando…' : 'Crear página'}
          </button>
        )}
      </div>
    </>
  );
}

function Notice({ tone, children }: { tone: 'gray' | 'amber' | 'red'; children: React.ReactNode }) {
  const cls = {
    gray: 'border-gray-200 bg-gray-50 text-gray-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-800',
  }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export default NewPageDialog;
