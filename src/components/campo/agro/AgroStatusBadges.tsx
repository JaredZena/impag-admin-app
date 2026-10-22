import type { AgroStatus, LeadStatus, Verdict } from '@/types/agro';

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; cls: string }> = {
  nuevo: { label: 'Nuevo', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  contactado: { label: 'Contactado', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  en_seguimiento: { label: 'En seguimiento', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
  cotizado: { label: 'Cotizado', cls: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  ganado: { label: 'Ganado', cls: 'bg-green-50 text-green-700 border border-green-200' },
  perdido: { label: 'Perdido', cls: 'bg-red-50 text-red-700 border border-red-200' },
  descartado: { label: 'Descartado', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
};

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = (
  Object.keys(LEAD_STATUS_META) as LeadStatus[]
).map((value) => ({ value, label: LEAD_STATUS_META[value].label }));

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = LEAD_STATUS_META[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export const VERDICT_META: Record<Verdict, { label: string; cls: string }> = {
  viable: { label: 'Viable', cls: 'bg-green-50 text-green-700 border border-green-200' },
  'viable-con-ajustes': { label: 'Viable con ajustes', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  'requiere-mas-presupuesto': {
    label: 'Requiere más presupuesto',
    cls: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  'no-recomendado': { label: 'No recomendado', cls: 'bg-red-50 text-red-700 border border-red-200' },
};

export function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) return <span className="text-xs text-gray-400">—</span>;
  const meta = VERDICT_META[verdict] ?? { label: verdict, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

const AGRO_STATUS_META: Record<AgroStatus, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  plan_ready: { label: 'Plan listo', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  products_ready: { label: 'Productos listos', cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  done: { label: 'Completo', cls: 'bg-green-50 text-green-700 border border-green-200' },
  error: { label: 'Error', cls: 'bg-red-50 text-red-700 border border-red-200' },
};

export function AgroStatusBadge({ status }: { status: AgroStatus }) {
  const meta = AGRO_STATUS_META[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}
