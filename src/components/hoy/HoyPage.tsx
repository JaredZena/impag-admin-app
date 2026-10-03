import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardCopy, Sun } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { fetchPendientesText } from '@/utils/tasksApi';
import { buildHoyText, money, short, type HoyData } from '@/utils/hoyText';
import SeguimientoDelDia from './SeguimientoDelDia';
import HoyAcciones from './HoyAcciones';
import LoadError from '@/components/ui/LoadError';

const todayLocal = () => new Date().toLocaleDateString('en-CA');

// Lo que Hernán escribe en el reporte HOY se guarda en este equipo por día, para
// que una recarga o cerrar la pestaña no lo borre.
type HoyDraft = { atencion: string; bloqueantes: string; manana: string };
const draftKey = (day: string) => `hoy-draft-${day}`;
const loadDraft = (day: string): HoyDraft | null => {
  try {
    return JSON.parse(localStorage.getItem(draftKey(day)) || 'null');
  } catch {
    return null;
  }
};
const saveDraft = (day: string, draft: HoyDraft) => {
  try {
    if (draft.atencion || draft.bloqueantes || draft.manana) localStorage.setItem(draftKey(day), JSON.stringify(draft));
  } catch {
    /* sin storage: sólo en memoria */
  }
};


function CopyButton({ getText, label }: { getText: () => Promise<string> | string; label: string }) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(await getText());
          setDone(true);
          setFailed(false);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setFailed(true);
        }
      }}
      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
    >
      {done ? <Check size={16} /> : <ClipboardCopy size={16} />}
      {done ? 'Copiado' : failed ? 'No se pudo copiar' : label}
    </button>
  );
}

function Block({ title, count, children, to }: { title: string; count?: number | string; children: React.ReactNode; to?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
        {count !== undefined && <span className="text-lg font-bold text-gray-900">{count}</span>}
      </div>
      <div className="text-sm text-gray-700 space-y-1">{children}</div>
      {to && (
        <Link to={to} className="inline-block mt-2 text-xs text-blue-600 hover:underline">
          Ver todo →
        </Link>
      )}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-gray-400">{text}</p>;

// Pantalla de inicio: lo del día y el reporte HOY (18:00) listo para copiar.
export default function HoyPage() {
  const [day, setDay] = useState(todayLocal());
  const [data, setData] = useState<HoyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [atencion, setAtencion] = useState(() => loadDraft(todayLocal())?.atencion ?? '');
  const [bloqueantes, setBloqueantes] = useState(() => loadDraft(todayLocal())?.bloqueantes ?? '');
  const [manana, setManana] = useState(() => loadDraft(todayLocal())?.manana ?? '');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    saveDraft(day, { atencion, bloqueantes, manana });
  }, [day, atencion, bloqueantes, manana]);

  useEffect(() => {
    let alive = true;
    setError(null);
    apiRequest(`/hoy?day=${day}`)
      .then((res: { data: HoyData }) => {
        if (!alive) return;
        setData(res.data);
        if (reload === 0 && !loadDraft(day)?.manana) setManana(res.data.priority.join('\n'));
      })
      .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : 'No se pudo cargar el día'));
    return () => {
      alive = false;
    };
  }, [day, reload]);

  const hoyText = useMemo(
    () => (data ? buildHoyText(data, atencion, bloqueantes, manana) : ''),
    [data, atencion, bloqueantes, manana]
  );
  const openTotal = data ? Object.values(data.open_by_section).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <Sun size={24} className="text-amber-500" />
          Hoy
        </h1>
        <input
          type="date"
          value={day}
          max={todayLocal()}
          onChange={(e) => {
            const next = e.target.value || todayLocal();
            const draft = loadDraft(next);
            setAtencion(draft?.atencion ?? '');
            setBloqueantes(draft?.bloqueantes ?? '');
            setManana(draft?.manana ?? '');
            setDay(next);
            setData(null);
            setReload(0);
          }}
          aria-label="Día"
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
        />
      </div>

      <HoyAcciones data={data} isToday={day === todayLocal()} />

      {error && (
        <LoadError
          message={error}
          onRetry={() => {
            setError(null);
            setReload((n) => n + 1);
          }}
        />
      )}
      {day === todayLocal() && <SeguimientoDelDia onChange={() => setReload((n) => n + 1)} />}
      {!data && !error && <div className="h-40 rounded-xl bg-gray-50 animate-pulse" />}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-5 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Block title="Ventas" count={data.sales.length} to="/sales">
              {data.sales.length === 0 ? (
                <Empty text="Sin ventas registradas este día" />
              ) : (
                data.sales.map((s) => (
                  <p key={s.id}>
                    {s.customer_name} · {money(s.amount)}
                    {s.pending > 0 && <span className="text-red-600"> · debe {money(s.pending)}</span>}
                  </p>
                ))
              )}
            </Block>
            <Block title="Cotizaciones enviadas" count={data.quotes_sent.length} to="/quotes">
              {data.quotes_sent.length === 0 ? (
                <Empty text="Ninguna registrada" />
              ) : (
                data.quotes_sent.map((q) => (
                  <Link key={q.id} to={`/quotes/${q.id}`} className="block hover:underline">
                    {q.customer_name}
                    {q.material ? ` · ${short(q.material, 34)}` : ''}
                  </Link>
                ))
              )}
            </Block>
            <Block title="Seguimientos" count={data.followups.length}>
              {data.followups.length === 0 ? (
                <Empty text="Ninguno registrado hoy" />
              ) : (
                data.followups.map((f, i) =>
                  f.quote_id ? (
                    <Link key={i} to={`/quotes/${f.quote_id}`} className="block hover:underline">
                      {f.customer_name} · {f.detail}
                    </Link>
                  ) : (
                    <p key={i}>
                      {f.customer_name} · {f.detail}
                    </p>
                  )
                )
              )}
            </Block>
            <Block title="Solicitudes nuevas" count={data.requests.length} to="/quotes">
              {data.requests.length === 0 ? (
                <Empty text="Ninguna" />
              ) : (
                data.requests.map((r) => (
                  <Link key={r.id} to={`/quotes/${r.id}`} className="block hover:underline">
                    {r.customer_name}
                    {r.material ? ` · ${short(r.material, 34)}` : ''}
                  </Link>
                ))
              )}
            </Block>
            <Block title="Pendientes" count={openTotal} to="/tasks">
              {Object.entries(data.open_by_section)
                .filter(([, n]) => n > 0)
                .map(([section, n]) => (
                  <p key={section}>
                    {section}: {n}
                  </p>
                ))}
              {data.closed_tasks.length > 0 && (
                <p className="text-green-700">Cerrados hoy: {data.closed_tasks.length}</p>
              )}
              <div className="pt-2">
                <CopyButton label="Copiar PENDIENTES" getText={async () => (await fetchPendientesText()).data.text} />
              </div>
            </Block>
            <Block title="Por cobrar" count={money(data.receivable.total)} to="/sales">
              {data.receivable.rows.length === 0 ? (
                <Empty text="Nadie debe de sus ventas registradas" />
              ) : (
                data.receivable.rows.slice(0, 6).map((r, i) => (
                  <p key={i}>
                    {r.customer_name} · <span className="text-red-600">{money(r.pending)}</span>
                  </p>
                ))
              )}
            </Block>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 lg:sticky lg:top-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Reporte HOY</h2>
              <CopyButton label="Copiar HOY" getText={() => hoyText} />
            </div>
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-2 items-center text-sm">
              <label htmlFor="hoy-atencion" className="text-gray-500">
                Atención al cliente
              </label>
              <input
                id="hoy-atencion"
                value={atencion}
                onChange={(e) => setAtencion(e.target.value)}
                inputMode="numeric"
                placeholder="¿cuántos?"
                className="w-24 px-2 py-1 border border-gray-200 rounded-md"
              />
              <label htmlFor="hoy-bloqueantes" className="text-gray-500 self-start pt-1">
                Bloqueantes
              </label>
              <textarea
                id="hoy-bloqueantes"
                value={bloqueantes}
                onChange={(e) => setBloqueantes(e.target.value)}
                rows={2}
                className="px-2 py-1 border border-gray-200 rounded-md"
              />
              <label htmlFor="hoy-manana" className="text-gray-500 self-start pt-1">
                Prioritario mañana
              </label>
              <textarea
                id="hoy-manana"
                value={manana}
                onChange={(e) => setManana(e.target.value)}
                rows={3}
                placeholder="Una línea por pendiente"
                className="px-2 py-1 border border-gray-200 rounded-md"
              />
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-gray-50 border border-gray-100 rounded-lg p-3 max-h-[50vh] overflow-y-auto">
              {hoyText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
