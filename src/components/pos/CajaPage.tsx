import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Ban,
  Lock,
  Printer,
  Wallet,
} from 'lucide-react';
import {
  addCashMovement,
  cancelPosSale,
  closeCashSession,
  getCurrentCashSession,
  getPosSale,
  getVendedorStats,
  listCashSessions,
  listPosSales,
  openCashSession,
} from '@/utils/posApi';
import type {
  CashMovement,
  CashSession,
  CashSessionListItem,
  CashSessionTotals,
  PosSaleDetail,
  PosSaleListItem,
  VendedorStatsItem,
} from '@/utils/posApi';
import { formatCurrency } from '@/utils/currencyUtils';
import { useNotifications } from '@/components/ui/notification';
import Modal from './Modal';
import TicketView from './TicketView';

// Route /caja renders inside the normal MainLayout padding (ProtectedRoute
// already wraps every route in MainLayout — do NOT import it here).

const BRANCH = 'DGO';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  deposito: 'Depósito',
  terminal: 'Terminal',
};

const MOVEMENT_LABELS: Record<string, string> = {
  venta: 'Venta',
  entrada: 'Entrada',
  salida: 'Salida',
  cancelacion: 'Cancelación',
};

// venta/entrada add to the drawer; salida/cancelacion subtract.
const isCashIn = (kind: CashMovement['kind']): boolean =>
  kind === 'venta' || kind === 'entrada';

// Local (not UTC) ISO date — Durango is UTC-6, so toISOString would roll
// evening sales into the next day.
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function differenceClass(diff: number): string {
  if (diff < 0) return 'text-red-600';
  if (diff > 0) return 'text-amber-600';
  return 'text-green-600';
}

export default function CajaPage() {
  const { addNotification } = useNotifications();

  // Data
  const [session, setSession] = useState<CashSession | null>(null);
  const [totals, setTotals] = useState<CashSessionTotals | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [currentLoading, setCurrentLoading] = useState(true);
  const [todaySales, setTodaySales] = useState<PosSaleListItem[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [pastSessions, setPastSessions] = useState<CashSessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [vendedorStats, setVendedorStats] = useState<VendedorStatsItem[]>([]);
  const [vendedorStatsLoading, setVendedorStatsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Abrir caja form
  const [openingFloat, setOpeningFloat] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [opening, setOpening] = useState(false);

  // Entrada/Salida modal
  const [movementKind, setMovementKind] = useState<'entrada' | 'salida' | null>(null);
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDescription, setMovementDescription] = useState('');
  const [savingMovement, setSavingMovement] = useState(false);

  // Cerrar caja modal
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  // Ventas del día: reprint + cancel
  const [ticketSale, setTicketSale] = useState<PosSaleDetail | null>(null);
  const [reprintingId, setReprintingId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PosSaleListItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getCurrentCashSession(BRANCH);
        if (cancelled) return;
        setSession(res.session);
        setTotals(res.totals ?? null);
        setMovements(res.movements ?? []);
      } catch {
        if (!cancelled) {
          setSession(null);
          setTotals(null);
          setMovements([]);
        }
      } finally {
        if (!cancelled) setCurrentLoading(false);
      }
    })();

    (async () => {
      try {
        const today = todayIso();
        const res = await listPosSales({ limit: 100, date_from: today, date_to: today });
        if (!cancelled) setTodaySales(res.items);
      } catch {
        if (!cancelled) setTodaySales([]);
      } finally {
        if (!cancelled) setSalesLoading(false);
      }
    })();

    (async () => {
      try {
        const res = await listCashSessions({ limit: 30 });
        if (!cancelled) setPastSessions(res.items);
      } catch {
        if (!cancelled) setPastSessions([]);
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();

    (async () => {
      try {
        const today = todayIso();
        const res = await getVendedorStats(today, today);
        if (!cancelled) setVendedorStats(res.items);
      } catch {
        if (!cancelled) setVendedorStats([]);
      } finally {
        if (!cancelled) setVendedorStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // ---------------------------------------------------------------------------
  // Abrir caja
  // ---------------------------------------------------------------------------

  const openingFloatNum = openingFloat.trim() === '' ? null : Number(openingFloat);
  const canOpen =
    openingFloatNum !== null &&
    !Number.isNaN(openingFloatNum) &&
    openingFloatNum >= 0 &&
    !opening;

  const handleOpen = async () => {
    if (!canOpen || openingFloatNum === null) return;
    setOpening(true);
    try {
      await openCashSession({
        branch: BRANCH,
        opening_float: openingFloatNum,
        notes: openingNotes.trim() || undefined,
      });
      setOpeningFloat('');
      setOpeningNotes('');
      addNotification({
        type: 'success',
        title: 'Caja abierta',
        message: `Fondo inicial ${formatCurrency(openingFloatNum)}`,
      });
      refresh();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error al abrir la caja',
        message: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setOpening(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Entrada / Salida
  // ---------------------------------------------------------------------------

  const openMovementModal = (kind: 'entrada' | 'salida') => {
    setMovementAmount('');
    setMovementDescription('');
    setMovementKind(kind);
  };

  const movementAmountNum = movementAmount.trim() === '' ? null : Number(movementAmount);
  const canSaveMovement =
    movementAmountNum !== null &&
    !Number.isNaN(movementAmountNum) &&
    movementAmountNum > 0 &&
    movementDescription.trim() !== '' &&
    !savingMovement;

  const handleSaveMovement = async () => {
    if (!session || !movementKind || !canSaveMovement || movementAmountNum === null) return;
    setSavingMovement(true);
    try {
      await addCashMovement(session.id, {
        kind: movementKind,
        amount: movementAmountNum,
        description: movementDescription.trim(),
      });
      addNotification({
        type: 'success',
        title: movementKind === 'entrada' ? 'Entrada registrada' : 'Salida registrada',
        message: formatCurrency(movementAmountNum),
      });
      setMovementKind(null);
      refresh();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error al registrar el movimiento',
        message: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setSavingMovement(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Cerrar caja
  // ---------------------------------------------------------------------------

  const expectedCash = totals?.expected_cash ?? 0;
  const countedNum = countedCash.trim() === '' ? null : Number(countedCash);
  const liveDifference =
    countedNum !== null && !Number.isNaN(countedNum) ? countedNum - expectedCash : null;
  const canClose =
    countedNum !== null && !Number.isNaN(countedNum) && countedNum >= 0 && !closing;

  const handleClose = async () => {
    if (!session || !canClose || countedNum === null) return;
    setClosing(true);
    try {
      const closed = await closeCashSession(session.id, {
        counted_cash: countedNum,
        notes: closeNotes.trim() || undefined,
      });
      addNotification({
        type: 'success',
        title: 'Caja cerrada',
        message: `Diferencia: ${formatCurrency(closed.session.difference ?? 0)}`,
      });
      setCloseModalOpen(false);
      setCountedCash('');
      setCloseNotes('');
      refresh();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error al cerrar la caja',
        message: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setClosing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Reimprimir / Cancelar venta
  // ---------------------------------------------------------------------------

  const handleReprint = async (sale: PosSaleListItem) => {
    setReprintingId(sale.id);
    try {
      const detail = await getPosSale(sale.id);
      setTicketSale(detail);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error al cargar la venta',
        message: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setReprintingId(null);
    }
  };

  const canCancel = cancelReason.trim().length >= 3 && !cancelling;

  const handleCancelSale = async () => {
    if (!cancelTarget || !canCancel) return;
    setCancelling(true);
    try {
      const cancelled = await cancelPosSale(cancelTarget.id, cancelReason.trim());
      addNotification({
        type: 'success',
        title: `Venta ${cancelled.folio} cancelada`,
        // El backend reabre la cotización vinculada (accepted → sent) sólo si
        // ninguna otra venta activa la referencia — el mensaje lo refleja.
        message: cancelled.quote_number
          ? `Se revirtió el inventario. La cotización ${cancelled.quote_number} se reabre si ninguna otra venta la cierra.`
          : 'Se revirtió el inventario y se eliminó del registro de ventas.',
      });
      setCancelTarget(null);
      setCancelReason('');
      refresh();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error al cancelar la venta',
        message: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setCancelling(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Wallet size={24} className="text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
        <span className="text-sm text-gray-400">Sucursal {BRANCH}</span>
      </div>

      {/* Current session card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        {currentLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-24 bg-gray-100 rounded" />
          </div>
        ) : session ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 text-green-800 px-3 py-1 text-xs font-medium">
                  Caja abierta desde {formatDateTime(session.opened_at)}
                </span>
                {session.opened_by && (
                  <p className="text-xs text-gray-400 mt-1">Abrió: {session.opened_by}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openMovementModal('entrada')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <ArrowDownCircle size={16} />
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => openMovementModal('salida')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <ArrowUpCircle size={16} />
                  Salida
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCountedCash('');
                    setCloseNotes('');
                    setCloseModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Lock size={16} />
                  Cerrar caja
                </button>
              </div>
            </div>

            {/* Running totals */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Fondo inicial', value: session.opening_float },
                { label: 'Ventas efectivo', value: totals?.ventas_efectivo ?? 0 },
                { label: 'Entradas', value: totals?.entradas ?? 0 },
                { label: 'Salidas', value: totals?.salidas ?? 0 },
                { label: 'Cancelaciones', value: totals?.cancelaciones ?? 0 },
              ].map((t) => (
                <div key={t.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{t.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(t.value)}</p>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700">Efectivo esperado</p>
                <p className="text-sm font-bold text-blue-900">{formatCurrency(expectedCash)}</p>
              </div>
            </div>

            {/* Movements */}
            {movements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin movimientos todavía</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-2 w-20">
                        Hora
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2 w-28">
                        Tipo
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">
                        Descripción
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 pl-2 w-32">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="py-2 pr-2 text-sm text-gray-500">
                          {formatTime(m.created_at)}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              isCashIn(m.kind)
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {MOVEMENT_LABELS[m.kind] ?? m.kind}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-700">{m.description ?? '—'}</td>
                        <td
                          className={`py-2 pl-2 text-sm font-medium text-right whitespace-nowrap ${
                            isCashIn(m.kind) ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {isCashIn(m.kind) ? '+' : '−'}
                          {formatCurrency(m.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Closed state: Abrir caja form */
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-gray-900 mb-1">Caja cerrada</p>
            <p className="text-sm text-gray-500 mb-4">
              Abre la caja con el fondo inicial para registrar las ventas en efectivo del día.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fondo inicial *
                </label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                <input
                  type="text"
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
              <button
                type="button"
                onClick={handleOpen}
                disabled={!canOpen}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {opening ? 'Abriendo…' : 'Abrir caja'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ventas del día */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Ventas del día</h2>
        {salesLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-100 rounded" />
            <div className="h-8 bg-gray-100 rounded" />
            <div className="h-8 bg-gray-100 rounded" />
          </div>
        ) : todaySales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin ventas registradas hoy</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-2">
                    Folio
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2 w-20">
                    Hora
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">
                    Cliente
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2">
                    Vendedor
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-2 w-32">
                    Pago
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-2 w-28">
                    Total
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-2 w-28">
                    Margen
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase py-2 px-2 w-28">
                    Estado
                  </th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {todaySales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {sale.folio}
                      {/* truthiness a propósito: el backend viejo no manda estos campos */}
                      {sale.quote_id && sale.quote_number ? (
                        <Link
                          to={`/quotes/${sale.quote_id}`}
                          className="block text-xs font-normal text-blue-600 hover:underline"
                          title="Ver cotización vinculada"
                        >
                          Cot. {sale.quote_number}
                        </Link>
                      ) : null}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-500">
                      {formatTime(sale.created_at)}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-700">
                      {sale.customer_name ?? '—'}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-700">{sale.vendedor ?? '—'}</td>
                    <td className="py-2 px-2 text-sm text-gray-700">
                      {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
                    </td>
                    <td className="py-2 px-2 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-700 text-right whitespace-nowrap">
                      {sale.cost_complete && sale.margin_amount !== null
                        ? formatCurrency(sale.margin_amount)
                        : '—'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.status === 'cancelada'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {sale.status === 'cancelada' ? 'Cancelada' : 'Completada'}
                      </span>
                    </td>
                    <td className="py-2 pl-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleReprint(sale)}
                          disabled={reprintingId === sale.id}
                          className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                          title="Reimprimir ticket"
                        >
                          <Printer size={16} />
                        </button>
                        {sale.status === 'completada' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelReason('');
                              setCancelTarget(sale);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Cancelar venta"
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comisiones del día (base para comisiones: ventas completadas por vendedor) */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Comisiones del día</h2>
        {vendedorStatsLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-100 rounded" />
            <div className="h-8 bg-gray-100 rounded" />
          </div>
        ) : vendedorStats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin ventas completadas hoy</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-2">
                    Vendedor
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-2 w-24">
                    Ventas
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-2 w-32">
                    Total
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 pl-2 w-40">
                    Margen
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendedorStats.map((v) => (
                  <tr key={v.vendedor ?? '__sin_vendedor__'} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-sm text-gray-700">
                      {v.vendedor ?? 'Sin vendedor'}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-700 text-right">{v.sales_count}</td>
                    <td className="py-2 px-2 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(v.total)}
                    </td>
                    <td className="py-2 pl-2 text-sm text-gray-700 text-right whitespace-nowrap">
                      {v.margin_known_count > 0 ? formatCurrency(v.margin_total) : '—'}
                      {v.margin_known_count > 0 && v.margin_known_count < v.sales_count && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({v.margin_known_count} de {v.sales_count} con costo)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past sessions */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Historial de sesiones</h2>
        {sessionsLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-100 rounded" />
            <div className="h-8 bg-gray-100 rounded" />
          </div>
        ) : pastSessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin sesiones registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-2">
                    Fecha
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-2 w-28">
                    Fondo
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-2 w-28">
                    Esperado
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-2 w-28">
                    Contado
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-2 px-2 w-28">
                    Diferencia
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase py-2 pl-2 w-24">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {pastSessions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-sm text-gray-700 whitespace-nowrap">
                      {formatDateTime(s.opened_at)}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-700 text-right whitespace-nowrap">
                      {formatCurrency(s.opening_float)}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-700 text-right whitespace-nowrap">
                      {s.status === 'cerrada'
                        ? formatCurrency(s.expected_cash ?? s.totals?.expected_cash ?? 0)
                        : formatCurrency(s.totals?.expected_cash ?? 0)}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-700 text-right whitespace-nowrap">
                      {s.counted_cash !== null ? formatCurrency(s.counted_cash) : '—'}
                    </td>
                    <td
                      className={`py-2 px-2 text-sm font-medium text-right whitespace-nowrap ${
                        s.difference !== null ? differenceClass(s.difference) : 'text-gray-400'
                      }`}
                    >
                      {s.difference !== null ? formatCurrency(s.difference) : '—'}
                    </td>
                    <td className="py-2 pl-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === 'abierta'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.status === 'abierta' ? 'Abierta' : 'Cerrada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entrada / Salida modal */}
      {movementKind && session && (
        <Modal
          title={movementKind === 'entrada' ? 'Entrada de efectivo' : 'Salida de efectivo'}
          onClose={() => setMovementKind(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto *</label>
              <input
                type="number"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
              <input
                type="text"
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  movementKind === 'entrada' ? 'p. ej. cambio adicional' : 'p. ej. pago a proveedor'
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovementKind(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMovement}
                disabled={!canSaveMovement}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingMovement ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cerrar caja modal */}
      {closeModalOpen && session && (
        <Modal title="Cerrar caja" onClose={() => setCloseModalOpen(false)}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-500">Efectivo esperado</span>
              <span className="font-semibold text-gray-900">{formatCurrency(expectedCash)}</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Efectivo contado *
              </label>
              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                placeholder="0.00"
                autoFocus
              />
            </div>
            {liveDifference !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Diferencia</span>
                <span className={`font-semibold ${differenceClass(liveDifference)}`}>
                  {liveDifference === 0
                    ? 'Cuadra exacto'
                    : `${liveDifference > 0 ? 'Sobrante ' : 'Faltante '}${formatCurrency(
                        Math.abs(liveDifference)
                      )}`}
                </span>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Opcional"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCloseModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={!canClose}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {closing ? 'Cerrando…' : 'Cerrar caja'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancelar venta modal */}
      {cancelTarget && (
        <Modal title={`Cancelar venta ${cancelTarget.folio}`} onClose={() => setCancelTarget(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Se revertirá el inventario y la venta de {formatCurrency(cancelTarget.total)} se
              eliminará del registro de ventas. Esta acción no se puede deshacer.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                maxLength={300}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="p. ej. cobro duplicado"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleCancelSale}
                disabled={!canCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelling ? 'Cancelando…' : 'Cancelar venta'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reprint ticket */}
      {ticketSale && (
        <TicketView sale={ticketSale} onClose={() => setTicketSale(null)} closeLabel="Cerrar" />
      )}
    </div>
  );
}
