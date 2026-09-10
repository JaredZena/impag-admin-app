import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Plus, Search, Wrench } from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import {
  listTools,
  money,
  qty,
  summaryWhatsAppText,
  TOOL_STATUS_LABELS,
  TOOL_STATUS_ORDER,
  type ToolBrief,
  type ToolStatus,
  type ToolsSummary,
} from '@/utils/toolsApi';
import { buttonClass, copyText, inputClass } from './toolHelpers';
import { StatusPill } from './toolUi';

// NOTE: ProtectedRoute already wraps every route in MainLayout — do NOT import it here.

type Filter = 'activas' | ToolStatus;

export default function ToolsPage() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [filter, setFilter] = useState<Filter>('activas');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<ToolBrief[]>([]);
  const [summary, setSummary] = useState<ToolsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTools({ status: filter === 'activas' ? undefined : filter, q: debouncedQuery })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setSummary(res.summary);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, debouncedQuery]);

  const handleCopySummary = async () => {
    if (!summary) return;
    const ok = await copyText(summaryWhatsAppText(summary));
    addNotification(
      ok
        ? { type: 'success', title: 'Resumen copiado', message: 'Pégalo en el grupo de WhatsApp.' }
        : { type: 'error', title: 'No se pudo copiar el resumen' }
    );
  };

  const chips: { key: Filter; label: string; count: number | null }[] = [
    { key: 'activas', label: 'Activas', count: summary?.active_count ?? null },
    ...TOOL_STATUS_ORDER.map((s) => ({
      key: s as Filter,
      label: TOOL_STATUS_LABELS[s],
      count: summary?.by_status[s]?.count ?? null,
    })),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:pr-12">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Wrench size={24} className="text-gray-500" />
            Herramientas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Herramienta y consumibles de uso interno. No aparecen en ventas, cotizaciones ni en la tienda.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <button type="button" onClick={handleCopySummary} disabled={!summary} className={buttonClass.secondary}>
            <Copy size={16} />
            Copiar resumen
          </button>
          <button type="button" onClick={() => navigate('/tools/new')} className={buttonClass.primary}>
            <Plus size={16} />
            <span className="sm:hidden">Registrar</span>
            <span className="hidden sm:inline">Registrar herramienta</span>
          </button>
        </div>
      </div>

      {summary && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Valor total</span>
            <span className="text-xl font-semibold tabular-nums text-gray-900">{money(summary.total_value)}</span>
          </div>
          <p className="text-sm text-gray-600">
            {summary.active_count} activas
            {summary.missing_cost_count > 0 && ` · ${summary.missing_cost_count} sin costo`}
            {summary.retired_count > 0 && ` · ${summary.retired_count} de baja`}
          </p>
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
              filter === chip.key
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {chip.label}
            {chip.count !== null && (
              <span className={`ml-1.5 tabular-nums ${filter === chip.key ? 'text-blue-100' : 'text-gray-400'}`}>
                {chip.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, proveedor o quién la tiene"
          className={`${inputClass} pl-9`}
          aria-label="Buscar herramienta"
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading && items.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          {debouncedQuery || filter !== 'activas'
            ? 'Ninguna herramienta coincide con la búsqueda.'
            : 'Todavía no hay herramientas registradas.'}
        </div>
      ) : (
        <ul className={`divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white ${loading ? 'opacity-60' : ''}`}>
          {items.map((t) => (
            <li key={t.id}>
              <Link
                to={`/tools/${t.id}`}
                className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none sm:px-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  {t.primary_image_url ? (
                    <img src={t.primary_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Wrench size={18} className="text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-medium text-gray-900">{t.name}</p>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-gray-900">{money(t.total_value)}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                    <StatusPill status={t.status} />
                    <span>
                      {qty(t.quantity)} {t.unit}
                    </span>
                    {t.kind === 'consumible' && <span>· Consumible</span>}
                    {t.holder ? (
                      <span className="truncate">· {t.holder}</span>
                    ) : (
                      t.supplier_name && <span className="truncate">· {t.supplier_name}</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
