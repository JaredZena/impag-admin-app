import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/utils/api';
import MainLayout from '@/components/layout/MainLayout';
import { useNotifications } from '@/components/ui/notification';

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

interface CustomerDetail extends CustomerBrief {
  email: string | null;
  rfc: string | null;
  first_seen_at: string | null;
  wa_conversations: { id: number; customer_phone: string; message_count: number; last_message_at: string | null }[];
  quotes: { id: number; quote_number: string; status: string; created_at: string | null }[];
  documents: { id: number; filename: string; category: string; document_date: string | null }[];
}

interface CustomerStats {
  total: number;
  purchased: number;
  sembrando_vida: number;
  active_30d: number;
  by_source: Record<string, number>;
}

const SOURCE_CLS: Record<string, string> = {
  whatsapp: 'text-green-700 bg-green-50', visita: 'text-blue-700 bg-blue-50',
  marketplace: 'text-purple-700 bg-purple-50', messenger: 'text-sky-700 bg-sky-50',
};

const SOURCE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'visita', label: 'Visita' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'messenger', label: 'Messenger' },
];

const SV_TAG = 'sembrando-vida';
const LIMIT = 100;

// Relative time in Spanish — same idiom as PublishStorefrontButton's formatRelativeTime
function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMin = Math.floor((Date.now() - then) / 60_000);
  if (diffMin < 1) return 'hace unos segundos';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `hace ${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
  const diffYears = Math.floor(diffMonths / 12);
  return `hace ${diffYears} año${diffYears !== 1 ? 's' : ''}`;
}

export default function CustomersPage() {
  const { addNotification } = useNotifications();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [source, setSource] = useState('');
  const [onlyPurchased, setOnlyPurchased] = useState(false);
  const [onlySV, setOnlySV] = useState(false);
  const [list, setList] = useState<CustomerBrief[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingTag, setUpdatingTag] = useState(false);

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

  // Guard against out-of-order detail responses (click A then B fast).
  const openIdRef = useRef<number | null>(null);

  const open = async (id: number) => {
    openIdRef.current = id;
    try {
      // Backend returns {customer, conversations, quotes, documents} — map to
      // the flat shape this page uses internally.
      const r = await apiRequest(`/customers/${id}`);
      if (openIdRef.current !== id) return;
      setSelected({
        ...r.customer,
        wa_conversations: r.conversations || [],
        quotes: r.quotes || [],
        documents: r.documents || [],
      });
    } catch {
      if (openIdRef.current !== id) return;
      addNotification({ type: 'error', title: 'Error al cargar el cliente', message: 'No se pudo obtener el detalle del cliente. Intenta de nuevo.' });
    }
  };

  const toggleSembradoVida = async () => {
    if (!selected || updatingTag) return;
    const id = selected.id;
    const prevTags = selected.tags || [];
    const isSV = prevTags.includes(SV_TAG);
    const nextTags = isSV ? prevTags.filter(t => t !== SV_TAG) : [...prevTags, SV_TAG];

    // Optimistic update: detail + matching row in the left list
    setSelected(s => (s && s.id === id ? { ...s, tags: nextTags } : s));
    setList(prev => prev.map(c => (c.id === id ? { ...c, tags: nextTags } : c)));
    setUpdatingTag(true);
    try {
      await apiRequest(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify({ tags: nextTags }) });
      fetchStats();
      // If the 🌱 filter is active and the tag was removed, the row no longer
      // belongs in the filtered list.
      if (onlySV && !nextTags.includes(SV_TAG)) {
        setList(prev => prev.filter(c => c.id !== id));
      }
    } catch {
      // Rollback
      setSelected(s => (s && s.id === id ? { ...s, tags: prevTags } : s));
      setList(prev => prev.map(c => (c.id === id ? { ...c, tags: prevTags } : c)));
      addNotification({ type: 'error', title: 'No se pudo actualizar la etiqueta', message: 'El cambio de Sembrando Vida no se guardó. Intenta de nuevo.' });
    } finally {
      setUpdatingTag(false);
    }
  };

  const selectedIsSV = (selected?.tags || []).includes(SV_TAG);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
            {loading ? <p className="text-gray-400 text-sm">Cargando…</p>
              : list.length === 0 ? <p className="text-gray-400 text-sm">Sin resultados.</p>
              : (
                <>
                  {list.map(c => (
                    <button key={c.id} onClick={() => open(c.id)}
                      className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                        selected?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-800">{c.display_name || '(sin nombre)'}</span>
                        <div className="flex items-center gap-1.5">
                          {(c.tags || []).includes(SV_TAG) && (
                            <span title="Sembrando Vida" className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">🌱</span>
                          )}
                          {c.has_purchased && <span className="text-[9px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">compró</span>}
                          {c.source && <span className={`text-[9px] px-1.5 py-0.5 rounded ${SOURCE_CLS[c.source] || 'text-gray-500 bg-gray-50'}`}>{c.source}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-0.5">
                        <span className="truncate mr-2">{c.phone_e164}{c.location ? ` · ${c.location}` : ''}</span>
                        {c.last_activity_at && <span className="shrink-0">{relativeTime(c.last_activity_at)}</span>}
                      </div>
                    </button>
                  ))}
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="w-full text-center text-xs font-medium text-green-700 border border-dashed border-green-300 rounded-lg py-2 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? 'Cargando…' : 'Cargar más'}
                    </button>
                  )}
                </>
              )}
          </div>

          {/* 360 detail */}
          <div className="rounded-lg border border-gray-200 p-4 max-h-[70vh] overflow-y-auto">
            {!selected ? <p className="text-gray-400 text-sm">Selecciona un cliente para ver su 360.</p> : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-800">{selected.display_name || '(sin nombre)'}</h2>
                  <button
                    onClick={toggleSembradoVida}
                    disabled={updatingTag}
                    className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-md border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                      selectedIsSV
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {selectedIsSV ? 'Quitar 🌱 Sembrando Vida' : 'Marcar 🌱 Sembrando Vida'}
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {selected.phone_e164}{selected.location ? ` · ${selected.location}` : ''}
                  {selected.email ? ` · ${selected.email}` : ''}
                  {selected.rfc ? ` · RFC ${selected.rfc}` : ''}
                </div>
                {selected.first_seen_at && (
                  <div className="text-[11px] text-gray-400 mt-0.5">Cliente desde {relativeTime(selected.first_seen_at)}</div>
                )}
                {(selected.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(selected.tags || []).map(t => (
                      <span
                        key={t}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          t === SV_TAG ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-100'
                        }`}
                      >
                        {t === SV_TAG ? '🌱 Sembrando Vida' : t}
                      </span>
                    ))}
                  </div>
                )}

                <Section title={`Conversaciones de WhatsApp (${(selected.wa_conversations || []).length})`}>
                  {(selected.wa_conversations || []).map(cv => (
                    <Row key={cv.id} left={cv.customer_phone} right={`${cv.message_count} msgs`} />
                  ))}
                </Section>

                <Section title={`Cotizaciones rastreables (${(selected.quotes || []).length})`}>
                  {(selected.quotes || []).map(qq => (
                    <Link
                      key={qq.id}
                      to={`/quotes/${qq.id}`}
                      className="flex items-center justify-between text-xs bg-gray-50 hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                    >
                      <span className="text-blue-600 hover:underline truncate mr-2">{qq.quote_number}</span>
                      <span className="text-gray-400 shrink-0">{qq.status}</span>
                    </Link>
                  ))}
                </Section>

                <Section title={`Documentos (${(selected.documents || []).length})`}>
                  {(selected.documents || []).map(d => (
                    <Row key={d.id} left={d.filename} right={d.category} />
                  ))}
                </Section>
              </>
            )}
          </div>
        </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div className="mt-4">
      <h3 className="text-[11px] font-semibold text-gray-500 uppercase mb-1">{title}</h3>
      {empty ? <p className="text-[11px] text-gray-300">—</p> : <div className="space-y-1">{children}</div>}
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
      <span className="text-gray-700 truncate mr-2">{left}</span>
      <span className="text-gray-400 shrink-0">{right}</span>
    </div>
  );
}
