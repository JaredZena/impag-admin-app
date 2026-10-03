import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, MessageSquareText, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { getPipelineSummary } from '@/utils/quotesApi';
import type { QuotePipelineSummary } from '@/types/quotes';
import { useNotifications } from '@/components/ui/notification';
import CaptureSaleDialog from './CaptureSaleDialog';
import { useOpenFromLink } from '@/hooks/useOpenFromLink';
import LoadError from '@/components/ui/LoadError';
import { daysAgoLabel, saleReasonLabel, ventaNumberLabel } from './salesLabels';

// ---------------------------------------------------------------------------
// Types (mirror of routes/sales.py in impag-quot)
// ---------------------------------------------------------------------------

interface MonthlyPoint {
  year: number;
  month: number; // 1-12
  total: number;
  count: number;
}

interface PaymentBucket {
  total: number;
  count: number;
}

interface ConceptRow {
  concept: string;
  total: number;
  count: number;
}

interface TopCustomerRow {
  customer_name: string;
  total: number;
  count: number;
}

interface MarginYearRow {
  year: number;
  revenue: number;
  cost: number;
  margin: number;
  margin_pct: number | null;
  count: number;
}

interface MarginsBlock {
  reconciled_count: number;
  reconciled_revenue: number;
  reconciled_cost: number;
  margin_total: number;
  margin_pct: number | null;
  by_year: MarginYearRow[];
  status_counts: Record<string, number>;
}

interface SalesStats {
  monthly: MonthlyPoint[];
  by_payment_method: Record<string, PaymentBucket>;
  by_concept: ConceptRow[];
  top_customers: TopCustomerRow[];
  margins?: MarginsBlock; // absent until the backend deploy lands
  delivery_pending: { count: number; total: number };
  invoice_pending_registration: { count: number; total: number };
  quarantined: { count: number };
  // Lo que deben los clientes de sus *Venta* de WhatsApp (ausente antes del deploy).
  receivable?: { count: number; total: number };
  grand_total: number;
  ytd_total: number;
  label: string;
}

interface MarginRow {
  id: number;
  tab_title: string;
  folios: string[];
  folio_month: string | null;
  customer_name: string | null;
  item_count: number;
  cost_subtotal: number | null;
  shipping_total: number | null;
  cost_total: number | null;
  sheet_sale_total: number | null;
  sheet_profit: number | null;
  ledger_revenue: number | null;
  margin_amount: number | null;
  margin_pct: number | null;
  match_status: string;
  recon_delta: number | null;
  synced_at: string | null;
}

interface MarginsListResponse {
  total: number;
  limit: number;
  offset: number;
  items: MarginRow[];
}

interface SaleRow {
  id: number;
  sheet_tab: string | null;
  source_row: number | null;
  sale_date: string | null;
  month_label: string | null;
  customer_name: string | null;
  customer_id: number | null;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  concept: string | null;
  payment_method: string | null;
  delivery_place: string | null;
  reference: string | null;
  folio: string | null;
  delivery_status: string | null;
  requires_invoice: boolean | null;
  registered: boolean | null;
  quarantined: boolean;
  quarantine_reason: string | null;
  imported_at: string | null;
  // *Venta* registrada desde WhatsApp (sheet_tab === 'WHATSAPP')
  paid_amount?: number | null;
  pending_amount?: number | null;
  quote_id?: number | null;
}

interface SalesListResponse {
  total: number;
  limit: number;
  offset: number;
  items: SaleRow[];
}

// ---------------------------------------------------------------------------
// Constants & formatters
// ---------------------------------------------------------------------------

// Series colors are FIXED BY YEAR — never remapped when the series set changes.
const YEAR_COLORS: Record<number, string> = {
  2024: '#2a78d6', // azul
  2025: '#eb6834', // naranja
  2026: '#1baf7a', // aqua
};

// Years beyond the explicit map get a stable color keyed by year value (never
// by index) so filtering can't repaint a surviving series.
const FALLBACK_YEAR_COLORS = ['#eda100', '#e87ba4', '#4a3aa7', '#008300'];
const colorForYear = (y: number): string =>
  YEAR_COLORS[y] ?? FALLBACK_YEAR_COLORS[y % FALLBACK_YEAR_COLORS.length];

const BAR_HUE = '#2a78d6'; // single hue for all horizontal bar lists

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const fmtMXN = (n: number): string =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const fmtMXNExact = (n: number): string =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}k`;
  return fmtMXN(n);
};

const relativeDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (days < 0) return shortDate(iso); // future-dated row (sheet anomaly) — show the date itself
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  if (days < 365) {
    const m = Math.floor(days / 30);
    return m === 1 ? 'hace 1 mes' : `hace ${m} meses`;
  }
  const y = Math.floor(days / 365);
  return y === 1 ? 'hace 1 año' : `hace ${y} años`;
};

const shortDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'Intenta de nuevo.');

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

const Card = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5">
    {title && <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>}
    {children}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <p className="text-sm text-gray-400 text-center py-8">{message}</p>
);

function useContainerWidth<T extends HTMLElement>() {
  const roRef = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);

  // Callback ref: the observed node is conditionally rendered ("Ver tabla"
  // swaps it out), so the observer must re-attach whenever the node changes.
  const ref = useCallback((el: T | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === 'number') setWidth(w);
    });
    ro.observe(el);
    roRef.current = ro;
    setWidth(el.getBoundingClientRect().width);
  }, []);

  useEffect(() => () => roRef.current?.disconnect(), []);

  return { ref, width };
}

/** Nice round axis maximum + step for ~`tickCount` intervals. */
function niceScale(maxVal: number, tickCount = 4): { max: number; step: number } {
  if (maxVal <= 0) return { max: 1000, step: 250 };
  const rough = maxVal / tickCount;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const factor = [1, 2, 5, 10].find((c) => c * pow >= rough) ?? 10;
  const step = factor * pow;
  return { max: step * tickCount, step };
}

// ---------------------------------------------------------------------------
// Chart A — "Ventas por mes" (inline SVG line chart, one line per year)
// ---------------------------------------------------------------------------

function MonthlyLineChart({ monthly }: { monthly: MonthlyPoint[] }) {
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const { ref, width } = useContainerWidth<HTMLDivElement>();

  const years = [...new Set(monthly.map((m) => m.year))].sort((a, b) => a - b);

  // year -> 12 slots (null where the month has no data)
  const series = new Map<number, (number | null)[]>();
  years.forEach((y) => series.set(y, Array.from({ length: 12 }, () => null)));
  monthly.forEach((m) => {
    const slots = series.get(m.year);
    if (slots && m.month >= 1 && m.month <= 12) slots[m.month - 1] = m.total;
  });

  if (years.length === 0) return <EmptyState message="Sin datos de ventas todavía" />;

  const allValues = monthly.filter((m) => series.has(m.year)).map((m) => m.total);
  const { max: yMax, step } = niceScale(Math.max(...allValues, 0));
  const tickValues: number[] = [];
  for (let v = 0; v <= yMax + step / 2; v += step) tickValues.push(v);

  // Geometry — fixed 280px height INCLUDING the x-axis label band.
  const HEIGHT = 280;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 30; // x-axis label band
  const PAD_RIGHT = 46; // room for endpoint year labels
  const longestTick = yMax.toLocaleString('es-MX');
  const PAD_LEFT = Math.max(44, longestTick.length * 6.8 + 14);

  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const bandW = plotW / 12;
  const cx = (i: number) => PAD_LEFT + bandW * (i + 0.5);
  const cy = (v: number) => PAD_TOP + plotH - (v / yMax) * plotH;

  // Endpoint direct labels: skip any label within 14px (y) of an already placed one.
  const endCandidates = years
    .map((year) => {
      const slots = series.get(year)!;
      let lastIdx = -1;
      slots.forEach((v, i) => { if (v !== null) lastIdx = i; });
      if (lastIdx < 0) return null;
      return { year, x: cx(lastIdx), y: cy(slots[lastIdx]!) };
    })
    .filter((c): c is { year: number; x: number; y: number } => c !== null)
    .sort((a, b) => a.y - b.y);
  const endLabels: typeof endCandidates = [];
  endCandidates.forEach((c) => {
    // Only labels at (nearly) the same x can actually collide.
    if (endLabels.every((p) => Math.abs(p.x - c.x) > 40 || Math.abs(p.y - c.y) >= 14)) endLabels.push(c);
  });

  const pathFor = (slots: (number | null)[]): string => {
    let d = '';
    let pen = false;
    slots.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const monthAria = (i: number): string => {
    const parts = years.map((y) => {
      const v = series.get(y)![i];
      return `${y}: ${v !== null ? fmtMXN(v) : 'sin datos'}`;
    });
    return `${MONTHS_FULL[i]} — ${parts.join(', ')}`;
  };

  const tooltipLeft = hoverMonth === null ? 0 : Math.min(Math.max(cx(hoverMonth), 110), Math.max(width - 110, 110));

  return (
    <div>
      {/* Legend row */}
      <div className="flex items-center gap-4 mb-3">
        {years.map((y) => (
          <span key={y} className="inline-flex items-center gap-1.5">
            <svg width="14" height="4" aria-hidden="true">
              <line x1="1" y1="2" x2="13" y2="2" stroke={colorForYear(y)} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-gray-600">{y}</span>
          </span>
        ))}
      </div>

      {!showTable && (
        <div className="overflow-x-auto">
        <div ref={ref} className="relative min-w-[480px]" style={{ height: HEIGHT }} onMouseLeave={() => setHoverMonth(null)}>
          {width > 0 && (
            <svg width={width} height={HEIGHT} role="img" aria-label="Ventas por mes, una línea por año">
              {/* Horizontal gridlines — solid, behind marks */}
              {tickValues.map((v) => (
                <g key={v}>
                  <line x1={PAD_LEFT} y1={cy(v)} x2={width - PAD_RIGHT} y2={cy(v)} stroke="#e5e7eb" strokeWidth="1" />
                  <text x={PAD_LEFT - 8} y={cy(v) + 3.5} textAnchor="end" fontSize="11" fill="#6b7280">
                    {v.toLocaleString('es-MX')}
                  </text>
                </g>
              ))}

              {/* Month labels (x-axis band) */}
              {MONTHS_SHORT.map((m, i) => (
                <text key={m} x={cx(i)} y={HEIGHT - 10} textAnchor="middle" fontSize="11" fill="#6b7280">
                  {m}
                </text>
              ))}

              {/* Series lines + markers */}
              {years.map((y) => (
                <g key={y}>
                  <path
                    d={pathFor(series.get(y)!)}
                    fill="none"
                    stroke={colorForYear(y)}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {series.get(y)!.map((v, i) =>
                    v === null ? null : (
                      <circle
                        key={i}
                        cx={cx(i)}
                        cy={cy(v)}
                        r="4"
                        fill={colorForYear(y)}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    ),
                  )}
                </g>
              ))}

              {/* Endpoint year labels — gray ink, never the series color */}
              {endLabels.map((l) => (
                <text key={l.year} x={l.x + 9} y={l.y + 4} fontSize="11" fontWeight="600" fill="#4b5563">
                  {l.year}
                </text>
              ))}

              {/* Crosshair */}
              {hoverMonth !== null && (
                <line
                  x1={cx(hoverMonth)}
                  y1={PAD_TOP}
                  x2={cx(hoverMonth)}
                  y2={PAD_TOP + plotH}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  pointerEvents="none"
                />
              )}

              {/* Invisible full-height hit bands, one per month (hover + keyboard focus) */}
              {MONTHS_SHORT.map((m, i) => (
                <rect
                  key={m}
                  x={PAD_LEFT + bandW * i}
                  y={PAD_TOP}
                  width={bandW}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={monthAria(i)}
                  style={{ outline: 'none' }}
                  onMouseEnter={() => setHoverMonth(i)}
                  onFocus={() => setHoverMonth(i)}
                  onBlur={() => setHoverMonth((h) => (h === i ? null : h))}
                />
              ))}
            </svg>
          )}

          {/* One tooltip: every year's value at the hovered month */}
          {hoverMonth !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md"
              style={{ left: tooltipLeft, top: 4 }}
            >
              <p className="text-xs text-gray-500 mb-1">{MONTHS_FULL[hoverMonth]}</p>
              {years.map((y) => {
                const v = series.get(y)![hoverMonth];
                return (
                  <div key={y} className="flex items-center gap-2 whitespace-nowrap leading-5">
                    <svg width="14" height="4" aria-hidden="true">
                      <line x1="1" y1="2" x2="13" y2="2" stroke={colorForYear(y)} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {v !== null ? (
                      <>
                        <span className="text-xs font-semibold text-gray-900">{fmtMXNExact(v)}</span>
                        <span className="text-xs text-gray-500">{y}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400">—</span>
                        <span className="text-xs text-gray-500">{y}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      )}

      {/* Accessible table fallback */}
      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Mes</th>
                {years.map((y) => (
                  <th key={y} className="text-right text-xs font-medium text-gray-500 py-2 pl-4">
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHS_SHORT.map((m, i) => (
                <tr key={m} className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 text-gray-700">{m}</td>
                  {years.map((y) => {
                    const v = series.get(y)![i];
                    return (
                      <td key={y} className="py-1.5 pl-4 text-right text-gray-700">
                        {v !== null ? fmtMXN(v) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-4 font-semibold text-gray-900">Total</td>
                {years.map((y) => {
                  const total = series.get(y)!.reduce<number>((acc, v) => acc + (v ?? 0), 0);
                  return (
                    <td key={y} className="py-2 pl-4 text-right font-semibold text-gray-900">
                      {fmtMXN(total)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowTable((s) => !s)}
        className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        {showTable ? 'Ver gráfica' : 'Ver tabla'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts B/C/D — shared horizontal bar list (CSS bars, single hue)
// ---------------------------------------------------------------------------

interface BarItem {
  key: string;
  label: string;
  value: number;
  count?: number;
  href?: string;
}

function BarList({ items, emptyMessage }: { items: BarItem[]; emptyMessage: string }) {
  if (items.length === 0) return <EmptyState message={emptyMessage} />;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-[2px]">
      {items.map((it) => (
        <div key={it.key} tabIndex={0} className="group relative flex items-center gap-2 focus:outline-none">
          <div className="w-32 sm:w-40 shrink-0 text-sm text-gray-700 truncate" title={it.label}>
            {it.href ? (
              <Link to={it.href} className="hover:text-blue-600 hover:underline">
                {it.label}
              </Link>
            ) : (
              it.label
            )}
          </div>
          <div className="flex-1 flex items-center min-w-0">
            <div
              className="h-4 transition-opacity group-hover:opacity-80 group-focus:opacity-80"
              style={{
                width: `calc((100% - 72px) * ${Math.max(it.value, 0) / max})`,
                minWidth: 2,
                backgroundColor: BAR_HUE,
                borderRadius: '0 4px 4px 0', // rounded data end only, square at the baseline
              }}
            />
            <span className="ml-2 text-xs text-gray-600 whitespace-nowrap">{fmtCompact(it.value)}</span>
          </div>
          {/* Exact-value tooltip on hover/focus */}
          <div className="pointer-events-none absolute left-32 sm:left-40 -top-8 z-10 hidden group-hover:block group-focus:block rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap">
            <span className="font-semibold text-gray-900">{fmtMXNExact(it.value)}</span>
            {typeof it.count === 'number' && (
              <span className="text-gray-500"> · {it.count} {it.count === 1 ? 'venta' : 'ventas'}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Margen por venta (BALANCES DE VENTA)
// ---------------------------------------------------------------------------

const MARGIN_STATUS_META: Record<string, { label: string; cls: string }> = {
  reconciled: { label: 'Cuadra', cls: 'bg-green-50 text-green-700 border border-green-200' },
  unverified: { label: 'Sin verificar', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  mismatch: { label: 'No cuadra', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  // Balance armado para entregar una cotización; la venta no se concretó
  no_ledger_match: { label: 'Cotización (sin venta)', cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  orphan: { label: 'Sin folio', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  duplicate: { label: 'Duplicada', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
};

// Folio en el título pero los totales no cuadran con la venta — sí es un
// problema de datos. Las cotizaciones no concretadas NO van aquí.
const REVIEW_STATUSES = new Set(['mismatch', 'duplicate']);
// Sin venta registrada (o sin folio siquiera): balance de cotización.
const QUOTE_STATUSES = new Set(['no_ledger_match', 'orphan']);

function MarginStatusPill({ status }: { status: string }) {
  const meta = MARGIN_STATUS_META[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

const marginPctClass = (pct: number): string => {
  if (pct < 0) return 'text-red-700';
  if (pct < 15) return 'text-amber-700';
  if (pct >= 30) return 'text-green-700';
  return 'text-gray-900';
};

const monthYearLabel = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

function MarginSection({ margins }: { margins: MarginsBlock }) {
  const [rows, setRows] = useState<MarginRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'reconciled' | 'review' | 'quote' | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const res = (await apiRequest('/sales/margins?limit=200')) as MarginsListResponse;
        if (!cancelled) setRows(res.items);
      } catch (err) {
        if (!cancelled) setLoadError(errorText(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retry]);

  const reviewCount = Object.entries(margins.status_counts)
    .filter(([status]) => REVIEW_STATUSES.has(status))
    .reduce((acc, [, count]) => acc + count, 0);
  const quoteCount = Object.entries(margins.status_counts)
    .filter(([status]) => QUOTE_STATUSES.has(status))
    .reduce((acc, [, count]) => acc + count, 0);

  const years = [...new Set(
    (rows ?? [])
      .map((r) => (r.folio_month ? Number(r.folio_month.slice(0, 4)) : null))
      .filter((y): y is number => y !== null),
  )].sort((a, b) => b - a);

  const filtered = (rows ?? []).filter((r) => {
    if (statusFilter === 'reconciled' && r.match_status !== 'reconciled') return false;
    if (statusFilter === 'review' && !REVIEW_STATUSES.has(r.match_status)) return false;
    if (statusFilter === 'quote' && !QUOTE_STATUSES.has(r.match_status)) return false;
    if (yearFilter !== null && (!r.folio_month || Number(r.folio_month.slice(0, 4)) !== yearFilter)) return false;
    return true;
  });
  const visible = showAll ? filtered : filtered.slice(0, 15);

  const statusFilters: { value: 'reconciled' | 'review' | 'quote' | null; label: string }[] = [
    { value: null, label: 'Todas' },
    { value: 'reconciled', label: `Cuadran (${margins.status_counts.reconciled ?? 0})` },
    { value: 'review', label: `Por revisar (${reviewCount})` },
    { value: 'quote', label: `Cotizaciones (${quoteCount})` },
  ];

  return (
    <Card title="Margen por venta">
      <p className="text-xs text-gray-500 -mt-2 mb-4">
        Costo real de cada venta, tomado de la hoja «Balances de venta» y comparado por
        número de nota con la venta registrada. Solo cuentan en el margen las ventas cuyo
        total cuadra con lo registrado.
      </p>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-x-8 gap-y-3 mb-4">
        <div>
          <p className="text-xs text-gray-500">Margen bruto (ventas que cuadran)</p>
          <p className="text-2xl font-bold text-gray-900">
            {margins.margin_pct !== null ? `${margins.margin_pct.toFixed(1)}%` : '—'}
            <span className="ml-2 text-sm font-medium text-gray-500">{fmtMXN(margins.margin_total)}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {margins.reconciled_count} ventas · ingreso {fmtMXN(margins.reconciled_revenue)}
          </p>
        </div>
        {margins.by_year.map((y) => (
          <div key={y.year}>
            <p className="text-xs text-gray-500">{y.year}</p>
            <p className="text-lg font-semibold text-gray-900">
              {y.margin_pct !== null ? `${y.margin_pct.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-gray-500">{fmtMXN(y.margin)}</p>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit max-w-full overflow-x-auto">
          {statusFilters.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-md border-0 transition-colors ${
                statusFilter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {years.length > 1 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit max-w-full overflow-x-auto">
            {[{ value: null as number | null, label: 'Todos' }, ...years.map((y) => ({ value: y as number | null, label: String(y) }))].map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setYearFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  yearFilter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => setRetry((r) => r + 1)} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No hay balances para este filtro" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Nota</th>
                <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Mes</th>
                <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Cliente</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Ingreso</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Costo</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Margen</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">%</th>
                <th className="text-left text-xs font-medium text-gray-500 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const revenue = r.ledger_revenue ?? r.sheet_sale_total;
                // Cotización no concretada: margen que HABRÍA dejado, según el
                // propio balance — informativo, nunca cuenta en agregados.
                const isQuote = QUOTE_STATUSES.has(r.match_status);
                const quotedMargin =
                  isQuote && r.cost_total !== null && r.sheet_sale_total !== null && r.sheet_sale_total > 0
                    ? r.sheet_sale_total - r.cost_total
                    : null;
                const quotedPct =
                  quotedMargin !== null && r.sheet_sale_total ? (100 * quotedMargin) / r.sheet_sale_total : null;
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs text-gray-600 whitespace-nowrap" title={r.tab_title}>
                      {r.folios.length > 0 ? r.folios.join(', ') : r.tab_title}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-600 whitespace-nowrap">{monthYearLabel(r.folio_month)}</td>
                    <td className="py-2.5 pr-3 text-sm text-gray-900 max-w-[160px] truncate" title={r.customer_name ?? undefined}>
                      {r.customer_name ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-900 text-right whitespace-nowrap">
                      {revenue !== null ? fmtMXNExact(revenue) : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-600 text-right whitespace-nowrap">
                      {r.cost_total !== null ? fmtMXNExact(r.cost_total) : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-sm font-medium text-right whitespace-nowrap">
                      {r.margin_amount !== null ? (
                        <span className={marginPctClass(r.margin_pct ?? 0)}>{fmtMXNExact(r.margin_amount)}</span>
                      ) : quotedMargin !== null ? (
                        <span className="text-gray-400" title="Margen cotizado — la venta no se concretó">
                          {fmtMXNExact(quotedMargin)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm font-semibold text-right whitespace-nowrap">
                      {r.margin_pct !== null ? (
                        <span className={marginPctClass(r.margin_pct)}>{r.margin_pct.toFixed(1)}%</span>
                      ) : quotedPct !== null ? (
                        <span className="text-gray-400 font-medium" title="Margen cotizado — la venta no se concretó">
                          {quotedPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <MarginStatusPill status={r.match_status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 15 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {showAll ? 'Ver menos' : `Ver las ${filtered.length.toLocaleString('es-MX')} ventas`}
            </button>
          )}
        </div>
      )}

      {(reviewCount > 0 || quoteCount > 0) && (
        <p className="mt-4 text-xs text-gray-500">
          {reviewCount > 0 && (
            <>
              <AlertTriangle size={12} className="inline mr-1 text-amber-500" aria-hidden="true" />
              {reviewCount === 1 ? '1 balance necesita revisión' : `${reviewCount} balances necesitan revisión`} en
              la hoja: «No cuadra» = el total del balance no es igual a la venta registrada (número de nota
              equivocado o montos viejos).{' '}
            </>
          )}
          {quoteCount > 0 && (
            <>
              Las {quoteCount} cotizaciones son balances de ventas que no se concretaron — su margen se muestra en
              gris como referencia y no cuenta en los totales.
            </>
          )}
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Cotizaciones abiertas (GET /quotes/pipeline-summary)
// ---------------------------------------------------------------------------

const daysLabel = (d: number): string => (d === 1 ? '1 día' : `${d.toLocaleString('es-MX')} días`);

function QuotePipelineCard() {
  const [summary, setSummary] = useState<QuotePipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getPipelineSummary();
        if (!cancelled) setSummary(s);
      } catch {
        // Igual que stats.margins: el endpoint puede no existir hasta que el
        // deploy del backend aterrice — la tarjeta se oculta sin alarmar.
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <Skeleton className="h-4 w-44 mb-4" />
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  if (summary.open_count === 0) {
    return (
      <Card title="Cotizaciones esperando respuesta">
        <p className="text-sm text-gray-400 py-1">
          Ninguna cotización enviada está esperando respuesta —{' '}
          <Link to="/quotes?capture=1" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
            registra la próxima
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card title="Cotizaciones esperando respuesta">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-x-8 gap-y-3 mb-4">
        <div>
          <p className="text-xs text-gray-500">Enviadas o vistas, sin respuesta</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{fmtMXN(summary.open_total)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {summary.open_count === 1
              ? '1 cotización'
              : `${summary.open_count.toLocaleString('es-MX')} cotizaciones`}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Sin seguimiento</p>
          <p className={`text-2xl font-bold mt-1 ${summary.stale_count > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
            {summary.stale_count > 0 && (
              <AlertTriangle size={18} className="inline mr-1.5 -mt-1 text-amber-500" aria-hidden="true" />
            )}
            {summary.stale_count.toLocaleString('es-MX')}
          </p>
        </div>
        {summary.oldest_days !== null && (
          <div>
            <p className="text-xs text-gray-500">Más antigua</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{daysLabel(summary.oldest_days)}</p>
          </div>
        )}
      </div>

      {/* Top open quotes */}
      {summary.top_open.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="hidden sm:table-cell text-left text-xs font-medium text-gray-500 py-2 pr-3">Folio</th>
                <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Cliente</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Total</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2">Días</th>
              </tr>
            </thead>
            <tbody>
              {summary.top_open.map((q, i) => (
                <tr key={q.id > 0 ? q.id : `${q.quote_number}-${i}`} className="border-b border-gray-50 last:border-0">
                  <td className="hidden sm:table-cell py-2.5 pr-3 font-mono text-xs whitespace-nowrap">
                    {q.id > 0 ? (
                      <Link to={`/quotes/${q.id}`} className="text-blue-600 hover:text-blue-700 hover:underline">
                        {q.quote_number || `#${q.id}`}
                      </Link>
                    ) : (
                      <span className="text-gray-600">{q.quote_number || '—'}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-gray-900 max-w-[110px] sm:max-w-[180px] truncate" title={q.customer_name || undefined}>
                    {q.id > 0 ? (
                      <Link to={`/quotes/${q.id}`} className="text-blue-600 sm:text-gray-900 hover:underline">
                        {q.customer_name || '—'}
                      </Link>
                    ) : (
                      q.customer_name || '—'
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                    {q.total > 0 ? fmtMXNExact(q.total) : <span className="font-normal text-gray-400">Sin total</span>}
                  </td>
                  <td className="py-2.5 text-sm text-gray-600 text-right whitespace-nowrap">
                    {daysLabel(q.days_open)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link
        to="/quotes"
        className="mt-3 inline-block text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        Ver las cotizaciones abiertas
      </Link>
    </Card>
  );
}


// ---------------------------------------------------------------------------
// Venta reference: "Venta 11_09_2026" + "#11 · sep 2026"
// ---------------------------------------------------------------------------

function VentaRef({ row }: { row: SaleRow }) {
  const label = ventaNumberLabel(row.reference);
  if (label) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="whitespace-nowrap">{row.reference}</span>
        <span className="whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">{label}</span>
      </span>
    );
  }
  if (row.folio) return <span className="whitespace-nowrap">Nota {row.folio}</span>;
  return null;
}

// ---------------------------------------------------------------------------
// Nos deben (ventas con saldo pendiente)
// ---------------------------------------------------------------------------

const OWED_PAGE = 200;
const OWED_MAX_PAGES = 5;

function NosDebenCard({ receivable }: { receivable?: { count: number; total: number } }) {
  const [rows, setRows] = useState<SaleRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const expected = receivable?.count;

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setLoadError(null);
    (async () => {
      try {
        // GET /sales has no "with balance" filter: the balance only exists on
        // WhatsApp *Venta* rows, which are the newest, so scan from the top.
        const owed: SaleRow[] = [];
        for (let page = 0; page < OWED_MAX_PAGES; page++) {
          const res = (await apiRequest(
            `/sales?quarantined=false&limit=${OWED_PAGE}&offset=${page * OWED_PAGE}`,
          )) as SalesListResponse;
          owed.push(...res.items.filter((r) => (r.pending_amount ?? 0) > 0));
          const more = (page + 1) * OWED_PAGE < res.total;
          if (!more || expected === undefined || owed.length >= expected) break;
        }
        owed.sort((a, b) => (a.sale_date ?? '9999').localeCompare(b.sale_date ?? '9999'));
        if (!cancelled) setRows(owed);
      } catch (err) {
        if (!cancelled) setLoadError(errorText(err));
      }
    })();
    return () => { cancelled = true; };
  }, [expected, retry]);

  const owedTotal = receivable?.total ?? (rows ?? []).reduce((acc, r) => acc + (r.pending_amount ?? 0), 0);
  const owedCount = Math.max(receivable?.count ?? 0, rows?.length ?? 0);
  const visible = showAll ? rows ?? [] : (rows ?? []).slice(0, 8);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Nos deben</h2>
          <p className="text-xs text-gray-500">Ventas con saldo pendiente, la más vieja primero</p>
        </div>
        {rows && rows.length > 0 && (
          <div className="text-right">
            <p className="text-xl font-bold text-red-600 whitespace-nowrap">{fmtMXNExact(owedTotal)}</p>
            <p className="text-xs text-gray-500">
              {owedCount === 1 ? '1 venta' : `${owedCount.toLocaleString('es-MX')} ventas`}
            </p>
          </div>
        )}
      </div>

      {loadError ? (
        <LoadError message={loadError} onRetry={() => setRetry((r) => r + 1)} />
      ) : rows === null ? (
        <div className="space-y-3 py-1">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          Nadie nos debe por ahora. Cuando registres una venta con anticipo o abono pendiente, aparece aquí.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {visible.map((r) => (
              <li key={r.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {r.customer_id ? (
                      <Link to={`/customers/${r.customer_id}`} className="text-gray-900 hover:text-blue-600 hover:underline">
                        {r.customer_name ?? 'Sin nombre'}
                      </Link>
                    ) : (
                      r.customer_name ?? 'Sin nombre'
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <VentaRef row={r} />
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-600 whitespace-nowrap">
                    Debe {fmtMXNExact(r.pending_amount ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500 whitespace-nowrap">{daysAgoLabel(r.sale_date)}</p>
                </div>
              </li>
            ))}
          </ul>
          {rows.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-2 bg-transparent p-0 border-0 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {showAll ? 'Ver menos' : `Ver las ${rows.length.toLocaleString('es-MX')}`}
            </button>
          )}
          {expected !== undefined && expected > rows.length && (
            <p className="mt-2 text-xs text-gray-500">
              {expected - rows.length === 1
                ? 'Falta 1 venta con saldo que no aparece en la lista.'
                : `Faltan ${(expected - rows.length).toLocaleString('es-MX')} ventas con saldo que no aparecen en la lista.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ventas recientes
// ---------------------------------------------------------------------------

function DeliveryPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const cls =
    status === 'entregado'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : status === 'pendiente'
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-gray-100 text-gray-600 border border-gray-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}

function RecentSalesTable({ years }: { years: number[] }) {
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [rows, setRows] = useState<SaleRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const yearFilters: { value: number | null; label: string }[] = [
    { value: null, label: 'Todos' },
    ...[...years].sort((a, b) => b - a).map((y) => ({ value: y, label: String(y) })),
  ];

  // Cancelled-flag guard: a slow response for an old chip must never
  // overwrite the currently selected filter's rows.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('limit', '15');
        // Rows "por revisar" live in Detalle técnico, not in the recent-sales list.
        params.set('quarantined', 'false');
        if (yearFilter !== null) params.set('year', String(yearFilter));
        const res = (await apiRequest(`/sales?${params.toString()}`)) as SalesListResponse;
        if (!cancelled) setRows(res.items);
      } catch (err) {
        if (!cancelled) setLoadError(errorText(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [yearFilter, retry]);

  const pendingOf = (r: SaleRow) => (r.pending_amount != null && r.pending_amount > 0 ? r.pending_amount : 0);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-semibold text-gray-900">Ventas recientes</h2>
        {yearFilters.length > 1 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-full overflow-x-auto">
            {yearFilters.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setYearFilter(f.value)}
                aria-pressed={yearFilter === f.value}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border-0 transition-colors ${
                  yearFilter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => setRetry((r) => r + 1)} />
      ) : (rows ?? []).length === 0 ? (
        <EmptyState
          message={
            yearFilter !== null
              ? `No hay ventas registradas en ${yearFilter}.`
              : 'Todavía no hay ventas. Registra la primera con «Registrar venta».'
          }
        />
      ) : (
        <>
          {/* Phone: cards */}
          <ul className="md:hidden divide-y divide-gray-100">
            {(rows ?? []).map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.customer_name ?? 'Sin nombre'}</p>
                    {r.description && <p className="text-sm text-gray-600 truncate">{r.description}</p>}
                  </div>
                  <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                    {r.amount !== null ? fmtMXNExact(r.amount) : '—'}
                  </p>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span className="whitespace-nowrap">{shortDate(r.sale_date) || 'Sin fecha'}</span>
                  {ventaNumberLabel(r.reference) && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 whitespace-nowrap">
                      Venta {ventaNumberLabel(r.reference)}
                    </span>
                  )}
                  {pendingOf(r) > 0 && (
                    <span className="ml-auto rounded-full bg-red-50 border border-red-200 px-2 py-0.5 font-medium text-red-700 whitespace-nowrap">
                      Debe {fmtMXNExact(pendingOf(r))}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Fecha</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Descripción</th>
                  <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Importe</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Forma de pago</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Venta / Nota</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <span className="block text-sm text-gray-900">{relativeDate(r.sale_date)}</span>
                      {shortDate(r.sale_date) !== '' && relativeDate(r.sale_date) !== shortDate(r.sale_date) && (
                        <span className="block text-xs text-gray-400">{shortDate(r.sale_date)}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-900 max-w-[150px] truncate" title={r.customer_name ?? undefined}>
                      {r.customer_name ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-gray-600 max-w-[180px] truncate" title={r.description ?? undefined}>
                      {r.description ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                      {r.amount !== null ? fmtMXNExact(r.amount) : '—'}
                      {pendingOf(r) > 0 && (
                        <span className="block text-xs font-normal text-red-600">Debe {fmtMXNExact(pendingOf(r))}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {r.payment_method ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 capitalize whitespace-nowrap">
                          {r.payment_method}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-600">
                      <VentaRef row={r} />
                      {r.sheet_tab === 'WHATSAPP' && <span className="block text-[10px] text-green-700">WhatsApp</span>}
                    </td>
                    <td className="py-2.5">
                      <DeliveryPill status={r.delivery_status} />
                    </td>
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

// ---------------------------------------------------------------------------
// Filas de la hoja por revisar (no cuentan en los totales)
// ---------------------------------------------------------------------------

function ReviewRowsSection({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SaleRow[] | null>(null);
  const [totalQ, setTotalQ] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = (await apiRequest('/sales?quarantined=true&limit=50')) as SalesListResponse;
      setRows(res.items);
      setTotalQ(res.total);
    } catch (err) {
      setLoadError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && rows === null && !loading) load();
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            {count === 1
              ? '1 fila de la hoja de ventas por revisar — no cuenta en los totales'
              : `${count.toLocaleString('es-MX')} filas de la hoja de ventas por revisar — no cuentan en los totales`}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="inline-flex items-center gap-1 bg-transparent p-0 border-0 text-xs font-medium text-amber-700 hover:text-amber-900 shrink-0"
        >
          {open ? 'Ocultar' : 'Ver filas'}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="mt-3 overflow-x-auto">
          {loading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : loadError ? (
            <LoadError message={loadError} onRetry={load} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200/70">
                  <th className="text-left text-xs font-medium text-amber-700 py-2 pr-4">Fila</th>
                  <th className="text-left text-xs font-medium text-amber-700 py-2 pr-4">Por qué</th>
                  <th className="text-left text-xs font-medium text-amber-700 py-2 pr-4">Cliente</th>
                  <th className="text-right text-xs font-medium text-amber-700 py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => {
                  const venta = ventaNumberLabel(r.quarantine_reason);
                  return (
                    <tr key={r.id} className="border-b border-amber-100 last:border-0">
                      <td className="py-1.5 pr-4 text-amber-900 whitespace-nowrap">
                        {r.sheet_tab ?? '—'} · fila {r.source_row ?? '—'}
                      </td>
                      <td className="py-1.5 pr-4 text-amber-800 min-w-[12rem]">
                        {saleReasonLabel(r.quarantine_reason)}
                        {venta && <span className="ml-1 text-amber-600">({venta})</span>}
                      </td>
                      <td className="py-1.5 pr-4 text-amber-900">{r.customer_name ?? '—'}</td>
                      <td className="py-1.5 text-right text-amber-900 whitespace-nowrap">
                        {r.amount !== null ? fmtMXNExact(r.amount) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {(rows ?? []).length > 0 && totalQ > (rows ?? []).length && (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-amber-600 text-xs">
                      Mostrando {(rows ?? []).length} de {totalQ.toLocaleString('es-MX')}
                    </td>
                  </tr>
                )}
                {(rows ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-amber-600 text-xs">
                      No hay filas por revisar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalle técnico (collapsed): margins, rows to review, where numbers come from
// ---------------------------------------------------------------------------

function TechnicalDetails({ stats }: { stats: SalesStats }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl bg-gray-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-transparent border-0 rounded-xl"
      >
        <span>
          <span className="block text-sm font-semibold text-gray-700">Detalle técnico</span>
          <span className="block text-xs text-gray-500">
            Margen por venta
            {stats.quarantined.count > 0 && ` · ${stats.quarantined.count.toLocaleString('es-MX')} filas por revisar`}
            {' · '}de dónde salen los números
          </span>
        </span>
        {open ? <ChevronUp size={18} className="text-gray-500 shrink-0" /> : <ChevronDown size={18} className="text-gray-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 md:px-4 md:pb-4 space-y-4">
          <p className="text-xs text-gray-600 px-1">
            Las ventas anteriores vienen de la hoja de ventas de Hernán; las nuevas, de los mensajes *Venta* que se
            registran aquí con «Registrar venta». Si una venta está en la hoja y también se registró aquí, se cuenta una
            sola vez. Son números de operación, no de contabilidad.
          </p>
          {stats.quarantined.count > 0 && <ReviewRowsSection count={stats.quarantined.count} />}
          {stats.margins && <MarginSection margins={stats.margins} />}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SalesDashboardPage() {
  const { addNotification } = useNotifications();
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const openCapture = useCallback(() => setShowCapture(true), []);
  useOpenFromLink('capture', openCapture);
  const [reloadKey, setReloadKey] = useState(0);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    (async () => {
      try {
        const s = (await apiRequest('/sales/stats')) as SalesStats;
        if (!cancelled) setStats(s);
      } catch (err) {
        if (!cancelled) setStatsError(errorText(err));
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const paymentItems: BarItem[] = stats
    ? Object.entries(stats.by_payment_method)
        .map(([method, bucket]) => ({
          key: method,
          label: method.charAt(0).toUpperCase() + method.slice(1),
          value: bucket.total,
          count: bucket.count,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const customerItems: BarItem[] = stats
    ? stats.top_customers.map((c) => ({
        key: c.customer_name,
        label: c.customer_name,
        value: c.total,
        count: c.count,
        href: `/customers?q=${encodeURIComponent(c.customer_name)}`,
      }))
    : [];

  const conceptItems: BarItem[] = stats
    ? stats.by_concept.map((c) => ({
        key: c.concept,
        label: c.concept,
        value: c.total,
        count: c.count,
      }))
    : [];

  return (
    <>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 md:space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
              <TrendingUp size={24} className="text-gray-400" />
              Ventas
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Números de operación (no es contabilidad)</p>
          </div>
          <button
            onClick={() => setShowCapture(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 border border-green-600 text-white px-4 py-3 sm:py-2.5 rounded-lg text-base sm:text-sm font-semibold hover:bg-green-700 hover:border-green-700 transition-colors"
          >
            <MessageSquareText size={18} />
            Registrar venta
          </button>
        </div>
        {showCapture && (
          <CaptureSaleDialog
            onClose={() => setShowCapture(false)}
            onSaved={() => {
              setShowCapture(false);
              setReloadKey((k) => k + 1);
              addNotification({ type: 'success', title: 'Venta registrada', message: 'Se actualizó la lista de ventas.' });
            }}
          />
        )}

        {/* Nos deben — waits for stats so it knows how many to look for */}
        {statsLoading ? (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <NosDebenCard key={`owed-${reloadKey}`} receivable={stats?.receivable} />
        )}

        {/* Ventas recientes */}
        <RecentSalesTable key={`recent-${reloadKey}`} years={[...new Set((stats?.monthly ?? []).map((m) => m.year))]} />

        {/* KPI row */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-7 w-32" />
              </div>
            ))}
          </div>
        ) : statsError ? (
          <LoadError message={statsError} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500">Ventas {currentYear}</p>
              <p className="text-xl md:text-2xl 2xl:text-3xl font-bold text-gray-900 mt-1">{fmtMXN(stats.ytd_total)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500">Desde que hay registro</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{fmtMXN(stats.grand_total)}</p>
            </div>
            {stats.margins && stats.margins.reconciled_count > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-500">Margen bruto</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                  {stats.margins.margin_pct !== null ? `${stats.margins.margin_pct.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                  {fmtMXN(stats.margins.margin_total)} · {stats.margins.reconciled_count} ventas con costo
                </p>
              </div>
            )}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500">Entregas pendientes</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{stats.delivery_pending.count.toLocaleString('es-MX')}</p>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">{fmtMXN(stats.delivery_pending.total)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500">Facturas por registrar</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                {stats.invoice_pending_registration.count.toLocaleString('es-MX')}
              </p>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">{fmtMXN(stats.invoice_pending_registration.total)}</p>
            </div>
          </div>
        ) : null}

        {/* Cotizaciones esperando respuesta (pipeline) */}
        <QuotePipelineCard />

        {/* Chart A — Ventas por mes */}
        {statsLoading ? (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          stats && (
            <Card title="Ventas por mes">
              <MonthlyLineChart monthly={stats.monthly} />
            </Card>
          )
        )}

        {/* Charts B/C/D — bar lists */}
        {statsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5">
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              <Card title="Por forma de pago">
                <BarList items={paymentItems} emptyMessage="Sin datos de formas de pago" />
              </Card>
              <Card title="Clientes que más compran">
                <BarList items={customerItems} emptyMessage="Sin datos de clientes" />
              </Card>
              <Card title="Por concepto">
                <BarList items={conceptItems} emptyMessage="Sin datos de conceptos" />
              </Card>
            </div>
          )
        )}

        {/* Detalle técnico */}
        {stats && <TechnicalDetails stats={stats} />}
      </div>
    </>
  );
}
