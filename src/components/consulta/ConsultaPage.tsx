import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ClipboardCopy, FileText, Package, Search, User, X } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { getPipelineSummary, listQuotes } from '@/utils/quotesApi';
import type { Quote, QuotePipelineSummary } from '@/types/quotes';
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge';
import { parseQuoteNotes } from '@/utils/quoteNotes';
import { IVA_RATE, unitLabelFromProductUnit } from '@/utils/onlineSale';
import { money, short, type HoyData } from '@/utils/hoyText';
import LoadError from '@/components/ui/LoadError';

// Mirrors of GET /products, GET /products/supplier-products and GET /customers (impag-quot).
interface ProductHit {
  id: number;
  name: string;
  price: number | null;
  iva: boolean | null;
  unit: string | null;
  is_calculated_price: boolean;
  currency: string | null;
  primary_image_url: string | null;
}

interface SupplierRow {
  id: number;
  supplier_name: string;
  cost: number | null;
  shipping_cost: number;
  total_cost: number;
  currency: string;
  stock: number;
}

interface CustomerHit {
  id: number;
  display_name: string | null;
  phone_e164: string | null;
  location: string | null;
}

interface Results {
  products: ProductHit[];
  quotes: Quote[];
  customers: CustomerHit[];
}

const todayLocal = () => new Date().toLocaleDateString('en-CA');

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

// What the customer pays: the row price plus IVA when the product carries it.
const customerPrice = (p: ProductHit): number | null =>
  p.price == null || p.price <= 0 ? null : Math.round(p.price * (p.iva ? 1 + IVA_RATE : 1) * 100) / 100;

function CopyLine({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* el navegador no dejó copiar; el texto sigue visible en pantalla */
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm text-green-700 font-medium px-3 py-2 rounded-lg border border-green-200 hover:bg-green-50"
    >
      {done ? <Check size={16} /> : <ClipboardCopy size={16} />}
      {done ? 'Copiado' : 'Copiar para WhatsApp'}
    </button>
  );
}

function ProductCard({ p }: { p: ProductHit }) {
  const [suppliers, setSuppliers] = useState<SupplierRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    apiRequest(`/products/supplier-products?product_id=${p.id}&limit=20`)
      .then((res: { data?: { supplier_products?: SupplierRow[] } }) => {
        if (alive) setSuppliers(res.data?.supplier_products ?? []);
      })
      .catch(() => alive && setSuppliers([]));
    return () => {
      alive = false;
    };
  }, [p.id]);

  const unit = unitLabelFromProductUnit(p.unit);
  const final = customerPrice(p);
  const foreign = p.currency && p.currency.toUpperCase() !== 'MXN' ? ` ${p.currency.toUpperCase()}` : '';
  const stock = suppliers ? suppliers.reduce((sum, s) => sum + (s.stock || 0), 0) : null;
  const cheapest = suppliers
    ?.filter((s) => s.currency === 'MXN' && s.total_cost > 0)
    .sort((a, b) => a.total_cost - b.total_cost)[0];
  const ganancia = cheapest && p.price ? Math.round((p.price / cheapest.total_cost - 1) * 100) : null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
      <div className="flex gap-3">
        {p.primary_image_url ? (
          <img src={p.primary_image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 bg-gray-50" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
            <Package size={24} className="text-gray-300" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link to={`/product-admin/${p.id}`} className="font-medium text-gray-900 leading-snug hover:underline line-clamp-2">
            {p.name}
          </Link>
          {final == null ? (
            <p className="text-sm text-amber-700 mt-1">Sin precio de venta. Pónselo en Precios de venta.</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 tabular-nums mt-1">
                {money(final)}
                {foreign}
                <span className="text-sm font-normal text-gray-500"> por {unit}</span>
              </p>
              <p className="text-xs text-gray-500">
                {p.iva == null
                  ? `${money(p.price!)} · falta indicar si lleva IVA`
                  : p.iva
                    ? `con IVA · ${money(p.price!)} + IVA`
                    : 'no lleva IVA'}
                {p.is_calculated_price ? ' · calculado con el costo y la ganancia' : ''}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500">Stock</p>
          <p className={`text-lg font-semibold tabular-nums ${stock ? 'text-green-700' : 'text-gray-900'}`}>
            {stock == null ? '…' : `${stock.toLocaleString('es-MX')} ${stock === 1 || unit === 'kg' ? unit : `${unit}s`}`}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500">Costo más bajo</p>
          <p className="text-lg font-semibold tabular-nums text-gray-900">
            {suppliers == null ? '…' : cheapest ? money(cheapest.total_cost) : '—'}
          </p>
          {cheapest && (
            <>
              <p className="text-xs text-gray-500 truncate">
                {cheapest.supplier_name}
                {cheapest.shipping_cost > 0 ? ' · con flete' : ''}
              </p>
              {ganancia != null && <p className="text-xs text-gray-500">Ganancia ≈ {ganancia}%</p>}
            </>
          )}
        </div>
      </div>

      {final != null && <CopyLine text={`${p.name} — ${money(final)}${foreign} ${p.iva ? 'con IVA ' : ''}por ${unit}`} />}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function QuoteRow({ q }: { q: Quote }) {
  const material = parseQuoteNotes(q.notes).material;
  return (
    <Link to={`/quotes/${q.id}`} className="block bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{q.customer_name || 'Sin nombre'}</p>
          <p className="text-sm text-gray-500 truncate">{material ? short(material, 60) : q.quote_number}</p>
          <p className="text-xs text-gray-400">
            {q.quote_number} · {fmtDate(q.sent_at || q.created_at)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold tabular-nums text-gray-900">{q.total ? money(q.total) : '—'}</p>
          <QuoteStatusBadge status={q.status} />
        </div>
      </div>
    </Link>
  );
}

// Sin búsqueda: lo que JD pregunta más seguido — quién nos debe y qué cotizaciones siguen abiertas.
function Resumen() {
  const [hoy, setHoy] = useState<HoyData | null>(null);
  const [pipeline, setPipeline] = useState<QuotePipelineSummary | null>(null);

  useEffect(() => {
    apiRequest(`/hoy?day=${todayLocal()}`)
      .then((res: { data: HoyData }) => setHoy(res.data))
      .catch(() => setHoy(null));
    getPipelineSummary()
      .then(setPipeline)
      .catch(() => setPipeline(null));
  }, []);

  return (
    <div className="space-y-6">
      <Section icon={<User size={14} />} title={`Nos deben${hoy ? ` · ${money(hoy.receivable.total)}` : ''}`}>
        <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
          {!hoy ? (
            <p className="px-4 py-3 text-sm text-gray-400">Cargando…</p>
          ) : hoy.receivable.rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Nadie debe de las ventas registradas en la app.</p>
          ) : (
            hoy.receivable.rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.customer_name || 'Sin nombre'}</p>
                  {r.reference && <p className="text-xs text-gray-400">{r.reference}</p>}
                </div>
                <p className="font-semibold tabular-nums text-red-600 shrink-0">{money(r.pending)}</p>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-gray-400">Sólo ventas registradas en la app (desde el 1 de octubre).</p>
      </Section>

      <Section
        icon={<FileText size={14} />}
        title={`Cotizaciones abiertas${pipeline ? ` · ${pipeline.open_count} · ${money(pipeline.open_total)}` : ''}`}
      >
        <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
          {!pipeline ? (
            <p className="px-4 py-3 text-sm text-gray-400">Cargando…</p>
          ) : pipeline.top_open.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No hay cotizaciones abiertas.</p>
          ) : (
            pipeline.top_open.map((q) => (
              <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{q.customer_name || 'Sin nombre'}</p>
                  <p className="text-xs text-gray-400">
                    {q.quote_number} · hace {q.days_open} día{q.days_open === 1 ? '' : 's'}
                  </p>
                </div>
                <p className="font-semibold tabular-nums text-gray-900 shrink-0">{q.total ? money(q.total) : '—'}</p>
              </Link>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}

// Consulta rápida: una sola caja para lo que el equipo le pregunta a Hernán por
// WhatsApp — precio, stock, "¿en cuánto le cotizamos a…?" y datos del cliente.
export default function ConsultaPage() {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(text.trim());
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // Espera a que deje de escribir antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    setParams(query ? { q: query } : {}, { replace: true });
  }, [query, setParams]);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setError(null);
      return;
    }
    let alive = true;
    setResults(null);
    setError(null);
    const q = encodeURIComponent(query);
    Promise.all([
      apiRequest(`/products?name=${q}&limit=6`) as Promise<{ data: ProductHit[] }>,
      listQuotes({ search: query, limit: 5 }),
      apiRequest(`/customers?q=${q}&limit=5`) as Promise<CustomerHit[]>,
    ])
      .then(([products, quotes, customers]) => {
        if (alive) setResults({ products: products.data ?? [], quotes: quotes.data, customers: customers ?? [] });
      })
      .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : 'Intenta de nuevo.'));
    return () => {
      alive = false;
    };
  }, [query, retry]);

  const nothing = results && !results.products.length && !results.quotes.length && !results.customers.length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consulta</h1>
        <p className="text-sm text-gray-500">Precio, stock, cotizaciones y clientes en un solo lugar.</p>
      </div>

      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej. malla sombra, Montañez, 350926"
          aria-label="Buscar"
          autoFocus={window.matchMedia('(min-width: 768px)').matches}
          className="w-full h-14 pl-12 pr-12 text-base bg-white border border-gray-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText('')}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {query.length < 2 ? (
        <Resumen />
      ) : error ? (
        <LoadError message={error} onRetry={() => setRetry((n) => n + 1)} />
      ) : !results ? (
        <div className="space-y-3">
          <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : nothing ? (
        <div className="text-center py-12 bg-white border border-gray-100 rounded-xl">
          <p className="font-medium text-gray-900">No encontré «{query}»</p>
          <p className="text-sm text-gray-500 mt-1">Prueba con una sola palabra: «malla», «bolsa», o el apellido del cliente.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {results.products.length > 0 && (
            <Section icon={<Package size={14} />} title="Productos">
              <div className="space-y-3">
                {results.products.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            </Section>
          )}
          {results.quotes.length > 0 && (
            <Section icon={<FileText size={14} />} title="Cotizaciones">
              <div className="space-y-2">
                {results.quotes.map((q) => (
                  <QuoteRow key={q.id} q={q} />
                ))}
              </div>
            </Section>
          )}
          {results.customers.length > 0 && (
            <Section icon={<User size={14} />} title="Clientes">
              <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
                {results.customers.map((c) => (
                  <Link key={c.id} to={`/customers/${c.id}`} className="block px-4 py-3 hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{c.display_name || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-400">{[c.phone_e164, c.location].filter(Boolean).join(' · ')}</p>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
