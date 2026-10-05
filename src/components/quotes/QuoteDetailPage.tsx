import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Copy, Check, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { getQuote, sendQuote, deleteQuote, updateQuote } from '@/utils/quotesApi';
import type { Quote } from '@/types/quotes';
import QuoteStatusBadge from './QuoteStatusBadge';
import PaymentStatusChip from './PaymentStatusChip';
import WebOrderPanel from './WebOrderPanel';
import { isWebOrder, parseWebOrderNotes, stripWebOrderBlock } from '@/utils/webOrder';
import QuoteItemsEditor from './QuoteItemsEditor';
import { needsFleteLine } from '@/utils/quoteItemsEdit';
import QuoteStatusPanel from './QuoteStatusPanel';
import QuotePdfPanel from './QuotePdfPanel';
import NextStepCard from './NextStepCard';
import { parseQuoteNotes, whatsappLink } from '@/utils/quoteNotes';

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  // Total plano (cotización registrada desde el PDF / WhatsApp, sin productos).
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState('');
  const [totalError, setTotalError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getQuote(parseInt(id))
      .then(setQuote)
      .catch(() => navigate('/quotes'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSend = async () => {
    if (!quote) return;
    if (isWebOrder(quote)) {
      // Pedido web: el cliente paga lo que diga la cotización al enviarla.
      if (quote.items.some((i) => i.unit_price <= 0)) {
        alert('Hay productos sin precio. Edita los productos y captura el precio antes de enviar.');
        return;
      }
      const details = parseWebOrderNotes(quote.notes);
      if (
        needsFleteLine(details, quote.items.map((i) => i.description)) &&
        !confirm('El cliente pidió envío y la cotización no cobra flete. ¿Enviarla así?')
      ) {
        return;
      }
    }
    const who = isWebOrder(quote) && quote.customer_email ? ' y se le avisará al cliente por correo' : '';
    if (!confirm(`¿Enviar esta cotización? Se generará un enlace para el cliente${who}.`)) return;

    setSending(true);
    try {
      const result = await sendQuote(quote.id);
      setQuote(result.data);
      // Auto-copy link
      await navigator.clipboard.writeText(result.quote_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to send quote:', err);
      alert('Error al enviar la cotización');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!quote?.access_token) return;
    const url = `https://todoparaelcampo.com.mx/cotizacion/${quote.access_token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDelete = async () => {
    if (!quote) return;
    if (!confirm('¿Eliminar este borrador?')) return;
    try {
      await deleteQuote(quote.id);
      navigate('/quotes');
    } catch (err) {
      console.error('Failed to delete quote:', err);
      alert('Error al eliminar');
    }
  };

  const handleSaveTotal = async () => {
    if (!quote) return;
    const value = Number(totalInput.replace(/[^\d.]/g, ''));
    if (!totalInput.trim() || !Number.isFinite(value)) {
      setTotalError('Total no válido');
      return;
    }
    try {
      setQuote(await updateQuote(quote.id, { total: value }));
      setEditingTotal(false);
      setTotalError(null);
    } catch (err) {
      setTotalError(err instanceof Error ? err.message : 'No se pudo guardar el total');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return <><div className="p-6 text-center text-gray-400">Cargando...</div></>;
  }

  if (!quote) {
    return <><div className="p-6 text-center text-gray-400">Cotización no encontrada</div></>;
  }

  const quoteUrl = quote.access_token
    ? `https://todoparaelcampo.com.mx/cotizacion/${quote.access_token}`
    : null;

  // Pedidos web: entrega y factura vienen en un bloque JSON dentro de las notas.
  // Se muestran en el panel "Pedido web" y se quitan de "Notas" para no repetirlos.
  const webOrder = isWebOrder(quote) ? parseWebOrderNotes(quote.notes) : null;
  const visibleNotes = webOrder && quote.notes ? stripWebOrderBlock(quote.notes, webOrder.raw) : quote.notes;
  // Registradas desde WhatsApp / PDF: lo que se cotiza va arriba, el resto es historial.
  const summary = parseQuoteNotes(visibleNotes);
  const hasSummary = summary.material !== null || summary.fields.length > 0;
  const chatUrl = whatsappLink(quote.customer_phone);
  const isRequest = quote.status === 'requested';

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/quotes')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{quote.quote_number}</h1>
                <QuoteStatusBadge status={quote.status} />
                <PaymentStatusChip status={quote.payment_status} />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Creada {formatDate(quote.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {quote.status === 'draft' && (
              <>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || quote.items.length === 0}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={16} />
                  {sending ? 'Enviando...' : 'Enviar cotización'}
                </button>
              </>
            )}
            {quoteUrl && (
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar enlace'}
              </button>
            )}
          </div>
        </div>

        {/* Siguiente paso: qué hacer, quién y para cuándo */}
        <NextStepCard quote={quote} onChanged={setQuote} />

        {/* Quote URL banner */}
        {quoteUrl && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Enlace para el cliente</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-blue-800 bg-blue-100/50 rounded px-2 py-1 truncate">{quoteUrl}</code>
              <a href={quoteUrl} target="_blank" rel="noopener" className="p-1.5 text-blue-600 hover:text-blue-800">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        )}

        {/* Customer Info */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Cliente</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Nombre</p>
              <p className="font-medium text-gray-900">{quote.customer_name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Teléfono</p>
              <p className="font-medium text-gray-900">{quote.customer_phone}</p>
              {chatUrl && (
                <a
                  href={chatUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                >
                  <ExternalLink size={12} />
                  Abrir WhatsApp
                </a>
              )}
            </div>
            {quote.customer_email && (
              <div>
                <p className="text-gray-500 text-xs">Email</p>
                <p className="font-medium text-gray-900">{quote.customer_email}</p>
              </div>
            )}
            {quote.customer_location && (
              <div>
                <p className="text-gray-500 text-xs">Ubicación</p>
                <p className="font-medium text-gray-900">{quote.customer_location}</p>
              </div>
            )}
          </div>
        </div>

        {/* Qué se cotiza (de la solicitud / el mensaje / el PDF) */}
        {hasSummary && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              {isRequest ? 'Solicitud' : 'Qué se cotiza'}
            </h2>
            {summary.material && (
              <p className="text-base font-medium text-gray-900 mb-3">{summary.material}</p>
            )}
            {summary.fields.length > 0 && (
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                {summary.fields.map((f, i) => (
                  <div key={`${f.label}-${i}`} className="contents">
                    <dt className="text-gray-500">{f.label}</dt>
                    <dd className="text-gray-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        {/* Estado manual (no aplica a borradores ni a pedidos web) */}
        {quote.status !== 'draft' && !isWebOrder(quote) && (
          <QuoteStatusPanel quote={quote} onChanged={setQuote} />
        )}

        {/* Pedido web (solo lectura) */}
        <WebOrderPanel quote={quote} details={webOrder} />

        {/* PDF enviado al cliente (cotizaciones COT-IMPAG hechas fuera de la app) */}
        {(quote.quote_number.startsWith('COT-IMPAG-') || quote.status === 'requested') && (
          <QuotePdfPanel quote={quote} onQuoteChanged={setQuote} />
        )}

        {/* Timeline */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Actividad</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Creada:</span><span>{formatDate(quote.created_at)}</span></div>
            {quote.sent_at && <div className="flex justify-between"><span className="text-gray-500">Enviada:</span><span>{formatDate(quote.sent_at)}</span></div>}
            {quote.viewed_at && <div className="flex justify-between"><span className="text-gray-500">Vista por cliente:</span><span className="text-yellow-600 font-medium">{formatDate(quote.viewed_at)}</span></div>}
            {quote.accepted_at && <div className="flex justify-between"><span className="text-gray-500">Aceptada:</span><span className="text-green-600 font-bold">{formatDate(quote.accepted_at)}</span></div>}
            {quote.expired_at && <div className="flex justify-between"><span className="text-gray-500">Expirada:</span><span className="text-gray-400">{formatDate(quote.expired_at)}</span></div>}
          </div>
        </div>

        {/* Line Items (una solicitud Por cotizar todavía no tiene productos ni total) */}
        {!(isRequest && quote.items.length === 0) && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <QuoteItemsEditor quote={quote} webOrder={webOrder} onChanged={setQuote} />

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>${quote.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IVA (16%):</span>
                    <span>${quote.iva_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total MXN:</span>
                    {editingTotal ? (
                      <span className="flex items-center gap-1">
                        <input
                          value={totalInput}
                          onChange={(e) => setTotalInput(e.target.value)}
                          inputMode="decimal"
                          aria-label="Total del PDF"
                          autoFocus
                          className="w-28 px-2 py-1 text-sm font-normal border border-gray-200 rounded-md text-right"
                        />
                        <button onClick={handleSaveTotal} className="p-1 text-green-600" aria-label="Guardar total">
                          <Check size={16} />
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        {quote.items.length === 0 && quote.status !== 'draft' && !isWebOrder(quote) && (
                          <button
                            onClick={() => {
                              setTotalInput(quote.total ? String(quote.total) : '');
                              setEditingTotal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            aria-label="Editar total"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  {quote.items.length === 0 && (
                    <p className="text-xs text-gray-400 text-right">Total del PDF (IVA según la cotización)</p>
                  )}
                  {totalError && <p className="text-xs text-red-600 text-right">{totalError}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes: con resumen arriba, aquí sólo queda el historial */}
        {hasSummary ? (
          summary.history.length + summary.other.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Historial</h2>
              <ul className="space-y-1 text-sm text-gray-600">
                {[...summary.other, ...summary.history].map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )
        ) : (
          visibleNotes && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Notas</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{visibleNotes}</p>
            </div>
          )
        )}
      </div>
    </>
  );
}
