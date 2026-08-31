import { Printer } from 'lucide-react';
import type { PosSaleDetail } from '@/utils/posApi';
import { formatCurrency } from '@/utils/currencyUtils';
import { numberToWords } from '@/utils/numberToWords';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  deposito: 'Depósito',
  terminal: 'Terminal',
};

// Printed on every ticket footer. Exported so the copy is easy to edit in one place.
export const WARRANTY_NOTE =
  'Garantía sujeta a las políticas del fabricante de cada producto. Conserve esta remisión — es indispensable para cualquier aclaración o garantía.';

interface TicketViewProps {
  sale: PosSaleDetail;
  onClose: () => void;
  /** Label for the close button — 'Nueva venta' on the register, 'Cerrar' on reprints. */
  closeLabel?: string;
  /**
   * Cotización que esta venta cerró (POS register only). Rendered OUTSIDE
   * #pos-ticket — confirmación en pantalla, nunca en el ticket impreso.
   */
  acceptedQuoteNumber?: string | null;
}

// 80mm-style remisión. The printable markup carries id="pos-ticket": the global
// @media print CSS in src/index.css (added by the shared-files task) hides
// everything except this node when window.print() runs.
export default function TicketView({
  sale,
  onClose,
  closeLabel = 'Nueva venta',
  acceptedQuoteNumber = null,
}: TicketViewProps) {
  const createdAt = new Date(sale.created_at);
  const dateTime = Number.isNaN(createdAt.getTime())
    ? sale.created_at
    : createdAt.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl my-4">
        <div
          id="pos-ticket"
          className="bg-white text-black font-mono text-[12px] leading-snug p-4"
          style={{ width: '80mm' }}
        >
          {/* Header */}
          <div className="text-center">
            <p className="text-sm font-bold">IMPAG</p>
            <p>Todo Para El Campo</p>
            <p>Sucursal {sale.branch}</p>
          </div>

          <hr className="my-2 border-black border-dashed" />

          {sale.status === 'cancelada' && (
            <p className="text-center font-bold text-sm my-1">** CANCELADA **</p>
          )}

          <p className="text-center text-xl font-bold tracking-wider">{sale.folio}</p>
          <p className="text-center">{dateTime}</p>
          {/* vendedor defaults to created_by server-side; pre-v2 sales only have created_by */}
          {(sale.vendedor || sale.created_by) && (
            <p className="text-center">Atendió: {sale.vendedor || sale.created_by}</p>
          )}

          {(sale.customer_name || sale.customer_phone) && (
            <>
              <hr className="my-2 border-black border-dashed" />
              {sale.customer_name && <p>Cliente: {sale.customer_name}</p>}
              {sale.customer_phone && <p>Tel: {sale.customer_phone}</p>}
            </>
          )}

          <hr className="my-2 border-black border-dashed" />

          {/* Lines */}
          {sale.items.map((item) => (
            <div key={item.id} className="mb-1">
              <p className="break-words">{item.description}</p>
              <div className="flex justify-between">
                <span>
                  {item.quantity.toLocaleString('es-MX')}
                  {item.unit ? ` ${item.unit}` : ''} x {formatCurrency(item.unit_price)}
                  {!item.iva && ' (sin IVA)'}
                </span>
                <span className="font-bold">{formatCurrency(item.line_total)}</span>
              </div>
            </div>
          ))}

          <hr className="my-2 border-black border-dashed" />

          {/* Totals — precios con IVA incluido */}
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (incluido):</span>
            <span>{formatCurrency(sale.iva_amount)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <p className="mt-1 break-words text-[10px]">{numberToWords(sale.total)}</p>

          <hr className="my-2 border-black border-dashed" />

          <div className="flex justify-between">
            <span>Forma de pago:</span>
            <span>{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</span>
          </div>
          {sale.payment_method === 'efectivo' && sale.amount_tendered !== null && (
            <>
              <div className="flex justify-between">
                <span>Recibido:</span>
                <span>{formatCurrency(sale.amount_tendered)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cambio:</span>
                <span>{formatCurrency(sale.change_given ?? 0)}</span>
              </div>
            </>
          )}
          {sale.requires_invoice && <p className="mt-1">Requiere factura</p>}

          {/* Datos de factura (captured at the register; CFDI is stamped later).
              NEVER print margin/cost fields on this ticket. */}
          {(sale.rfc || sale.razon_social || sale.uso_cfdi || sale.cfdi_email) && (
            <>
              <hr className="my-2 border-black border-dashed" />
              <p className="font-bold">DATOS DE FACTURA</p>
              {sale.rfc && <p className="break-words">RFC: {sale.rfc}</p>}
              {sale.razon_social && <p className="break-words">Razón social: {sale.razon_social}</p>}
              {sale.uso_cfdi && <p>Uso CFDI: {sale.uso_cfdi}</p>}
              {sale.cfdi_email && <p className="break-words">Correo: {sale.cfdi_email}</p>}
            </>
          )}

          <hr className="my-2 border-black border-dashed" />

          <p className="text-center text-[10px] mt-2">
            REMISIÓN — Este documento no es un comprobante fiscal (CFDI)
          </p>
          <p className="text-center text-[10px] mt-1">{WARRANTY_NOTE}</p>
          <p className="text-center text-[10px]">¡Gracias por su compra!</p>
        </div>

        {/* Confirmación de cotización — outside #pos-ticket so it never prints */}
        {acceptedQuoteNumber && (
          <p className="px-4 pb-2 text-center text-xs font-medium text-green-700">
            Cotización {acceptedQuoteNumber} marcada como aceptada
          </p>
        )}

        {/* Actions — outside #pos-ticket so they never print */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Printer size={16} />
            Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
