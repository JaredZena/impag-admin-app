import { useState } from 'react';
import { AlertTriangle, FileText, MessageSquareText, X } from 'lucide-react';
import { captureQuote, captureQuotePdf } from '@/utils/quotesApi';
import type { CaptureQuoteResult, Quote } from '@/types/quotes';
import QuoteStatusBadge from './QuoteStatusBadge';

interface CaptureQuoteDialogProps {
  onClose: () => void;
  onSaved: (quote: Quote) => void;
}

const PLACEHOLDER = `*Cotización Enviada 400926DGO*
Cliente: Miguel Cordero
Ubicación: Nuevo Ideal, Dgo
Entrega: *Nuevo Ideal, Dgo*
Material/Proyecto:
Bolsa para vivero 17x17`;

const todayLocal = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const MAX_PDF_BYTES = 15 * 1024 * 1024;

// Registrar una cotización hecha fuera de la app pegando el mensaje
// *Cotización Enviada* que Hernán ya manda al grupo, y/o adjuntando el PDF
// (de ahí salen el total y la fecha). Primero vista previa (dry_run), luego
// guardar. Un folio que ya existe se registra como reenvío.
export default function CaptureQuoteDialog({ onClose, onSaved }: CaptureQuoteDialogProps) {
  const [text, setText] = useState('');
  const [total, setTotal] = useState('');
  const [phone, setPhone] = useState('');
  const [sentDate, setSentDate] = useState(todayLocal());
  const [dateTouched, setDateTouched] = useState(false);
  const [pdf, setPdf] = useState<File | null>(null);
  const [preview, setPreview] = useState<CaptureQuoteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = () => ({
    text,
    total: total.trim() || undefined,
    customer_phone: phone.trim() || undefined,
    sent_date: sentDate || undefined,
  });

  // Con PDF, sin fecha tocada a mano, el backend usa la «Fecha:» del PDF.
  const submit = (dryRun: boolean) =>
    pdf
      ? captureQuotePdf({
          file: pdf,
          text,
          customer_phone: phone.trim() || undefined,
          sent_date: dateTouched ? sentDate : undefined,
          dry_run: dryRun,
        })
      : captureQuote(dryRun ? { ...payload(), dry_run: true } : payload());

  const handlePdf = (file: File | null) => {
    setError(null);
    if (file && file.size > MAX_PDF_BYTES) {
      setError('El PDF pesa más de 15 MB.');
      return;
    }
    setPdf(file);
  };

  const handleReview = async () => {
    setBusy(true);
    setError(null);
    try {
      setPreview(await submit(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el mensaje');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await submit(false);
      if (result.quote) onSaved(result.quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const p = preview?.preview;
  const previewTotal =
    p?.total != null ? money(p.total) : !pdf && total.trim() ? total.trim() : '—';
  const previewDate = dateTouched || !p?.pdf_date ? sentDate : p.pdf_date;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Registrar cotización desde WhatsApp"
        className="w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquareText size={16} className="text-green-600" />
            Registrar desde WhatsApp
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {!p ? (
            <>
              <div>
                <label
                  htmlFor="capture-pdf"
                  className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40"
                >
                  <FileText size={20} className={pdf ? 'text-red-600' : 'text-gray-400'} />
                  <span className="flex-1 min-w-0 text-sm">
                    {pdf ? (
                      <span className="block truncate font-medium text-gray-900">{pdf.name}</span>
                    ) : (
                      <>
                        <span className="block font-medium text-gray-700">Adjunta el PDF de la cotización</span>
                        <span className="block text-xs text-gray-400">
                          De ahí salen el folio, el total y la fecha; queda guardado con la cotización.
                        </span>
                      </>
                    )}
                  </span>
                  {pdf && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePdf(null);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Quitar
                    </button>
                  )}
                </label>
                <input
                  id="capture-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    handlePdf(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </div>
              <div>
                <label htmlFor="capture-text" className="block text-xs font-medium text-gray-600 mb-1">
                  Pega el mensaje «Cotización Enviada» o «Solicitud de Cotización»{pdf ? ' (opcional)' : ''}
                </label>
                <textarea
                  id="capture-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={PLACEHOLDER}
                  rows={7}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="capture-total" className="block text-xs font-medium text-gray-600 mb-1">
                    Total del PDF
                  </label>
                  <input
                    id="capture-total"
                    value={pdf ? '' : total}
                    onChange={(e) => setTotal(e.target.value)}
                    disabled={!!pdf}
                    inputMode="decimal"
                    placeholder={pdf ? 'Del PDF' : '$0.00'}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label htmlFor="capture-phone" className="block text-xs font-medium text-gray-600 mb-1">
                    Teléfono del cliente
                  </label>
                  <input
                    id="capture-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="618 123 4567"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="capture-date" className="block text-xs font-medium text-gray-600 mb-1">
                    Fecha de envío{pdf && !dateTouched ? ' (la del PDF)' : ''}
                  </label>
                  <input
                    id="capture-date"
                    type="date"
                    value={pdf && !dateTouched ? '' : sentDate}
                    max={todayLocal()}
                    onChange={(e) => {
                      setSentDate(e.target.value);
                      setDateTouched(true);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Con el teléfono, el seguimiento automático puede preparar el recordatorio por WhatsApp.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                {p.kind === 'request' ? (
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    {p.action === 'created' ? 'Nueva solicitud' : 'Ya tenía solicitud abierta'}{' '}
                    <span className="font-mono">{p.quote_number}</span>
                    <QuoteStatusBadge status="requested" />
                  </p>
                ) : p.action === 'converted' ? (
                  <p className="font-medium text-gray-900">
                    Cotización <span className="font-mono">{p.quote_number}</span> de la solicitud{' '}
                    <span className="font-mono">{p.request_number}</span>
                    {p.existing ? ` (${p.existing.customer_name})` : ''}
                  </p>
                ) : p.action === 'created' ? (
                  <p className="font-medium text-gray-900">
                    Nueva cotización <span className="font-mono">{p.quote_number}</span>
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      Reenvío de <span className="font-mono">{p.quote_number}</span>
                      {p.tag ? ` (${p.tag})` : ''}
                    </p>
                    {p.existing && (
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        Hoy: <QuoteStatusBadge status={p.existing.status} /> {money(p.existing.total)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-gray-500">Cliente</dt>
                <dd className="text-gray-900">{p.customer_name}</dd>
                <dt className="text-gray-500">Ubicación</dt>
                <dd className="text-gray-900">{p.customer_location || '—'}</dd>
                <dt className="text-gray-500">Entrega</dt>
                <dd className="text-gray-900">{p.delivery || '—'}</dd>
                <dt className="text-gray-500">Material</dt>
                <dd className="text-gray-900">{p.material || '—'}</dd>
                {p.phone && (
                  <>
                    <dt className="text-gray-500">Teléfono</dt>
                    <dd className="text-gray-900">{p.phone}</dd>
                  </>
                )}
                {p.datos && (
                  <>
                    <dt className="text-gray-500">Datos</dt>
                    <dd className="text-gray-900">{p.datos}</dd>
                  </>
                )}
                {p.kind !== 'request' && (
                  <>
                    <dt className="text-gray-500">Total</dt>
                    <dd className="text-gray-900">{previewTotal}</dd>
                  </>
                )}
                <dt className="text-gray-500">{p.kind === 'request' ? 'Solicitada' : 'Enviada'}</dt>
                <dd className="text-gray-900">{previewDate.split('-').reverse().join('/')}</dd>
                {p.contexto && (
                  <>
                    <dt className="text-gray-500">Contexto</dt>
                    <dd className="text-gray-900">{p.contexto}</dd>
                  </>
                )}
                {pdf && (
                  <>
                    <dt className="text-gray-500">PDF</dt>
                    <dd className="text-gray-900 truncate">{pdf.name}</dd>
                  </>
                )}
              </dl>
              {preview.warnings.length > 0 && (
                <ul className="rounded-lg bg-amber-50 border border-amber-100 p-3 space-y-1">
                  {preview.warnings.map((w) => (
                    <li key={w} className="text-xs text-amber-800 flex gap-1.5">
                      <AlertTriangle size={14} className="shrink-0 mt-px" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          {!p ? (
            <button
              type="button"
              onClick={handleReview}
              disabled={busy || (!text.trim() && !pdf)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Leyendo...' : 'Revisar'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {busy
                  ? 'Guardando...'
                  : p.kind === 'request'
                    ? 'Registrar solicitud'
                    : p.action === 'converted'
                      ? 'Registrar cotización'
                      : p.action === 'created'
                        ? 'Registrar'
                        : 'Registrar reenvío'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
