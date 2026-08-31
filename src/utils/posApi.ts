// mirror of routes/pos.py in impag-quot
// Typed API layer for Punto de Venta (POS) + Caja. All requests go through
// apiRequest from '@/utils/api' so 401 handling stays centralized (session
// expiration handler / token cleanup) — do NOT add another 401 behavior here.

import { apiRequest } from '@/utils/api';

// ==================== Shared types ====================

export type PosPaymentMethod = 'efectivo' | 'transferencia' | 'deposito' | 'terminal';
export type PosSaleStatus = 'completada' | 'cancelada';
export type CashSessionStatus = 'abierta' | 'cerrada';
export type CashMovementKind = 'venta' | 'entrada' | 'salida' | 'cancelacion';

// ==================== GET /pos/products ====================

export interface PosProduct {
  id: number;
  name: string;
  sku: string;
  unit: string | null; // ProductUnit enum value (PIEZA, KG, ROLLO, METRO)
  price: number | null; // effective price: price ?? calculated_price
  currency: 'MXN' | 'USD' | null; // USD/null → do NOT prefill; cashier types an MXN price
  iva: boolean;
  stock: number;
}

// ==================== POST /pos/sales ====================

export interface PosSaleItemInput {
  product_id?: number | null; // null/absent → free-form line ("artículo libre")
  description: string;
  unit?: string | null;
  quantity: number; // > 0
  unit_price: number; // FINAL price per unit, IVA-included when iva=true
  iva?: boolean; // default true
}

export interface CreatePosSalePayload {
  branch?: string; // default 'DGO'
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_method: PosPaymentMethod;
  amount_tendered?: number | null; // efectivo only
  requires_invoice?: boolean;
  delivery_place?: string | null;
  notes?: string | null;
  vendedor?: string | null; // max 120; defaults server-side to the authenticated email
  // Factura (CFDI) capture — free-form, all optional, never block the sale.
  rfc?: string | null; // max 20
  razon_social?: string | null; // max 200
  uso_cfdi?: string | null; // max 10 (e.g. G01, G03, S01, P01)
  cfdi_email?: string | null; // max 255
  items: PosSaleItemInput[]; // min 1
}

// ==================== Sale responses ====================

export interface PosSaleItem {
  id: number;
  product_id: number | null;
  description: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  iva: boolean;
  line_total: number;
  // Cost snapshot taken at sale time (cheapest active supplier). All null for
  // free-form lines and products with no known supplier cost. NEVER shown on
  // the customer ticket — admin views only.
  supplier_product_id: number | null;
  supplier_name: string | null; // denormalized Supplier.name snapshot
  unit_cost: number | null; // per-unit cost+shipping, in cost_currency
  cost_currency: 'MXN' | 'USD' | null;
  exchange_rate: number | null; // USD→MXN rate used (1 for MXN); null when unavailable
  line_cost_mxn: number | null; // quantity × unit_cost × rate; null when cost unknown
}

export interface PosSaleHeader {
  id: number;
  folio: string;
  branch: string;
  sale_date: string; // ISO date
  created_at: string; // ISO datetime
  created_by: string | null;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: PosPaymentMethod;
  amount_tendered: number | null;
  change_given: number | null;
  subtotal: number; // sum of non-IVA bases
  iva_amount: number;
  total: number;
  requires_invoice: boolean;
  delivery_place: string | null;
  notes: string | null;
  status: PosSaleStatus;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  cash_session_id: number | null;
  // Vendedor + margin rollup (null on pre-v2 sales). Margin is admin-only —
  // NEVER printed on the customer ticket.
  vendedor: string | null; // defaults to created_by when not provided at create
  cost_total: number | null; // Σ known line_cost_mxn; null when no line has a known cost
  margin_amount: number | null; // total − cost_total, only set when cost_complete
  cost_complete: boolean; // true iff EVERY line has a known MXN cost
  // Factura (CFDI) capture — only meaningful when requires_invoice.
  rfc: string | null;
  razon_social: string | null;
  uso_cfdi: string | null;
  cfdi_email: string | null;
}

export interface PosSaleDetail extends PosSaleHeader {
  items: PosSaleItem[];
}

export interface PosSaleListItem extends PosSaleHeader {
  item_count: number;
}

export interface PosSalesListResponse {
  total: number;
  limit: number;
  offset: number;
  items: PosSaleListItem[];
}

// ==================== GET /pos/stats/vendedores ====================

export interface VendedorStatsItem {
  vendedor: string | null; // null row = sales with no vendedor ("Sin vendedor")
  sales_count: number;
  total: number;
  margin_total: number; // Σ margin_amount over cost_complete sales only (0 when none)
  margin_known_count: number; // how many sales fed margin_total
}

export interface VendedorStatsResponse {
  items: VendedorStatsItem[]; // ordered by total desc
}

// ==================== Caja (cash sessions) ====================

export interface CashSession {
  id: number;
  branch: string;
  status: CashSessionStatus;
  opened_at: string;
  opened_by: string | null;
  opening_float: number;
  closed_at: string | null;
  closed_by: string | null;
  expected_cash: number | null;
  counted_cash: number | null;
  difference: number | null; // counted − expected
  notes: string | null;
}

export interface CashMovement {
  id: number;
  cash_session_id: number;
  kind: CashMovementKind;
  amount: number; // always positive; sign implied by kind
  description: string | null;
  pos_sale_id: number | null;
  created_at: string;
  created_by: string | null;
}

export interface CashSessionTotals {
  ventas_efectivo: number;
  entradas: number;
  salidas: number;
  cancelaciones: number;
  expected_cash: number;
}

export interface CurrentCashSessionResponse {
  session: CashSession | null;
  totals?: CashSessionTotals;
  movements?: CashMovement[];
}

export interface OpenCashSessionPayload {
  branch?: string; // default 'DGO'
  opening_float: number; // >= 0
  notes?: string;
}

export interface CreateCashMovementPayload {
  kind: 'entrada' | 'salida';
  amount: number; // > 0
  description: string; // required
}

export interface CloseCashSessionPayload {
  counted_cash: number; // >= 0
  notes?: string;
}

export interface CashSessionListItem extends CashSession {
  totals: CashSessionTotals;
}

export interface CashSessionsListResponse {
  total: number;
  limit: number;
  offset: number;
  items: CashSessionListItem[];
}

// ==================== Customers (routes/customers.py) ====================

// mirror of _brief() in routes/customers.py
export interface CustomerBrief {
  id: number;
  display_name: string | null;
  phone_e164: string | null;
  location: string | null;
  source: string | null;
  has_purchased: boolean | null;
  tags: string[];
  last_activity_at: string | null;
}

export interface CreateCustomerPayload {
  display_name: string; // required, 2..200
  phone?: string; // normalized server-side to E.164
  email?: string;
  location?: string;
}

// ==================== Products ====================

export async function searchPosProducts(q: string, limit = 20): Promise<PosProduct[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await apiRequest(`/pos/products?${params.toString()}`);
  // Tolerate both a bare array and an { items: [...] } envelope.
  return Array.isArray(res) ? res : res.items;
}

// ==================== Sales ====================

export async function createPosSale(payload: CreatePosSalePayload): Promise<PosSaleDetail> {
  return apiRequest('/pos/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listPosSales(params?: {
  limit?: number;
  offset?: number;
  date_from?: string; // ISO date
  date_to?: string; // ISO date
  status?: PosSaleStatus;
  vendedor?: string; // exact match
  q?: string; // ILIKE over folio/customer_name
}): Promise<PosSalesListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  if (params?.date_from) searchParams.set('date_from', params.date_from);
  if (params?.date_to) searchParams.set('date_to', params.date_to);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.vendedor) searchParams.set('vendedor', params.vendedor);
  if (params?.q) searchParams.set('q', params.q);

  const qs = searchParams.toString();
  return apiRequest(`/pos/sales${qs ? `?${qs}` : ''}`);
}

export async function getPosSale(saleId: number): Promise<PosSaleDetail> {
  return apiRequest(`/pos/sales/${saleId}`);
}

// 409 (ApiError.status === 409) when the sale is already cancelled.
export async function cancelPosSale(saleId: number, reason: string): Promise<PosSaleDetail> {
  return apiRequest(`/pos/sales/${saleId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// Per-vendedor aggregates over completed sales only (status='completada'),
// ordered by total desc. Dates are ISO (YYYY-MM-DD), both optional/inclusive.
export async function getVendedorStats(
  dateFrom?: string,
  dateTo?: string
): Promise<VendedorStatsResponse> {
  const searchParams = new URLSearchParams();
  if (dateFrom) searchParams.set('date_from', dateFrom);
  if (dateTo) searchParams.set('date_to', dateTo);

  const qs = searchParams.toString();
  return apiRequest(`/pos/stats/vendedores${qs ? `?${qs}` : ''}`);
}

// ==================== Caja ====================

export async function getCurrentCashSession(branch = 'DGO'): Promise<CurrentCashSessionResponse> {
  return apiRequest(`/pos/cash-sessions/current?branch=${encodeURIComponent(branch)}`);
}

// 409 (ApiError.status === 409) when a session is already open for the branch.
// Backend envelope: {session, totals, movements} (routes/pos.py open).
export async function openCashSession(payload: OpenCashSessionPayload): Promise<{
  session: CashSession;
  totals: CashSessionTotals;
  movements: CashMovement[];
}> {
  return apiRequest('/pos/cash-sessions/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 409 (ApiError.status === 409) when the session is closed.
// Backend envelope: {movement, totals} (routes/pos.py movements).
export async function addCashMovement(
  sessionId: number,
  payload: CreateCashMovementPayload
): Promise<{ movement: CashMovement; totals: CashSessionTotals }> {
  return apiRequest(`/pos/cash-sessions/${sessionId}/movements`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 409 (ApiError.status === 409) when the session is already closed.
// Backend envelope: {session, totals} (routes/pos.py close).
export async function closeCashSession(
  sessionId: number,
  payload: CloseCashSessionPayload
): Promise<{ session: CashSession; totals: CashSessionTotals }> {
  return apiRequest(`/pos/cash-sessions/${sessionId}/close`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listCashSessions(params?: {
  limit?: number;
  offset?: number;
}): Promise<CashSessionsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  return apiRequest(`/pos/cash-sessions${qs ? `?${qs}` : ''}`);
}

// ==================== Customers ====================

// GET /customers returns a bare array of brief dicts (routes/customers.py).
export async function searchCustomers(q: string, limit = 20): Promise<CustomerBrief[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiRequest(`/customers?${params.toString()}`);
}

// POST /customers. On duplicate phone the backend responds 409
// (ApiError.status === 409); apiRequest flattens the structured detail, so to
// offer attaching the existing customer, recover it with
// searchCustomers(<phone>) after catching the 409.
export async function createCustomer(payload: CreateCustomerPayload): Promise<CustomerBrief> {
  return apiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
