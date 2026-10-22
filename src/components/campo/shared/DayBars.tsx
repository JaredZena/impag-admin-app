import { useState } from 'react';
import { EmptyState } from './Primitives';

export interface DaySeriesMeta {
  key: string;
  label: string;
  color: string;
  format: (n: number) => string;
}

export interface DayDatum {
  day: string; // YYYY-MM-DD
  values: Record<string, number>;
}

const shortDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const longDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Per-day grouped bars. Each series is scaled to its OWN max (so "proyectos"
 * and "costo IA" are both legible on the same chart despite different
 * units) — this is a comparison-of-shape chart, not an absolute-value one.
 */
export function DayBars({ data, series, emptyMessage }: { data: DayDatum[]; series: DaySeriesMeta[]; emptyMessage: string }) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) return <EmptyState message={emptyMessage} />;

  const maxOf = (key: string) => Math.max(...data.map((d) => d.values[key] ?? 0), 1);
  const maxes = new Map(series.map((s) => [s.key, maxOf(s.key)]));

  const HEIGHT = 140;
  const showEveryNth = data.length > 20 ? Math.ceil(data.length / 15) : 1;

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="text-xs text-gray-600">{s.label}</span>
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1 min-w-full" style={{ height: HEIGHT }} onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div
              key={d.day}
              className="flex-1 min-w-[6px] flex items-end gap-px relative h-full"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
              tabIndex={0}
              aria-label={`${longDay(d.day)}: ${series.map((s) => `${s.label} ${s.format(d.values[s.key] ?? 0)}`).join(', ')}`}
            >
              {series.map((s) => {
                const v = d.values[s.key] ?? 0;
                const max = maxes.get(s.key) ?? 1;
                const h = Math.max((v / max) * (HEIGHT - 18), v > 0 ? 2 : 0);
                return (
                  <div
                    key={s.key}
                    className="flex-1 rounded-t-sm transition-opacity"
                    style={{ height: h, backgroundColor: s.color, opacity: hover === null || hover === i ? 1 : 0.35 }}
                  />
                );
              })}
              {hover === i && (
                <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap">
                  <p className="text-gray-500 mb-1">{longDay(d.day)}</p>
                  {series.map((s) => (
                    <p key={s.key} className="text-gray-900 font-medium">
                      {s.label}: {s.format(d.values[s.key] ?? 0)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-1 min-w-full mt-1">
          {data.map((d, i) => (
            <div key={d.day} className="flex-1 min-w-[6px] text-center">
              {i % showEveryNth === 0 && <span className="text-[10px] text-gray-400">{shortDay(d.day)}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
