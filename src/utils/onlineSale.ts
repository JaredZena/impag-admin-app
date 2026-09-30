// "Vender en línea" (todoparaelcampo.com.mx) — pure helpers for the product
// row switch: desired state, status badge and dialog defaults. No React, no
// fetch, so they are unit-tested directly.

import type { OnlineSale, OnlineSaleInput } from '@/types/api';

// One entry of the storefront's public/sale-status.json, written after each
// publish run: backend product id -> [{handle, buyable, reasons}].
export interface SaleStatusEntry {
  handle: string;
  buyable: boolean;
  reasons: string[];
}

export const SALE_REASON_LABELS: Record<string, string> = {
  not_tier1: 'este producto aún no está habilitado para venta en línea (pide a Jared)',
  mapping_not_confirmed: 'falta confirmar el vínculo con la página',
  not_verified: 'el precio no está verificado (revisa costo y margen)',
  iva_unknown: 'falta indicar si lleva IVA',
  iva_mismatch: 'el IVA no coincide',
  unit_mismatch: 'falta la unidad del producto',
  currency: 'el precio no está en pesos',
  invalid_config: 'datos de venta inválidos',
};

export const saleReasonLabel = (code: string): string =>
  SALE_REASON_LABELS[code] ?? `motivo: ${code}`;

const UNIT_LABELS: Record<string, string> = {
  PIEZA: 'pieza',
  METRO: 'metro',
  KG: 'kg',
  ROLLO: 'rollo',
  PAQUETE: 'paquete',
  KIT: 'kit',
};

// Customer-facing unit ("precio por pieza") from the ProductUnit enum value.
export const unitLabelFromProductUnit = (unit?: string | null): string => {
  const key = (unit || '').trim().toUpperCase();
  if (!key || key === 'N/A') return 'pieza';
  return UNIT_LABELS[key] ?? key.toLowerCase();
};

export const DEFAULT_MIN_QTY = 1;
export const DEFAULT_MAX_QTY = 50;

// Dialog prefill: the saved config when there is one, else sensible defaults.
export const defaultOnlineSaleInput = (
  onlineSale: OnlineSale | null | undefined,
  productUnit?: string | null,
): OnlineSaleInput => {
  if (onlineSale) {
    return {
      enabled: onlineSale.enabled,
      unit_label: onlineSale.unit_label,
      delivery: onlineSale.delivery?.length ? [...onlineSale.delivery] : ['recoger'],
      min_qty: onlineSale.min_qty,
      max_qty: onlineSale.max_qty,
      stock_status: onlineSale.stock_status,
    };
  }
  return {
    enabled: false,
    unit_label: unitLabelFromProductUnit(productUnit),
    delivery: ['recoger'],
    min_qty: DEFAULT_MIN_QTY,
    max_qty: DEFAULT_MAX_QTY,
    stock_status: 'in_stock',
  };
};

// Mirrors the backend's OnlineSaleUpdate validation so Hernán gets a plain
// Spanish message instead of a 422. Returns null when valid.
export const validateOnlineSaleInput = (input: OnlineSaleInput): string | null => {
  const label = input.unit_label.trim();
  if (!label) return 'Escribe la unidad (por ejemplo "pieza" o "metro").';
  if (label.length > 60) return 'La unidad es muy larga (máximo 60 letras).';
  if (input.delivery.length === 0) return 'Elige al menos una forma de entrega.';
  const { min_qty: min, max_qty: max } = input;
  if (!Number.isInteger(min) || min < 1 || min > 9999) {
    return 'La cantidad mínima debe ser un número entero entre 1 y 9999.';
  }
  if (!Number.isInteger(max) || max < 1 || max > 9999) {
    return 'La cantidad máxima debe ser un número entero entre 1 y 9999.';
  }
  if (min > max) return 'La cantidad mínima no puede ser mayor que la máxima.';
  return null;
};

export const isBuyableOnStore = (statuses: SaleStatusEntry[] | null | undefined): boolean =>
  !!statuses?.some((s) => s.buyable);

// What the team wants: the saved switch, or — for products turned on outside
// the admin before this switch existed (online_sale null) — whatever the store
// is doing today.
export const isOnlineSaleDesired = (
  onlineSale: OnlineSale | null | undefined,
  statuses: SaleStatusEntry[] | null | undefined,
): boolean => (onlineSale ? onlineSale.enabled : isBuyableOnStore(statuses));

export type SaleBadgeKind = 'live' | 'pending' | 'blocked' | 'stopping' | 'off';

export interface SaleBadge {
  kind: SaleBadgeKind;
  label: string;
}

export const deriveSaleBadge = (
  onlineSale: OnlineSale | null | undefined,
  statuses: SaleStatusEntry[] | null | undefined,
): SaleBadge => {
  const buyable = isBuyableOnStore(statuses);
  const desired = isOnlineSaleDesired(onlineSale, statuses);

  if (!desired) {
    // Turned off here but the store has not been republished yet.
    if (buyable) return { kind: 'stopping', label: 'Aún se vende: pulsa Publicar para quitarlo' };
    return { kind: 'off', label: 'No se vende en línea' };
  }
  if (buyable) return { kind: 'live', label: 'En venta' };

  // "disabled" just means the store still has the old (off) setting — a
  // publish fixes it. Anything else needs a fix before publishing helps.
  const blocking = Array.from(
    new Set((statuses ?? []).flatMap((s) => s.reasons ?? []).filter((r) => r !== 'disabled')),
  );
  if (blocking.length === 0) return { kind: 'pending', label: 'Pendiente: pulsa Publicar' };
  return {
    kind: 'blocked',
    label: `No se puede vender: ${blocking.map(saleReasonLabel).join('; ')}`,
  };
};

export const IVA_RATE = 0.16;

// Approximate price the customer pays on the store: row price + IVA when the
// product carries IVA. null when it can't be computed simply (no price, not
// in pesos, or IVA unknown).
export const estimateStorePrice = (
  price: number | null | undefined,
  iva: boolean | null | undefined,
  currency?: string | null,
): number | null => {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  if (currency && currency.toUpperCase() !== 'MXN') return null;
  if (iva == null) return null;
  return Math.round(price * (iva ? 1 + IVA_RATE : 1) * 100) / 100;
};
