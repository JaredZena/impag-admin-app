import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { getAiUsageEvents, getAiUsageSummary } from '@/utils/aiUsageApi';
import type { AiUsageEvent, AiUsageSummary } from '@/types/aiUsage';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatUsd } from '@/utils/campoTaxonomy';
import { formatDateTime } from '@/utils/dateUtils';
import LoadError from '@/components/ui/LoadError';
import { Card, CardSkeleton, EmptyState, PillGroup, Skeleton, StatCard, errorText } from './shared/Primitives';
import { DayBars } from './shared/DayBars';

const PERIODS: { value: number; label: string }[] = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
];

const fmtCount = (n: number): string => n.toLocaleString('es-MX');
const fmtPct = (n: number): string => `${n.toFixed(1)}%`;
const fmtSeconds = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ok: { label: 'OK', cls: 'bg-green-50 text-green-700 border border-green-200' },
  error: { label: 'Error', cls: 'bg-red-50 text-red-700 border border-red-200' },
  timeout: { label: 'Tiempo agotado', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  refusal: { label: 'Rechazo', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  max_tokens: { label: 'Límite de tokens', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
};

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>;
}

export default function AIUsagePage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [events, setEvents] = useState<AiUsageEvent[] | null>(null);
  const [featureFilter, setFeatureFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const s = await getAiUsageSummary(days);
        if (!cancelled) setSummary(s);
      } catch (err) {
        if (!cancelled) setLoadError(errorText(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days, retry]);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setEventsError(null);
    (async () => {
      try {
        const rows = await getAiUsageEvents({ limit: 100, feature: featureFilter || undefined });
        if (!cancelled) setEvents(rows);
      } catch (err) {
        if (!cancelled) setEventsError(errorText(err));
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featureFilter, retry]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Gauge size={22} className="text-blue-600" aria-hidden="true" />
        <h1 className="text-xl font-bold text-gray-900">Uso de IA</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Llamadas a Claude de todas las herramientas de la tienda (Agroproyectos, Apoyos, Cotizador solar).
      </p>

      <div className="mb-5">
        <PillGroup options={PERIODS} value={days} onChange={setDays} ariaLabel="Periodo" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => setRetry((r) => r + 1)} />
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Costo total"
              value={formatUsd(summary.total.cost_usd)}
              sub={summary.usd_mxn ? formatCurrency(summary.total.cost_usd * summary.usd_mxn) : undefined}
            />
            <StatCard label="Llamadas" value={fmtCount(summary.total.calls)} />
            <StatCard label="Tokens de entrada" value={fmtCount(summary.total.input_tokens)} />
            <StatCard label="Tokens de salida" value={fmtCount(summary.total.output_tokens)} />
            <StatCard label="Búsquedas web" value={fmtCount(summary.total.web_searches)} />
            <StatCard
              label="Errores"
              value={fmtPct(summary.total.calls > 0 ? (100 * summary.total.errors) / summary.total.calls : 0)}
              sub={`${fmtCount(summary.total.errors)} de ${fmtCount(summary.total.calls)}`}
              tone={summary.total.errors > 0 ? 'text-red-600' : 'text-gray-900'}
            />
            <StatCard label="Costo promedio por llamada" value={formatUsd(summary.total.avg_cost_usd)} />
            <StatCard label="Duración promedio" value={fmtSeconds(summary.total.avg_duration_ms)} />
          </div>

          <Card title="Costo por día">
            <DayBars
              data={summary.by_day.map((d) => ({ day: d.day, values: { cost_usd: d.cost_usd } }))}
              series={[{ key: 'cost_usd', label: 'Costo IA', color: '#eb6834', format: (n) => formatUsd(n) }]}
              emptyMessage="Sin llamadas en este periodo"
            />
          </Card>

          <div className="grid lg:grid-cols-2 gap-4 mt-4 mb-4">
            <Card title="Por herramienta">
              {summary.by_feature.length === 0 ? (
                <EmptyState message="Sin llamadas todavía" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Herramienta</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Llamadas</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Costo</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Prom.</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Duración</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Errores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.by_feature.map((f) => (
                        <tr key={f.feature} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-3 text-gray-900">
                            <button
                              type="button"
                              onClick={() => setFeatureFilter(f.feature)}
                              className="text-left hover:text-blue-600 hover:underline"
                            >
                              {f.label}
                            </button>
                          </td>
                          <td className="py-2 pr-3 text-right text-gray-600">{fmtCount(f.calls)}</td>
                          <td className="py-2 pr-3 text-right font-medium text-gray-900">{formatUsd(f.cost_usd)}</td>
                          <td className="py-2 pr-3 text-right text-gray-600">{formatUsd(f.avg_cost_usd)}</td>
                          <td className="py-2 pr-3 text-right text-gray-600">{fmtSeconds(f.avg_duration_ms)}</td>
                          <td className="py-2 text-right text-gray-600">{f.errors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Por modelo">
              {summary.by_model.length === 0 ? (
                <EmptyState message="Sin llamadas todavía" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Modelo</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Llamadas</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.by_model.map((m) => (
                        <tr key={m.model} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-3 text-gray-900">{summary.model_labels[m.model] ?? m.model}</td>
                          <td className="py-2 pr-3 text-right text-gray-600">{fmtCount(m.calls)}</td>
                          <td className="py-2 text-right font-medium text-gray-900">{formatUsd(m.cost_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      ) : null}

      <Card
        title="Llamadas recientes"
        actions={
          <div className="flex items-center gap-2">
            {featureFilter && (
              <button type="button" onClick={() => setFeatureFilter('')} className="text-xs text-blue-600 hover:underline">
                Quitar filtro
              </button>
            )}
            <select
              value={featureFilter}
              onChange={(e) => setFeatureFilter(e.target.value)}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs shadow-sm"
            >
              <option value="">Todas las herramientas</option>
              {(summary?.by_feature ?? []).map((f) => (
                <option key={f.feature} value={f.feature}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {eventsLoading ? (
          <CardSkeleton rows={6} />
        ) : eventsError ? (
          <LoadError message={eventsError} onRetry={() => setRetry((r) => r + 1)} />
        ) : !events || events.length === 0 ? (
          <EmptyState message="Sin llamadas que mostrar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Fecha</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Herramienta</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Modelo</th>
                  <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Tokens</th>
                  <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Costo</th>
                  <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Duración</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                    <td className="py-2 pr-3 text-gray-900">{e.label}</td>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{e.model ?? e.requested_model ?? '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-600 whitespace-nowrap">
                      {e.input_tokens}/{e.output_tokens}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatUsd(e.cost_usd)}</td>
                    <td className="py-2 pr-3 text-right text-gray-600 whitespace-nowrap">
                      {e.duration_ms !== null ? fmtSeconds(e.duration_ms) : '—'}
                    </td>
                    <td className="py-2">
                      <StatusChip status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-gray-400 mt-4">
        Costos estimados a precio de lista de Anthropic (USD); la factura real puede variar.
      </p>
    </div>
  );
}
