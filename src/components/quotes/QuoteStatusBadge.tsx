import type { QuoteStatus } from '@/types/quotes';

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Enviada', className: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Vista', className: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Aceptada', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Expirada', className: 'bg-gray-100 text-gray-500' },
};

export default function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
