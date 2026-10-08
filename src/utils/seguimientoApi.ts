import { apiRequest } from '@/utils/api';

// Mirror of GET/POST /hoy/seguimiento (impag-quot services/seguimiento.py).
export type SeguimientoKind = 'cotizacion' | 'temporada' | 'inactivo';
export type SeguimientoOutcome = 'enviado' | 'respondio' | 'venta' | 'no_interesa';

export interface SeguimientoCard {
  key: string;
  kind: SeguimientoKind;
  customer_name: string;
  phone: string | null;
  wa: string | null;
  reason: string;
  message: string;
  amount: number;
  quote_ids: number[];
}

export interface SeguimientoContact {
  id: number;
  key: string;
  kind: SeguimientoKind;
  customer_name: string;
  phone: string | null;
  wa: string | null;
  quote_id: number | null;
  outcome: SeguimientoOutcome;
  message: string | null;
  created_at: string | null;
}

export interface SeguimientoDia {
  day: string;
  target: number;
  available: Record<SeguimientoKind, number>;
  done: SeguimientoContact[];
  todo: SeguimientoCard[];
}

export const KIND_LABEL: Record<SeguimientoKind, string> = {
  cotizacion: 'Cotización',
  temporada: 'Temporada',
  inactivo: 'Sin comprar',
};

export const OUTCOME_LABEL: Record<SeguimientoOutcome, string> = {
  enviado: 'Enviado',
  respondio: 'Respondió',
  venta: 'Venta',
  no_interesa: 'No le interesa',
};

// 10 dígitos de México → 52 + número, como lo pide wa.me.
export function waDigits(phone: string): string | null {
  let d = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (d.startsWith('521') && d.length === 13) d = `52${d.slice(3)}`;
  if (d.length === 10) d = `52${d}`;
  return d.length >= 11 ? d : null;
}

// En la compu, wa.me pasa por una pestaña de api.whatsapp.com que pregunta
// cada vez; whatsapp:// abre la app de escritorio directo. "web" es para quien
// no tiene la app: WhatsApp Web, siempre en la misma pestaña. En el teléfono
// wa.me ya abre la app.
export type WaTarget = 'app' | 'web';
export const WA_WEB_TAB = 'whatsapp-web';

export const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function waUrl(digits: string, message?: string, target: WaTarget = 'app') {
  const text = message ? `text=${encodeURIComponent(message)}` : '';
  if (isPhone()) return `https://wa.me/${digits}${text && `?${text}`}`;
  const base = target === 'web' ? 'https://web.whatsapp.com/send' : 'whatsapp://send';
  return `${base}?phone=${digits}${text && `&${text}`}`;
}

// Props for an <a> that opens the chat: the app needs no tab at all.
export function waLinkProps(url: string) {
  if (url.startsWith('whatsapp:')) return { href: url };
  if (url.startsWith('https://web.whatsapp.com')) return { href: url, target: WA_WEB_TAB };
  return { href: url, target: '_blank', rel: 'noopener noreferrer' };
}

export function openWhatsApp(url: string) {
  const { href, target, rel } = waLinkProps(url);
  if (!target) window.location.href = href;
  else window.open(href, target, rel ? 'noopener' : undefined);
}

const TARGET_KEY = 'seguimiento.waTarget';

export function savedWaTarget(): WaTarget {
  try {
    return localStorage.getItem(TARGET_KEY) === 'web' ? 'web' : 'app';
  } catch {
    return 'app';
  }
}

export function saveWaTarget(target: WaTarget) {
  try {
    localStorage.setItem(TARGET_KEY, target);
  } catch {
    // Sin almacenamiento: vale sólo por esta visita.
  }
}

export const fetchSeguimiento = (extra = 0) =>
  apiRequest(`/hoy/seguimiento?extra=${extra}`) as Promise<{ data: SeguimientoDia }>;

// Sin escribirle: 'no_interesa' (en una cotización, la cierra como Perdida)
// o 'venta' (ya compró: la cierra como Aceptada).
export const logSeguimiento = (
  card: SeguimientoCard,
  phone: string | null,
  message: string,
  outcome: 'enviado' | 'no_interesa' | 'venta' = 'enviado'
) =>
  apiRequest('/hoy/seguimiento', {
    method: 'POST',
    body: JSON.stringify({
      key: card.key,
      customer_name: card.customer_name,
      kind: card.kind,
      quote_ids: card.quote_ids,
      phone,
      message,
      outcome,
    }),
  }) as Promise<{ data: SeguimientoContact }>;

export const setSeguimientoOutcome = (id: number, outcome: SeguimientoOutcome) =>
  apiRequest(`/hoy/seguimiento/${id}/outcome`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  }) as Promise<{ data: SeguimientoContact }>;
