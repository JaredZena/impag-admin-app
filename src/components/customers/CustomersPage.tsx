import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '@/utils/api';
import MainLayout from '@/components/layout/MainLayout';
import { useNotifications } from '@/components/ui/notification';
import { SOURCE_CLS, SV_TAG, relativeTime } from './customerShared';

interface CustomerBrief {
  id: number;
  display_name: string | null;
  phone_e164: string | null;
  location: string | null;
  source: string | null;
  has_purchased: boolean;
  last_activity_at: string | null;
  tags: string[];
}

interface CustomerStats {
  total: number;
  purchased: number;
  sembrando_vida: number;
  active_30d: number;
  by_source: Record<string, number>;
}

const SOURCE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'visita', label: 'Visita' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'messenger', label: 'Messenger' },
];

const LIMIT = 100;

const TH_CLS = 'px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700';
const TD_CLS = 'px-3 py-2.5 sm:px-4 sm:py-3';

export default function CustomersPage() {
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [source, setSource] = useState('');
  const [onlyPurchased, setOnlyPurchased] = useState(false);
  const [onlySV, setOnlySV] = useState(false);
  const [list, setList] = useState<CustomerBrief[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce only the search text; filter chips apply immediately
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const fetchPage = useCallback(async (offset: number): Promise<CustomerBrief[]> => {
    const params = new URLSearchParams();
    params.set('q', debouncedQ);
    if (source) params.set('source', source);
    if (onlyPurchased) params.set('has_purchased', 'true');
    if (onlySV) params.set('tag', SV_TAG);
    params.set('limit', String(LIMIT));
    params.set('offset', String(offset));
    return (await apiRequest(`/customers?${params.toString()}`)) || [];
  }, [debouncedQ, source, onlyPurchased, onlySV]);

  // Epoch shared between the reset effect and loadMore: any filter/search
  // change invalidates in-flight appends so a slow "Cargar más" can't stomp
  // a fresh filtered list.
  const epochRef = useRef(0);

  // Any change in q/filters resets the list (offset 0)
  useEffect(() => {
    epochRef.current += 1;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await fetchPage(0);
        if (cancelled) return;
        setList(rows);
        setHasMore(rows.length === LIMIT);
      } catch {
        if (!cancelled) addNotification({ type: 'error', title: 'Error al cargar clientes', message: 'No se pudo obtener la lista de clientes. Intenta de nuevo.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchPage, addNotification]);

  const fetchStats = useCallback(async () => {
    try { setStats(await apiRequest('/customers/stats')); }
    catch { /* stats are non-blocking; keep last known value */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const loadMore = async () => {
    if (loadingMore) return;
    const epoch = epochRef.current;
    setLoadingMore(true);
    try {
      const rows = await fetchPage(list.length);
      if (epoch !== epochRef.current) return; // filters changed mid-flight
      setList(prev => [...prev, ...rows]);
      setHasMore(rows.length === LIMIT);
    } catch {
      addNotification({ type: 'error', title: 'Error al cargar más clientes', message: 'No se pudieron obtener más resultados. Intenta de nuevo.' });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Clientes</h1>
        <p className="text-sm text-gray-500 mb-4">Busca por nombre, teléfono o lugar — un cliente, todo su historial.</p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total clientes" value={stats.total} />
            <StatCard label="Compraron" value={stats.purchased} accent="text-green-600" />
            <StatCard label="🌱 Sembrando Vida" value={stats.sembrando_vida} accent="text-emerald-600" />
            <StatCard label="Activos 30 días" value={stats.active_30d} accent="text-blue-600" />
          </div>
        )}

        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-full mb-3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setSource(f.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                source === f.value
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="w-px h-4 bg-gray-200 mx-1" aria-hidden="true" />
          <button
            onClick={() => setOnlyPurchased(v => !v)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              onlyPurchased
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Compró
          </button>
          <button
            onClick={() => setOnlySV(v => !v)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              onlySV
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            🌱 Sembrando Vida
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100">
                  <th className={TH_CLS}>Cliente</th>
                  <th className={`hidden sm:table-cell ${TH_CLS}`}>Teléfono</th>
                  <th className={`hidden lg:table-cell ${TH_CLS}`}>Lugar</th>
                  <th className={`hidden md:table-cell ${TH_CLS}`}>Fuente</th>
                  <th className={`hidden md:table-cell ${TH_CLS}`}>Compró</th>
                  <th className={TH_CLS}>Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 animate-pulse">
                      <td className={TD_CLS}><div className="h-4 bg-gray-200 rounded w-36" /></td>
                      <td className={`hidden sm:table-cell ${TD_CLS}`}><div className="h-4 bg-gray-100 rounded w-28" /></td>
                      <td className={`hidden lg:table-cell ${TD_CLS}`}><div className="h-4 bg-gray-100 rounded w-24" /></td>
                      <td className={`hidden md:table-cell ${TD_CLS}`}><div className="h-4 bg-gray-100 rounded-full w-20" /></td>
                      <td className={`hidden md:table-cell ${TD_CLS}`}><div className="h-4 bg-gray-100 rounded-full w-10" /></td>
                      <td className={TD_CLS}><div className="h-4 bg-gray-100 rounded w-20" /></td>
                    </tr>
                  ))
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  list.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => {
                        // Don't navigate when the user is selecting text
                        // (e.g. copying a phone number).
                        if (window.getSelection()?.toString()) return;
                        navigate(`/customers/${c.id}`);
                      }}
                      tabIndex={0}
                      role="link"
                      onKeyDown={e => { if (e.key === 'Enter') navigate(`/customers/${c.id}`); }}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-green-50/50 cursor-pointer transition-colors focus:outline-none focus:bg-green-50"
                    >
                      <td className={TD_CLS}>
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/customers/${c.id}`}
                            onClick={e => e.stopPropagation()}
                            className="font-medium text-sm text-gray-800 hover:text-green-700"
                          >
                            {c.display_name || '(sin nombre)'}
                          </Link>
                          {(c.tags || []).includes(SV_TAG) && (
                            <span title="Sembrando Vida" className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">🌱</span>
                          )}
                        </div>
                        {c.phone_e164 && <div className="text-[11px] text-gray-400 sm:hidden mt-0.5">{c.phone_e164}</div>}
                      </td>
                      <td className={`hidden sm:table-cell ${TD_CLS} text-sm text-gray-600 whitespace-nowrap`}>{c.phone_e164 || '—'}</td>
                      <td className={`hidden lg:table-cell ${TD_CLS} text-sm text-gray-600`}>{c.location || '—'}</td>
                      <td className={`hidden md:table-cell ${TD_CLS}`}>
                        {c.source ? (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SOURCE_CLS[c.source] || 'text-gray-500 bg-gray-50'}`}>{c.source}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`hidden md:table-cell ${TD_CLS}`}>
                        {c.has_purchased
                          ? <span className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Sí</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`${TD_CLS} text-xs text-gray-400 whitespace-nowrap`}>{c.last_activity_at ? relativeTime(c.last_activity_at) : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {hasMore && !loading && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full mt-3 text-center text-xs font-medium text-green-700 border border-dashed border-green-300 rounded-lg py-2 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Cargando…' : 'Cargar más'}
          </button>
        )}
      </div>
    </MainLayout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-gray-900'}`}>{(value ?? 0).toLocaleString('es-MX')}</p>
    </div>
  );
}
