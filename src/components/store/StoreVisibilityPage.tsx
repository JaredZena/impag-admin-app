// «Tienda en línea»: every page of todoparaelcampo.com.mx with its
// «Mostrar en la tienda» switch. Switching saves at once (impag-quot
// storefront_page_visibility); the store changes on the next «Publicar en
// tienda» (or the daily 7 am publish). «Ligar producto» picks the product that
// prices each page the same way (storefront_page_link), and «Nueva página»
// makes a page from a product (storefront_new_page). See
// src/utils/storeVisibility.ts and src/utils/storeNewPage.ts.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import LoadError from '@/components/ui/LoadError';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useNotifications } from '@/components/ui/notification';
import PublishStorefrontButton from '@/components/product/PublishStorefrontButton';
import LinkProductDialog from '@/components/store/LinkProductDialog';
import NewPageDialog from '@/components/store/NewPageDialog';
import { STORE_BASE_URL } from '@/hooks/useStoreLinks';
import { createNewPage, deleteNewPage, fetchNewPageRows, type NewPageRow } from '@/utils/storeNewPage';
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
  const [newRows, setNewRows] = useState<NewPageRow[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const nuevaParam = Number(searchParams.get('nueva'));
  const [creating, setCreating] = useState<{ productId: number | null } | null>(() =>
    searchParams.has('nueva') ? { productId: Number.isInteger(nuevaParam) && nuevaParam > 0 ? nuevaParam : null } : null,
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, r, l, n] = await Promise.all([
        fetchStorePages(),
        fetchVisibilityRows(),
        fetchLinkRows(),
        // A failed list of new pages must not hide the store's pages.
        fetchNewPageRows().catch(() => [] as NewPageRow[]),
      ]);
      setPages(p);
      setRows(r);
      setLinks(l);
      setNewRows(n);
    } catch (err) {
      setError((err instanceof Error && err.message) || 'No se pudo cargar la tienda.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const views = useMemo(() => mergeVisibility(pages ?? [], rows, links), [pages, rows, links]);
  const newRowByHandle = useMemo(() => new Map(newRows.map((r) => [r.handle, r])), [newRows]);
  // Rows the store doesn't have yet: they appear on the next publish.
  const waitingNew = useMemo(() => {
    const live = new Set((pages ?? []).map((p) => p.handle));
    return newRows.filter((r) => !live.has(r.handle));
  }, [pages, newRows]);
  // Admin-made pages whose row was deleted: they leave on the next publish.
  const leaving = useMemo(() => views.filter((v) => v.admin_page && !newRowByHandle.has(v.handle)), [views, newRowByHandle]);
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
  const waitingTotal = counts.pending + waitingNew.length + leaving.length;
  const categoryName = useMemo(() => new Map(categories), [categories]);

  const closeCreate = () => {
    setCreating(null);
    if (searchParams.has('nueva')) {
      const next = new URLSearchParams(searchParams);
      next.delete('nueva');
      setSearchParams(next, { replace: true });
    }
  };

  const created = (row: NewPageRow, title: string) => {
    setNewRows((current) => [row, ...current.filter((r) => r.handle !== row.handle)]);
    closeCreate();
    addNotification({
      type: 'success',
      title: 'Página creada',
      message: `«${title}» sale en la tienda al pulsar «Publicar en tienda».`,
      duration: 7000,
    });
  };

  const removeNew = async (handle: string, title: string, published: boolean) => {
    setSaving((s) => new Set(s).add(handle));
    try {
      await deleteNewPage(handle);
      setNewRows((current) => current.filter((r) => r.handle !== handle));
      addNotification({
        type: 'success',
        title: published ? 'Página por quitar' : 'Página cancelada',
        message: published
          ? `«${title}» sale de la tienda al pulsar «Publicar en tienda».`
          : `«${title}» ya no se va a crear.`,
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
        next.delete(handle);
        return next;
      });
    }
  };

  // Undo «Borrar página» before publishing: the same page, product and category again.
  const keepAdminPage = async (page: StorePageView) => {
    if (page.backend_id === null) return;
    setSaving((s) => new Set(s).add(page.handle));
    try {
      const row = await createNewPage(page.handle, page.backend_id, page.category_slug);
      setNewRows((current) => [row, ...current.filter((r) => r.handle !== row.handle)]);
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
              Prende o apaga cada página de todoparaelcampo.com.mx, liga cada una al producto que le da su precio o crea
              una página nueva desde un producto. Una página apagada sale de la tienda, del buscador y de Google; los
              cambios se ven al pulsar «Publicar en tienda».
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={() => setCreating({ productId: null })}
              disabled={pages === null}
              className="rounded-md border-0 bg-white px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
            >
              + Nueva página
            </button>
            <PublishStorefrontButton />
          </div>
        </div>

        {waitingTotal > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {waitingTotal === 1 ? '1 cambio espera' : `${waitingTotal} cambios esperan`} a que pulses «Publicar en tienda».
          </div>
        )}

        {waitingNew.length > 0 && (
          <Card className="mb-4 border-0 shadow-sm rounded-xl overflow-hidden">
            <p className="border-b border-gray-100 px-3 sm:px-4 py-2 text-sm font-medium text-gray-800">
              Páginas nuevas por publicar
            </p>
            <div className="divide-y divide-gray-100">
              {waitingNew.map((r) => (
                <div key={r.handle} className="flex items-center gap-3 px-3 sm:px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{r.title ?? r.product_name ?? `Producto #${r.product_id}`}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span>{categoryName.get(r.category_slug) ?? r.category_slug}</span>
                      <Link to={`/product-admin/${r.product_id}`} className="text-emerald-700 underline">
                        Producto #{r.product_id}
                      </Link>
                      {r.created_by && (
                        <span>
                          {r.created_by.split('@')[0]} · {formatDate(r.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-amber-700">Se crea al publicar</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNew(r.handle, r.title ?? r.product_name ?? r.handle, false)}
                    disabled={saving.has(r.handle)}
                    className="border-0 bg-transparent p-0 text-sm font-normal text-red-700 underline disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          </Card>
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
                adminRow={newRowByHandle.get(p.handle) ?? null}
                onRemove={() => removeNew(p.handle, p.title, true)}
                onKeep={() => keepAdminPage(p)}
              />
            ))}
          </Card>
        )}
      </div>
      {creating && pages && (
        <NewPageDialog
          pages={pages}
          rows={newRows}
          categories={categories}
          initialProductId={creating.productId}
          onCreated={created}
          onClose={closeCreate}
        />
      )}
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
  adminRow,
  onRemove,
  onKeep,
}: {
  page: StorePageView;
  saving: boolean;
  onToggle: () => void;
  onLink: () => void;
  adminRow: NewPageRow | null;
  onRemove: () => void;
  onKeep: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const state = STATE_LABEL[page.state];
  const leaving = page.admin_page && !adminRow;
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
          {page.admin_page && !leaving && (
            confirmRemove ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-red-700">¿Borrar la página?</span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRemove(false);
                    onRemove();
                  }}
                  disabled={saving}
                  className="border-0 bg-transparent p-0 text-xs font-medium text-red-700 underline disabled:opacity-50"
                >
                  Sí, borrar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="border-0 bg-transparent p-0 text-xs font-normal text-gray-600 underline"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                disabled={saving}
                title="Creada aquí con «Nueva página»: se puede borrar"
                className="border-0 bg-transparent p-0 text-xs font-normal text-red-700 underline disabled:opacity-50"
              >
                Borrar página
              </button>
            )
          )}
        </div>
        {leaving && (
          <p className="mt-1 text-xs font-medium text-amber-700">
            Se borra de la tienda al publicar ·{' '}
            <button
              type="button"
              onClick={onKeep}
              disabled={saving || page.backend_id === null}
              className="border-0 bg-transparent p-0 text-xs font-medium text-emerald-700 underline disabled:opacity-50"
            >
              Deshacer
            </button>
          </p>
        )}
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
