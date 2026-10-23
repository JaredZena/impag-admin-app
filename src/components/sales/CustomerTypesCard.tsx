import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import LoadError from '@/components/ui/LoadError';

// Mirror of GET /sales/customer-types (impag-quot services/customer_types.py)
interface TypeCustomer {
  name: string;
  amount: number;
  sales: number;
  last_sale: string | null;
  sembrando_vida: boolean;
  types: string[]; // other types they also bought
}

interface CustomerType {
  slug: string;
  label: string;
  producer: boolean;
  customers: number;
  amount: number;
  sembrando_vida: number;
  items: TypeCustomer[];
}

export interface CustomerTypesResponse {
  year: number | null;
  total_customers: number;
  total_amount: number;
  sembrando_vida: number;
  types: CustomerType[];
}

const BAR_HUE = '#2a78d6'; // same single hue as the other bar lists on Ventas
const MUTED_BAR = '#c4c9d1'; // unclassified rows: present but recessive
const UNCLASSIFIED = new Set(['otro', 'sin_dato']);
const PREVIEW_ROWS = 12;

const fmtMXN = (n: number): string =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toLocaleString('es-MX', { maximumFractionDigits: 0 })}k`;
  return fmtMXN(n);
};

const shortDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const clientes = (n: number): string => `${n.toLocaleString('es-MX')} ${n === 1 ? 'cliente' : 'clientes'}`;

function TypeCustomers({ type, labels }: { type: CustomerType; labels: Record<string, string> }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? type.items : type.items.slice(0, PREVIEW_ROWS);
  return (
    <div className="mt-2 mb-3 ml-0 sm:ml-44 rounded-lg border border-gray-100 overflow-hidden">
      {type.slug === 'sin_dato' && (
        <p className="px-3 py-2 text-xs text-amber-800 bg-amber-50 border-b border-amber-100">
          Sus ventas no dicen qué compraron (la hoja de VENTAS dejó la descripción vacía). Con la descripción o la
          cotización ligada, el cliente pasa a su tipo solo.
        </p>
      )}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="text-left font-medium px-3 py-1.5">Cliente</th>
            <th className="text-right font-medium px-3 py-1.5">Compró</th>
            <th className="text-right font-medium px-3 py-1.5 hidden sm:table-cell">Ventas</th>
            <th className="text-right font-medium px-3 py-1.5 hidden md:table-cell">Última</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((c) => (
            <tr key={c.name}>
              <td className="px-3 py-1.5 text-gray-800">
                <Link to={`/customers?q=${encodeURIComponent(c.name)}`} className="hover:text-blue-600 hover:underline">
                  {c.name}
                </Link>
                {c.sembrando_vida && (
                  <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                    Sembrando Vida
                  </span>
                )}
                {c.types.length > 0 && (
                  <span className="block text-xs text-gray-400">
                    También: {c.types.map((t) => labels[t] ?? t).join(', ')}
                  </span>
                )}
              </td>
              <td className="px-3 py-1.5 text-right text-gray-700 whitespace-nowrap">{fmtMXN(c.amount)}</td>
              <td className="px-3 py-1.5 text-right text-gray-500 hidden sm:table-cell">{c.sales}</td>
              <td className="px-3 py-1.5 text-right text-gray-500 whitespace-nowrap hidden md:table-cell">
                {shortDate(c.last_sale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {type.items.length > PREVIEW_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full px-3 py-2 text-xs font-medium text-blue-600 hover:bg-gray-50 border-t border-gray-100"
        >
          {showAll ? 'Ver menos' : `Ver los ${type.items.length}`}
        </button>
      )}
    </div>
  );
}

export default function CustomerTypesCard({ years }: { years: number[] }) {
  const [year, setYear] = useState<number | null>(null);
  const [data, setData] = useState<CustomerTypesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const qs = year ? `?year=${year}` : '';
        const res = (await apiRequest(`/sales/customer-types${qs}`)) as CustomerTypesResponse;
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Intenta de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, reloadKey]);

  const labels = Object.fromEntries((data?.types ?? []).map((t) => [t.slug, t.label]));
  const max = Math.max(...(data?.types ?? []).map((t) => t.customers), 1);
  const yearOptions = [...years].sort((a, b) => b - a);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Clientes por tipo</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Según lo que compró cada cliente: cuenta en el tipo donde más gastó.
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Año">
          {[null, ...yearOptions].map((y) => (
            <button
              key={y ?? 'todos'}
              type="button"
              aria-pressed={year === y}
              onClick={() => {
                setYear(y);
                setOpen(null);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                year === y
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {y ?? 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-md bg-gray-200 h-5 w-full" />
          ))}
        </div>
      ) : error ? (
        <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : data && data.types.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Sin ventas en este periodo</p>
      ) : data ? (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <p className="text-sm text-gray-700 mb-3">
            <span className="font-semibold text-gray-900">{clientes(data.total_customers)}</span>
            {' · '}
            {fmtMXN(data.total_amount)}
            {data.sembrando_vida > 0 && <> · {data.sembrando_vida} de Sembrando Vida</>}
          </p>
          <div className="space-y-[2px]">
            {data.types.map((t) => {
              const isOpen = open === t.slug;
              const muted = UNCLASSIFIED.has(t.slug);
              return (
                <div key={t.slug}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : t.slug)}
                    className="group relative w-full flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 px-1 py-1 text-left rounded border-0 bg-transparent hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <span className="sm:w-44 shrink-0 text-sm text-gray-700 leading-tight">
                      <span className="inline-flex items-center gap-1">
                        {isOpen ? (
                          <ChevronUp size={14} className="text-gray-400 shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400 shrink-0" />
                        )}
                        <span className={muted ? 'text-gray-500' : ''}>{t.label}</span>
                      </span>
                      {!t.producer && <span className="sm:block ml-1.5 sm:ml-0 sm:pl-[18px] text-xs text-gray-400">no es productor</span>}
                    </span>
                    <span className="w-full sm:w-auto sm:flex-1 flex items-center min-w-0 pl-[18px] sm:pl-0">
                      <span
                        className="h-4 transition-opacity group-hover:opacity-80"
                        style={{
                          width: `calc((100% - 120px) * ${t.customers / max})`,
                          minWidth: 2,
                          backgroundColor: muted ? MUTED_BAR : BAR_HUE,
                          borderRadius: '0 4px 4px 0',
                        }}
                      />
                      <span className="ml-2 text-sm font-semibold text-gray-900 tabular-nums">{t.customers}</span>
                      <span className="ml-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">{fmtCompact(t.amount)}</span>
                    </span>
                    <span className="pointer-events-none absolute left-0 sm:left-44 -top-8 z-10 hidden group-hover:block rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap">
                      <span className="font-semibold text-gray-900">{clientes(t.customers)}</span>
                      <span className="text-gray-500">
                        {' · '}
                        {fmtMXN(t.amount)}
                        {t.sembrando_vida > 0 && ` · ${t.sembrando_vida} de Sembrando Vida`}
                      </span>
                    </span>
                  </button>
                  {isOpen && <TypeCustomers type={t} labels={labels} />}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Barra = número de clientes; el monto es lo que ese grupo compró. Si la venta no tiene descripción se usa su
            cotización.
          </p>
        </div>
      ) : null}
    </div>
  );
}
