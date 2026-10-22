import type { ReactNode } from 'react';

// Small pieces shared by the Campo IA pages (Apoyos, Agroproyectos, Uso de
// IA), copied from the look of src/components/sales/SalesDashboardPage.tsx
// so the three sections feel like one dashboard family. No chart library —
// bars are plain divs/SVG.

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

export function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 text-center py-8">{message}</p>;
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'text-gray-900',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl md:text-2xl font-bold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export interface PillOption<T extends string | number> {
  value: T;
  label: string;
}

/** Segmented pill control — period selectors, status filters. */
export function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit max-w-full overflow-x-auto"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-md border-0 transition-colors ${
            value === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'Intenta de nuevo.');
