import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Scale, Trash2 } from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  addExpense,
  createConcept,
  deleteConcept,
  deleteExpense,
  getFinanceDashboard,
  listConcepts,
  openMonth,
  updateConcept,
  updateExpense,
  type ExpenseCategory,
  type ExpenseConcept,
  type FinanceDashboard,
  type MonthlyExpense,
  type SeriesPoint,
} from '@/utils/financeApi';

// Punto de equilibrio: venta mínima mensual = gastos fijos ÷ margen bruto.
// Gastos se capturan por mes (se abren copiando la plantilla de conceptos);
// ventas y margen vienen del ledger y de BALANCES DE VENTA.

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MARGIN_KEY = 'breakeven.marginOverride';

const fmtMXN = (n: number | null | undefined): string =>
  n === null || n === undefined
    ? '—'
    : n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toLocaleString('es-MX', { maximumFractionDigits: 0 })}k`;
  return fmtMXN(n);
};

const pct = (n: number) => `${(n * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

const monthLabel = (key: string, full = false) => {
  const [y, m] = key.split('-').map(Number);
  return full ? `${MONTHS_FULL[m - 1]} ${y}` : `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
};

const shiftMonth = (key: string, n: number) => {
  const [y, m] = key.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

const currentMonthKey = () => {
  // Business month in Mexico City, like the backend.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit',
  }).format(new Date());
  return parts.slice(0, 7);
};

const readMarginOverride = (): number | null => {
  try {
    const v = Number(localStorage.getItem(MARGIN_KEY));
    return v > 0 && v < 100 ? v : null;
  } catch {
    return null;
  }
};

const Card = ({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5">
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 mb-4">
        {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </div>
);

const Kpi = ({ label, value, sub, tone = 'default' }: {
  label: string; value: string; sub?: React.ReactNode; tone?: 'default' | 'good' | 'bad';
}) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-900'}`}>
      {value}
    </p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

// ---------------------------------------------------------------------------
// Chart: ventas por mes (barras) vs venta mínima (marca)
// ---------------------------------------------------------------------------

const HistoryChart = ({ series, selected, onSelect }: {
  series: SeriesPoint[]; selected: string; onSelect: (m: string) => void;
}) => {
  const H = 180;
  const max = Math.max(1, ...series.map((s) => Math.max(s.sales, s.breakeven_fixed ?? 0))) * 1.08;
  const y = (v: number) => H - (v / max) * H;
  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-3">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Ventas ≥ venta mínima</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400" /> Ventas por debajo</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-gray-900" /> Venta mínima (gastos fijos)</span>
      </div>
      <div className="flex items-end gap-1 sm:gap-2">
        {series.map((s) => {
          const be = s.breakeven_fixed;
          const ok = be !== null && s.sales >= be;
          const isSel = s.month === selected;
          return (
            <div
              key={s.month}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(s.month)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect(s.month); }}
              title={`${monthLabel(s.month, true)}: ventas ${fmtMXN(s.sales)} · mínima ${fmtMXN(be)}`}
              className={`relative flex-1 min-w-0 flex flex-col items-center group rounded-md cursor-pointer ${isSel ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <div className="relative w-full" style={{ height: H }}>
                <div
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 rounded-t ${
                    be === null ? 'bg-gray-300' : ok ? 'bg-emerald-500' : 'bg-red-400'
                  } ${s.is_partial ? 'opacity-60' : ''} group-hover:opacity-90`}
                  style={{ height: Math.max(2, H - y(s.sales)) }}
                />
                {be !== null && (
                  <div
                    className={`absolute left-0 right-0 border-t-2 ${s.expenses_source === 'registrado' ? 'border-gray-900' : 'border-dashed border-gray-400'}`}
                    style={{ top: y(be) }}
                  />
                )}
              </div>
              <span className={`mt-1 text-[10px] sm:text-xs ${isSel ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                {monthLabel(s.month)}
              </span>
              <span className="text-[10px] text-gray-400 hidden sm:block">{fmtCompact(s.sales)}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Línea punteada = mes sin gastos capturados (se usa la plantilla de conceptos). Barra tenue = mes en curso.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Expense line row (inline edit, saves on blur)
// ---------------------------------------------------------------------------

const ExpenseRow = ({ line, onChange, onDelete }: {
  line: MonthlyExpense;
  onChange: (id: number, patch: Partial<MonthlyExpense>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) => {
  const [amount, setAmount] = useState(String(line.amount));
  const [notes, setNotes] = useState(line.notes ?? '');
  useEffect(() => { setAmount(String(line.amount)); setNotes(line.notes ?? ''); }, [line.amount, line.notes]);

  return (
    <tr className="border-t border-gray-100">
      <td className="py-2 pr-2">
        <p className="text-sm text-gray-900">{line.name}</p>
        {line.concept_id === null && <p className="text-[11px] text-gray-400">solo este mes</p>}
      </td>
      <td className="py-2 pr-2">
        <select
          value={line.category}
          onChange={(e) => onChange(line.id, { category: e.target.value as ExpenseCategory })}
          className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white"
        >
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => {
            const v = Number(amount);
            if (!Number.isNaN(v) && v >= 0 && v !== line.amount) onChange(line.id, { amount: v });
          }}
          className="w-28 text-sm text-right border border-gray-200 rounded-md px-2 py-1"
        />
      </td>
      <td className="py-2 pr-2 text-center">
        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={line.paid}
            onChange={(e) => onChange(line.id, { paid: e.target.checked })}
          />
          <span className={line.paid ? 'text-emerald-700' : 'text-amber-700'}>{line.paid ? 'Pagado' : 'Pendiente'}</span>
        </label>
      </td>
      <td className="py-2 pr-2 hidden md:table-cell">
        <input
          value={notes}
          placeholder="nota"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (line.notes ?? '')) onChange(line.id, { notes: notes || null }); }}
          className="w-full text-xs border border-gray-200 rounded-md px-2 py-1"
        />
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={() => onDelete(line.id)}
          className="p-1 text-gray-400 hover:text-red-600"
          aria-label={`Quitar ${line.name}`}
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
};

// ---------------------------------------------------------------------------
// Concept template manager
// ---------------------------------------------------------------------------

const ConceptsCard = ({ onChanged }: { onChanged: () => void }) => {
  const { addNotification } = useNotifications();
  const [concepts, setConcepts] = useState<ExpenseConcept[] | null>(null);
  const [draft, setDraft] = useState({ name: '', amount: '', category: 'operativo' as ExpenseCategory, notes: '' });

  const load = useCallback(async () => {
    try {
      setConcepts(await listConcepts());
    } catch (e) {
      addNotification({ type: 'error', title: 'Conceptos', message: (e as Error).message });
    }
  }, [addNotification]);
  useEffect(() => { load(); }, [load]);

  const save = async (id: number, patch: Partial<ExpenseConcept>) => {
    try {
      await updateConcept(id, patch);
      await load();
      onChanged();
    } catch (e) {
      addNotification({ type: 'error', title: 'No se guardó', message: (e as Error).message });
    }
  };

  const add = async () => {
    if (!draft.name.trim()) return;
    try {
      await createConcept({
        name: draft.name.trim(),
        category: draft.category,
        default_amount: Number(draft.amount) || 0,
        notes: draft.notes || null,
        sort_order: (concepts?.length ?? 0) + 1,
      });
      setDraft({ name: '', amount: '', category: 'operativo', notes: '' });
      await load();
      onChanged();
    } catch (e) {
      addNotification({ type: 'error', title: 'No se agregó', message: (e as Error).message });
    }
  };

  const remove = async (c: ExpenseConcept) => {
    try {
      await deleteConcept(c.id);
      await load();
      onChanged();
    } catch (e) {
      addNotification({ type: 'error', title: 'No se borró', message: (e as Error).message });
    }
  };

  const activeTotal = (concepts ?? []).filter((c) => c.active && c.category !== 'otro')
    .reduce((acc, c) => acc + c.default_amount, 0);

  return (
    <Card title="Plantilla de gastos fijos">
      <p className="text-xs text-gray-500 -mt-2 mb-3">
        Lo que se copia al abrir un mes nuevo (con el monto del mes anterior si existe). Cambiar aquí no toca
        meses ya capturados. Total fijo de la plantilla: <b>{fmtMXN(activeTotal)}</b>.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="pb-2 font-medium">Concepto</th>
              <th className="pb-2 font-medium">Categoría</th>
              <th className="pb-2 font-medium text-right">Monto mensual</th>
              <th className="pb-2 font-medium text-center">Activo</th>
              <th className="pb-2 font-medium hidden md:table-cell">De dónde sale</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(concepts ?? []).map((c) => (
              <tr key={c.id} className={`border-t border-gray-100 ${c.active ? '' : 'opacity-50'}`}>
                <td className="py-2 pr-2">{c.name}</td>
                <td className="py-2 pr-2">
                  <select
                    value={c.category}
                    onChange={(e) => save(c.id, { category: e.target.value as ExpenseCategory })}
                    className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white"
                  >
                    {CATEGORY_ORDER.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={c.default_amount}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v) && v >= 0 && v !== c.default_amount) save(c.id, { default_amount: v });
                    }}
                    className="w-28 text-sm text-right border border-gray-200 rounded-md px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-2 text-center">
                  <input type="checkbox" checked={c.active} onChange={(e) => save(c.id, { active: e.target.checked })} />
                </td>
                <td className="py-2 pr-2 hidden md:table-cell">
                  <input
                    defaultValue={c.notes ?? ''}
                    onBlur={(e) => { if (e.target.value !== (c.notes ?? '')) save(c.id, { notes: e.target.value || null }); }}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1"
                  />
                </td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => remove(c)} className="p-1 text-gray-400 hover:text-red-600" aria-label={`Borrar ${c.name}`}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="border-t border-gray-100">
              <td className="py-2 pr-2">
                <input
                  value={draft.name}
                  placeholder="Nuevo concepto"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-md px-2 py-1"
                />
              </td>
              <td className="py-2 pr-2">
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseCategory })}
                  className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white"
                >
                  {CATEGORY_ORDER.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
                </select>
              </td>
              <td className="py-2 pr-2 text-right">
                <input
                  type="number"
                  min={0}
                  value={draft.amount}
                  placeholder="0"
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  className="w-28 text-sm text-right border border-gray-200 rounded-md px-2 py-1"
                />
              </td>
              <td />
              <td className="py-2 pr-2 hidden md:table-cell">
                <input
                  value={draft.notes}
                  placeholder="fuente"
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded-md px-2 py-1"
                />
              </td>
              <td className="py-2 text-right">
                <button type="button" onClick={add} className="p-1 text-gray-600 hover:text-gray-900" aria-label="Agregar concepto">
                  <Plus size={16} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const BreakevenPage = () => {
  const { addNotification } = useNotifications();
  const [month, setMonth] = useState(currentMonthKey());
  const [marginOverride, setMarginOverride] = useState<number | null>(readMarginOverride());
  const [marginInput, setMarginInput] = useState(marginOverride ? String(marginOverride) : '');
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLine, setNewLine] = useState({ name: '', amount: '', category: 'otro' as ExpenseCategory });

  const load = useCallback(async () => {
    try {
      setData(await getFinanceDashboard({ month, months: 12, marginPct: marginOverride }));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      addNotification({ type: 'error', title: 'Punto de equilibrio', message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [month, marginOverride, addNotification]);
  useEffect(() => { load(); }, [load]);

  const applyMargin = () => {
    const v = Number(marginInput);
    const next = marginInput.trim() && v > 0 && v < 100 ? v : null;
    try {
      if (next) localStorage.setItem(MARGIN_KEY, String(next));
      else localStorage.removeItem(MARGIN_KEY);
    } catch { /* per-viewer convenience only */ }
    setMarginOverride(next);
    if (!next) setMarginInput('');
  };

  const run = async (fn: () => Promise<unknown>, title: string) => {
    try {
      await fn();
      await load();
    } catch (e) {
      addNotification({ type: 'error', title, message: (e as Error).message });
    }
  };

  const onLineChange = (id: number, patch: Partial<MonthlyExpense>) =>
    run(() => updateExpense(id, patch), 'No se guardó');
  const onLineDelete = (id: number) => run(() => deleteExpense(id), 'No se borró');

  const addLine = () => {
    if (!newLine.name.trim()) return;
    run(async () => {
      await addExpense(month, { name: newLine.name.trim(), amount: Number(newLine.amount) || 0, category: newLine.category });
      setNewLine({ name: '', amount: '', category: 'otro' });
    }, 'No se agregó');
  };

  const sel = data?.selected;
  const fijo = data?.scenarios.find((s) => s.key === 'fijo');
  const isCurrent = data ? month === data.today.slice(0, 7) : false;
  const covered = sel && fijo?.breakeven ? Math.min(1, sel.sales / fijo.breakeven) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <Scale size={24} className="text-gray-400" />
          Punto de equilibrio
        </h1>
        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 text-xs font-medium">
          Instantánea operativa — no libros contables
        </span>
        <div className="ml-auto flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="p-1.5 rounded hover:bg-gray-100" aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-sm font-medium text-gray-900 capitalize min-w-32 text-center">{monthLabel(month, true)}</span>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="p-1.5 rounded hover:bg-gray-100" aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {!data || !sel ? (
        <p className="py-16 text-center text-sm text-gray-500">
          {loading ? 'Cargando…' : `No se pudo cargar: ${error ?? 'sin datos'}`}
        </p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi
              label="Venta mínima del mes"
              value={fmtMXN(fijo?.breakeven)}
              sub={<>gastos fijos {fmtMXN(sel.fixed_total)} ÷ margen {pct(data.margin.pct)}</>}
            />
            <Kpi
              label={isCurrent ? `Vendido al día ${sel.days_elapsed}` : 'Vendido en el mes'}
              value={fmtMXN(sel.sales)}
              sub={isCurrent ? <>ritmo → {fmtMXN(sel.projection)} al cierre</> : `${pct(covered)} de la venta mínima`}
              tone={fijo?.breakeven && sel.sales >= fijo.breakeven ? 'good' : 'default'}
            />
            <Kpi
              label="Falta para no perder"
              value={fijo?.gap ? fmtMXN(fijo.gap) : '¡Cubierto!'}
              sub={isCurrent && sel.projection_gap ? <>al ritmo actual faltarían {fmtMXN(sel.projection_gap)}</> : undefined}
              tone={fijo?.gap ? 'bad' : 'good'}
            />
            <Kpi
              label="Resultado estimado"
              value={fmtMXN(sel.result)}
              sub={<>utilidad bruta {fmtMXN(sel.gross_profit)} − gastos {fmtMXN(sel.fixed_total + sel.otro)}</>}
              tone={sel.result >= 0 ? 'good' : 'bad'}
            />
          </div>

          {/* Progress */}
          {fijo?.breakeven ? (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                <span>Avance contra la venta mínima</span>
                <span className="font-medium">{pct(covered)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${covered >= 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${covered * 100}%` }}
                />
              </div>
              {isCurrent && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Día {sel.days_elapsed} de {sel.days_in_month} ({pct(sel.days_elapsed / sel.days_in_month)} del mes)
                </p>
              )}
            </div>
          ) : null}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Scenarios */}
            <Card title="Escenarios de venta mínima">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Escenario</th>
                    <th className="pb-2 font-medium text-right">Gastos</th>
                    <th className="pb-2 font-medium text-right">Venta mínima</th>
                    <th className="pb-2 font-medium text-right">Falta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scenarios.map((s) => (
                    <tr key={s.key} className={`border-t border-gray-100 ${s.key === 'fijo' ? 'font-semibold' : ''}`}>
                      <td className="py-2 pr-2">{s.label}</td>
                      <td className="py-2 pr-2 text-right">{fmtMXN(s.expenses)}</td>
                      <td className="py-2 pr-2 text-right">{fmtMXN(s.breakeven)}</td>
                      <td className={`py-2 text-right ${s.gap ? 'text-red-700' : 'text-emerald-700'}`}>
                        {s.gap ? fmtMXN(s.gap) : 'ok'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3 text-xs text-gray-600">
                <div>
                  <p>
                    Margen bruto usado: <b>{pct(data.margin.pct)}</b>{' '}
                    {data.margin.source === 'medido' && <>(medido en {data.margin.sample} ventas conciliadas de BALANCES)</>}
                    {data.margin.source === 'manual' && <>(manual — medido: {data.margin.measured_pct !== null ? pct(data.margin.measured_pct) : '—'})</>}
                    {data.margin.source === 'supuesto' && <>(supuesto: aún no hay ventas conciliadas)</>}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    step="0.1"
                    value={marginInput}
                    placeholder="margen %"
                    onChange={(e) => setMarginInput(e.target.value)}
                    className="w-24 border border-gray-200 rounded-md px-2 py-1"
                  />
                  <button type="button" onClick={applyMargin} className="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50">
                    {marginInput.trim() ? 'Usar' : 'Medido'}
                  </button>
                </div>
              </div>
              {data.arrears.total > 0 && (
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  <p className="font-semibold mb-1">Adeudos de meses anteriores: {fmtMXN(data.arrears.total)}</p>
                  <ul className="space-y-1">
                    {data.arrears.items.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2">
                        <span>{a.name} · <span className="capitalize">{monthLabel(a.month, true)}</span></span>
                        <span className="flex items-center gap-2">
                          {fmtMXN(a.amount)}
                          <button type="button" onClick={() => onLineChange(a.id, { paid: true })} className="underline hover:no-underline">
                            marcar pagado
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* Pipeline + reference */}
            <Card title="¿De dónde puede salir?">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Cotizaciones abiertas (enviadas / vistas)</p>
                  <p className="text-xl font-bold text-gray-900">
                    {fmtMXN(data.pipeline.open_total)}{' '}
                    <span className="text-sm font-medium text-gray-500">{data.pipeline.open_count} cotizaciones</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Si todas cierran dejan ~{fmtMXN(data.pipeline.gross_profit_if_all_close)} de utilidad bruta.
                    {fijo?.gap && data.pipeline.share_needed_to_cover_gap !== null ? (
                      data.pipeline.share_needed_to_cover_gap <= 1 ? (
                        <> Para cubrir lo que falta hay que cerrar <b>{pct(data.pipeline.share_needed_to_cover_gap)}</b> del valor abierto.</>
                      ) : (
                        <> Ni cerrando todas se cubre lo que falta.</>
                      )
                    ) : null}
                  </p>
                  <Link to="/quotes" className="text-xs text-blue-600 hover:underline">Ver cotizaciones →</Link>
                </div>
                <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Promedio {data.reference.year}</p>
                    <p className="font-semibold">{fmtMXN(data.reference.avg_sales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mediana</p>
                    <p className="font-semibold">{fmtMXN(data.reference.median_sales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Meses bajo la mínima</p>
                    <p className="font-semibold">
                      {data.reference.months_below_breakeven} de {data.reference.completed_months}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Meses completos del año antes del mes elegido, contra la venta mínima de este mes.
                </p>
              </div>
            </Card>
          </div>

          {/* Month expenses */}
          <Card
            title={`Gastos de ${monthLabel(month, true)}`}
            action={
              <button
                type="button"
                onClick={() => run(() => openMonth(month), 'No se abrió el mes')}
                className="text-xs px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800"
              >
                {sel.opened ? 'Agregar conceptos faltantes' : 'Abrir mes con la plantilla'}
              </button>
            }
          >
            {!sel.opened && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
                Este mes aún no tiene gastos capturados; los números de arriba usan la plantilla. Ábrelo para
                confirmar montos reales y marcar qué ya se pagó.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Concepto</th>
                    <th className="pb-2 font-medium">Categoría</th>
                    <th className="pb-2 font-medium">Monto</th>
                    <th className="pb-2 font-medium text-center">Estado</th>
                    <th className="pb-2 font-medium hidden md:table-cell">Nota</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sel.items.map((line) => (
                    <ExpenseRow key={line.id} line={line} onChange={onLineChange} onDelete={onLineDelete} />
                  ))}
                  <tr className="border-t border-gray-100">
                    <td className="py-2 pr-2">
                      <input
                        value={newLine.name}
                        placeholder="Gasto extra (gasolina, reparación…)"
                        onChange={(e) => setNewLine({ ...newLine, name: e.target.value })}
                        className="w-full text-sm border border-gray-200 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={newLine.category}
                        onChange={(e) => setNewLine({ ...newLine, category: e.target.value as ExpenseCategory })}
                        className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white"
                      >
                        {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        value={newLine.amount}
                        placeholder="0"
                        onChange={(e) => setNewLine({ ...newLine, amount: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') addLine(); }}
                        className="w-28 text-sm text-right border border-gray-200 rounded-md px-2 py-1"
                      />
                    </td>
                    <td colSpan={3} className="py-2 text-right">
                      <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50">
                        <Plus size={14} /> Agregar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
              <span>Operativo <b>{fmtMXN(sel.operativo)}</b></span>
              <span>Financiamiento <b>{fmtMXN(sel.financiamiento)}</b></span>
              <span>Otro <b>{fmtMXN(sel.otro)}</b></span>
              {sel.unpaid > 0 && <span className="text-amber-700">Pendiente de pago <b>{fmtMXN(sel.unpaid)}</b></span>}
            </div>
          </Card>

          {/* History */}
          <Card title="Últimos 12 meses">
            <HistoryChart series={data.series} selected={month} onSelect={setMonth} />
            <div className="overflow-x-auto mt-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Mes</th>
                    <th className="pb-2 font-medium text-right">Ventas</th>
                    <th className="pb-2 font-medium text-right">Gastos fijos</th>
                    <th className="pb-2 font-medium text-right">Venta mínima</th>
                    <th className="pb-2 font-medium text-right">Resultado est.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.series].reverse().map((s) => (
                    <tr
                      key={s.month}
                      onClick={() => setMonth(s.month)}
                      className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${s.month === month ? 'bg-gray-50 font-medium' : ''}`}
                    >
                      <td className="py-1.5 capitalize">
                        {monthLabel(s.month, true)}
                        {s.expenses_source !== 'registrado' && <span className="ml-1 text-[10px] text-gray-400">(plantilla)</span>}
                      </td>
                      <td className="py-1.5 text-right">{fmtMXN(s.sales)}</td>
                      <td className="py-1.5 text-right">{fmtMXN(s.fixed_total)}</td>
                      <td className="py-1.5 text-right">{fmtMXN(s.breakeven_fixed)}</td>
                      <td className={`py-1.5 text-right ${s.result >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtMXN(s.result)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <ConceptsCard onChanged={load} />
        </>
      )}
    </div>
  );
};

export default BreakevenPage;
