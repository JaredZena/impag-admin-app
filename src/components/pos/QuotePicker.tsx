import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { searchPosQuotes } from '@/utils/posApi';
import { listQuotes } from '@/utils/quotesApi';
import type { QuoteStatus } from '@/types/quotes';
import { formatCurrency } from '@/utils/currencyUtils';

// Compact snapshot of the linked quote persisted in the POS cart — the full
// Quote (with items) is heavy and goes stale in localStorage.
export interface PosQuoteRef {
  id: number;
  quote_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: QuoteStatus;
}

type PickerRow = PosQuoteRef & { created_at: string | null };

// Only OPEN quotes are offered in the picker — completing the sale marks them
// accepted (that is what drains the "Cotizaciones abiertas" widget). The
// backend also accepts attaching an already-accepted quote (idempotent close),
// but the register keeps the choice list focused on the open pipeline.
const OPEN_STATUSES = ['sent', 'viewed'] as const;

const isOpenStatus = (s: unknown): s is 'sent' | 'viewed' =>
  s === 'sent' || s === 'viewed';

const STATUS_LABELS: Record<'sent' | 'viewed', string> = {
  sent: 'Enviada',
  viewed: 'Vista',
};

interface QuotePickerProps {
  value: PosQuoteRef | null;
  onChange: (quote: PosQuoteRef | null) => void;
}

// Fetch open quotes matching the term. Primary: GET /pos/quotes (light rows,
// ILIKE over folio/cliente/teléfono). Fallback while an older backend without
// that endpoint is still deployed: GET /quotes, whose `status` filter matches
// exactly one value — so both open statuses are queried in parallel and merged.
async function fetchOpenQuotes(term: string): Promise<PickerRow[]> {
  try {
    const rows = await searchPosQuotes(term, 10);
    return rows
      .filter((r) => isOpenStatus(r.status))
      .map((r) => ({
        id: r.id,
        quote_number: r.quote_number,
        customer_name: r.customer_name ?? '',
        customer_phone: r.customer_phone ?? '',
        total: r.total,
        status: r.status as QuoteStatus,
        created_at: r.created_at,
      }));
  } catch {
    const settled = await Promise.allSettled(
      OPEN_STATUSES.map((status) => listQuotes({ status, search: term, limit: 10 }))
    );
    const merged = new Map<number, PickerRow>();
    for (const res of settled) {
      if (res.status !== 'fulfilled') continue;
      for (const q of res.value.data) {
        if (!isOpenStatus(q.status)) continue;
        merged.set(q.id, {
          id: q.id,
          quote_number: q.quote_number,
          customer_name: q.customer_name ?? '',
          customer_phone: q.customer_phone ?? '',
          total: q.total,
          status: q.status,
          created_at: q.created_at ?? null,
        });
      }
    }
    return [...merged.values()];
  }
}

// Optional quote attach for the POS: debounced type-ahead over OPEN quotes
// (sent/viewed) by folio de cotización o nombre/teléfono del cliente, selected
// chip with ✕. Deliberately unobtrusive — most tickets have no quote.
export default function QuotePicker({ value, onChange }: QuotePickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(0);

  const doSearch = useCallback(async (q: string) => {
    const epoch = ++epochRef.current;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchOpenQuotes(term);
      if (epoch !== epochRef.current) return;
      rows.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
      setResults(rows.slice(0, 8));
      setIsOpen(true);
    } catch {
      if (epoch === epochRef.current) setResults([]);
    } finally {
      if (epoch === epochRef.current) setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (row: PickerRow) => {
    // strip created_at — only the ref is persisted in the cart
    onChange({
      id: row.id,
      quote_number: row.quote_number,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      total: row.total,
      status: row.status,
    });
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Clear any pending debounce on unmount
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            <FileText size={13} className="inline -mt-0.5 mr-1 text-emerald-600" />
            {value.quote_number}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {value.customer_name || 'Sin cliente'} · {formatCurrency(value.total)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
          aria-label="Quitar cotización"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Buscar cotización abierta..."
          className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {results.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleSelect(q)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{q.quote_number}</p>
                <span className="text-xs text-gray-400 shrink-0">
                  {isOpenStatus(q.status) ? STATUS_LABELS[q.status] : q.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {q.customer_name || '—'}
                <span className="ml-2 font-medium text-gray-600">{formatCurrency(q.total)}</span>
              </p>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-sm text-gray-500">
          Sin cotizaciones abiertas que coincidan
        </div>
      )}
    </div>
  );
}
