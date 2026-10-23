import { useState } from 'react';
import { addDays, addMonths, parseYmd, shortDate, toYmd } from '@/components/quotes/nextAction';

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-full border text-sm ${
    on ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
  }`;

// «Posponer»: el cliente pidió que le escribieran después («hasta que le
// traigan la pastura»). Se elige el día y la tarjeta vuelve a salir ese día.
export default function PosponerPanel({
  name,
  busy,
  onConfirm,
  onCancel,
}: {
  name: string;
  busy: boolean;
  onConfirm: (due: string, reason: string) => void;
  onCancel: () => void;
}) {
  const [today] = useState(() => new Date());
  const [due, setDue] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const options = [1, 2, 3].map((n) => {
    const date = addMonths(today, n);
    return { label: n === 1 ? '1 mes' : `${n} meses`, ymd: toYmd(date), hint: shortDate(date) };
  });
  const chosen = parseYmd(due);

  return (
    <div className="w-full lg:basis-full rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
      <p className="font-medium text-gray-900 mb-2">¿Cuándo le volvemos a escribir a {name}?</p>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <button
            key={o.ymd}
            type="button"
            aria-pressed={due === o.ymd}
            onClick={() => setDue(due === o.ymd ? null : o.ymd)}
            className={chip(due === o.ymd)}
          >
            {o.label}
            <span className={`ml-1 ${due === o.ymd ? 'text-gray-300' : 'text-gray-400'}`}>{o.hint}</span>
          </button>
        ))}
        <input
          type="date"
          value={due ?? ''}
          min={toYmd(addDays(today, 1))}
          onChange={(e) => setDue(e.target.value || null)}
          aria-label="Otra fecha"
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-full bg-white"
        />
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={120}
        required
        placeholder="Motivo: qué está esperando (ej. que le llegue la pastura)"
        aria-label="Motivo"
        className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          type="button"
          disabled={!due || !reason.trim() || busy}
          title={due && !reason.trim() ? 'Escribe el motivo' : undefined}
          onClick={() => due && reason.trim() && onConfirm(due, reason)}
          className="bg-gray-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-40"
        >
          Posponer
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-gray-500">
          Cancelar
        </button>
        <span className="text-xs text-gray-500">
          {chosen
            ? `Sale otra vez aquí el ${shortDate(chosen)}, y en «Qué sigue» de Cotizaciones.`
            : 'Se quita de la lista hasta ese día; no se marca como perdida.'}
        </span>
      </div>
    </div>
  );
}
