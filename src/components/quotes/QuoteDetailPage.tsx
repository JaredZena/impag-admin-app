import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { getQuote, sendQuote, deleteQuote } from '@/utils/quotesApi';
import type { Quote } from '@/types/quotes';
import QuoteStatusBadge from './QuoteStatusBadge';
import QuoteItemRow from './QuoteItemRow';
import MainLayout from '@/components/layout/MainLayout';

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    getQuote(parseInt(id))
      .then(setQuote)
      .catch(() => navigate('/quotes'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSend = async () => {
    if (!quote) return;
    if (!confirm('¿Enviar esta cotización? Se generará un enlace para el cliente.')) return;

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return <MainLayout><div className="p-6 text-center text-gray-400">Cargando...</div></MainLayout>;
  }

  if (!quote) {
    return <MainLayout><div className="p-6 text-center text-gray-400">Cotización no encontrada</div></MainLayout>;
  }

  const quoteUrl = quote.access_token
    ? `https://todoparaelcampo.com.mx/cotizacion/${quote.access_token}`
    : null;

  return (
    <MainLayout>
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

        {/* Line Items */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Productos</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Descripción</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase py-2">Cant.</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Precio</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <QuoteItemRow
                  key={item.id}
                  item={item}
                  onUpdate={() => {}}
                  onDelete={() => {}}
                  editable={false}
                />
              ))}
            </tbody>
          </table>

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
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span>Total MXN:</span>
                  <span>${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Notas</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
