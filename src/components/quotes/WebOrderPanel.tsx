import type { ReactNode } from 'react';
import { CreditCard, FileText, Truck } from 'lucide-react';
import type { Quote } from '@/types/quotes';
import {
  deliveryMethodLabel,
  formatAddress,
  invoiceTypeLabel,
  isWebOrder,
  paymentMethodLabel,
  type WebOrderDetails,
} from '@/utils/webOrder';

const formatMoney = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

function Field({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium text-gray-900 break-words">{value}</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

const GRID_COLS: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' };

/**
 * Datos del pedido de la tienda en línea (solo lectura). No pinta nada si la
 * cotización no es un pedido web o si no hay datos que mostrar.
 */
export default function WebOrderPanel({ quote, details }: { quote: Quote; details: WebOrderDetails | null }) {
  if (!isWebOrder(quote)) return null;

  const method = paymentMethodLabel(quote.payment_method);
  const reference = typeof quote.payment_reference === 'string' ? quote.payment_reference.trim() : '';
  const delivery = details?.delivery ?? null;
  const invoiceRequested = details?.invoiceRequested ?? null;
  const invoice = details?.invoice ?? null;

  const showPayment = Boolean(method || reference);
  const showDelivery = delivery !== null;
  const showInvoice = invoiceRequested !== null;
  const sectionCount = [showPayment, showDelivery, showInvoice].filter(Boolean).length;
  if (sectionCount === 0) return null;

  const costLabel =
    delivery?.cost_total === null || delivery?.cost_total === undefined
      ? null
      : delivery.cost_total === 0
        ? 'Sin costo'
        : formatMoney(delivery.cost_total);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6" data-testid="web-order-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Pedido web</h2>
        <span className="text-xs text-gray-400">Tienda en línea · solo lectura</span>
      </div>
      <div className={`grid grid-cols-1 gap-6 text-sm ${GRID_COLS[sectionCount]}`}>
        {showPayment && (
          <Section icon={<CreditCard size={14} aria-hidden="true" />} title="Pago">
            <Field label="Método" value={method} />
            <Field label="Referencia Mercado Pago" value={reference ? `#${reference}` : null} />
          </Section>
        )}

        {delivery && (
          <Section icon={<Truck size={14} aria-hidden="true" />} title="Entrega">
            <Field label="Método" value={deliveryMethodLabel(delivery.method)} />
            <Field label="Dirección" value={delivery.address ? formatAddress(delivery.address) : null} />
            <Field label="Referencias" value={delivery.address?.references ?? null} />
            <Field label="Costo de envío" value={costLabel} />
          </Section>
        )}

        {showInvoice && (
          <Section icon={<FileText size={14} aria-hidden="true" />} title="Factura">
            {invoiceRequested && invoice ? (
              <>
                <Field label="Tipo" value={invoiceTypeLabel(invoice.type)} />
                <Field label="RFC" value={invoice.rfc} />
                <Field label="Razón social" value={invoice.razon_social} />
                <Field label="Régimen fiscal" value={invoice.regimen_fiscal} />
                <Field label="Uso CFDI" value={invoice.uso_cfdi} />
                <Field label="CP fiscal" value={invoice.cp_fiscal} />
                <Field label="Correo para CFDI" value={invoice.email} />
              </>
            ) : (
              <p className="text-gray-600">No solicitada</p>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
