import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { listQuotes } from '@/utils/quotesApi';
import type { Quote } from '@/types/quotes';
import { useAuth } from '@/contexts/AuthContext';
import NextActionLine from './NextActionLine';
import { NEXT_STEP_GROUPS, endOfWeek, groupNextSteps, ownerForUser, sameOwner, shortDay, toYmd } from './nextAction';

// En el teléfono se ven las primeras 5; «Ver las N» abre el resto.
const PHONE_ROWS = 5;
const MINE_KEY = 'impag.quotes.nextSteps.mine';

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const readMine = () => {
  try {
    return localStorage.getItem(MINE_KEY) === '1';
  } catch {
    return false;
  }
};

const saveMine = (value: boolean) => {
  try {
    localStorage.setItem(MINE_KEY, value ? '1' : '0');
  } catch {
    // Sin almacenamiento sólo se olvida la preferencia.
  }
};

// «Qué sigue»: lo que hay que hacer con cada cliente de aquí al domingo.
export default function NextStepsSection() {
  const { user } = useAuth();
  const me = ownerForUser(user);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [today, setToday] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(readMine);
  const [expanded, setExpanded] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    const now = new Date();
    setLoading(true);
    setError(null);
    try {
      const res = await listQuotes({ next_action_due_to: toYmd(endOfWeek(now)), order: 'next_action', limit: 50 });
      if (request !== requestRef.current) return;
      setQuotes(res.data);
      setToday(now);
    } catch (err) {
      if (request !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showMine = Boolean(me) && mineOnly;
  const groups = useMemo(
    () => groupNextSteps(showMine ? quotes.filter((q) => sameOwner(q.next_action_owner, me)) : quotes, today),
    [quotes, today, showMine, me],
  );
  const total = groups.overdue.length + groups.today.length + groups.week.length;
  const mineCount = useMemo(
    () => (me ? Object.values(groupNextSteps(quotes, today)).flat().filter((q) => sameOwner(q.next_action_owner, me)).length : 0),
    [quotes, today, me],
  );

  const toggleMine = () => {
    const next = !mineOnly;
    setMineOnly(next);
    saveMine(next);
  };

  let index = 0;
  const collapsed = !expanded && total > PHONE_ROWS;

  return (
    <section
      aria-labelledby="que-sigue-title"
      className="bg-white border border-gray-100 rounded-xl p-3 md:p-4 mb-3 md:mb-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <ListChecks size={18} className="shrink-0 text-gray-400" />
        <h2 id="que-sigue-title" className="text-base font-semibold text-gray-900">
          Qué sigue
        </h2>
        <span className="text-xs text-gray-500 whitespace-nowrap">hasta el {shortDay(endOfWeek(today))}</span>
        {me && (
          <button
            type="button"
            onClick={toggleMine}
            aria-pressed={mineOnly}
            className={`ml-auto shrink-0 whitespace-nowrap px-3 py-1.5 text-sm md:text-xs font-medium rounded-full border transition-colors ${
              mineOnly
                ? 'bg-gray-900 border-gray-900 text-white hover:border-gray-900'
                : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Solo míos{!loading && !error ? ` · ${mineCount}` : ''}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-2">Cargando…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600 py-2">
          No se pudo cargar: {error}{' '}
          <button
            type="button"
            onClick={load}
            className="bg-transparent p-0 border-0 text-blue-600 font-medium hover:underline"
          >
            Reintentar
          </button>
        </p>
      ) : total === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          {showMine ? 'Nada tuyo pendiente esta semana.' : 'Nada pendiente esta semana.'}
        </p>
      ) : (
        <>
          {NEXT_STEP_GROUPS.map((group) => {
            const rows = groups[group.key];
            if (rows.length === 0) return null;
            const firstIndex = index;
            index += rows.length;
            const groupHiddenOnPhone = collapsed && firstIndex >= PHONE_ROWS;
            return (
              <div key={group.key} className={`mt-2 ${groupHiddenOnPhone ? 'hidden md:block' : ''}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${group.className}`}>
                  {group.label} · {rows.length}
                </h3>
                <ul className="md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-x-6">
                  {rows.map((q, i) => {
                    const hiddenOnPhone = collapsed && firstIndex + i >= PHONE_ROWS;
                    return (
                      <li key={q.id} className={`${hiddenOnPhone ? 'hidden md:block' : ''} border-b border-gray-50 last:border-b-0`}>
                        <Link
                          to={`/quotes/${q.id}`}
                          className="flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 active:bg-gray-100"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{q.customer_name || 'Sin nombre'}</p>
                            <NextActionLine quote={q} today={today} maxChars={90} />
                          </div>
                          {q.total > 0 && (
                            <p className="shrink-0 text-sm font-semibold text-gray-900 whitespace-nowrap">{money(q.total)}</p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {total > PHONE_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="md:hidden mt-2 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50"
            >
              {expanded ? 'Ver menos' : `Ver las ${total}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
