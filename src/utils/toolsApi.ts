// mirror of routes/tools.py in impag-quot
// Inventario de herramientas (uso interno): tools never show up in POS, quotes
// or the storefront. All requests go through apiRequest from '@/utils/api' so
// 401 handling stays centralized — do NOT add another 401 behavior here.

import { apiRequest } from '@/utils/api';

// ==================== Types ====================

export type ToolStatus = 'pendiente_entrega' | 'en_local' | 'en_obra' | 'con_cliente' | 'baja';
export type ToolKind = 'herramienta' | 'consumible';
export type ToolMovementKind =
  | 'compra'
  | 'alta'
  | 'recibida'
  | 'salida'
  | 'regreso'
  | 'baja'
  | 'reactivar'
  | 'ajuste';

// Labels use the team's own vocabulary from the HERRAMIENTAS sheet.
export const TOOL_STATUS_LABELS: Record<ToolStatus, string> = {
  en_local: 'En el local',
  pendiente_entrega: 'Pendiente entrega',
  en_obra: 'En obra',
  con_cliente: 'Con el cliente',
  baja: 'Baja',
};
export const TOOL_STATUS_ORDER: ToolStatus[] = [
  'en_local',
  'pendiente_entrega',
  'en_obra',
  'con_cliente',
  'baja',
];
// Someone outside the store has the tool: the backend requires a holder.
export const OUT_STATUSES: ToolStatus[] = ['en_obra', 'con_cliente'];
export const TOOL_UNITS = ['PIEZA', 'JUEGO', 'METRO', 'KG', 'LITRO', 'ROLLO'];
export const TOOL_LOCATIONS = ['Nuevo Ideal', 'Texcoco'];

export interface ToolBrief {
  id: number;
  name: string;
  kind: ToolKind;
  quantity: number;
  unit: string;
  unit_cost: number | null;
  total_value: number | null; // cantidad × costo; null when there's no cost
  status: ToolStatus;
  status_label: string;
  location: string | null;
  holder: string | null; // obra / cliente / persona
  supplier_name: string | null;
  purchase_date: string | null; // YYYY-MM-DD
  image_count: number;
  primary_image_url: string | null; // presigned, ~1h
  retired_at: string | null;
  updated_at: string | null;
}

export interface ToolMovement {
  id: number;
  kind: ToolMovementKind;
  kind_label: string;
  from_status: ToolStatus | null;
  to_status: ToolStatus | null;
  holder: string | null;
  note: string | null;
  occurred_on: string | null; // YYYY-MM-DD
  created_at: string | null;
  created_by: string | null;
}

export interface ToolImage {
  key: string;
  url: string;
}

export interface ToolDetail extends ToolBrief {
  invoice_ref: string | null;
  notes: string | null;
  retired_reason: string | null;
  sheet_no: number | null;
  images: ToolImage[];
  created_at: string | null;
  created_by: string | null;
  movements: ToolMovement[]; // newest first
}

export interface ToolStatusTotals {
  label: string;
  count: number;
  value: number;
}

export interface ToolsSummary {
  by_status: Record<ToolStatus, ToolStatusTotals>;
  active_count: number; // excludes bajas
  total_value: number; // excludes bajas
  missing_cost_count: number;
  retired_count: number;
}

export interface ToolsListResponse {
  items: ToolBrief[];
  total: number;
  summary: ToolsSummary;
}

export interface ToolFieldsInput {
  name?: string;
  kind?: ToolKind;
  quantity?: number;
  unit?: string;
  unit_cost?: number | null;
  purchase_date?: string | null;
  supplier_name?: string | null;
  invoice_ref?: string | null;
  location?: string | null;
  holder?: string | null;
  notes?: string | null;
}

export interface CreateToolInput extends ToolFieldsInput {
  name: string;
  status?: Exclude<ToolStatus, 'baja'>;
}

export interface MovementInput {
  to_status: ToolStatus;
  holder?: string | null; // required for en_obra / con_cliente
  location?: string | null;
  note?: string | null; // required for baja (motivo)
  occurred_on?: string | null; // YYYY-MM-DD, default = today (Durango)
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | null;
  message: string | null;
}

// ==================== Requests ====================

export async function listTools(
  params: { status?: ToolStatus; q?: string; includeRetired?: boolean } = {}
): Promise<ToolsListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.includeRetired) qs.set('include_retired', 'true');
  const query = qs.toString();
  const res: Envelope<ToolsListResponse> = await apiRequest(`/tools${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getTool(id: number | string): Promise<ToolDetail> {
  const res: Envelope<ToolDetail> = await apiRequest(`/tools/${id}`);
  return res.data;
}

export async function createTool(input: CreateToolInput): Promise<ToolDetail> {
  const res: Envelope<ToolDetail> = await apiRequest('/tools', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateTool(id: number, input: ToolFieldsInput): Promise<ToolDetail> {
  const res: Envelope<ToolDetail> = await apiRequest(`/tools/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteTool(id: number): Promise<void> {
  await apiRequest(`/tools/${id}`, { method: 'DELETE' });
}

export async function addToolMovement(id: number, input: MovementInput): Promise<ToolDetail> {
  const res: Envelope<ToolDetail> = await apiRequest(`/tools/${id}/movements`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.data;
}

// ==================== Formatting ====================

export const money = (n: number | null | undefined): string =>
  n === null || n === undefined
    ? '—'
    : `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const qty = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toLocaleString('es-MX', { maximumFractionDigits: 2 });

/** Local (not UTC) date as YYYY-MM-DD, for date inputs. */
export const todayISO = (): string => {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** 'YYYY-MM-DD…' -> 'DD/MM/YYYY' without a Date round-trip (no TZ shift). */
export const dmy = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

// ==================== WhatsApp text (team template style) ====================

export function summaryWhatsAppText(summary: ToolsSummary, date: string = todayISO()): string {
  const lines = [`*Herramientas ${dmy(date)}*`];
  for (const status of TOOL_STATUS_ORDER) {
    if (status === 'baja') continue;
    const totals = summary.by_status[status];
    if (!totals || totals.count === 0) continue;
    lines.push(`${totals.label}: ${totals.count} · ${money(totals.value)}`);
  }
  const noun = summary.active_count === 1 ? 'herramienta' : 'herramientas';
  lines.push(`*Total: ${money(summary.total_value)}* (${summary.active_count} ${noun})`);
  if (summary.missing_cost_count > 0) {
    lines.push(`Sin costo registrado: ${summary.missing_cost_count}`);
  }
  return lines.join('\n');
}

const MOVEMENT_HEADERS: Record<ToolMovementKind, string> = {
  compra: 'Herramienta nueva',
  alta: 'Herramienta registrada',
  recibida: 'Herramienta recibida',
  salida: 'Salida de herramienta',
  regreso: 'Regreso de herramienta',
  baja: 'Baja de herramienta',
  reactivar: 'Herramienta reactivada',
  ajuste: 'Ajuste de herramienta',
};

export function movementWhatsAppText(tool: ToolDetail, m: ToolMovement): string {
  const lines = [
    `*${MOVEMENT_HEADERS[m.kind] ?? 'Herramienta'}*`,
    `Herramienta: ${tool.name}`,
    `Cantidad: ${qty(tool.quantity)} ${tool.unit}`,
  ];
  if (m.holder && (m.kind === 'salida' || m.kind === 'compra')) {
    lines.push(`${m.to_status === 'con_cliente' ? 'Cliente' : 'Destino'}: ${m.holder}`);
  }
  if (m.kind === 'compra') {
    if (tool.unit_cost !== null) lines.push(`Costo: ${money(tool.unit_cost)} c/u`);
    if (tool.supplier_name) lines.push(`Proveedor: ${tool.supplier_name}`);
  }
  if ((m.kind === 'regreso' || m.kind === 'recibida' || m.kind === 'reactivar') && tool.location) {
    lines.push(`Ubicación: ${tool.location}`);
  }
  if (m.note) lines.push(`${m.kind === 'baja' ? 'Motivo' : 'Nota'}: ${m.note}`);
  lines.push(`Fecha: ${dmy(m.occurred_on ?? m.created_at)}`);
  return lines.join('\n');
}
