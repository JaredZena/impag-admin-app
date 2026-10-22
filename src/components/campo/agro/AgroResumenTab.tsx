import { useEffect, useState } from 'react';
import { getAgroStats } from '@/utils/agroApi';
import { getAiUsageSummary } from '@/utils/aiUsageApi';
import type { AgroStats } from '@/types/agro';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatUsd } from '@/utils/campoTaxonomy';
import LoadError from '@/components/ui/LoadError';
import { Card, EmptyState, PillGroup, Skeleton, StatCard, errorText } from '../shared/Primitives';
import { BarList } from '../shared/BarList';
import { DayBars } from '../shared/DayBars';
import { LEAD_STATUS_META } from './AgroStatusBadges';
import type { LeadStatus } from '@/types/agro';

const PERIODS: { value: number; label: string }[] = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
];

const prettyKind = (slug: string): string =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const fmtPct = (n: number): string => `${n.toFixed(0)}%`;
const fmtCount = (n: number): string => n.toLocaleString('es-MX');
const fmtSeconds = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

export default function AgroResumenTab() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<AgroStats | null>(null);
  const [usdMxn, setUsdMxn] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [s, usage] = await Promise.all([getAgroStats(days), getAiUsageSummary(days)]);
        if (!cancelled) {
          setStats(s);
          setUsdMxn(usage.usd_mxn);
        }
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

  return (
    <div>
      <div className="mb-5">
        <PillGroup options={PERIODS} value={days} onChange={setDays} ariaLabel="Periodo" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => setRetry((r) => r + 1)} />
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Proyectos" value={fmtCount(stats.totals.projects)} />
            <StatCard label="Con contacto" value={fmtCount(stats.totals.with_contact)} />
            <StatCard
              label="Cotizaciones"
              value={fmtCount(stats.totals.quotes)}
              sub={formatCurrency(stats.totals.quotes_total_mxn)}
            />
            <StatCard label="Ganados" value={fmtCount(stats.totals.won)} tone="text-green-700" />
            <StatCard
              label="Tasa de conversión"
              value={fmtPct(stats.totals.projects > 0 ? (100 * stats.totals.won) / stats.totals.projects : 0)}
              sub={`${fmtCount(stats.totals.won)} de ${fmtCount(stats.totals.projects)}`}
            />
            <StatCard
              label="Costo IA total"
              value={formatUsd(stats.totals.cost_usd)}
              sub={usdMxn ? formatCurrency(stats.totals.cost_usd * usdMxn) : undefined}
            />
            <StatCard
              label="Costo IA por proyecto"
              value={formatUsd(stats.totals.avg_cost_usd)}
              sub="promedio"
            />
            <StatCard
              label="Tiempo de generación"
              value={fmtSeconds(stats.totals.avg_generation_ms)}
              sub="promedio del plan completo"
            />
            <StatCard label="Clics a WhatsApp" value={fmtCount(stats.totals.whatsapp_clicks)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card title="Embudo">
              <FunnelBars funnel={stats.funnel} />
            </Card>
            <Card title="Estado de los leads">
              <LeadStatusGrid counts={stats.lead_status_counts} />
            </Card>
          </div>

          <Card title="Proyectos por día">
            <DayBars
              data={stats.by_day.map((d) => ({ day: d.day, values: { projects: d.projects, cost_usd: d.cost_usd } }))}
              series={[
                { key: 'projects', label: 'Proyectos', color: '#2a78d6', format: fmtCount },
                { key: 'cost_usd', label: 'Costo IA', color: '#eb6834', format: (n) => formatUsd(n) },
              ]}
              emptyMessage="Sin proyectos en este periodo"
            />
          </Card>

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <Card title="Tipos de proyecto">
              <BarList
                items={stats.by_kind.slice(0, 15).map((k) => ({ key: k.key, label: prettyKind(k.key), value: k.count }))}
                format={fmtCount}
                emptyMessage="Sin datos todavía"
              />
            </Card>
            <Card title="Sectores">
              <BarList
                items={stats.by_sector.map((s) => ({ key: s.key, label: s.label, value: s.count }))}
                format={fmtCount}
                emptyMessage="Sin datos todavía"
                hue="#1baf7a"
              />
            </Card>
            <Card title="Estados">
              <BarList
                items={stats.by_state.map((s) => ({ key: s.key, label: s.label, value: s.count }))}
                format={fmtCount}
                emptyMessage="Sin datos todavía"
              />
            </Card>
            <Card title="Tipo de productor">
              <BarList
                items={stats.by_producer_type.map((s) => ({ key: s.key, label: s.label, value: s.count }))}
                format={fmtCount}
                emptyMessage="Sin datos todavía"
                hue="#eda100"
              />
            </Card>
            <Card title="Presupuesto">
              <BarList
                items={stats.budget_buckets.map((b) => ({ key: b.label, label: b.label, value: b.count }))}
                format={fmtCount}
                emptyMessage="Sin datos todavía"
              />
            </Card>
            <Card title="Veredicto de viabilidad">
              <BarList
                items={stats.verdicts.map((v) => ({ key: v.key, label: v.label, value: v.count }))}
                format={fmtCount}
                emptyMessage="Sin datos todavía"
                hue="#4a3aa7"
              />
            </Card>
            <Card title="Productos más recomendados">
              <BarList
                items={stats.top_products.map((p) => ({ key: p.handle, label: p.title, value: p.count }))}
                format={fmtCount}
                emptyMessage="Sin productos recomendados todavía"
                hue="#e87ba4"
              />
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function FunnelBars({ funnel }: { funnel: { key: string; label: string; count: number }[] }) {
  if (funnel.length === 0) return <EmptyState message="Sin datos todavía" />;
  const first = funnel[0]?.count || 1;
  return (
    <div className="space-y-2.5">
      {funnel.map((stage) => {
        const pct = first > 0 ? (100 * stage.count) / first : 0;
        return (
          <div key={stage.key}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{stage.label}</span>
              <span className="font-medium text-gray-900">
                {fmtCount(stage.count)} <span className="text-gray-400">({fmtPct(pct)})</span>
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.max(pct, stage.count > 0 ? 2 : 0)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadStatusGrid({ counts }: { counts: Partial<Record<LeadStatus, number>> }) {
  const entries = Object.entries(LEAD_STATUS_META) as [LeadStatus, { label: string; cls: string }][];
  const total = entries.reduce((acc, [key]) => acc + (counts[key] ?? 0), 0);
  if (total === 0) return <EmptyState message="Sin leads todavía" />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {entries.map(([key, meta]) => (
        <div key={key} className="rounded-lg border border-gray-100 p-2.5">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-1 ${meta.cls}`}>{meta.label}</span>
          <p className="text-lg font-bold text-gray-900">{fmtCount(counts[key] ?? 0)}</p>
        </div>
      ))}
    </div>
  );
}
