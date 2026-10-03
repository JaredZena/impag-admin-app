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

export const waUrl = (digits: string, message: string) =>
  `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

export const fetchSeguimiento = (extra = 0) =>
  apiRequest(`/hoy/seguimiento?extra=${extra}`) as Promise<{ data: SeguimientoDia }>;

// outcome 'no_interesa': quitarlo sin escribirle (en una cotización, la cierra como Perdida).
export const logSeguimiento = (
  card: SeguimientoCard,
  phone: string | null,
  message: string,
  outcome: 'enviado' | 'no_interesa' = 'enviado'
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
