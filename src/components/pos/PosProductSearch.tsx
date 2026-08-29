import { useState, useCallback, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { searchPosProducts } from '@/utils/posApi';
import type { PosProduct } from '@/utils/posApi';
import { formatCurrency } from '@/utils/currencyUtils';

interface PosProductSearchProps {
  onSelect: (product: PosProduct) => void;
}

// Modeled on components/quotes/ProductSearchInput.tsx, against GET /pos/products.
// Adds keyboard navigation (↑/↓ + Enter selects the highlighted — or first — result).
export default function PosProductSearch({ onSelect }: PosProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PosProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Epoch guard: this fires per keystroke, so a slow old response must never
  // overwrite the results of a newer query.
  const epochRef = useRef(0);

  const doSearch = useCallback(async (q: string) => {
    const epoch = ++epochRef.current;
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchPosProducts(q.trim());
      if (epoch !== epochRef.current) return;
      setResults(data);
      setHighlight(0);
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

  const handleSelect = (product: PosProduct) => {
    onSelect(product);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setIsOpen(true);
        setHighlight((h) => Math.min(h + 1, results.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && results.length > 0) {
        handleSelect(results[highlight] ?? results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
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

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Buscar producto por nombre o SKU..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.map((product, i) => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelect(product)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 ${
                i === highlight ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {product.sku && <span>SKU: {product.sku}</span>}
                    {product.unit && <span className="ml-2 text-gray-400">{product.unit}</span>}
                  </p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {product.price !== null ? formatCurrency(product.price, product.currency) : 'Sin precio'}
                  </p>
                  {product.currency === 'USD' && (
                    <p className="text-xs text-amber-600">USD — captura precio MXN</p>
                  )}
                  <span
                    className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stock > 0
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    Stock: {product.stock}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          No se encontraron productos
        </div>
      )}
    </div>
  );
}
