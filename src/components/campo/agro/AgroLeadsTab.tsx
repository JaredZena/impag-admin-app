import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import { listAgroProjects } from '@/utils/agroApi';
import type { AgroListItem, AgroListResponse, LeadStatus } from '@/types/agro';
import { STATE_LABELS, SECTOR_LABELS, formatUsd } from '@/utils/campoTaxonomy';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatDate } from '@/utils/dateUtils';
import LoadError from '@/components/ui/LoadError';
import { CardSkeleton, EmptyState, errorText } from '../shared/Primitives';
import { GeneratingBadge, LEAD_STATUS_META, LeadStatusBadge, VerdictBadge } from './AgroStatusBadges';

const PAGE_SIZE = 50;

const LEAD_FILTERS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'nuevo', label: LEAD_STATUS_META.nuevo.label },
  { value: 'contactado', label: LEAD_STATUS_META.contactado.label },
  { value: 'en_seguimiento', label: LEAD_STATUS_META.en_seguimiento.label },
  { value: 'cotizado', label: LEAD_STATUS_META.cotizado.label },
  { value: 'ganado', label: LEAD_STATUS_META.ganado.label },
  { value: 'perdido', label: LEAD_STATUS_META.perdido.label },
  { value: 'descartado', label: LEAD_STATUS_META.descartado.label },
];

export default function AgroLeadsTab() {
  const navigate = useNavigate();
  const [leadStatus, setLeadStatus] = useState<LeadStatus | ''>('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [sector, setSector] = useState('');
  const [hasContact, setHasContact] = useState<'' | 'true' | 'false'>('');
  const [days, setDays] = useState<'' | '7' | '30' | '90'>('');
  const [offset, setOffset] = useState(0);
  const [resp, setResp] = useState<AgroListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // Any filter change restarts pagination from the top.
  useEffect(() => {
    setOffset(0);
  }, [leadStatus, search, state, sector, hasContact, days]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const handle = setTimeout(() => {
      (async () => {
        try {
          const res = await listAgroProjects({
            lead_status: leadStatus || undefined,
            q: search || undefined,
            state: state || undefined,
            sector: sector || undefined,
            has_contact: hasContact === '' ? undefined : hasContact === 'true',
            days: days ? Number(days) : undefined,
            limit: PAGE_SIZE,
            offset,
          });
          if (!cancelled) setResp(res);
        } catch (err) {
          if (!cancelled) setLoadError(errorText(err));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 250); // debounce search typing
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [leadStatus, search, state, sector, hasContact, days, offset, retry]);

  const items = resp?.items ?? [];

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit max-w-full overflow-x-auto mb-4">
        {LEAD_FILTERS.map((f) => (
          <button
            key={f.value || 'todos'}
            type="button"
            onClick={() => setLeadStatus(f.value)}
            aria-pressed={leadStatus === f.value}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-md border-0 transition-colors ${
              leadStatus === f.value ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {f.label}
            {resp && f.value && typeof resp.lead_counts[f.value] === 'number' ? ` (${resp.lead_counts[f.value]})` : ''}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono, idea, ref…"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-300 bg-white text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATE_LABELS).map(([slug, label]) => (
            <option key={slug} value={slug}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm"
        >
          <option value="">Todos los sectores</option>
          {Object.entries(SECTOR_LABELS).map(([slug, label]) => (
            <option key={slug} value={slug}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={hasContact}
          onChange={(e) => setHasContact(e.target.value as '' | 'true' | 'false')}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm"
        >
          <option value="">Con o sin contacto</option>
          <option value="true">Con contacto</option>
          <option value="false">Sin contacto</option>
        </select>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value as '' | '7' | '30' | '90')}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm"
        >
          <option value="">Todo el tiempo</option>
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
        </select>
      </div>

      {loading && offset === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <CardSkeleton rows={6} />
        </div>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => setRetry((r) => r + 1)} />
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <EmptyState message="Ningún proyecto coincide con estos filtros." />
        </div>
      ) : (
        <>
          {/* Phone: cards */}
          <ul className="md:hidden space-y-2">
            {items.map((item) => (
              <LeadCard key={item.id} item={item} onClick={() => navigate(`/agroproyectos/${item.id}`)} />
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-xl overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Fecha</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Ref</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Nombre</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Proyecto</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Estado</th>
                  <th className="text-right text-xs font-medium text-gray-500 py-2.5 px-3">Presupuesto</th>
                  <th className="text-right text-xs font-medium text-gray-500 py-2.5 px-3">Inversión</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Veredicto</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Cotización</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Lead</th>
                  <th className="text-right text-xs font-medium text-gray-500 py-2.5 px-3">Costo IA</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/agroproyectos/${item.id}`)}
                  >
                    <td className="py-2.5 px-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(item.created_at)}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-600 whitespace-nowrap">{item.ref}</td>
                    <td className="py-2.5 px-3 text-sm text-gray-900 max-w-[160px] truncate">
                      {item.contact_name ?? <span className="text-gray-400">Sin nombre</span>}
                      {item.contact_phone && (
                        <span className="block text-xs text-gray-500 whitespace-nowrap">{item.contact_phone}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-700 max-w-[200px] truncate" title={item.idea}>
                      {item.title ?? item.idea}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-600 whitespace-nowrap">
                      {STATE_LABELS[item.state ?? ''] ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {item.budget_unknown ? 'No sabe' : item.budget_mxn !== null ? formatCurrency(item.budget_mxn) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {item.investment_min_mxn !== null && item.investment_max_mxn !== null
                        ? `${formatCurrency(item.investment_min_mxn)}–${formatCurrency(item.investment_max_mxn)}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <VerdictBadge verdict={item.verdict} />
                    </td>
                    <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                      {item.quote ? (
                        <span className="text-blue-600">{item.quote.quote_number}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col items-start gap-1">
                        <LeadStatusBadge status={item.lead_status} />
                        {item.generating && <GeneratingBadge step={item.generating} compact />}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-600 text-right whitespace-nowrap">
                      {formatUsd(item.cost_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resp && resp.total > offset + items.length && (
            <button
              type="button"
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={loading}
              className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
            >
              {loading ? 'Cargando…' : `Ver más (${resp.total - offset - items.length} restantes)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function LeadCard({ item, onClick }: { item: AgroListItem; onClick: () => void }) {
  return (
    <li
      className="bg-white border border-gray-100 rounded-xl p-3.5 cursor-pointer hover:border-gray-300"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {item.contact_name ?? 'Sin nombre'} <span className="text-xs text-gray-400 font-normal">{item.ref}</span>
          </p>
          <p className="text-sm text-gray-600 truncate">{item.title ?? item.idea}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <LeadStatusBadge status={item.lead_status} />
          {item.generating && <GeneratingBadge step={item.generating} compact />}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>{formatDate(item.created_at)}</span>
        {item.contact_phone && (
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={12} /> {item.contact_phone}
          </span>
        )}
        <VerdictBadge verdict={item.verdict} />
      </div>
    </li>
  );
}
