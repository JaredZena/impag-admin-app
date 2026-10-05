import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, FileText, Globe, MessageSquareText, Plus, Search, Sparkles } from 'lucide-react';
import { listQuotes, getQuoteStats } from '@/utils/quotesApi';
import type { Quote, QuoteStats } from '@/types/quotes';
import QuoteStatusBadge from './QuoteStatusBadge';
import { parseQuoteNotes } from '@/utils/quoteNotes';
import PaymentStatusChip from './PaymentStatusChip';
import CaptureQuoteDialog from './CaptureQuoteDialog';
import { isWebOrder, WEB_ORDER_PREFIX } from '@/utils/webOrder';
import LoadError from '@/components/ui/LoadError';
import NextActionLine from './NextActionLine';
import NextStepsSection from './NextStepsSection';
import { useOpenFromLink } from '@/hooks/useOpenFromLink';
import {
  OPEN_QUOTE_STATUSES,
  getOpenQuotesSummary,
  nextQuotePage,
  startCursors,
  type OpenQuotesSummary,
  type StatusCursor,
} from './quoteListPaging';

const OPEN = 'open';
const PAGE_SIZE = 50;

const STATUS_FILTERS = [
  { value: OPEN, label: 'Abiertas' },
  { value: 'requested', label: 'Por cotizar' },
  { value: 'needs_work', label: 'Por ajustar' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'viewed', label: 'Vistas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Perdidas' },
  { value: 'expired', label: 'Expiradas' },
  { value: '', label: 'Todas' },
];

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Lo que se cotizó: el Material/Proyecto del mensaje de WhatsApp o, si la
// cotización trae productos, el primero y cuántos más.
const quotedText = (quote: Quote): string | null => {
  const material = parseQuoteNotes(quote.notes).material;
  if (material) return material;
  if (quote.items.length === 0) return null;
  const first = quote.items[0].description;
  return quote.items.length === 1 ? first : `${first} y ${quote.items.length - 1} más`;
};

function MoreOptionsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass = 'flex items-start gap-2.5 px-3 py-2.5 text-sm hover:bg-gray-50';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 whitespace-nowrap"
      >
        Más opciones
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <Link role="menuitem" to="/quotes/new" className={itemClass}>
            <Plus size={16} className="mt-0.5 shrink-0 text-gray-400" />
            <span>
              <span className="block font-medium text-gray-900">Nueva cotización a mano</span>
              <span className="block text-xs text-gray-500">Capturar productos y precios uno por uno</span>
            </span>
          </Link>
          <Link role="menuitem" to="/quotation-history" className={itemClass}>
            <Sparkles size={16} className="mt-0.5 shrink-0 text-gray-400" />
            <span>
              <span className="block font-medium text-gray-900">Cotizador IA</span>
              <span className="block text-xs text-gray-500">Armar una cotización con ayuda de la IA</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = 'text-gray-900',
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="h-full flex flex-col items-start text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-300 transition-colors"
    >
      {body}
    </button>
  ) : (
    <div className="bg-white border border-gray-100 rounded-xl p-4">{body}</div>
  );
}

export default function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [openSummary, setOpenSummary] = useState<OpenQuotesSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState(OPEN);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const openCapture = useCallback(() => setShowCapture(true), []);
  useOpenFromLink('capture', openCapture);
  // "Pedidos web" (quote_number WEB-…): el filtro aparece hasta que la lista
  // trae al menos un pedido de la tienda en línea.
  const [webOnly, setWebOnly] = useState(false);
  const [webOrdersSeen, setWebOrdersSeen] = useState(false);
  const cursorsRef = useRef<StatusCursor[]>([]);
  const requestRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    getQuoteStats()
      .then((s) => !cancelled && setStats(s))
      .catch((err) => console.error('Failed to fetch quote stats:', err));
    getOpenQuotesSummary()
      .then((s) => !cancelled && setOpenSummary(s))
      .catch(() => {
        // Sin el desglose por estado se muestra la cuenta de /quotes/stats.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const apiSearch = searchQuery || (webOnly ? WEB_ORDER_PREFIX : '');
  const fetchPage = useCallback(
    (status: string, offset: number, limit: number) =>
      listQuotes({ status: status || undefined, search: apiSearch || undefined, limit, offset }),
    [apiSearch],
  );

  const fetchQuotes = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setLoadError(null);
    setMoreError(null);
    try {
      const statuses = statusFilter === OPEN ? OPEN_QUOTE_STATUSES : [statusFilter];
      const page = await nextQuotePage(startCursors(statuses), PAGE_SIZE, fetchPage);
      if (request !== requestRef.current) return;
      cursorsRef.current = page.cursors;
      setQuotes(page.items);
      setTotal(page.total);
      setHasMore(page.hasMore);
      if (page.items.some((q) => isWebOrder(q))) setWebOrdersSeen(true);
    } catch (err) {
      if (request !== requestRef.current) return;
      console.error('Failed to fetch quotes:', err);
      setLoadError(err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [statusFilter, fetchPage]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const loadMore = async () => {
    const request = requestRef.current;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await nextQuotePage(cursorsRef.current, PAGE_SIZE, fetchPage);
      if (request !== requestRef.current) return;
      cursorsRef.current = page.cursors;
      setQuotes((prev) => {
        const seen = new Set(prev.map((q) => q.id));
        return [...prev, ...page.items.filter((q) => !seen.has(q.id))];
      });
      setTotal(page.total);
      setHasMore(page.hasMore);
      if (page.items.some((q) => isWebOrder(q))) setWebOrdersSeen(true);
    } catch (err) {
      if (request === requestRef.current) setMoreError(err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      setLoadingMore(false);
    }
  };

  const visibleQuotes = webOnly ? quotes.filter((q) => isWebOrder(q)) : quotes;
  const filterLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? statusFilter;

  const openCount =
    openSummary?.count ??
    (stats ? (stats.requested ?? 0) + stats.pending_sent + stats.pending_viewed + (stats.needs_work ?? 0) : null);

  const emptyMessage = (() => {
    const scope = statusFilter === OPEN ? ' abierta' : statusFilter ? ` en «${filterLabel}»` : '';
    if (webOnly) return searchQuery ? `Ningún pedido web coincide con «${searchQuery}».` : 'No hay pedidos web en esta lista.';
    if (searchQuery) return `Ninguna cotización${scope} coincide con «${searchQuery}».`;
    if (statusFilter === OPEN) return 'No hay cotizaciones abiertas.';
    if (!statusFilter) return 'Todavía no hay cotizaciones.';
    return `No hay cotizaciones en «${filterLabel}».`;
  })();

  const linkButton = 'bg-transparent p-0 border-0 text-blue-600 font-medium text-sm hover:text-blue-700 hover:underline';

  return (
    <>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
            <p className="hidden sm:block text-sm text-gray-500 mt-1">Solicitudes, cotizaciones enviadas y su seguimiento</p>
          </div>
          <MoreOptionsMenu />
          <button
            onClick={() => setShowCapture(true)}
            className="order-last sm:order-none w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 border border-green-600 text-white px-4 py-3 sm:py-2.5 rounded-lg text-base sm:text-sm font-semibold hover:bg-green-700 hover:border-green-700 transition-colors"
          >
            <MessageSquareText size={18} />
            Registrar cotización
          </button>
        </div>

        {/* Qué sigue: siguientes pasos que vencen esta semana */}
        <NextStepsSection />

        {/* Stats — phone: two figures */}
        {(openCount !== null || stats) && (
          <div className="md:hidden grid grid-cols-[1fr,auto] gap-2 mb-3">
            {openCount !== null && (
              <button
                type="button"
                onClick={() => setStatusFilter(OPEN)}
                className="text-left bg-white border border-gray-100 hover:border-gray-300 rounded-lg px-3 py-2"
              >
                <span className="block text-xs text-gray-500">Abiertas</span>
                <span className="block text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {openCount.toLocaleString('es-MX')}
                  {openSummary && openSummary.total > 0 && ` · ${money(openSummary.total)}`}
                </span>
              </button>
            )}
            {stats && (
              <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                <span className="block text-xs text-gray-500">Este mes</span>
                <span className="block text-sm font-semibold text-gray-900">
                  {stats.total_this_month.toLocaleString('es-MX')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stats — desktop */}
        {stats && (
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Abiertas"
              value={(openCount ?? 0).toLocaleString('es-MX')}
              sub={openSummary && openSummary.total > 0 ? money(openSummary.total) : undefined}
              onClick={() => setStatusFilter(OPEN)}
            />
            <StatCard
              label="Por cotizar"
              value={(stats.requested ?? 0).toLocaleString('es-MX')}
              sub="pidieron precio y aún no sale"
              tone="text-purple-600"
              onClick={() => setStatusFilter('requested')}
            />
            <StatCard
              label="Por ajustar"
              value={(stats.needs_work ?? 0).toLocaleString('es-MX')}
              sub="les debemos una corrección"
              tone="text-orange-600"
              onClick={() => setStatusFilter('needs_work')}
            />
            <StatCard label="Este mes" value={stats.total_this_month.toLocaleString('es-MX')} sub="cotizaciones registradas" />
            <StatCard label="Aceptadas este mes" value={money(stats.accepted_value)} tone="text-green-600" />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 mb-4">
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar cliente, folio o teléfono"
              aria-label="Buscar cotizaciones"
              className="w-full pl-9 pr-4 py-2.5 md:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div
            role="group"
            aria-label="Filtrar por estado"
            className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 md:mx-0 md:px-0 md:pb-0 md:flex-wrap md:overflow-visible"
          >
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                aria-pressed={statusFilter === f.value}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm md:text-xs font-medium rounded-full border transition-colors ${
                  statusFilter === f.value
                    ? 'bg-gray-900 border-gray-900 text-white hover:border-gray-900'
                    : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
            {(webOrdersSeen || webOnly) && (
              <button
                type="button"
                onClick={() => setWebOnly((v) => !v)}
                aria-pressed={webOnly}
                className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 text-sm md:text-xs font-medium rounded-full border transition-colors ${
                  webOnly
                    ? 'bg-emerald-600 border-emerald-600 text-white hover:border-emerald-600'
                    : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Globe size={14} />
                Pedidos web
              </button>
            )}
          </div>
        </div>

        {/* Quote List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : loadError ? (
          <LoadError message={loadError} onRetry={fetchQuotes} />
        ) : visibleQuotes.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white border border-gray-100 rounded-xl">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-700">{emptyMessage}</p>
            {!webOnly && !searchQuery && (statusFilter === OPEN || !statusFilter) && (
              <p className="text-sm text-gray-500 mt-1">Registra la próxima con «Registrar cotización».</p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {webOnly ? (
                <button type="button" onClick={() => setWebOnly(false)} className={linkButton}>
                  Quitar el filtro «Pedidos web»
                </button>
              ) : searchQuery && statusFilter ? (
                <button type="button" onClick={() => setStatusFilter('')} className={linkButton}>
                  Buscar en todas
                </button>
              ) : statusFilter && statusFilter !== OPEN ? (
                <button type="button" onClick={() => setStatusFilter(OPEN)} className={linkButton}>
                  Ver las abiertas
                </button>
              ) : null}
              {searchQuery && (
                <button type="button" onClick={() => setSearchInput('')} className={linkButton}>
                  Borrar la búsqueda
                </button>
              )}
              {!webOnly && !searchQuery && (
                <button
                  type="button"
                  onClick={() => setShowCapture(true)}
                  className="inline-flex items-center gap-2 bg-green-600 border border-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 hover:border-green-700"
                >
                  <MessageSquareText size={16} />
                  Registrar cotización
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-2" aria-live="polite">
              Mostrando {visibleQuotes.length.toLocaleString('es-MX')} de {total.toLocaleString('es-MX')}
            </p>

            {/* Phone: one card per quote */}
            <ul className="md:hidden space-y-2">
              {visibleQuotes.map((quote) => {
                const quoted = quotedText(quote);
                return (
                  <li key={quote.id}>
                    <Link
                      to={`/quotes/${quote.id}`}
                      className="block bg-white border border-gray-100 rounded-xl p-3 active:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{quote.customer_name || 'Sin nombre'}</p>
                          {quoted && <p className="text-sm text-gray-600 line-clamp-2">{quoted}</p>}
                          <NextActionLine quote={quote} maxChars={90} className="mt-1" />
                        </div>
                        {quote.total > 0 ? (
                          <p className="shrink-0 font-bold text-gray-900 whitespace-nowrap">{money(quote.total)}</p>
                        ) : (
                          <p className="shrink-0 text-sm text-gray-400 whitespace-nowrap">Sin total</p>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <QuoteStatusBadge status={quote.status} />
                        <PaymentStatusChip status={quote.payment_status} />
                        <span className="text-xs text-gray-500">{formatDate(quote.sent_at ?? quote.created_at)}</span>
                        <span className="ml-auto text-[11px] text-gray-400 font-mono truncate max-w-[45%]">
                          {quote.quote_number}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block bg-white border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Cotización</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Estado</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Total</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleQuotes.map((quote) => {
                    const quoted = quotedText(quote);
                    return (
                      <tr
                        key={quote.id}
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/quotes/${quote.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {quote.quote_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{quote.customer_name}</p>
                          {quoted && (
                            <p className="text-xs text-gray-600 truncate max-w-[18rem]" title={quoted}>
                              {quoted}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">{quote.customer_phone}</p>
                          <NextActionLine quote={quote} size="xs" maxChars={70} className="mt-0.5 max-w-[26rem]" />
                        </td>
                        <td className="px-4 py-3">
                          <QuoteStatusBadge status={quote.status} />
                          <PaymentStatusChip status={quote.payment_status} className="ml-1.5" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {quote.total > 0 ? (
                            <p className="text-sm font-semibold text-gray-900">{money(quote.total)}</p>
                          ) : (
                            <p className="text-sm text-gray-400">Sin total</p>
                          )}
                          {quote.items.length > 0 && (
                            <p className="text-xs text-gray-400">
                              {quote.items.length === 1 ? '1 producto' : `${quote.items.length} productos`}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* Fecha de envío (las cargadas desde WhatsApp/PDF se crearon después) */}
                          <p className="text-xs text-gray-500">{formatDate(quote.sent_at ?? quote.created_at)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(hasMore || moreError) && (
              <div className="mt-4 text-center">
                {moreError && <p className="text-sm text-red-600 mb-2">{moreError}</p>}
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full md:w-auto px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-60"
                >
                  {loadingMore ? 'Cargando…' : moreError ? 'Reintentar' : 'Cargar más'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {showCapture && (
        <CaptureQuoteDialog
          onClose={() => setShowCapture(false)}
          onSaved={(quote) => {
            setShowCapture(false);
            navigate(`/quotes/${quote.id}`);
          }}
        />
      )}
    </>
  );
}
