import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNotifications } from '@/components/ui/notification';
import { STORE_BASE_URL } from '@/hooks/useStoreLinks';
import { useSaleStatus } from '@/hooks/useSaleStatus';
import { formatCurrency } from '@/utils/currencyUtils';
import {
  defaultOnlineSaleInput,
  deriveSaleBadge,
  estimateStorePrice,
  isOnlineSaleDesired,
  validateOnlineSaleInput,
  type SaleBadgeKind,
} from '@/utils/onlineSale';
import { saveOnlineSale } from '@/utils/onlineSaleApi';
import type { OnlineSale, OnlineSaleDelivery, OnlineSaleInput, OnlineSaleStockStatus } from '@/types/api';

interface OnlineSaleControlProps {
  productId: string | number;
  productUnit?: string;
  price?: number | null;
  iva?: boolean | null;
  currency?: string;
  onlineSale: OnlineSale | null;
  storeHandle: string;
  storeTitle: string;
  onSaved: (onlineSale: OnlineSale | null) => void;
}

const DELIVERY_OPTIONS: { value: OnlineSaleDelivery; label: string; note?: string }[] = [
  { value: 'recoger', label: 'Recoger en tienda' },
  { value: 'paqueteria', label: 'Paquetería', note: 'aún no disponible en la tienda' },
  { value: 'flete', label: 'Flete', note: 'aún no disponible en la tienda' },
];

const BADGE_CLASSES: Record<SaleBadgeKind, string> = {
  live: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  stopping: 'bg-amber-100 text-amber-800',
  blocked: 'bg-red-100 text-red-700',
  off: 'text-gray-400',
};

const SAVED_HINT = 'Pulsa Publicar para actualizar la tienda (tarda unos minutos).';

interface DialogForm {
  unit_label: string;
  delivery: OnlineSaleDelivery[];
  min_qty: string;
  max_qty: string;
  stock_status: OnlineSaleStockStatus;
}

const toForm = (input: OnlineSaleInput): DialogForm => ({
  unit_label: input.unit_label,
  delivery: input.delivery,
  min_qty: String(input.min_qty),
  max_qty: String(input.max_qty),
  stock_status: input.stock_status,
});

const OnlineSaleControl: React.FC<OnlineSaleControlProps> = ({
  productId,
  productUnit,
  price,
  iva,
  currency,
  onlineSale,
  storeHandle,
  storeTitle,
  onSaved,
}) => {
  const { addNotification } = useNotifications();
  const statuses = useSaleStatus(productId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DialogForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) setDialogOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen, saving]);

  // Wait for sale-status.json so the switch doesn't flicker for the products
  // that were turned on outside the admin (online_sale null + buyable).
  if (statuses === null) return null;

  const desired = isOnlineSaleDesired(onlineSale, statuses);
  const badge = deriveSaleBadge(onlineSale, statuses);
  const storeUrl = `${STORE_BASE_URL}/producto/${storeHandle}`;
  const storePrice = estimateStorePrice(price, iva, currency);

  const save = async (input: OnlineSaleInput) => {
    setSaving(true);
    try {
      const response = await saveOnlineSale(productId, input);
      onSaved(response.online_sale ?? null);
      addNotification({ type: 'success', title: 'Guardado', message: SAVED_HINT, duration: 8000 });
      return true;
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error al guardar venta en línea',
        message: (err instanceof Error && err.message) || 'No se pudo guardar',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openDialog = () => {
    setForm(toForm(defaultOnlineSaleInput(onlineSale, productUnit)));
    setFormError(null);
    setDialogOpen(true);
  };

  const handleToggle = () => {
    if (saving) return;
    if (desired) {
      // Keep the config (or the defaults, for a product turned on outside the
      // admin) so turning it back on is one click away.
      save({ ...defaultOnlineSaleInput(onlineSale, productUnit), enabled: false });
    } else {
      openDialog();
    }
  };

  const handleDialogSave = async () => {
    if (!form || saving) return;
    const input: OnlineSaleInput = {
      enabled: true,
      unit_label: form.unit_label.trim(),
      delivery: DELIVERY_OPTIONS.map((o) => o.value).filter((v) => form.delivery.includes(v)),
      min_qty: Number(form.min_qty),
      max_qty: Number(form.max_qty),
      stock_status: form.stock_status,
    };
    const error = validateOnlineSaleInput(input);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    if (await save(input)) setDialogOpen(false);
  };

  const toggleDelivery = (value: OnlineSaleDelivery) => {
    setForm((f) =>
      f && {
        ...f,
        delivery: f.delivery.includes(value) ? f.delivery.filter((d) => d !== value) : [...f.delivery, value],
      },
    );
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        role="switch"
        aria-checked={desired}
        aria-label="Vender en línea"
        title={desired ? 'Dejar de vender en línea' : 'Vender en línea'}
        disabled={saving}
        onClick={handleToggle}
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          desired ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
            desired ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-gray-700">Vender en línea</span>
      {badge.kind === 'off' ? null : (
        <span className={`rounded px-1.5 py-0.5 font-medium ${BADGE_CLASSES[badge.kind]}`}>{badge.label}</span>
      )}
      {desired && (
        <button
          type="button"
          className="text-emerald-700 hover:underline"
          title="Cambiar unidad, entregas o cantidades"
          onClick={openDialog}
          disabled={saving}
        >
          Ajustes ✎
        </button>
      )}

      {dialogOpen &&
        form &&
        createPortal(
          // Portal events still bubble through React to the row's onClick.
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget && !saving) setDialogOpen(false);
            }}
          >
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto p-5 text-sm">
              <h2 className="text-lg font-semibold text-gray-900">Vender en línea</h2>

              <div className="mt-3 rounded-md bg-emerald-50 p-3 text-emerald-900 space-y-1">
                <div>
                  Se venderá en:{' '}
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                    {storeTitle || storeHandle}
                  </a>
                </div>
                <div>
                  Precio en la tienda (aprox.):{' '}
                  {storePrice != null ? (
                    <span className="font-semibold">
                      {formatCurrency(storePrice, 'MXN')}
                      {iva ? ' con IVA' : ' (sin IVA)'}
                    </span>
                  ) : (
                    <span className="text-amber-800">no se puede calcular (revisa precio, moneda e IVA)</span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="font-medium text-gray-800">Se vende por</span>
                  <Input
                    value={form.unit_label}
                    onChange={(e) => setForm({ ...form, unit_label: e.target.value })}
                    maxLength={60}
                    placeholder="pieza, metro, rollo…"
                    className="mt-1 h-9"
                  />
                </label>

                <fieldset>
                  <legend className="font-medium text-gray-800">Entrega</legend>
                  <div className="mt-1 space-y-1">
                    {DELIVERY_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.delivery.includes(o.value)}
                          onChange={() => toggleDelivery(o.value)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        <span>{o.label}</span>
                        {o.note && <span className="text-xs text-gray-500">— {o.note}</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="font-medium text-gray-800">Mínimo por pedido</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.min_qty}
                      onChange={(e) => setForm({ ...form, min_qty: e.target.value })}
                      className="mt-1 h-9"
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-gray-800">Máximo por pedido</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.max_qty}
                      onChange={(e) => setForm({ ...form, max_qty: e.target.value })}
                      className="mt-1 h-9"
                    />
                  </label>
                </div>

                <fieldset>
                  <legend className="font-medium text-gray-800">Existencia</legend>
                  <div className="mt-1 flex gap-4">
                    {(
                      [
                        ['in_stock', 'Disponible'],
                        ['backorder', 'Sobre pedido'],
                      ] as [OnlineSaleStockStatus, string][]
                    ).map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`stock-status-${productId}`}
                          checked={form.stock_status === value}
                          onChange={() => setForm({ ...form, stock_status: value })}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

              <p className="mt-3 text-xs text-gray-500">
                Después de guardar, pulsa Publicar para que la tienda se actualice.
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleDialogSave}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? 'Guardando…' : desired ? 'Guardar' : 'Guardar y vender'}
                </Button>
              </div>
            </Card>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default OnlineSaleControl;
