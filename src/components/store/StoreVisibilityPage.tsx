// «Tienda en línea»: every page of todoparaelcampo.com.mx with its
// «Mostrar en la tienda» switch. Switching saves at once (impag-quot
// storefront_page_visibility); the store changes on the next «Publicar en
// tienda» (or the daily 7 am publish). «Ligar producto» picks the product that
// prices each page the same way (storefront_page_link). See
// src/utils/storeVisibility.ts.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import LoadError from '@/components/ui/LoadError';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useNotifications } from '@/components/ui/notification';
import PublishStorefrontButton from '@/components/product/PublishStorefrontButton';
import LinkProductDialog from '@/components/store/LinkProductDialog';
import { STORE_BASE_URL } from '@/hooks/useStoreLinks';
import {
  fetchLinkRows,
  fetchStorePages,
  fetchVisibilityRows,
  filterPages,
  mergeVisibility,
  saveLink,
  saveVisibility,
  type LinkRow,
  type ProductOption,
  type StorePage,
  type StorePageState,
  type StorePageView,
  type VisibilityFilter,
  type VisibilityRow,
} from '@/utils/storeVisibility';

const STATE_LABEL: Record<StorePageState, { text: string; className: string }> = {
  online: { text: 'Se vende en línea', className: 'bg-green-100 text-green-800' },
  price: { text: 'Precio publicado', className: 'bg-teal-50 text-teal-800' },
  ask: { text: 'Precio a cotizar', className: 'bg-gray-100 text-gray-700' },
};

const FILTERS: { key: VisibilityFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'shown', label: 'En la tienda' },
  { key: 'hidden', label: 'Ocultas' },
  { key: 'unlinked', label: 'Sin ligar' },
  { key: 'pending', label: 'Por publicar' },
];

const formatDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

const StoreVisibilityPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [pages, setPages] = useState<StorePage[] | null>(null);
  const [rows, setRows] = useState<VisibilityRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [linking, setLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<VisibilityFilter>('all');
  const [category, setCategory] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, r, l] = await Promise.all([fetchStorePages(), fetchVisibilityRows(), fetchLinkRows()]);
      setPages(p);
      setRows(r);
      setLinks(l);
    } catch (err) {
      setError((err instanceof Error && err.message) || 'No se pudo cargar la tienda.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const views = useMemo(() => mergeVisibility(pages ?? [], rows, links), [pages, rows, links]);
  const linkingPage = useMemo(() => views.find((v) => v.handle === linking) ?? null, [views, linking]);
  const visible = useMemo(() => filterPages(views, query, filter, category), [views, query, filter, category]);
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of pages ?? []) if (p.category_slug) seen.set(p.category_slug, p.category);
    return [...seen].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [pages]);
  const counts = useMemo(
    () => ({
      all: views.length,
      shown: views.filter((v) => v.shown).length,
      hidden: views.filter((v) => !v.shown).length,
      unlinked: views.filter((v) => v.productId === null).length,
      pending: views.filter((v) => v.pending).length,
    }),
    [views],
  );

  const toggle = async (page: StorePageView) => {
    const hidden = page.shown;
    setSaving((s) => new Set(s).add(page.handle));
    try {
      const saved = await saveVisibility(page.handle, hidden);
      setRows((current) => [...current.filter((r) => r.handle !== saved.handle), saved]);
      addNotification({
        type: 'success',
        title: hidden ? 'Página oculta' : 'Página visible',
        message: `«${page.title}» ${hidden ? 'se quita de' : 'vuelve a'} la tienda al pulsar «Publicar en tienda».`,
        duration: 6000,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se guardó el cambio',
        message: (err instanceof Error && err.message) || 'Intenta de nuevo.',
      });
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        next.delete(page.handle);
        return next;
      });
    }
  };

  const link = async (page: StorePageView, product: ProductOption | null) => {
    setSaving((s) => new Set(s).add(page.handle));
    try {
      const saved = await saveLink(page.handle, product ? product.id : null);
      setLinks((current) => [...current.filter((l) => l.handle !== saved.handle), saved]);
      setLinking(null);
      addNotification({
        type: 'success',
        title: product ? 'Producto ligado' : 'Producto quitado',
        message: product
          ? `«${page.title}» toma el precio de «${product.name}» al pulsar «Publicar en tienda».`
          : `«${page.title}» queda «a cotizar» al pulsar «Publicar en tienda».`,
        duration: 6000,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se guardó el cambio',
        message: (err instanceof Error && err.message) || 'Intenta de nuevo.',
      });
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        next.delete(page.handle);
        return next;
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto max-w-5xl px-3 sm:px-4 md:px-6 pt-20 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2">
              Tienda en línea
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Prende o apaga cada página de todoparaelcampo.com.mx y liga cada una al producto que le da su precio. Una
              página apagada sale de la tienda, del buscador y de Google; los cambios se ven al pulsar «Publicar en
              tienda».
            </p>
          </div>
          <PublishStorefrontButton />
        </div>

        {counts.pending > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {counts.pending === 1 ? '1 cambio espera' : `${counts.pending} cambios esperan`} a que pulses «Publicar en tienda».
          </div>
        )}

        <Card className="p-3 sm:p-4 mb-4 shadow-sm border-0 rounded-xl">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
              aria-label="Buscar producto"
              className="sm:flex-1"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Categoría"
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="">Todas las categorías</option>
              {categories.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  filter === f.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label} <span className="tabular-nums opacity-80">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </Card>

        {error ? (
          <LoadError message={error} onRetry={load} />
        ) : pages === null ? (
          <LoadingSpinner text="Cargando la tienda…" />
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-gray-500">Ninguna página coincide.</p>
        ) : (
          <Card className="divide-y divide-gray-100 border-0 shadow-sm rounded-xl overflow-hidden">
            {visible.map((p) => (
              <PageRow
                key={p.handle}
                page={p}
                saving={saving.has(p.handle)}
                onToggle={() => toggle(p)}
                onLink={() => setLinking(p.handle)}
              />
            ))}
          </Card>
        )}
      </div>
      {linkingPage && (
        <LinkProductDialog
          page={linkingPage}
          saving={saving.has(linkingPage.handle)}
          onPick={(product) => link(linkingPage, product)}
          onUnlink={() => link(linkingPage, null)}
          onClose={() => setLinking(null)}
        />
      )}
    </div>
  );
};

function PageRow({
  page,
  saving,
  onToggle,
  onLink,
}: {
  page: StorePageView;
  saving: boolean;
  onToggle: () => void;
  onLink: () => void;
}) {
  const state = STATE_LABEL[page.state];
  const changed = page.row?.updated_by ? `${page.row.updated_by.split('@')[0]} · ${formatDate(page.row.updated_at)}` : '';
  return (
    <div className={`flex items-center gap-3 px-3 sm:px-4 py-3 ${page.shown ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {page.image && <img src={page.image} alt="" loading="lazy" className={`h-full w-full object-cover ${page.shown ? '' : 'opacity-40'}`} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${page.shown ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{page.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span>{page.category}</span>
          <span className={`rounded px-1.5 py-0.5 ${state.className}`}>{state.text}</span>
          {page.productId ? (
            <>
              <Link to={`/product-admin/${page.productId}`} className="text-emerald-700 underline">
                Producto #{page.productId}
              </Link>
              <button type="button" onClick={onLink} disabled={saving} className="border-0 bg-transparent p-0 text-xs font-normal text-emerald-700 underline disabled:opacity-50">
                Cambiar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLink}
              disabled={saving}
              title="Sin producto en el sistema: el precio que cambies en Productos no llega a esta página"
              className="rounded border-0 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Sin ligar · Ligar producto
            </button>
          )}
          {!page.hidden && (
            <a href={`${STORE_BASE_URL}/producto/${page.handle}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
              Ver
            </a>
          )}
          {changed && <span>{changed}</span>}
        </div>
        {page.shownPending && (
          <p className="mt-1 text-xs font-medium text-amber-700">
            {page.shown ? 'Vuelve a la tienda al publicar' : 'Sale de la tienda al publicar'}
          </p>
        )}
        {page.linkPending && (
          <p className="mt-1 text-xs font-medium text-amber-700">
            {page.productId
              ? `Toma el precio de «${page.linkRow?.product_name ?? `Producto #${page.productId}`}» al publicar`
              : 'Queda sin producto al publicar'}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={page.shown}
        aria-label={`Mostrar en la tienda: ${page.title}`}
        title={page.shown ? 'Quitar de la tienda' : 'Mostrar en la tienda'}
        disabled={saving}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
          page.shown ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            page.shown ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default StoreVisibilityPage;
