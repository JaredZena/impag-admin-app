import { useState } from 'react';
import { CalendarClock, Check, Pencil, Plus, UserRound } from 'lucide-react';
import { setQuoteNextAction } from '@/utils/quotesApi';
import type { Quote } from '@/types/quotes';
import { useAuth } from '@/contexts/AuthContext';
import { OPEN_QUOTE_STATUSES } from './quoteListPaging';
import {
  DUE_TONE_CLASS,
  NEXT_ACTION_MAX,
  NEXT_ACTION_OWNERS,
  dueLabel,
  normalizeOwner,
  ownerForUser,
  parseYmd,
  quickDueOptions,
  toYmd,
} from './nextAction';

interface NextStepCardProps {
  quote: Quote;
  onChanged: (quote: Quote) => void;
}

// Lo que más se escribe, para no teclear en el teléfono.
const QUICK_TEXTS = ['Mandar seguimiento por WhatsApp', 'Llamar al cliente', 'Mandar la cotización', 'Confirmar pago', 'Agendar entrega'];

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'No se pudo guardar el siguiente paso.');

// «Siguiente paso» de la cotización: qué hacer, quién y para cuándo
// (PUT /quotes/{id}/next-action). «Hecho» lo borra y pregunta qué sigue.
export default function NextStepCard({ quote, onChanged }: NextStepCardProps) {
  const { user } = useAuth();
  const me = ownerForUser(user);
  const [editing, setEditing] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [text, setText] = useState('');
  const [owner, setOwner] = useState<string | null>(null);
  const [due, setDue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = quote.next_action?.trim() || null;
  const currentOwner = normalizeOwner(quote.next_action_owner);
  const currentDue = dueLabel(quote.next_action_due);
  const isOpen = (OPEN_QUOTE_STATUSES as readonly string[]).includes(quote.status);

  const openEditor = (fill: { text: string; owner: string | null; due: string | null }) => {
    setText(fill.text);
    setOwner(fill.owner);
    setDue(fill.due);
    setError(null);
    setEditing(true);
  };

  const startChange = () => {
    setJustDone(false);
    const dueDate = parseYmd(quote.next_action_due);
    openEditor({ text: current ?? '', owner: currentOwner ?? me, due: dueDate ? toYmd(dueDate) : null });
  };

  const handleDone = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await setQuoteNextAction(quote.id, { next_action: null, owner: null, due: null });
      onChanged(updated);
      setJustDone(true);
      // Lo más común es que el mismo responsable siga con el cliente.
      openEditor({ text: '', owner: currentOwner ?? me, due: null });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      onChanged(await setQuoteNextAction(quote.id, { next_action: trimmed, owner, due }));
      setEditing(false);
      setJustDone(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setEditing(false);
    setJustDone(false);
    setError(null);
  };

  if (editing) {
    const today = new Date();
    const quickDues = quickDueOptions(today);
    const owners: string[] = [...NEXT_ACTION_OWNERS];
    if (owner && !owners.includes(owner)) owners.push(owner);
    const chosenDue = dueLabel(due, today);
    const chip = (active: boolean) =>
      `px-3 py-2 rounded-full border text-sm font-medium transition-colors ${
        active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
      }`;

    return (
      <section aria-labelledby="siguiente-paso-title" className="bg-white border-2 border-blue-200 rounded-xl p-4 md:p-6 mb-6">
        {justDone && (
          <p className="flex items-center gap-1.5 text-sm text-green-700 mb-1">
            <Check size={16} />
            Listo, quedó como hecho.
          </p>
        )}
        <h2 id="siguiente-paso-title" className="text-lg font-semibold text-gray-900 mb-3">
          {justDone ? '¿Qué sigue?' : current ? 'Cambiar siguiente paso' : 'Siguiente paso'}
        </h2>

        <div className="flex items-baseline justify-between gap-3 mb-1">
          <label htmlFor="next-action-text" className="text-sm font-medium text-gray-700">
            Qué hay que hacer
          </label>
          <span className={`text-xs ${text.length >= NEXT_ACTION_MAX ? 'text-red-600' : 'text-gray-400'}`}>
            {text.length}/{NEXT_ACTION_MAX}
          </span>
        </div>
        <input
          id="next-action-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, NEXT_ACTION_MAX))}
          maxLength={NEXT_ACTION_MAX}
          placeholder="Ej. Mandar seguimiento por WhatsApp"
          autoComplete="off"
          className="w-full px-3 py-3 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {!text.trim() && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_TEXTS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setText(t)}
                className="px-2.5 py-1.5 text-xs rounded-md border bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <p id="next-action-owner" className="text-sm font-medium text-gray-700 mt-4 mb-1.5">
          Quién
        </p>
        <div role="group" aria-labelledby="next-action-owner" className="grid grid-cols-4 gap-2">
          {owners.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOwner(owner === o ? null : o)}
              aria-pressed={owner === o}
              className={`min-h-[48px] px-1 rounded-lg border text-sm font-semibold transition-colors ${
                owner === o
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        <p id="next-action-due" className="text-sm font-medium text-gray-700 mt-4 mb-1.5">
          Para cuándo
        </p>
        <div role="group" aria-labelledby="next-action-due" className="flex flex-wrap items-center gap-2">
          {quickDues.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => setDue(due === d.ymd ? null : d.ymd)}
              aria-pressed={due === d.ymd}
              title={d.hint}
              className={chip(due === d.ymd)}
            >
              {d.label}
              {d.label !== 'Hoy' && d.label !== 'Mañana' && (
                <span className={`ml-1 font-normal ${due === d.ymd ? 'text-gray-300' : 'text-gray-400'}`}>{d.hint}</span>
              )}
            </button>
          ))}
          <input
            type="date"
            value={due ?? ''}
            onChange={(e) => setDue(e.target.value || null)}
            aria-label="Otra fecha"
            className="px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {chosenDue ? `Para el ${chosenDue.date} (${chosenDue.text})` : 'Sin fecha'}
        </p>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="px-4 py-3 md:py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            {justDone ? 'Nada por ahora' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !text.trim()}
            className="bg-gray-900 text-white px-6 py-3 md:py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </section>
    );
  }

  if (!current) {
    if (!isOpen) return null;
    return (
      <button
        type="button"
        onClick={() => {
          setJustDone(false);
          openEditor({ text: '', owner: me, due: null });
        }}
        className="w-full flex items-center justify-between gap-3 bg-white border border-dashed border-gray-300 rounded-xl px-4 py-4 mb-6 text-left hover:border-gray-400 active:bg-gray-50"
      >
        <span className="text-sm text-gray-500">Sin siguiente paso</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
          <Plus size={16} />
          Agregar
        </span>
      </button>
    );
  }

  const overdue = currentDue?.tone === 'overdue';
  return (
    <section
      aria-labelledby="siguiente-paso-title"
      className={`border-2 rounded-xl p-4 md:p-6 mb-6 ${overdue ? 'bg-red-50/40 border-red-200' : 'bg-white border-blue-100'}`}
    >
      <h2 id="siguiente-paso-title" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Siguiente paso
      </h2>
      <p className="mt-1 text-lg md:text-xl font-semibold text-gray-900 break-words">{current}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 text-gray-700">
          <UserRound size={15} className="text-gray-400" />
          {currentOwner ?? 'Sin responsable'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock size={15} className="text-gray-400" />
          {currentDue ? (
            <>
              <span className={DUE_TONE_CLASS[currentDue.tone]}>{currentDue.text}</span>
              {currentDue.tone !== 'later' && <span className="text-gray-400">{currentDue.date}</span>}
            </>
          ) : (
            <span className="text-gray-500">Sin fecha</span>
          )}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
        <button
          type="button"
          onClick={handleDone}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 sm:py-2.5 rounded-lg text-base sm:text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
        >
          <Check size={18} />
          {busy ? 'Guardando…' : 'Hecho'}
        </button>
        <button
          type="button"
          onClick={startChange}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-3 sm:py-2.5 rounded-lg text-base sm:text-sm font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-60"
        >
          <Pencil size={16} />
          Cambiar
        </button>
      </div>
    </section>
  );
}
