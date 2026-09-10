import { CircleCheck, Clock, TriangleAlert, type LucideIcon } from 'lucide-react';
import { getPaymentChip, type PaymentChipTone } from '@/utils/webOrder';

const toneStyles: Record<PaymentChipTone, { className: string; Icon: LucideIcon; title: string }> = {
  paid: {
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Icon: CircleCheck,
    title: 'Mercado Pago confirmó el pago',
  },
  pending: {
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    Icon: Clock,
    title: 'El cliente generó el pago pero Mercado Pago aún no lo acredita (OXXO, SPEI o revisión)',
  },
  problem: {
    className: 'bg-red-50 text-red-700 ring-red-200',
    Icon: TriangleAlert,
    title: 'Monto distinto, reembolso o contracargo: revisar en Mercado Pago antes de entregar',
  },
};

// No pinta nada si la cotización no trae payment_status (o trae uno sin chip).
export default function PaymentStatusChip({ status, className = '' }: { status?: string | null; className?: string }) {
  const chip = getPaymentChip(status);
  if (!chip) return null;
  const { className: toneClass, Icon, title } = toneStyles[chip.tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${toneClass} ${className}`}
    >
      <Icon size={12} aria-hidden="true" />
      {chip.label}
    </span>
  );
}
