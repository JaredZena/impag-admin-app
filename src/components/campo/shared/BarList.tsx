import { Link } from 'react-router-dom';
import { EmptyState } from './Primitives';

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  sub?: string;
  href?: string;
}

const BAR_HUE = '#2a78d6';

/** Horizontal CSS bar list — counts, cost, whatever `format` renders. */
export function BarList({
  items,
  emptyMessage,
  format,
  hue = BAR_HUE,
}: {
  items: BarListItem[];
  emptyMessage: string;
  format: (n: number) => string;
  hue?: string;
}) {
  if (items.length === 0) return <EmptyState message={emptyMessage} />;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-[2px]">
      {items.map((it) => (
        <div key={it.key} tabIndex={0} className="group relative flex items-center gap-2 focus:outline-none">
          <div className="w-28 sm:w-40 shrink-0 text-sm text-gray-700 truncate" title={it.label}>
            {it.href ? (
              <Link to={it.href} className="hover:text-blue-600 hover:underline">
                {it.label}
              </Link>
            ) : (
              it.label
            )}
          </div>
          <div className="flex-1 flex items-center min-w-0">
            <div
              className="h-4 transition-opacity group-hover:opacity-80 group-focus:opacity-80"
              style={{
                width: `calc((100% - 72px) * ${Math.max(it.value, 0) / max})`,
                minWidth: 2,
                backgroundColor: hue,
                borderRadius: '0 4px 4px 0',
              }}
            />
            <span className="ml-2 text-xs text-gray-600 whitespace-nowrap">{format(it.value)}</span>
          </div>
          {it.sub && (
            <div className="pointer-events-none absolute left-28 sm:left-40 -top-8 z-10 hidden group-hover:block group-focus:block rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap">
              {it.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
