// Helpers para pedidos web (tienda en línea todoparaelcampo.com.mx, Mercado Pago).
//
// Todo aquí es tolerante: si un campo no viene, viene null o trae un valor que
// no reconocemos, las funciones regresan null y la UI no pinta nada nuevo. Así
// las cotizaciones de siempre se ven exactamente igual.
import type { Quote } from '@/types/quotes';

export const WEB_ORDER_PREFIX = 'WEB-';

export function isWebOrder(quote: Pick<Quote, 'quote_number'> | null | undefined): boolean {
  const n = quote?.quote_number;
  return typeof n === 'string' && n.trim().toUpperCase().startsWith(WEB_ORDER_PREFIX);
}

// ==================== Chip de pago ====================

export type PaymentChipTone = 'paid' | 'pending' | 'problem';

export interface PaymentChipInfo {
  tone: PaymentChipTone;
  label: string;
}

// checkout / rejected / cancelled (y cualquier valor desconocido) no llevan chip:
// el carrito sigue abierto o el cliente no pagó, y el estado de la cotización
// (Borrador / Expirada) ya lo dice.
const PAYMENT_TONES = new Map<string, PaymentChipTone>([
  ['approved', 'paid'],
  ['pending', 'pending'],
  ['in_process', 'pending'],
  ['authorized', 'pending'],
  ['mismatch', 'problem'],
  ['amount_mismatch', 'problem'],
  ['refunded', 'problem'],
  ['partially_refunded', 'problem'],
  ['charged_back', 'problem'],
  ['in_mediation', 'problem'],
]);

const PAYMENT_LABELS: Record<PaymentChipTone, string> = {
  paid: 'Pagado en línea',
  pending: 'Pago pendiente',
  problem: 'Revisar pago',
};

export function getPaymentChip(status: unknown): PaymentChipInfo | null {
  if (typeof status !== 'string') return null;
  const tone = PAYMENT_TONES.get(status.trim().toLowerCase());
  return tone ? { tone, label: PAYMENT_LABELS[tone] } : null;
}

// ==================== Campana de notificaciones ====================

export function notificationDotClass(eventType: string): string {
  if (eventType === 'quote_accepted' || eventType === 'web_order_paid') return 'bg-green-500';
  if (eventType === 'web_order_problem') return 'bg-red-500';
  return 'bg-yellow-500';
}

// ==================== Método de pago ====================

const MP_PAYMENT_TYPES = new Map<string, string>([
  ['credit_card', 'Tarjeta de crédito'],
  ['debit_card', 'Tarjeta de débito'],
  ['prepaid_card', 'Tarjeta prepagada'],
  ['ticket', 'Efectivo (ticket)'],
  ['atm', 'Cajero'],
  ['bank_transfer', 'Transferencia bancaria'],
  ['account_money', 'Saldo en Mercado Pago'],
]);

/** "mercadopago:ticket:oxxo" → "Mercado Pago · Efectivo (ticket) · OXXO". */
export function paymentMethodLabel(value: string | null | undefined): string | null {
  const s = cleanString(value);
  if (!s) return null;
  const [provider, type, method] = s.split(':').map((p) => p.trim());
  if (provider.toLowerCase() !== 'mercadopago') return s;
  const parts = ['Mercado Pago'];
  if (type) parts.push(MP_PAYMENT_TYPES.get(type.toLowerCase()) ?? type);
  if (method) parts.push(method.toUpperCase());
  return parts.join(' · ');
}

// ==================== Bloque JSON en quote.notes ====================

export interface WebOrderAddress {
  street: string | null;
  number: string | null;
  colonia: string | null;
  cp: string | null;
  municipio: string | null;
  estado: string | null;
  references: string | null;
}

export interface WebOrderDelivery {
  method: string | null;
  address: WebOrderAddress | null;
  cost_total: number | null;
}

export interface WebOrderInvoice {
  type: string | null;
  rfc: string | null;
  razon_social: string | null;
  regimen_fiscal: string | null;
  cp_fiscal: string | null;
  uso_cfdi: string | null;
  email: string | null;
}

export interface WebOrderDetails {
  delivery: WebOrderDelivery | null;
  /** true: pidió factura · false: no pidió · null: el bloque no lo dice. */
  invoiceRequested: boolean | null;
  invoice: WebOrderInvoice | null;
  /** Monto que cobró Mercado Pago (payment.transaction_amount del bloque). */
  chargedAmount: number | null;
  /** Avisos que dejó el backend al registrar el pedido (warnings del bloque). */
  warnings: string[];
  /**
   * El bloque no trae ni la entrega ni la respuesta de factura: el pago se
   * registró sin los datos del pedido y hay que confirmarlos con el cliente.
   */
  orderDataMissing: boolean;
  /** Texto exacto del JSON dentro de las notas (para ocultarlo en "Notas"). */
  raw: string;
}

const MAX_NOTES_LENGTH = 50_000;
const MAX_CANDIDATES = 200;
const MAX_WARNINGS = 30;
const NESTED_KEYS = ['pedido_web', 'web_order', 'order', 'pedido'];
// Bloque del backend (impag-quot write_notes_block): {v, ref, delivery, invoice, payment, warnings}.
const ORDER_KEYS = ['delivery', 'invoice', 'payment', 'warnings'];

type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasKey(obj: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function cleanString(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t : null;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

function cleanNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Índice de la llave que cierra la que abre en `start`, o -1 si no cierra. */
function findMatchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function isOrderBlock(value: unknown): value is JsonRecord {
  return isRecord(value) && ORDER_KEYS.some((key) => hasKey(value, key));
}

function pickOrder(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  if (isOrderBlock(value)) return value;
  for (const key of NESTED_KEYS) {
    const nested = value[key];
    if (isOrderBlock(nested)) return nested;
  }
  return null;
}

/** Primer objeto JSON de las notas que traiga `delivery`, `invoice`, `payment` o `warnings`. */
function findOrderBlock(text: string): { order: JsonRecord; raw: string } | null {
  let attempts = 0;
  for (let i = text.indexOf('{'); i !== -1 && attempts < MAX_CANDIDATES; i = text.indexOf('{', i + 1)) {
    attempts++;
    const end = findMatchingBrace(text, i);
    if (end === -1) continue;
    const raw = text.slice(i, end + 1);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // texto humano con llaves: seguimos buscando más adelante / adentro
    }
    const order = pickOrder(parsed);
    if (order) return { order, raw };
    i = end; // JSON válido pero no es el pedido: saltamos su interior
  }
  return null;
}

function normalizeDelivery(value: unknown): WebOrderDelivery | null {
  if (!isRecord(value)) return null;
  let address: WebOrderAddress | null = null;
  if (isRecord(value.address)) {
    const a = value.address;
    const candidate: WebOrderAddress = {
      street: cleanString(a.street),
      number: cleanString(a.number),
      colonia: cleanString(a.colonia),
      cp: cleanString(a.cp),
      municipio: cleanString(a.municipio),
      estado: cleanString(a.estado),
      references: cleanString(a.references),
    };
    if (Object.values(candidate).some((v) => v !== null)) address = candidate;
  }
  const delivery: WebOrderDelivery = {
    method: cleanString(value.method),
    address,
    cost_total: cleanNumber(value.cost_total),
  };
  if (delivery.method === null && delivery.address === null && delivery.cost_total === null) return null;
  return delivery;
}

function normalizeInvoice(
  order: JsonRecord,
  hasDelivery: boolean,
): Pick<WebOrderDetails, 'invoiceRequested' | 'invoice'> {
  if (!hasKey(order, 'invoice')) return { invoiceRequested: null, invoice: null };
  const value = order.invoice;
  // invoice null es "no pidió factura" sólo junto a los datos de entrega. Un pago
  // registrado sin los datos del pedido también deja invoice null: ahí no se sabe.
  if (value === null) return { invoiceRequested: hasDelivery ? false : null, invoice: null };
  if (value === false) return { invoiceRequested: false, invoice: null };
  if (!isRecord(value)) return { invoiceRequested: null, invoice: null };
  if (value.requires_invoice === false) return { invoiceRequested: false, invoice: null };
  const invoice: WebOrderInvoice = {
    type: cleanString(value.type),
    rfc: cleanString(value.rfc)?.toUpperCase() ?? null,
    razon_social: cleanString(value.razon_social),
    regimen_fiscal: cleanString(value.regimen_fiscal),
    cp_fiscal: cleanString(value.cp_fiscal),
    uso_cfdi: cleanString(value.uso_cfdi)?.toUpperCase() ?? null,
    email: cleanString(value.email),
  };
  const hasData = Object.values(invoice).some((v) => v !== null);
  if (value.requires_invoice === true || hasData) return { invoiceRequested: true, invoice };
  return { invoiceRequested: null, invoice: null };
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const warnings: string[] = [];
  for (const item of value) {
    const warning = typeof item === 'string' ? item.trim() : '';
    if (warning && !warnings.includes(warning)) warnings.push(warning);
    if (warnings.length >= MAX_WARNINGS) break;
  }
  return warnings;
}

function normalizeChargedAmount(payment: unknown): number | null {
  if (!isRecord(payment)) return null;
  const amount = cleanNumber(payment.transaction_amount);
  return amount !== null && amount >= 0 ? amount : null;
}

/**
 * Lee el bloque JSON que el backend guarda en quote.notes para los pedidos web:
 * entrega, factura, el monto que cobró Mercado Pago y los avisos (warnings).
 * Acepta el JSON solo, entre marcadores ([Pedido web …] … [/Pedido web]) o en
 * un bloque ```json. Regresa null si no hay bloque, si el JSON es inválido o si
 * no trae nada que mostrar.
 */
export function parseWebOrderNotes(notes: string | null | undefined): WebOrderDetails | null {
  if (typeof notes !== 'string' || !notes.includes('{') || notes.length > MAX_NOTES_LENGTH) return null;
  const found = findOrderBlock(notes);
  if (!found) return null;
  const delivery = normalizeDelivery(found.order.delivery);
  const { invoiceRequested, invoice } = normalizeInvoice(found.order, delivery !== null);
  const chargedAmount = normalizeChargedAmount(found.order.payment);
  const warnings = normalizeWarnings(found.order.warnings);
  const orderDataMissing = delivery === null && invoiceRequested === null;
  // Sin datos del pedido, el bloque sólo vale si registra un pago o trae avisos.
  if (orderDataMissing && !isRecord(found.order.payment) && warnings.length === 0) return null;
  return { delivery, invoiceRequested, invoice, chargedAmount, warnings, orderDataMissing, raw: found.raw };
}

/** Notas sin el bloque del pedido (lo que escribió una persona). */
export function stripWebOrderBlock(notes: string, raw: string): string {
  return notes
    .replace(raw, () => '')
    .replace(/^[ \t]*\[\/?Pedido web[^\]\n]*\][ \t]*$/gim, '')
    .replace(/```(?:json)?\s*```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ==================== Etiquetas ====================

const DELIVERY_LABELS = new Map<string, string>([
  ['recoger', 'Recoger en tienda'],
  ['paqueteria', 'Envío por paquetería'],
  ['flete', 'Flete'],
]);

export function deliveryMethodLabel(method: string | null): string | null {
  if (!method) return null;
  return DELIVERY_LABELS.get(method.toLowerCase()) ?? method;
}

const INVOICE_TYPE_LABELS = new Map<string, string>([
  ['a_nombre', 'A nombre del cliente'],
  ['generica', 'Genérica'],
]);

export function invoiceTypeLabel(type: string | null): string | null {
  if (!type) return null;
  return INVOICE_TYPE_LABELS.get(type.toLowerCase()) ?? type;
}

// Códigos que escribe impag-quot (services/web_orders.py: order_problems y
// record_order). Un código nuevo se muestra tal cual: nunca se esconde un aviso.
const WARNING_LABELS = new Map<string, string>([
  ['invalid_phone', 'Teléfono del cliente inválido'],
  ['invalid_email', 'Correo del cliente inválido'],
  ['missing_address', 'Falta la dirección de entrega'],
  ['unit_total_mismatch', 'El precio con IVA de un producto no cuadra'],
  ['totals_mismatch', 'Los totales no cuadran con los productos'],
  ['iva_breakdown_mismatch', 'El desglose de IVA no cuadra'],
  ['totals_differ_from_recorded_order', 'El pago trae un total distinto al del pedido registrado'],
  ['invalid_rfc', 'RFC inválido'],
  ['missing_razon_social', 'Falta la razón social'],
  ['invalid_regimen_fiscal', 'Régimen fiscal inválido'],
  ['invalid_cp_fiscal', 'CP fiscal inválido'],
  ['invalid_uso_cfdi', 'Uso de CFDI inválido'],
  ['invalid_invoice_email', 'Correo para CFDI inválido'],
  ['unmapped_product', 'Producto que no existe en el catálogo'],
  ['iva_mismatch', 'El IVA del producto no coincide con el catálogo'],
  ['additional_approved_payment', 'Mercado Pago aprobó otro pago para este pedido'],
  ['unparseable_date_approved', 'Fecha de aprobación ilegible'],
  ['no_task_user', 'No se crearon las tareas (falta el usuario de sistema)'],
  ['no_notification_recipients', 'Nadie recibió el aviso (falta WEB_ORDER_NOTIFY_EMAILS)'],
]);

/** "iva_mismatch:371" → "El IVA del producto no coincide con el catálogo (371)". */
export function warningLabel(code: string): string {
  const colon = code.indexOf(':');
  const key = (colon === -1 ? code : code.slice(0, colon)).trim().toLowerCase();
  const detail = colon === -1 ? '' : code.slice(colon + 1).trim();
  const label = WARNING_LABELS.get(key);
  if (!label) return code;
  return detail ? `${label} (${detail})` : label;
}

/**
 * true si lo que cobró Mercado Pago y el total del pedido difieren en más de un
 * centavo (la misma tolerancia que usa el backend). Sin números válidos: false.
 */
export function chargedDiffersFromTotal(charged: number, total: number): boolean {
  if (!Number.isFinite(charged) || !Number.isFinite(total)) return false;
  return Math.abs(Math.round(charged * 100) - Math.round(total * 100)) > 1;
}

export function formatAddress(address: WebOrderAddress): string | null {
  const parts = [
    [address.street, address.number].filter(Boolean).join(' '),
    address.colonia ? `Col. ${address.colonia}` : '',
    address.cp ? `CP ${address.cp}` : '',
    [address.municipio, address.estado].filter(Boolean).join(', '),
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}
