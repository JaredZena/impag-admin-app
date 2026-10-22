import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Star, TrendingUp } from 'lucide-react';
import { getPanel, type PanelData, type ProfileMetric } from '@/utils/panelApi';
import { getFinanceDashboard, type FinanceDashboard } from '@/utils/financeApi';

// «Cómo vamos»: lo primero al entrar. Para todo el equipo: ventas del mes,
// Google (reseñas, búsquedas, perfil) y la tienda en línea (Google Analytics +
// pedidos web); lo que nos deben y las cotizaciones abiertas ya están abajo en
// HoyAcciones. Punto de equilibrio y estado de resultados: dueños (hoy, todo
// el equipo: OWNER_EMAILS sin definir en impag-quot).
// Números de fuera: POST /jobs/google-metrics-sync (diario) en impag-quot.

const OPEN_KEY = 'hoy-panel-open';
const peso = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
const int = (n: number) => Math.round(n).toLocaleString('es-MX');
const monthName = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { month: 'long' });
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** «1–22 sep»: los mismos días del mes anterior (el backend recorta igual). */
const sameDaysLastMonth = (monthIso: string, todayIso: string) => {
  const [y, m] = monthIso.split('-').map(Number);
  const prevDays = new Date(y, m - 1, 0).getDate();
  const day = Math.min(Number(todayIso.slice(8, 10)), prevDays);
  return `1–${day} ${MONTHS_SHORT[(m + 10) % 12]}`;
};
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

function Delta({ now, before, vs }: { now: number; before: number | null | undefined; vs: string }) {
  if (before === null || before === undefined) return null;
  if (before === 0 && now === 0) return <span className="text-xs text-gray-400">igual que {vs}</span>;
  const up = now >= before;
  const text = before === 0 ? `+${int(now)}` : `${up ? '+' : ''}${Math.round(((now - before) / before) * 100)}%`;
  return (
    <span className={`text-xs font-medium ${now === before ? 'text-gray-500' : up ? 'text-green-700' : 'text-red-700'}`}>
      {now === before ? '=' : up ? '▲' : '▼'} {now === before ? `igual que ${vs}` : `${text} vs ${vs}`}
    </span>
  );
}

function Meter({ value, goal, label }: { value: number; goal: number; label: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const done = value >= goal;
  return (
    <div className="mt-2">
      <div
        className="h-2 rounded-full bg-blue-100 overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
        aria-label={label}
      >
        <div className={`h-full rounded-full ${done ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-500 inline-flex items-center gap-1">
        {done && <Check size={12} className="text-green-700" />}
        {label}
      </p>
    </div>
  );
}

/** Columnas mini: gris = historia, azul = el periodo actual. Hover = valor. */
function Bars({ points, label }: { points: { key: string; value: number; title: string }[]; label: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="mt-2 flex items-end gap-[2px] h-8" role="img" aria-label={label}>
      {points.map((p, i) => (
        <div key={p.key} className="flex-1 h-full flex items-end group relative" title={p.title}>
          <div
            className={`w-full max-w-[24px] mx-auto rounded-t-[3px] ${
              i === points.length - 1 ? 'bg-blue-600' : 'bg-gray-300 group-hover:bg-gray-400'
            }`}
            style={{ height: `${Math.max(p.value > 0 ? 8 : 3, (p.value / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function Tile({
  label,
  children,
  to,
  className = '',
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  to?: string;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl p-4 min-w-0 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
        {to && (
          <Link to={to} className="text-xs text-blue-600 hover:underline shrink-0">
            Ver →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

const Value = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-2xl font-semibold text-gray-900">{children}</p>
);

const PROFILE_ROWS: { key: ProfileMetric; label: string }[] = [
  { key: 'profile_views', label: 'Vistas del perfil' },
  { key: 'directions', label: 'Cómo llegar' },
  { key: 'calls', label: 'Llamadas' },
  { key: 'website_clicks', label: 'Clics a la página' },
];

/** Totales por semana (7 días que terminan en el último día con datos). */
function weekly(series: { day: string; value: number }[], unit: string) {
  const out: { key: string; value: number; title: string }[] = [];
  for (let end = series.length; end > 0 && out.length < 13; end -= 7) {
    const week = series.slice(Math.max(0, end - 7), end);
    const value = week.reduce((a, d) => a + d.value, 0);
    out.unshift({
      key: week[week.length - 1].day,
      value,
      title: `Semana al ${shortDate(week[week.length - 1].day)}: ${int(value)} ${unit}`,
    });
  }
  return out;
}

function GoogleTiles({ g }: { g: PanelData['google'] }) {
  const { reviews, profile, search } = g;
  const due = shortDate(g.goals_due);
  return (
    <>
      <Tile label="Reseñas en Google" className="lg:col-span-2">
        <Value>
          {reviews.count}
          {reviews.avg_stars !== null && (
            <span className="ml-2 text-sm font-medium text-gray-500 inline-flex items-center gap-0.5">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              {reviews.avg_stars.toFixed(1)}
            </span>
          )}
        </Value>
        <Meter value={reviews.count} goal={reviews.goal} label={`Meta ${reviews.goal} al ${due}`} />
        {reviews.latest[0] && (
          <p className="mt-1 text-xs text-gray-500 truncate">
            Última: {reviews.latest[0].author} · {shortDate(reviews.latest[0].date)}
          </p>
        )}
      </Tile>

      <Tile label="Clics desde Google · 28 días" className="sm:col-span-2 lg:col-span-2">
        {search.clicks_28d === null ? (
          <p className="mt-2 text-sm text-gray-400">Falta conectar Search Console</p>
        ) : (
          <>
            <Value>{int(search.clicks_28d)}</Value>
            <Delta now={search.clicks_28d} before={search.clicks_prev_28d} vs="28 días antes" />
            <Meter value={search.clicks_28d} goal={search.goal} label={`Meta ${search.goal} al ${due}`} />
            <Bars
              points={weekly(
                search.series.map((d) => ({ day: d.day, value: d.clicks })),
                'clics'
              )}
              label="Clics por semana, últimas 13 semanas"
            />
            {search.last_day && <p className="mt-1 text-xs text-gray-400">Datos al {shortDate(search.last_day)}</p>}
          </>
        )}
      </Tile>

      <Tile
        label={profile.month ? `Perfil de Google · ${monthName(profile.month)}` : 'Perfil de Google'}
        className="sm:col-span-2 lg:col-span-6"
      >
        {!profile.month ? (
          <p className="mt-2 text-sm text-gray-400">Sin informes todavía</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            {PROFILE_ROWS.map(({ key, label }) => {
              const now = profile.values[key] ?? 0;
              const before = profile.previous[key];
              return (
                <div key={key} className="min-w-0">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-semibold text-gray-900">{int(now)}</p>
                  <Delta now={now} before={before} vs="mes anterior" />
                  <Bars
                    label={`${label}, últimos ${profile.series.length} meses`}
                    points={profile.series.map((p) => ({
                      key: p.month,
                      value: p[key],
                      title: `${monthName(p.month)} ${p.month.slice(0, 4)}: ${int(p[key])}`,
                    }))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Tile>
    </>
  );
}

function MiniStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      {children}
    </div>
  );
}

const Big = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xl font-semibold text-gray-900">{children}</p>
);

/** todoparaelcampo.com.mx: tráfico (Google Analytics, desde el 22 oct 2026) y lo que la tienda registró. */
function TiendaTile({ t }: { t: PanelData['tienda'] }) {
  const vs = '28 días antes';
  return (
    <Tile label="Tienda en línea · 28 días" className="sm:col-span-2 lg:col-span-6">
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat label="Visitas">
          {t.visits_28d === null ? (
            <p className="mt-1 text-sm text-gray-400">Sin datos todavía</p>
          ) : (
            <>
              <Big>{int(t.visits_28d)}</Big>
              <Delta now={t.visits_28d} before={t.visits_prev_28d} vs={vs} />
              <Bars
                points={weekly(
                  t.series.map((d) => ({ day: d.day, value: d.visits })),
                  'visitas'
                )}
                label="Visitas por semana, últimas 13 semanas"
              />
            </>
          )}
        </MiniStat>
        <MiniStat label="Clics a WhatsApp">
          {t.whatsapp_28d === null ? (
            <p className="mt-1 text-sm text-gray-400">Sin datos todavía</p>
          ) : (
            <>
              <Big>{int(t.whatsapp_28d)}</Big>
              <Delta now={t.whatsapp_28d} before={t.whatsapp_prev_28d} vs={vs} />
            </>
          )}
        </MiniStat>
        <MiniStat label="Cotizaciones web">
          <Big>{t.web_quotes_28d}</Big>
          <Delta now={t.web_quotes_28d} before={t.web_quotes_prev_28d} vs={vs} />
        </MiniStat>
        <MiniStat label="Pedidos pagados">
          <Big>
            {t.paid_orders_28d}
            {t.paid_orders_28d > 0 && (
              <span className="ml-1 text-sm font-medium text-gray-500">{peso(t.paid_total_28d)}</span>
            )}
          </Big>
          <p className="text-xs text-gray-500">
            Desde el inicio: {t.paid_orders_all}
            {t.paid_orders_all > 0 ? ` · ${peso(t.paid_total_all)}` : ''}
          </p>
        </MiniStat>
      </div>
      {t.last_day && t.first_day && (
        <p className="mt-2 text-xs text-gray-400">
          Google Analytics, del {shortDate(t.first_day)} al {shortDate(t.last_day)}
        </p>
      )}
    </Tile>
  );
}

function OwnerTiles() {
  const [fin, setFin] = useState<FinanceDashboard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getFinanceDashboard({ months: 2 })
      .then((d) => alive && setFin(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;
  if (!fin) return <div className="sm:col-span-2 lg:col-span-6 h-28 rounded-xl bg-gray-50 animate-pulse" />;

  const sel = fin.selected;
  const target = fin.scenarios.find((s) => s.key === 'fijo')?.breakeven ?? null;
  const onPace = target !== null && sel.projection >= target;
  const months = fin.series.slice(-2);
  const rows: { label: string; get: (m: (typeof months)[number]) => number; strong?: boolean }[] = [
    { label: 'Ventas', get: (m) => m.sales },
    { label: 'Utilidad bruta', get: (m) => m.gross_profit },
    { label: 'Impuestos', get: (m) => -m.taxes },
    { label: 'Gastos', get: (m) => -(m.fixed_total + m.otro) },
    { label: 'Resultado', get: (m) => m.result, strong: true },
  ];

  return (
    <>
      <Tile
        label="Punto de equilibrio"
        to="/punto-equilibrio"
        className="sm:col-span-2 lg:col-span-3"
      >
        {target === null ? (
          <p className="mt-2 text-sm text-gray-400">Faltan gastos del mes</p>
        ) : (
          <>
            <Value>
              {peso(sel.sales)} <span className="text-sm font-medium text-gray-500">de {peso(target)} mínimo</span>
            </Value>
            <div className="mt-2 h-2 rounded-full bg-blue-100 overflow-hidden" aria-hidden>
              <div
                className={`h-full rounded-full ${sel.sales >= target ? 'bg-green-600' : onPace ? 'bg-blue-600' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (sel.sales / target) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Día {sel.days_elapsed} de {sel.days_in_month} · proyección al cierre {peso(sel.projection)}
              {sel.projection_gap ? (
                <span className="text-amber-700"> · faltarían {peso(sel.projection_gap)}</span>
              ) : (
                <span className="text-green-700"> · alcanza</span>
              )}
            </p>
          </>
        )}
      </Tile>

      <Tile
        label="Estado de resultados"
        to="/punto-equilibrio"
        className="sm:col-span-2 lg:col-span-3"
      >
        <table className="mt-2 w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="text-left font-normal" />
              {months.map((m) => (
                <th key={m.month} className="text-right font-normal">
                  <span className="capitalize">{monthName(`${m.month}-01`)}</span>
                  {m.is_partial ? ' (en curso)' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className={r.strong ? 'border-t border-gray-100 font-semibold' : ''}>
                <td className="py-0.5 text-gray-600">{r.label}</td>
                {months.map((m) => {
                  const v = r.get(m);
                  return (
                    <td
                      key={m.month}
                      className={`py-0.5 text-right ${r.strong ? (v < 0 ? 'text-red-700' : 'text-green-700') : 'text-gray-900'}`}
                    >
                      {v < 0 ? `−${peso(-v)}` : peso(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[11px] text-gray-400">{fin.label}</p>
      </Tile>
    </>
  );
}

export default function ComoVamos() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [data, setData] = useState<PanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError(null);
    getPanel()
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'No se pudo cargar'));
    return () => {
      alive = false;
    };
  }, [open, reload]);

  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(OPEN_KEY, v ? '0' : '1');
      } catch {
        /* sin storage: sólo en memoria */
      }
      return !v;
    });
  };

  const v = data?.ventas;

  return (
    <section aria-label="Cómo vamos" className="space-y-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 !bg-transparent !border-0 !p-0"
      >
        <TrendingUp size={18} className="text-blue-600" />
        Cómo vamos
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && error && (
        <p className="text-sm text-gray-500">
          No se pudo cargar el panel ({error}).{' '}
          <button type="button" onClick={() => setReload((n) => n + 1)} className="text-blue-600 hover:underline !bg-transparent !border-0 !p-0">
            Reintentar
          </button>
        </p>
      )}
      {open && !data && !error && <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />}

      {open && data && v && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Tile label={`Ventas de ${monthName(v.month)}`} to="/sales" className="lg:col-span-2">
            <Value>{peso(v.total)}</Value>
            <p className="text-xs text-gray-500">
              {v.count} {v.count === 1 ? 'venta' : 'ventas'}
            </p>
            <Delta now={v.total} before={v.prev_same_days_total} vs={sameDaysLastMonth(v.month, data.today)} />
          </Tile>

          <GoogleTiles g={data.google} />

          <TiendaTile t={data.tienda} />

          {data.is_owner && <OwnerTiles />}
        </div>
      )}
    </section>
  );
}
