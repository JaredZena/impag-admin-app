import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { createPosSale, getCurrentCashSession } from '@/utils/posApi';
import type {
  CashSession,
  CreatePosSalePayload,
  CustomerBrief,
  PosPaymentMethod,
  PosProduct,
  PosSaleDetail,
} from '@/utils/posApi';
import { formatCurrency } from '@/utils/currencyUtils';
import { useNotifications } from '@/components/ui/notification';
import PosProductSearch from './PosProductSearch';
import CustomerPicker from './CustomerPicker';
import TicketView from './TicketView';

// Route /pos is FULL-BLEED (MainLayout renders it without padding); the page
// must NOT import MainLayout — ProtectedRoute already wraps every route in it.

const CART_KEY = 'pos_cart_v1';
const BRANCH = 'DGO';

const PAYMENT_METHODS: { value: PosPaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'terminal', label: 'Terminal' },
];

interface CartLine {
  _id: string;
  product_id: number | null; // null → artículo libre
  description: string;
  unit: string | null;
  quantity: number;
  unit_price: number; // FINAL price, IVA-included when iva=true
  iva: boolean;
  sku?: string | null;
  currency?: 'MXN' | 'USD' | null;
  stock?: number | null;
}

interface StoredCart {
  items: CartLine[];
  customer: CustomerBrief | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const lineTotal = (it: CartLine): number => round2(it.quantity * it.unit_price);

// Cart + selected customer survive reloads and the ~1h Google-token reauth.
function readStoredCart(): StoredCart {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [], customer: null };
    const parsed = JSON.parse(raw) as Partial<StoredCart>;
    const items = (Array.isArray(parsed?.items) ? parsed.items : []).filter(
      (it): it is CartLine =>
        !!it &&
        typeof it.description === 'string' &&
        typeof it.quantity === 'number' &&
        typeof it.unit_price === 'number'
    );
    const customer =
      parsed?.customer && typeof parsed.customer.id === 'number' ? parsed.customer : null;
    return { items, customer };
  } catch {
    return { items: [], customer: null };
  }
}

export default function PosPage() {
  const { addNotification } = useNotifications();

  const [items, setItems] = useState<CartLine[]>(() => readStoredCart().items);
  const [customer, setCustomer] = useState<CustomerBrief | null>(() => readStoredCart().customer);
  const [payment, setPayment] = useState<PosPaymentMethod>('efectivo');
  const [amountTendered, setAmountTendered] = useState('');
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSale, setLastSale] = useState<PosSaleDetail | null>(null);

  // Caja status strip
  const [cajaSession, setCajaSession] = useState<CashSession | null>(null);
  const [cajaLoading, setCajaLoading] = useState(true);

  const cajaCancelledRef = useRef(false);

  const fetchCaja = useCallback(async () => {
    try {
      const res = await getCurrentCashSession(BRANCH);
      if (!cajaCancelledRef.current) setCajaSession(res.session);
    } catch {
      // strip is non-blocking; selling works without it
    } finally {
      if (!cajaCancelledRef.current) setCajaLoading(false);
    }
  }, []);

  useEffect(() => {
    cajaCancelledRef.current = false;
    fetchCaja();
    return () => {
      cajaCancelledRef.current = true;
    };
  }, [fetchCaja]);

  // Persist cart + customer on every change
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify({ items, customer } satisfies StoredCart));
    } catch {
      // storage unavailable — cart just won't survive a reload
    }
  }, [items, customer]);

  // ---------------------------------------------------------------------------
  // Cart operations
  // ---------------------------------------------------------------------------

  const addProduct = (product: PosProduct) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.product_id === product.id);
      if (existing) {
        return prev.map((it) =>
          it._id === existing._id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      // USD list price: do NOT prefill — the cashier types an MXN price.
      const prefill = product.currency === 'USD' ? 0 : product.price ?? 0;
      const line: CartLine = {
        _id: crypto.randomUUID(),
        product_id: product.id,
        description: product.name,
        unit: product.unit,
        quantity: 1,
        unit_price: prefill,
        iva: product.iva,
        sku: product.sku,
        currency: product.currency,
        stock: product.stock,
      };
      return [...prev, line];
    });
  };

  const addFreeformItem = () => {
    setItems((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        product_id: null,
        description: '',
        unit: null,
        quantity: 1,
        unit_price: 0,
        iva: true,
      },
    ]);
  };

  const updateItem = (id: string, patch: Partial<CartLine>) => {
    setItems((prev) => prev.map((it) => (it._id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it._id !== id));
  };

  // ---------------------------------------------------------------------------
  // Totals — display only; the backend recomputes everything in Decimal.
  // Prices are FINAL (IVA-included): base = line_total/1.16 for IVA lines.
  // ---------------------------------------------------------------------------

  const total = round2(items.reduce((sum, it) => sum + lineTotal(it), 0));
  const ivaAmount = round2(
    items.reduce((sum, it) => {
      if (!it.iva) return sum;
      const lt = lineTotal(it);
      return sum + (lt - lt / 1.16);
    }, 0)
  );
  const subtotal = round2(total - ivaAmount);

  const tendered = amountTendered.trim() === '' ? null : Number(amountTendered);
  const tenderedInvalid = tendered !== null && (Number.isNaN(tendered) || tendered < 0);
  const insufficient =
    payment === 'efectivo' && tendered !== null && !Number.isNaN(tendered) && tendered < total;
  const change =
    payment === 'efectivo' && tendered !== null && !Number.isNaN(tendered) && tendered >= total
      ? round2(tendered - total)
      : null;

  const lineInvalid = (it: CartLine): boolean =>
    it.description.trim() === '' ||
    !(it.quantity > 0) ||
    !(it.unit_price >= 0) ||
    !Number.isFinite(it.quantity) ||
    !Number.isFinite(it.unit_price);

  const canCharge =
    items.length > 0 && !items.some(lineInvalid) && !insufficient && !tenderedInvalid && !saving;

  // ---------------------------------------------------------------------------
  // Cobrar
  // ---------------------------------------------------------------------------

  const handleCobrar = async () => {
    if (!canCharge) return;
    const payload: CreatePosSalePayload = {
      branch: BRANCH,
      payment_method: payment,
      requires_invoice: requiresInvoice,
      items: items.map((it) => ({
        product_id: it.product_id ?? undefined,
        description: it.description.trim(),
        unit: it.unit ?? undefined,
        quantity: it.quantity,
        unit_price: it.unit_price,
        iva: it.iva,
      })),
    };
    if (customer) payload.customer_id = customer.id;
    if (payment === 'efectivo' && tendered !== null && !Number.isNaN(tendered)) {
      payload.amount_tendered = tendered;
    }

    setSaving(true);
    try {
      const sale = await createPosSale(payload);
      setLastSale(sale);
      setItems([]);
      setCustomer(null);
      try {
        localStorage.removeItem(CART_KEY);
      } catch {
        // ignore
      }
      setAmountTendered('');
      setRequiresInvoice(false);
      setPayment('efectivo');
      addNotification({
        type: 'success',
        title: `Venta ${sale.folio} registrada`,
        message: formatCurrency(sale.total),
      });
      fetchCaja();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error al registrar la venta',
        message: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const openedTime = cajaSession
    ? new Date(cajaSession.opened_at).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top strip: title + caja status */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">
          <ShoppingCart size={22} className="text-gray-400" />
          Punto de Venta
        </h1>
        {cajaLoading ? (
          <div className="animate-pulse rounded-md bg-gray-200 h-6 w-64" />
        ) : cajaSession ? (
          <Link
            to="/caja"
            className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 text-green-800 px-3 py-1 text-xs font-medium hover:bg-green-100 transition-colors"
          >
            Caja abierta desde {openedTime} · fondo {formatCurrency(cajaSession.opening_float)}
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 text-xs font-medium">
            <AlertTriangle size={14} className="shrink-0" />
            Sin sesión de caja — la venta en efectivo no se registrará en caja
            <Link to="/caja" className="font-semibold underline hover:text-amber-900">
              Abrir caja
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-4 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Left/main column: search + cart */}
        <div className="flex-1 w-full space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <PosProductSearch onSelect={addProduct} />
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                El carrito está vacío — busca un producto para comenzar
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-2">
                        Descripción
                      </th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase py-2 px-1 w-24">
                        Cant.
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-1 w-32">
                        Precio
                      </th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase py-2 px-1 w-20">
                        IVA
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-1 w-28">
                        Total
                      </th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it._id} className="border-b border-gray-100 group">
                        <td className="py-2 pr-2">
                          {it.product_id === null ? (
                            <input
                              type="text"
                              value={it.description}
                              onChange={(e) => updateItem(it._id, { description: e.target.value })}
                              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Descripción del artículo"
                            />
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-900">{it.description}</p>
                              {it.sku && <p className="text-xs text-gray-400">SKU: {it.sku}</p>}
                              {it.currency === 'USD' && it.unit_price === 0 && (
                                <p className="text-xs text-amber-600">
                                  Precio de lista en USD — captura el precio MXN
                                </p>
                              )}
                            </>
                          )}
                        </td>
                        <td className="py-2 px-1">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              value={it.quantity}
                              onChange={(e) =>
                                updateItem(it._id, { quantity: parseFloat(e.target.value) || 0 })
                              }
                              className="w-20 text-sm border border-gray-200 rounded px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              min="0"
                              step="any"
                            />
                          </div>
                          {it.unit && (
                            <p className="text-xs text-gray-400 text-center mt-0.5">{it.unit}</p>
                          )}
                        </td>
                        <td className="py-2 px-1 text-right">
                          <input
                            type="number"
                            value={it.unit_price}
                            onChange={(e) =>
                              updateItem(it._id, { unit_price: parseFloat(e.target.value) || 0 })
                            }
                            className={`w-28 text-sm border rounded px-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              it.currency === 'USD' && it.unit_price === 0
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-gray-200'
                            }`}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => updateItem(it._id, { iva: !it.iva })}
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                              it.iva
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                            title={it.iva ? 'Precio con IVA incluido' : 'Sin IVA'}
                          >
                            {it.iva ? 'IVA' : 'Sin IVA'}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-right">
                          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                            {formatCurrency(lineTotal(it))}
                          </span>
                        </td>
                        <td className="py-2 pl-1 w-10">
                          <button
                            type="button"
                            onClick={() => removeItem(it._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Quitar artículo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={addFreeformItem}
              className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={14} />
              Artículo libre
            </button>
          </div>
        </div>

        {/* Right column: totals + customer + payment + cobrar */}
        <div className="w-full lg:w-96 shrink-0 space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
            {/* Totals */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA (incluido)</span>
                <span className="text-gray-900">{formatCurrency(ivaAmount)}</span>
              </div>
              <div className="flex justify-between items-baseline border-t border-gray-100 pt-2">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-gray-400">Precios con IVA incluido</p>
            </div>

            {/* Customer */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Cliente (opcional)</p>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </div>

            {/* Payment method */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Forma de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPayment(m.value)}
                    className={`py-3 rounded-lg text-sm font-medium border transition-colors ${
                      payment === m.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Efectivo: recibido + cambio */}
            {payment === 'efectivo' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recibido</label>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-500">Cambio</span>
                  {insufficient ? (
                    <span className="font-semibold text-red-600">
                      Faltan {formatCurrency(round2(total - (tendered ?? 0)))}
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-900">
                      {change !== null ? formatCurrency(change) : '—'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Requiere factura */}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresInvoice}
                onChange={(e) => setRequiresInvoice(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Requiere factura
            </label>

            {/* Cobrar */}
            <button
              type="button"
              onClick={handleCobrar}
              disabled={!canCharge}
              className={`w-full py-4 rounded-xl text-lg font-bold text-white transition-colors disabled:cursor-not-allowed ${
                insufficient
                  ? 'bg-red-500 disabled:opacity-80'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
              }`}
            >
              {saving ? 'Registrando…' : `Cobrar ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Ticket modal after a successful sale */}
      {lastSale && <TicketView sale={lastSale} onClose={() => setLastSale(null)} />}
    </div>
  );
}
