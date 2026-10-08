import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCopy, MessageCircle, X } from 'lucide-react';
import {
  KIND_LABEL,
  OUTCOME_LABEL,
  fetchSeguimiento,
  isPhone,
  logSeguimiento,
  openWhatsApp,
  saveWaTarget,
  savedWaTarget,
  setSeguimientoOutcome,
  waDigits,
  waLinkProps,
  waUrl,
  type SeguimientoCard,
  type SeguimientoContact,
  type SeguimientoDia,
  type SeguimientoKind,
  type SeguimientoOutcome,
  type WaTarget,
} from '@/utils/seguimientoApi';

const KIND_STYLE: Record<SeguimientoKind, string> = {
  cotizacion: 'bg-blue-50 text-blue-700',
  temporada: 'bg-amber-50 text-amber-700',
  inactivo: 'bg-gray-100 text-gray-600',
};

const KindBadge = ({ kind }: { kind: SeguimientoKind }) => (
  <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${KIND_STYLE[kind]}`}>
    {KIND_LABEL[kind]}
  </span>
);

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Algo falló, intenta de nuevo');

// Los mensajes de seguimiento del día: la app elige a quién y arma el texto;
// la persona lo manda desde el WhatsApp de Impag Local.
export default function SeguimientoDelDia({ onChange }: { onChange: () => void }) {
  const [data, setData] = useState<SeguimientoDia | null>(null);
  const [extra, setExtra] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [waTarget, setWaTarget] = useState<WaTarget>(savedWaTarget);

  const load = useCallback(
    () =>
      fetchSeguimiento(extra)
        .then((res) => {
          setData(res.data);
          setError(null);
        })
        .catch((err: unknown) => setError(errorText(err))),
    [extra]
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await action();
      await load();
      onChange();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const phoneFor = (card: SeguimientoCard) => (card.wa ? card.phone : phones[card.key]?.trim() || null);
  const digitsFor = (card: SeguimientoCard) => card.wa ?? waDigits(phones[card.key] ?? '');

  const send = (card: SeguimientoCard) => {
    const digits = digitsFor(card);
    // Abrir antes del await: el navegador sólo deja abrir ventanas en el clic.
    if (digits) openWhatsApp(waUrl(digits, card.message, waTarget));
    run(card.key, () => logSeguimiento(card, phoneFor(card), card.message));
  };

  const chooseTarget = (target: WaTarget) => {
    setWaTarget(target);
    saveWaTarget(target);
  };

  const copy = async (card: SeguimientoCard) => {
    try {
      await navigator.clipboard.writeText(card.message);
      setCopied(card.key);
    } catch {
      setError('No se pudo copiar el mensaje');
    }
  };

  const notInterested = (card: SeguimientoCard) =>
    run(card.key, () => logSeguimiento(card, phoneFor(card), card.message, 'no_interesa'));

  const alreadyBought = (card: SeguimientoCard) =>
    run(card.key, () => logSeguimiento(card, phoneFor(card), card.message, 'venta'));

  const outcome = (c: SeguimientoContact, value: SeguimientoOutcome) =>
    run(`c${c.id}`, () => setSeguimientoOutcome(c.id, value));

  if (!data) {
    return error ? (
      <p className="text-sm text-red-600">{error}</p>
    ) : (
      <div className="h-24 rounded-xl bg-gray-50 animate-pulse" />
    );
  }

  const left = Object.values(data.available).reduce((a, b) => a + b, 0) - data.todo.length;
  const pct = Math.min(100, Math.round((data.done.length / data.target) * 100));

  return (
    <section className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
          <MessageCircle size={16} className="text-green-600" />
          Seguimiento del día
        </h2>
        <span className="text-sm font-bold text-gray-900">
          {data.done.length}/{data.target}
        </span>
        <div className="flex-1 min-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Cotizaciones sin respuesta, quien compró en esta temporada el año pasado y clientes que dejaron de comprar.
        El botón abre WhatsApp con el mensaje escrito; revísalo y envíalo desde Impag Local. Si ya compró, márcalo
        con «Ya compró» sin escribirle.
      </p>
      {!isPhone() && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
          <span>Abrir en:</span>
          {(
            [
              ['app', 'App de escritorio'],
              ['web', 'WhatsApp Web'],
            ] as [WaTarget, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={waTarget === value}
              onClick={() => chooseTarget(value)}
              className={`px-2 py-0.5 rounded-full border ${
                waTarget === value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          {waTarget === 'app' && <span>La primera vez Chrome pregunta: marca «Permitir siempre» y Abrir.</span>}
        </div>
      )}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {data.todo.length === 0 ? (
        <div className="text-sm text-gray-500 py-2 flex flex-wrap items-center gap-3">
          {data.done.length > 0 ? 'Listo por hoy.' : 'No hay a quién escribir hoy.'}
          {left > 0 && (
            <button type="button" onClick={() => setExtra(extra + 10)} className="text-blue-600 hover:underline">
              Agregar 10 más
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.todo.map((card) => {
            const digits = digitsFor(card);
            const isBusy = busy === card.key;
            return (
              <li key={card.key} className="py-3 flex flex-col lg:flex-row lg:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-gray-900 truncate">{card.customer_name}</span>
                    <KindBadge kind={card.kind} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{card.reason}</p>
                  <p className="text-xs text-gray-700 mt-1 line-clamp-2" title={card.message}>
                    {card.message}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!card.wa && (
                    <input
                      value={phones[card.key] ?? ''}
                      onChange={(e) => setPhones({ ...phones, [card.key]: e.target.value })}
                      inputMode="tel"
                      placeholder="Teléfono"
                      aria-label={`Teléfono de ${card.customer_name}`}
                      className="w-32 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                    />
                  )}
                  <button
                    type="button"
                    disabled={!digits || isBusy}
                    onClick={() => send(card)}
                    title={digits ? 'Abrir WhatsApp con el mensaje' : 'Escribe el teléfono o copia el mensaje'}
                    className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>
                  {!digits &&
                    (copied === card.key ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => send(card)}
                        className="inline-flex items-center gap-1.5 border border-green-600 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-50"
                      >
                        <Check size={14} />
                        Marcar enviado
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => copy(card)}
                        title="Copia el mensaje para pegarlo en su chat"
                        className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                      >
                        <ClipboardCopy size={14} />
                        Copiar
                      </button>
                    ))}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => alreadyBought(card)}
                    title={
                      card.kind === 'cotizacion'
                        ? 'Ya compró: cerrar la cotización como Aceptada, sin escribirle'
                        : 'Ya compró: quitarlo de la lista, sin escribirle'
                    }
                    className="border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
                  >
                    Ya compró
                  </button>
                  {confirming === card.key ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => notInterested(card)}
                        className="bg-red-600 text-white px-2 py-1.5 rounded-lg hover:bg-red-700"
                      >
                        {card.kind === 'cotizacion' ? 'Sí, cotización perdida' : 'Sí, quitar'}
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className="px-2 py-1.5 text-gray-500">
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(card.key)}
                      title="No le interesa: no volver a mostrar"
                      aria-label={`No le interesa: ${card.customer_name}`}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data.done.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <button type="button" onClick={() => setShowDone(!showDone)} className="text-xs text-gray-600 hover:underline">
            {showDone ? 'Ocultar' : 'Ver'} enviados hoy ({data.done.length})
          </button>
          {showDone && (
            <ul className="mt-2 space-y-2">
              {data.done.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-900">{c.customer_name}</span>
                  <KindBadge kind={c.kind} />
                  {c.wa && (
                    <a {...waLinkProps(waUrl(c.wa, undefined, waTarget))} className="text-xs text-green-700 hover:underline">
                      abrir chat
                    </a>
                  )}
                  <span className="flex gap-1 ml-auto">
                    {(['respondio', 'venta', 'no_interesa'] as SeguimientoOutcome[]).map((o) => (
                      <button
                        key={o}
                        type="button"
                        disabled={busy === `c${c.id}` || c.outcome === o}
                        onClick={() => outcome(c, o)}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          c.outcome === o
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {OUTCOME_LABEL[o]}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
