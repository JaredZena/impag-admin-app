import { CheckCircle2, MessageSquare } from 'lucide-react';
import type { AgroIrrigation, AgroMessage, AgroPlan, AgroProductItem, AgroProducts } from '@/types/agro';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatDateTime } from '@/utils/dateUtils';
import { Card, EmptyState } from '../shared/Primitives';
import { VerdictBadge } from './AgroStatusBadges';

const money = (n: number | null): string => (n === null ? '—' : formatCurrency(n));
const moneyRange = (min: number, max: number): string =>
  min === max ? money(min) : `${money(min)} – ${money(max)}`;

const PRIORITY_META: Record<AgroProductItem['priority'], { label: string; cls: string }> = {
  esencial: { label: 'Esencial', cls: 'bg-red-50 text-red-700 border border-red-200' },
  recomendado: { label: 'Recomendado', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  opcional: { label: 'Opcional', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
};

function ProductsTable({ items, catalogTotal }: { items: AgroProductItem[]; catalogTotal: number }) {
  if (items.length === 0) return <EmptyState message="Sin productos del catálogo en esta sección." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Producto</th>
            <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Prioridad</th>
            <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Cantidad</th>
            <th className="text-right text-xs font-medium text-gray-500 py-2 pr-3">Total</th>
            <th className="text-left text-xs font-medium text-gray-500 py-2">Por qué</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const meta = PRIORITY_META[it.priority] ?? PRIORITY_META.opcional;
            return (
              <tr key={it.handle} className="border-b border-gray-50 last:border-0 align-top">
                <td className="py-2.5 pr-3 text-sm text-gray-900">{it.title}</td>
                <td className="py-2.5 pr-3">
                  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-sm text-gray-700 text-right whitespace-nowrap">
                  {it.quantity} {it.unit_label ?? ''}
                </td>
                <td className="py-2.5 pr-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                  {money(it.line_total)}
                </td>
                <td className="py-2.5 text-sm text-gray-600">{it.why}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 pr-3 text-sm font-semibold text-gray-900 text-right">
              Total del catálogo
            </td>
            <td className="py-2 pr-3 text-sm font-bold text-gray-900 text-right">{money(catalogTotal)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function NotInCatalog({ items }: { items: AgroProducts['not_in_catalog'] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-500 mb-1.5">No está en el catálogo de la tienda</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-gray-600">
            <span className="font-medium text-gray-800">{it.item}</span> — {it.why}
            {it.estimated_cost_mxn !== null && <span className="text-gray-500"> (≈ {money(it.estimated_cost_mxn)})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AgroPlanView({
  plan,
  products,
  irrigation,
  messages,
}: {
  plan: AgroPlan | null;
  products: AgroProducts | null;
  irrigation: AgroIrrigation | null;
  messages: AgroMessage[];
}) {
  if (!plan) {
    return (
      <Card title="Plan">
        <EmptyState message="Este proyecto todavía no tiene un plan generado." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{plan.title}</h3>
            <p className="text-xs text-gray-500">{plan.project_kind} · {plan.sector}</p>
          </div>
          <VerdictBadge verdict={plan.viability.verdict} />
        </div>
        <p className="text-sm text-gray-700 mb-3">{plan.summary}</p>
        <p className="text-sm text-gray-600 italic mb-4">{plan.viability.explanation}</p>

        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-500">Inversión estimada</p>
            <p className="text-lg font-bold text-gray-900">
              {moneyRange(plan.budget.investment_min_mxn, plan.budget.investment_max_mxn)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-500">Para empezar (recomendado)</p>
            <p className="text-lg font-bold text-gray-900">{money(plan.budget.recommended_start_mxn)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-500">Capital de trabajo</p>
            <p className="text-lg font-bold text-gray-900">{money(plan.budget.working_capital_mxn)}</p>
          </div>
        </div>

        {plan.budget.gap_mxn !== null && plan.budget.gap_mxn > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-800">
            El presupuesto que dio el productor ({money(plan.budget.provided_mxn)}) queda {money(plan.budget.gap_mxn)}{' '}
            corto para esta meta.
          </div>
        )}

        {plan.key_numbers.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-3 mb-2">
            {plan.key_numbers.map((k, i) => (
              <div key={i}>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-sm font-semibold text-gray-900">{k.value}</p>
                {k.note && <p className="text-xs text-gray-400">{k.note}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Desglose de presupuesto">
        {plan.budget.breakdown.length === 0 ? (
          <EmptyState message="Sin desglose." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Concepto</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3">Categoría</th>
                  <th className="text-right text-xs font-medium text-gray-500 py-2">Rango</th>
                </tr>
              </thead>
              <tbody>
                {plan.budget.breakdown.map((b, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 text-sm text-gray-900">
                      {b.concept}
                      {b.notes && <span className="block text-xs text-gray-500">{b.notes}</span>}
                    </td>
                    <td className="py-2 pr-3 text-sm text-gray-600 capitalize">{b.category.replace(/-/g, ' ')}</td>
                    <td className="py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                      {moneyRange(b.amount_min_mxn, b.amount_max_mxn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {plan.options.length > 0 && (
        <Card title="Razas / variedades recomendadas">
          <div className="grid sm:grid-cols-2 gap-3">
            {plan.options.map((opt, i) => (
              <div key={i} className={`rounded-lg border p-3 ${opt.recommended ? 'border-green-300 bg-green-50' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{opt.name}</p>
                  {opt.recommended && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                      <CheckCircle2 size={13} /> Recomendada
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">{opt.why}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <ul className="space-y-0.5">
                    {opt.pros.map((p, j) => (
                      <li key={j} className="text-green-700">+ {p}</li>
                    ))}
                  </ul>
                  <ul className="space-y-0.5">
                    {opt.cons.map((c, j) => (
                      <li key={j} className="text-red-600">− {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Economía del proyecto">
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500">Costo de operación mensual</p>
            <p className="text-sm font-semibold text-gray-900">{money(plan.economics.monthly_operating_cost_mxn)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ingreso mensual estimado</p>
            <p className="text-sm font-semibold text-gray-900">
              {moneyRange(plan.economics.monthly_income_min_mxn, plan.economics.monthly_income_max_mxn)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Primer ingreso</p>
            <p className="text-sm font-semibold text-gray-900">{plan.economics.months_to_first_income} meses</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Recuperación de inversión</p>
            <p className="text-sm font-semibold text-gray-900">
              {plan.economics.payback_months_min !== null && plan.economics.payback_months_max !== null
                ? `${plan.economics.payback_months_min}–${plan.economics.payback_months_max} meses`
                : '—'}
            </p>
          </div>
        </div>
        {plan.economics.assumptions.length > 0 && (
          <ul className="text-xs text-gray-500 space-y-0.5 list-disc pl-4">
            {plan.economics.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}
      </Card>

      {plan.infrastructure.length > 0 && (
        <Card title="Infraestructura">
          <ul className="space-y-2">
            {plan.infrastructure.map((it, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-gray-900">{it.item}</span>
                <span className="text-gray-600"> — {it.spec}</span>
                <span className="block text-xs text-gray-400">{it.why}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {plan.timeline.length > 0 && (
        <Card title="Cronograma">
          <ol className="space-y-3">
            {plan.timeline.map((phase, i) => (
              <li key={i} className="border-l-2 border-blue-200 pl-3">
                <p className="text-sm font-semibold text-gray-900">
                  {phase.phase} <span className="text-xs text-gray-400 font-normal">· {phase.duration}</span>
                </p>
                <ul className="text-sm text-gray-600 list-disc pl-4">
                  {phase.tasks.map((t, j) => (
                    <li key={j}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {plan.risks.length > 0 && (
        <Card title="Riesgos">
          <ul className="space-y-2">
            {plan.risks.map((r, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-amber-700">{r.risk}</span>
                <span className="block text-gray-600">{r.mitigation}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {plan.next_steps.length > 0 && (
        <Card title="Próximos pasos">
          <ol className="text-sm text-gray-700 list-decimal pl-4 space-y-1">
            {plan.next_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Card>
      )}

      {plan.questions_to_confirm.length > 0 && (
        <Card title="Preguntas para confirmar con el productor">
          <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
            {plan.questions_to_confirm.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Card>
      )}

      {products && (
        <Card title="Productos recomendados">
          <ProductsTable items={products.items} catalogTotal={products.catalog_total_mxn} />
          <NotInCatalog items={products.not_in_catalog} />
          {products.notes && <p className="text-xs text-gray-400 mt-3">{products.notes}</p>}
        </Card>
      )}

      {irrigation && (
        <Card title="Diseño de riego">
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-500">Sistema</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{irrigation.system_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Área</p>
              <p className="text-sm font-semibold text-gray-900">{irrigation.area_m2.toLocaleString('es-MX')} m²</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cultivo / uso</p>
              <p className="text-sm font-semibold text-gray-900">{irrigation.crop_or_use}</p>
            </div>
          </div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 text-gray-500">Necesidad de agua</td>
                  <td className="py-1.5 text-gray-900">{irrigation.design.water_need_m3_day} m³/día</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 text-gray-500">Emisores</td>
                  <td className="py-1.5 text-gray-900">
                    {irrigation.design.emitters_count} × {irrigation.design.emitter} ({irrigation.design.emitter_flow_lph} L/h c/u)
                  </td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 text-gray-500">Gasto total</td>
                  <td className="py-1.5 text-gray-900">
                    {irrigation.design.total_flow_lph} L/h ({irrigation.design.total_flow_lpm} L/min)
                  </td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 text-gray-500">Horas de riego al día</td>
                  <td className="py-1.5 text-gray-900">{irrigation.design.irrigation_hours_per_day} h en {irrigation.design.sectors} sector(es)</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 text-gray-500">Bomba</td>
                  <td className="py-1.5 text-gray-900">
                    {irrigation.design.pump.type} · {irrigation.design.pump.power_source}
                    {irrigation.design.pump.hp !== null && ` · ${irrigation.design.pump.hp} HP`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {irrigation.calculations.length > 0 && (
            <div className="overflow-x-auto mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Cálculos</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-gray-500 py-1.5 pr-3">Dato</th>
                    <th className="text-left text-gray-500 py-1.5 pr-3">Fórmula</th>
                    <th className="text-right text-gray-500 py-1.5">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {irrigation.calculations.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-1.5 pr-3 text-gray-700">{c.label}</td>
                      <td className="py-1.5 pr-3 text-gray-400 font-mono">{c.formula}</td>
                      <td className="py-1.5 text-gray-900 text-right">{c.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ProductsTable items={irrigation.items} catalogTotal={irrigation.catalog_total_mxn} />
          <NotInCatalog items={irrigation.not_in_catalog} />
        </Card>
      )}

      <Card title="Preguntas del productor">
        {messages.length === 0 ? (
          <EmptyState message="Sin preguntas todavía." />
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => (
              <li key={i} className={m.role === 'user' ? 'pl-0' : 'pl-5'}>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                  <MessageSquare size={11} />
                  {m.role === 'user' ? 'Productor' : 'IA'} · {formatDateTime(m.created_at)}
                </div>
                <p className={`text-sm ${m.role === 'user' ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{m.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
