// Form state + payload builders for the tool form. Kept out of ToolForm.tsx so
// React Fast Refresh keeps working (component files export components only).

import {
  OUT_STATUSES,
  todayISO,
  type CreateToolInput,
  type ToolDetail,
  type ToolFieldsInput,
  type ToolKind,
  type ToolStatus,
} from '@/utils/toolsApi';

export type CreateStatus = Exclude<ToolStatus, 'baja'>;

export interface ToolFormValues {
  name: string;
  kind: ToolKind;
  quantity: string;
  unit: string;
  unit_cost: string;
  purchase_date: string;
  supplier_name: string;
  invoice_ref: string;
  status: CreateStatus; // create only
  holder: string;
  location: string;
  notes: string;
}

export const CREATE_STATUSES: CreateStatus[] = ['en_local', 'pendiente_entrega', 'en_obra', 'con_cliente'];

export const emptyToolForm = (): ToolFormValues => ({
  name: '',
  kind: 'herramienta',
  quantity: '1',
  unit: 'PIEZA',
  unit_cost: '',
  purchase_date: todayISO(),
  supplier_name: '',
  invoice_ref: '',
  status: 'en_local',
  holder: '',
  location: 'Nuevo Ideal',
  notes: '',
});

export const toolToForm = (t: ToolDetail): ToolFormValues => ({
  name: t.name,
  kind: t.kind,
  quantity: String(t.quantity),
  unit: t.unit,
  unit_cost: t.unit_cost === null ? '' : String(t.unit_cost),
  purchase_date: t.purchase_date ?? '',
  supplier_name: t.supplier_name ?? '',
  invoice_ref: t.invoice_ref ?? '',
  status: t.status === 'baja' ? 'en_local' : t.status,
  holder: t.holder ?? '',
  location: t.location ?? '',
  notes: t.notes ?? '',
});

type Built<T> = { payload: T } | { error: string };

const toNumber = (s: string): number | null => (s.trim() === '' ? null : Number(s));
const round2 = (n: number) => Math.round(n * 100) / 100;

function commonFields(
  v: ToolFormValues,
  minQuantity: 'positive' | 'zero'
): Built<ToolFieldsInput & { name: string }> {
  const name = v.name.trim();
  if (!name) return { error: 'Escribe el nombre de la herramienta.' };
  const quantity = toNumber(v.quantity);
  if (quantity === null || Number.isNaN(quantity)) return { error: 'Escribe la cantidad.' };
  if (minQuantity === 'positive' ? quantity <= 0 : quantity < 0) {
    return {
      error:
        minQuantity === 'positive'
          ? 'La cantidad debe ser mayor a cero.'
          : 'La cantidad no puede ser negativa.',
    };
  }
  const cost = toNumber(v.unit_cost);
  if (cost !== null && (Number.isNaN(cost) || cost < 0)) return { error: 'El costo no puede ser negativo.' };
  return {
    payload: {
      name,
      kind: v.kind,
      quantity: round2(quantity),
      unit: v.unit,
      unit_cost: cost === null ? null : round2(cost),
      purchase_date: v.purchase_date || null,
      supplier_name: v.supplier_name.trim() || null,
      invoice_ref: v.invoice_ref.trim() || null,
      notes: v.notes.trim() || null,
    },
  };
}

export function buildCreatePayload(v: ToolFormValues): Built<CreateToolInput> {
  const base = commonFields(v, 'positive');
  if ('error' in base) return base;
  const isOut = OUT_STATUSES.includes(v.status);
  const holder = v.holder.trim();
  if (isOut && !holder) return { error: 'Indica dónde o con quién está la herramienta.' };
  return {
    payload: {
      ...base.payload,
      status: v.status,
      holder: isOut || v.status === 'pendiente_entrega' ? holder || null : null,
      location: v.status === 'en_local' ? v.location.trim() || null : null,
    },
  };
}

export function buildUpdatePayload(v: ToolFormValues, status: ToolStatus): Built<ToolFieldsInput> {
  const base = commonFields(v, 'zero');
  if ('error' in base) return base;
  const payload: ToolFieldsInput = { ...base.payload, location: v.location.trim() || null };
  const holder = v.holder.trim();
  if (OUT_STATUSES.includes(status)) {
    if (!holder) return { error: 'Indica quién tiene la herramienta.' };
    payload.holder = holder;
  } else if (status === 'pendiente_entrega') {
    payload.holder = holder || null;
  }
  return { payload };
}
