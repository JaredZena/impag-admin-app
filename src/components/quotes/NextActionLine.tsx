import type { Quote } from '@/types/quotes';
import { DUE_TONE_CLASS, dueLabel, normalizeOwner } from './nextAction';

interface NextActionLineProps {
  quote: Pick<Quote, 'next_action' | 'next_action_owner' | 'next_action_due'>;
  today?: Date;
  size?: 'sm' | 'xs';
  // Recorta el texto (no la línea) para que quién y cuándo siempre se vean.
  maxChars?: number;
  className?: string;
}

// "→ Mandar seguimiento · Hernán · atrasado 2 días", en una línea compacta.
// No pinta nada si la cotización no tiene siguiente paso.
export default function NextActionLine({ quote, today, size = 'sm', maxChars, className = '' }: NextActionLineProps) {
  const text = quote.next_action?.trim();
  if (!text) return null;
  const shown = maxChars && text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
  const owner = normalizeOwner(quote.next_action_owner);
  const due = dueLabel(quote.next_action_due, today);
  return (
    <p className={`${size === 'xs' ? 'text-xs' : 'text-sm'} leading-snug text-gray-800 ${className}`} title={due ? `${text} · ${due.date}` : text}>
      <span className="sr-only">Siguiente paso: </span>
      <span aria-hidden="true" className="text-gray-400">
        →{' '}
      </span>
      <span className="font-medium">{shown}</span>
      {owner && (
        <>
          <span className="text-gray-400"> · </span>
          <span className="text-gray-500 whitespace-nowrap">{owner}</span>
        </>
      )}
      {due && (
        <>
          <span className="text-gray-400"> · </span>
          <span className={`whitespace-nowrap ${DUE_TONE_CLASS[due.tone]}`}>{due.text}</span>
        </>
      )}
    </p>
  );
}
