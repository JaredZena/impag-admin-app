import { Trash2 } from 'lucide-react';
import type { QuoteItem } from '@/types/quotes';

interface QuoteItemRowProps {
  item: QuoteItem;
  onUpdate: (field: string, value: string | number | boolean) => void;
  onDelete: () => void;
  editable?: boolean;
}

export default function QuoteItemRow({ item, onUpdate, onDelete, editable = true }: QuoteItemRowProps) {
  const lineTotal = item.quantity * item.unit_price;

  if (!editable) {
    return (
      <tr className="border-b border-gray-50">
        <td className="py-3 pr-4">
          <p className="text-sm font-medium text-gray-900">{item.description}</p>
          {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
          {item.notes && <p className="text-xs text-gray-500 mt-1">{item.notes}</p>}
        </td>
        <td className="py-3 px-2 text-center text-sm">{item.quantity} {item.unit || ''}</td>
        <td className="py-3 px-2 text-right text-sm">${item.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
        <td className="py-3 pl-2 text-right text-sm font-medium">${lineTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 group">
      <td className="py-2 pr-2">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onUpdate('description', e.target.value)}
          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Descripción del producto"
        />
        <input
          type="text"
          value={item.notes || ''}
          onChange={(e) => onUpdate('notes', e.target.value)}
          className="w-full text-xs border border-gray-100 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-500"
          placeholder="Notas (opcional)"
        />
      </td>
      <td className="py-2 px-1">
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdate('quantity', parseFloat(e.target.value) || 0)}
          className="w-20 text-sm border border-gray-200 rounded px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
          min="0"
          step="1"
        />
      </td>
      <td className="py-2 px-1">
        <input
          type="number"
          value={item.unit_price}
          onChange={(e) => onUpdate('unit_price', parseFloat(e.target.value) || 0)}
          className="w-28 text-sm border border-gray-200 rounded px-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
          min="0"
          step="0.01"
        />
      </td>
      <td className="py-2 px-1 text-right">
        <span className="text-sm font-medium text-gray-900">
          ${lineTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td className="py-2 pl-1 w-10">
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
