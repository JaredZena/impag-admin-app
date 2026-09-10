import React from 'react';
import { TOOL_STATUS_LABELS, type ToolStatus } from '@/utils/toolsApi';

const STATUS_CLASSES: Record<ToolStatus, string> = {
  en_local: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  pendiente_entrega: 'bg-amber-50 text-amber-800 ring-amber-200',
  en_obra: 'bg-sky-50 text-sky-800 ring-sky-200',
  con_cliente: 'bg-violet-50 text-violet-800 ring-violet-200',
  baja: 'bg-gray-100 text-gray-600 ring-gray-200',
};

export const StatusPill: React.FC<{ status: ToolStatus; className?: string }> = ({
  status,
  className = '',
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${
      STATUS_CLASSES[status] ?? STATUS_CLASSES.baja
    } ${className}`}
  >
    {TOOL_STATUS_LABELS[status] ?? status}
  </span>
);
