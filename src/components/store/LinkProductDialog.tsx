// «Ligar producto»: pick the product in the system that prices a store page.
// Saving goes to impag-quot storefront_page_link at once; the page takes the
// product's price on the next «Publicar en tienda». See src/utils/storeVisibility.ts.

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import {
  priceBlocker,
  searchProducts,
  searchSeed,
  type ProductOption,
  type StorePageView,
} from '@/utils/storeVisibility';

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

interface Props {
  page: StorePageView;
  saving: boolean;
  onPick: (product: ProductOption) => void;
  onUnlink: () => void;
  onClose: () => void;
}

const LinkProductDialog: React.FC<Props> = ({ page, saving, onPick, onUnlink, onClose }) => {
  const [query, setQuery] = useState(() => searchSeed(page.title));
  const [results, setResults] = useState<ProductOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

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
        .then((rows) => {
          if (!ctrl.signal.aborted) setResults(rows);
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

  const current = page.productId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-product-title"
        className="flex max-h-[90vh] w-full sm:max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="link-product-title" className="text-base font-semibold text-gray-900">
            Ligar producto
          </h2>
          <p className="mt-0.5 truncate text-sm text-gray-600" title={page.title}>
            {page.title}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            La página toma el precio del producto que elijas al pulsar «Publicar en tienda».
          </p>
        </div>

        <div className="px-4 pt-3">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en Productos…"
            aria-label="Buscar en Productos"
          />
        </div>

        <div className="min-h-[10rem] flex-1 overflow-y-auto px-2 py-2" aria-live="polite">
          {query.trim().length < 2 ? (
            <p className="px-2 py-6 text-center text-sm text-gray-500">Escribe al menos 2 letras.</p>
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
                y vuelve a ligarlo.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((p) => {
                const blocker = priceBlocker(p);
                const isCurrent = p.id === current;
                const price = p.price ?? p.calculated_price;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={saving || isCurrent}
                      onClick={() => onPick(p)}
                      className="w-full rounded-lg border-0 bg-transparent px-2 py-2.5 text-left font-normal hover:bg-emerald-50 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {p.name}
                        {isCurrent && <span className="ml-2 text-xs font-normal text-emerald-700">(ligado ahora)</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        #{p.id}
                        {p.sku ? ` · ${p.sku}` : ''}
                        {price ? ` · ${money(price)}` : ''}
                        {p.unit ? ` por ${p.unit.toLowerCase()}` : ''}
                      </p>
                      {blocker && <p className="mt-0.5 text-xs text-amber-700">{blocker}</p>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3">
          {current !== null ? (
            <button
              type="button"
              disabled={saving}
              onClick={onUnlink}
              className="border-0 bg-transparent p-0 text-sm font-normal text-red-700 underline disabled:opacity-50"
            >
              Quitar producto
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-md border-0 bg-gray-100 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-200 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkProductDialog;
