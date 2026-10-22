import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Plus, Search } from 'lucide-react';
import { listApoyos, getApoyosStats } from '@/utils/apoyosApi';
import type { ApoyoAdmin, ApoyoListResponse, ApoyosStats, ApoyoStatus, ApoyoWindow } from '@/types/apoyos';
import { STATE_LABELS, SECTOR_LABELS, STATE_OPTIONS, SECTOR_OPTIONS, formatUsd } from '@/utils/campoTaxonomy';
import { ApoyoConfidenceBadge, ApoyoStatusBadge, ApoyoWindowBadge, WINDOW_LABELS, sourceDomain } from './badges';
import RunNowButton from './RunNowButton';
import PublishSiteButton from './PublishSiteButton';
import LoadError from '@/components/ui/LoadError';
import dayjs from 'dayjs';

const STATUS_FILTERS: { value: ApoyoStatus | 'all'; label: string; countKey: keyof ApoyosStats['counts'] | null }[] = [
  { value: 'draft', label: 'Por revisar', countKey: 'draft' },
  { value: 'published', label: 'Publicados', countKey: 'published' },
  { value: 'rejected', label: 'Descartados', countKey: 'rejected' },
  { value: 'archived', label: 'Archivados', countKey: 'archived' },
  { value: 'all', label: 'Todos', countKey: null },
];

const WINDOW_FILTER_OPTIONS: { value: ApoyoWindow | ''; label: string }[] = [
  { value: '', label: 'Cualquier ventana' },
  { value: 'abierta', label: WINDOW_LABELS.abierta },
  { value: 'proxima', label: WINDOW_LABELS.proxima },
  { value: 'permanente', label: WINDOW_LABELS.permanente },
  { value: 'cerrada', label: WINDOW_LABELS.cerrada },
  { value: 'sin-fecha', label: WINDOW_LABELS['sin-fecha'] },
];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return dayjs(iso).format('DD MMM YYYY');
}

function fmtRelative(iso: string | null) {
  if (!iso) return 'nunca';
  return dayjs(iso).fromNow();
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ApoyosReviewTab() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApoyoAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<ApoyoListResponse['counts'] | null>(null);
  const [stats, setStats] = useState<ApoyosStats | null>(null);
  const [status, setStatus] = useState<ApoyoStatus | 'all'>('draft');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [windowFilter, setWindowFilter] = useState<ApoyoWindow | ''>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchStats = useCallback(() => {
    getApoyosStats()
      .then(setStats)
      .catch((err) => console.error('Failed to fetch apoyos stats:', err));
  }, []);

  const fetchItems = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listApoyos({
        status,
        q: search || undefined,
        state: stateFilter || undefined,
        sector: sectorFilter || undefined,
        window: windowFilter || undefined,
        limit: 100,
      });
      if (request !== requestRef.current) return;
      setItems(res.items);
      setTotal(res.total);
      setCounts(res.counts);
    } catch (err) {
      if (request !== requestRef.current) return;
      setLoadError(err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [status, search, stateFilter, sectorFilter, windowFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const refreshAll = () => {
    fetchItems();
    fetchStats();
  };

  const emptyMessage = (() => {
    if (search) return `Ningún apoyo coincide con «${search}».`;
    const label = STATUS_FILTERS.find((f) => f.value === status)?.label ?? status;
    if (status === 'draft') return 'No hay apoyos por revisar.';
    return `No hay apoyos en «${label}».`;
  })();

  return (
    <div>
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <RunNowButton onRunFinished={refreshAll} />
          <PublishSiteButton />
        </div>
        <button
          onClick={() => navigate('/apoyos/nuevo')}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          <Plus size={18} />
          Agregar apoyo
        </button>
      </div>

      {/* KPI strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <KpiCard label="Por revisar" value={String(stats.counts.draft)} />
          {/* Everything published and not closed is on the site; most programs
              never publish a closing date, so "abierta" alone would read 0. */}
          <KpiCard
            label="En la tienda (vigentes)"
            value={String(stats.counts.published - (stats.published_by_window.cerrada ?? 0))}
            sub={`${stats.published_by_window.abierta ?? 0} con fecha de cierre`}
          />
          <KpiCard label="Cierran en 30 días" value={String(stats.closing_soon.length)} />
          <KpiCard
            label="Gasto IA del mes"
            value={formatUsd(stats.month_spend_usd)}
            sub={stats.monthly_budget_usd > 0 ? `de ${formatUsd(stats.monthly_budget_usd)}` : 'sin límite'}
          />
          <KpiCard label="Última búsqueda" value={fmtRelative(stats.last_run?.finished_at ?? stats.last_run?.created_at ?? null)} />
          <KpiCard label="Próxima búsqueda" value={stats.next_run_due_at ? fmtDate(stats.next_run_due_at) : '—'} />
        </div>
      )}

      {/* Status pills */}
      <div role="group" aria-label="Filtrar por estado de revisión" className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            aria-pressed={status === f.value}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
              status === f.value
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
            {counts && f.countKey && ` (${counts[f.countKey]})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título u organismo"
            aria-label="Buscar apoyos"
            className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filtrar por estado"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Cualquier estado</option>
          {STATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          aria-label="Filtrar por sector"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Cualquier sector</option>
          {SECTOR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={windowFilter}
          onChange={(e) => setWindowFilter(e.target.value as ApoyoWindow | '')}
          aria-label="Filtrar por ventana"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {WINDOW_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={fetchItems} />
      ) : items.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white border border-gray-100 rounded-xl">
          <Landmark size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-700">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-2">
            Mostrando {items.length.toLocaleString('es-MX')} de {total.toLocaleString('es-MX')}
          </p>

          {/* Phone: cards */}
          <ul className="md:hidden space-y-2">
            {items.map((apoyo) => (
              <li key={apoyo.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/apoyos/${apoyo.id}`)}
                  className="w-full text-left block bg-white border border-gray-100 rounded-xl p-3 active:bg-gray-50"
                >
                  <p className="font-semibold text-gray-900">{apoyo.title}</p>
                  <p className="text-sm text-gray-500">{apoyo.organism || '—'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <ApoyoStatusBadge status={apoyo.status} />
                    <ApoyoWindowBadge window={apoyo.window} daysLeft={apoyo.days_left} />
                    <ApoyoConfidenceBadge confidence={apoyo.confidence} />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {apoyo.states.map((s) => STATE_LABELS[s] || s).join(', ') || 'Sin estado'} ·{' '}
                    {apoyo.sectors.map((s) => SECTOR_LABELS[s] || s).join(', ') || 'Sin sector'}
                  </p>
                  {sourceDomain(apoyo.source_url) && (
                    <p className="text-xs text-gray-400 mt-0.5">{sourceDomain(apoyo.source_url)}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Programa</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Nivel</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Estados</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Sectores</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Ventana</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Confianza</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Fuente</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((apoyo) => (
                  <tr
                    key={apoyo.id}
                    onClick={() => navigate(`/apoyos/${apoyo.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{apoyo.title}</p>
                      <p className="text-xs text-gray-500">{apoyo.organism || '—'}</p>
                      <ApoyoStatusBadge status={apoyo.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{apoyo.level || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[14rem]">
                      {apoyo.states.map((s) => STATE_LABELS[s] || s).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[12rem]">
                      {apoyo.sectors.map((s) => SECTOR_LABELS[s] || s).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ApoyoWindowBadge window={apoyo.window} daysLeft={apoyo.days_left} />
                    </td>
                    <td className="px-4 py-3">
                      <ApoyoConfidenceBadge confidence={apoyo.confidence} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{sourceDomain(apoyo.source_url) || '—'}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{fmtDate(apoyo.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
