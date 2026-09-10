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
  /** Texto exacto del JSON dentro de las notas (para ocultarlo en "Notas"). */
  raw: string;
}

const MAX_NOTES_LENGTH = 50_000;
const MAX_CANDIDATES = 200;
const NESTED_KEYS = ['pedido_web', 'web_order', 'order', 'pedido'];

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

function pickOrder(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  if (hasKey(value, 'delivery') || hasKey(value, 'invoice')) return value;
  for (const key of NESTED_KEYS) {
    const nested = value[key];
    if (isRecord(nested) && (hasKey(nested, 'delivery') || hasKey(nested, 'invoice'))) return nested;
  }
  return null;
}

/** Primer objeto JSON de las notas que traiga `delivery` o `invoice`. */
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

function normalizeInvoice(order: JsonRecord): Pick<WebOrderDetails, 'invoiceRequested' | 'invoice'> {
  if (!hasKey(order, 'invoice')) return { invoiceRequested: null, invoice: null };
  const value = order.invoice;
  if (value === null || value === false) return { invoiceRequested: false, invoice: null };
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

/**
 * Lee los datos de entrega y factura del bloque JSON que el backend guarda en
 * quote.notes para los pedidos web. Acepta el JSON solo, entre marcadores
 * ([Pedido web …] … [/Pedido web]) o en un bloque ```json. Regresa null si no
 * hay bloque, si el JSON es inválido o si no trae nada que mostrar.
 */
export function parseWebOrderNotes(notes: string | null | undefined): WebOrderDetails | null {
  if (typeof notes !== 'string' || !notes.includes('{') || notes.length > MAX_NOTES_LENGTH) return null;
  const found = findOrderBlock(notes);
  if (!found) return null;
  const delivery = normalizeDelivery(found.order.delivery);
  const { invoiceRequested, invoice } = normalizeInvoice(found.order);
  if (delivery === null && invoiceRequested === null) return null;
  return { delivery, invoiceRequested, invoice, raw: found.raw };
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

export function formatAddress(address: WebOrderAddress): string | null {
  const parts = [
    [address.street, address.number].filter(Boolean).join(' '),
    address.colonia ? `Col. ${address.colonia}` : '',
    address.cp ? `CP ${address.cp}` : '',
    [address.municipio, address.estado].filter(Boolean).join(', '),
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}
