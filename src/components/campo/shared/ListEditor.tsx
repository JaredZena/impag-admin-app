import { useState } from 'react';
import { Plus, X } from 'lucide-react';

/** Add/remove editor for a list of short strings (emails, product handles, domains). */
export function ListEditor({
  items,
  onChange,
  placeholder = 'Agregar…',
  maxItems,
  validate,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  validate?: (value: string) => string | null; // returns an error message, or null when valid
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (maxItems !== undefined && items.length >= maxItems) {
      setError(`Máximo ${maxItems} elementos.`);
      return;
    }
    if (items.includes(value)) {
      setError('Ya está en la lista.');
      return;
    }
    const problem = validate?.(value) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    onChange([...items, value]);
    setDraft('');
    setError(null);
  };

  return (
    <div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-2">
          {items.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 pl-2.5 pr-1 py-1 text-xs text-gray-700"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                className="rounded-full p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200"
                aria-label={`Quitar ${item}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus size={14} />
          Agregar
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
