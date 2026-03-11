import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { FileMetadata } from '@/types/files';

interface Props {
  files: FileMetadata[];
}

const CELL_SIZE = 12;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP; // 15px
const DAY_LABEL_WIDTH = 22;

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getCellColor(count: number): string {
  if (count === 0) return '#e2e8f0'; // slate-200
  if (count === 1) return '#bbf7d0'; // green-200
  if (count <= 3) return '#4ade80'; // green-400
  if (count <= 7) return '#16a34a'; // green-600
  return '#14532d'; // green-900
}

interface TooltipState {
  date: string;
  count: number;
  x: number;
  y: number;
}

export const DocumentDateHeatmap: React.FC<Props> = ({ files }) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { weeks, monthLabels, totalWithDate, totalDaysActive } = useMemo(() => {
    const countByDate: Record<string, number> = {};
    let totalWithDate = 0;

    for (const file of files) {
      if (file.document_date) {
        countByDate[file.document_date] = (countByDate[file.document_date] || 0) + 1;
        totalWithDate++;
      }
    }

    const totalDaysActive = Object.keys(countByDate).length;

    // Build range: start from Sunday ~52 weeks ago, end today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Rewind to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks: { date: string; count: number }[][] = [];
    const current = new Date(startDate);

    while (current <= today) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().split('T')[0];
        const isFuture = current > today;
        week.push({ date: dateStr, count: isFuture ? -1 : (countByDate[dateStr] || 0) });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }

    // Month labels: track which column each month first appears in
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const d = new Date(week[0].date);
      const month = d.getMonth();
      if (month !== lastMonth) {
        // Only add if there's room to display (not the very last column)
        if (i < weeks.length - 2) {
          monthLabels.push({ label: MONTHS_ES[month], col: i });
        }
        lastMonth = month;
      }
    });

    return { weeks, monthLabels, totalWithDate, totalDaysActive };
  }, [files]);

  // Close tooltip on scroll
  useEffect(() => {
    const handleScroll = () => setTooltip(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const totalWidth = DAY_LABEL_WIDTH + weeks.length * CELL_STEP;
  const totalHeight = 7 * CELL_STEP - CELL_GAP;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Actividad por fecha de documento</h3>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{totalWithDate} archivo{totalWithDate !== 1 ? 's' : ''} con fecha</span>
          <span>·</span>
          <span>{totalDaysActive} día{totalDaysActive !== 1 ? 's' : ''} con actividad</span>
        </div>
      </div>

      <div className="overflow-x-auto" ref={containerRef}>
        <div style={{ width: totalWidth + 2 }} className="relative">
          {/* Month labels */}
          <div className="relative h-5" style={{ marginLeft: DAY_LABEL_WIDTH }}>
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="absolute text-[10px] text-slate-500 select-none"
                style={{ left: m.col * CELL_STEP }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Main grid */}
          <div className="flex" style={{ gap: 0 }}>
            {/* Day-of-week labels */}
            <div
              style={{
                width: DAY_LABEL_WIDTH,
                flexShrink: 0,
                paddingTop: 0,
              }}
            >
              {DAYS_ES.map((day, i) => (
                <div
                  key={i}
                  className="text-[9px] text-slate-400 flex items-center select-none"
                  style={{
                    height: CELL_SIZE,
                    marginBottom: i < 6 ? CELL_GAP : 0,
                    justifyContent: 'flex-end',
                    paddingRight: 4,
                  }}
                >
                  {/* Show Mon, Wed, Fri only */}
                  {(i === 1 || i === 3 || i === 5) ? day.slice(0, 2) : ''}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <svg
              width={weeks.length * CELL_STEP - CELL_GAP}
              height={totalHeight}
              style={{ display: 'block' }}
            >
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  if (day.count === -1) return null; // future
                  const x = wi * CELL_STEP;
                  const y = di * CELL_STEP;
                  return (
                    <rect
                      key={`${wi}-${di}`}
                      x={x}
                      y={y}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      rx={2}
                      ry={2}
                      fill={getCellColor(day.count)}
                      style={{ cursor: day.count > 0 ? 'pointer' : 'default' }}
                      onMouseEnter={(e) => {
                        if (day.count >= 0) {
                          const svgRect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                          setTooltip({
                            date: day.date,
                            count: day.count,
                            x: svgRect.left + x + CELL_SIZE / 2,
                            y: svgRect.top + y,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2" style={{ marginLeft: DAY_LABEL_WIDTH }}>
            <span className="text-[10px] text-slate-400">Menos</span>
            {[0, 1, 2, 4, 8].map((n) => (
              <svg key={n} width={CELL_SIZE} height={CELL_SIZE} style={{ display: 'block' }}>
                <rect
                  x={0} y={0}
                  width={CELL_SIZE} height={CELL_SIZE}
                  rx={2} ry={2}
                  fill={getCellColor(n)}
                />
              </svg>
            ))}
            <span className="text-[10px] text-slate-400">Más</span>
          </div>
        </div>
      </div>

      {/* Tooltip portal-style via fixed positioning */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-slate-900 text-white text-xs rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap">
            <div className="font-medium">
              {new Date(tooltip.date + 'T00:00:00').toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            <div className="text-slate-300">
              {tooltip.count === 0
                ? 'Sin archivos'
                : `${tooltip.count} archivo${tooltip.count !== 1 ? 's' : ''}`}
            </div>
          </div>
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              bottom: -4,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #0f172a',
            }}
          />
        </div>
      )}
    </div>
  );
};
