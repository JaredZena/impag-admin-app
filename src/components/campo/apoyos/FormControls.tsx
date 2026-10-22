import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Option } from '@/utils/campoTaxonomy';

// ---------------------------------------------------------------------------
// Chips multi-select — toggle a slug on/off from a fixed set of options.
// ---------------------------------------------------------------------------

export function ChipsMultiSelect({
  options,
  value,
  onChange,
  showSelectAll = false,
  disabled = false,
}: {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  showSelectAll?: boolean;
  disabled?: boolean;
}) {
  const toggle = (v: string) => {
    if (disabled) return;
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const allSelected = options.length > 0 && options.every((o) => value.includes(o.value));

  return (
    <div className="flex flex-wrap gap-1.5">
      {showSelectAll && options.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(allSelected ? [] : options.map((o) => o.value))}
          className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50"
        >
          {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
        </button>
      )}
      {options.map((o) => {
        const selected = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(o.value)}
            aria-pressed={selected}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors disabled:opacity-50 ${
              selected
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List editor — free-text items (requirements, how_to_apply, extra_queries,
// blocked_domains, notify_emails…), add/remove/edit one per row.
// ---------------------------------------------------------------------------

export function ListEditor({
  value,
  onChange,
  placeholder = 'Agregar...',
  maxItems,
  maxLength,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    if (maxItems && value.length >= maxItems) return;
    onChange([...value, text]);
    setDraft('');
  };

  const updateAt = (i: number, text: string) => {
    onChange(value.map((v, idx) => (idx === i ? text : v)));
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-1.5">
      {value.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={v}
            onChange={(e) => updateAt(i, e.target.value)}
            maxLength={maxLength}
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label="Quitar"
            className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      {(!maxItems || value.length < maxItems) && (
        <div className="flex items-center gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            maxLength={maxLength}
            placeholder={placeholder}
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            aria-label="Agregar"
            className="shrink-0 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sources editor — {url, title} pairs.
// ---------------------------------------------------------------------------

export function SourcesEditor({
  value,
  onChange,
}: {
  value: { url: string; title: string }[];
  onChange: (next: { url: string; title: string }[]) => void;
}) {
  const update = (i: number, patch: Partial<{ url: string; title: string }>) => {
    onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };
  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { url: '', title: '' }]);

  return (
    <div className="space-y-1.5">
      {value.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={v.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Título de la fuente"
            className="w-40 shrink-0 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={v.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://..."
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label="Quitar fuente"
            className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
      >
        <Plus size={14} />
        Agregar fuente
      </button>
    </div>
  );
}
