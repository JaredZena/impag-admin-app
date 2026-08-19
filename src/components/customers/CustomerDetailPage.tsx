import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, ApiError } from '@/utils/api';
import MainLayout from '@/components/layout/MainLayout';
import { useNotifications } from '@/components/ui/notification';
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge';
import type { QuoteStatus } from '@/types/quotes';
import { formatCurrency } from '@/utils/currencyUtils';
import { getFileViewUrl } from '@/utils/filesApi';
import { formatDate } from '@/utils/dateUtils';
import { SOURCE_CLS, SV_TAG, relativeTime } from './customerShared';

interface CustomerInfo {
  id: number;
  display_name: string | null;
  phone_e164: string | null;
  location: string | null;
  source: string | null;
  has_purchased: boolean;
  tags: string[];
  last_activity_at: string | null;
  email: string | null;
  rfc: string | null;
  first_seen_at: string | null;
}

interface WaConversation {
  id: number;
  customer_phone: string;
  message_count: number;
  last_message_at: string | null;
}

interface CustomerQuote {
  id: number;
  quote_number: string;
  status: string;
  created_at: string | null;
  total?: number | null;
  sent_at?: string | null;
  accepted_at?: string | null;
}

interface CustomerDocument {
  id: number;
  filename: string;
  category: string;
  document_date: string | null;
}

interface AiQuotation {
  id: number;
  title: string | null;
  created_at: string | null;
}

const TH_CLS = 'px-3 py-2 sm:px-4 text-left text-xs font-semibold text-gray-600';
const TD_CLS = 'px-3 py-2.5 sm:px-4';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [aiQuotations, setAiQuotations] = useState<AiQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTag, setUpdatingTag] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Backend returns {customer, conversations, quotes, documents, ai_quotations}
        const r = await apiRequest(`/customers/${id}`);
        if (cancelled) return;
        setCustomer(r.customer);
        setConversations(r.conversations || []);
        setQuotes(r.quotes || []);
        setDocuments(r.documents || []);
        setAiQuotations(r.ai_quotations || []);
      } catch (e) {
        if (cancelled) return;
        const notFound = e instanceof ApiError && e.status === 404;
        addNotification({
          type: 'error',
          title: notFound ? 'Cliente no encontrado' : 'Error al cargar el cliente',
          message: notFound
            ? 'El cliente que buscas no existe o fue eliminado.'
            : 'No se pudo obtener el detalle del cliente. Intenta de nuevo.',
        });
        navigate('/customers', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, addNotification, navigate]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/customers');
  };

  const toggleSembradoVida = async () => {
    if (!customer || updatingTag) return;
    const prevTags = customer.tags || [];
    const isSV = prevTags.includes(SV_TAG);
    const nextTags = isSV ? prevTags.filter(t => t !== SV_TAG) : [...prevTags, SV_TAG];

    // Optimistic update with rollback on failure
    setCustomer(c => (c ? { ...c, tags: nextTags } : c));
    setUpdatingTag(true);
    try {
      await apiRequest(`/customers/${customer.id}`, { method: 'PATCH', body: JSON.stringify({ tags: nextTags }) });
    } catch {
      setCustomer(c => (c ? { ...c, tags: prevTags } : c));
      addNotification({ type: 'error', title: 'No se pudo actualizar la etiqueta', message: 'El cambio de Sembrando Vida no se guardó. Intenta de nuevo.' });
    } finally {
      setUpdatingTag(false);
    }
  };

  const openDocument = async (docId: number) => {
    if (viewingDocId !== null) return;
    setViewingDocId(docId);
    // Open the tab synchronously (inside the click's activation) so Safari and
    // slow responses don't trip the popup blocker; point it once we have the URL.
    const win = window.open('', '_blank');
    try {
      const { url } = await getFileViewUrl(docId);
      if (win) {
        win.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    } catch {
      win?.close();
      addNotification({ type: 'error', title: 'No se pudo abrir el documento', message: 'No se pudo generar el enlace de vista. Intenta de nuevo.' });
    } finally {
      setViewingDocId(null);
    }
  };

  const isSV = (customer?.tags || []).includes(SV_TAG);

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <button onClick={goBack} className="text-sm text-green-700 hover:text-green-800 hover:underline mb-3 inline-flex items-center gap-1">
          ← Clientes
        </button>

        {loading || !customer ? (
          <div className="space-y-4 animate-pulse">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <div className="h-6 bg-gray-200 rounded w-56 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-72 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-48" />
            </div>
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
                <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{customer.display_name || '(sin nombre)'}</h1>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {customer.source && (
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${SOURCE_CLS[customer.source] || 'text-gray-500 bg-gray-50'}`}>{customer.source}</span>
                    )}
                    {customer.has_purchased && (
                      <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Compró</span>
                    )}
                    {(customer.tags || []).map(t => (
                      <span
                        key={t}
                        className={`text-[11px] px-2 py-0.5 rounded-full ${t === SV_TAG ? 'text-emerald-700 bg-emerald-50' : 'text-gray-600 bg-gray-100'}`}
                      >
                        {t === SV_TAG ? '🌱 Sembrando Vida' : t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={toggleSembradoVida}
                  disabled={updatingTag}
                  className={`shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    isSV
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {isSV ? 'Quitar 🌱 Sembrando Vida' : 'Marcar 🌱 Sembrando Vida'}
                </button>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm">
                <InfoField label="Teléfono">
                  {customer.phone_e164
                    ? <a href={`tel:${customer.phone_e164}`} className="text-blue-600 hover:underline">{customer.phone_e164}</a>
                    : '—'}
                </InfoField>
                <InfoField label="Email">
                  {customer.email
                    ? <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline break-all">{customer.email}</a>
                    : '—'}
                </InfoField>
                <InfoField label="RFC">{customer.rfc || '—'}</InfoField>
                <InfoField label="Lugar">{customer.location || '—'}</InfoField>
                <InfoField label="Cliente desde">
                  {customer.first_seen_at
                    ? <>{relativeTime(customer.first_seen_at)} <span className="text-gray-400">({formatDate(customer.first_seen_at)})</span></>
                    : '—'}
                </InfoField>
                <InfoField label="Última actividad">
                  {customer.last_activity_at
                    ? <>{relativeTime(customer.last_activity_at)} <span className="text-gray-400">({formatDate(customer.last_activity_at)})</span></>
                    : '—'}
                </InfoField>
              </dl>
            </div>

            {/* Cotizaciones */}
            <SectionCard title="Cotizaciones" count={quotes.length} emptyText="Sin cotizaciones registradas." isEmpty={quotes.length === 0}>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className={TH_CLS}>Número</th>
                      <th className={TH_CLS}>Estado</th>
                      <th className={TH_CLS}>Total</th>
                      <th className={TH_CLS}>Creada</th>
                      <th className={`hidden md:table-cell ${TH_CLS}`}>Enviada</th>
                      <th className={`hidden md:table-cell ${TH_CLS}`}>Aceptada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(qq => (
                      <tr key={qq.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                        <td className={TD_CLS}>
                          <Link to={`/quotes/${qq.id}`} className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap">{qq.quote_number}</Link>
                        </td>
                        <td className={TD_CLS}><QuoteStatusBadge status={qq.status as QuoteStatus} /></td>
                        <td className={`${TD_CLS} text-sm text-gray-700 whitespace-nowrap`}>{qq.total != null ? formatCurrency(qq.total) : '—'}</td>
                        <td className={`${TD_CLS} text-xs text-gray-400 whitespace-nowrap`}>{qq.created_at ? relativeTime(qq.created_at) : '—'}</td>
                        <td className={`hidden md:table-cell ${TD_CLS} text-xs text-gray-400 whitespace-nowrap`}>{qq.sent_at ? relativeTime(qq.sent_at) : '—'}</td>
                        <td className={`hidden md:table-cell ${TD_CLS} text-xs text-gray-400 whitespace-nowrap`}>{qq.accepted_at ? relativeTime(qq.accepted_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Conversaciones de WhatsApp */}
            <SectionCard title="Conversaciones de WhatsApp" count={conversations.length} emptyText="Sin conversaciones registradas." isEmpty={conversations.length === 0}>
              <div className="divide-y divide-gray-50">
                {conversations.map(cv => (
                  <div key={cv.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-700">{cv.customer_phone}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-3">
                      {cv.message_count} mensaje{cv.message_count !== 1 ? 's' : ''}
                      {cv.last_message_at ? ` · ${relativeTime(cv.last_message_at)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Documentos */}
            <SectionCard title="Documentos" count={documents.length} emptyText="Sin documentos." isEmpty={documents.length === 0}>
              <div className="divide-y divide-gray-50">
                {documents.map(d => (
                  <button
                    key={d.id}
                    onClick={() => openDocument(d.id)}
                    disabled={viewingDocId !== null}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors disabled:cursor-wait"
                  >
                    <span className="text-sm text-blue-600 hover:underline truncate">{d.filename}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{d.category}</span>
                      {d.document_date && <span className="text-xs text-gray-400">{formatDate(d.document_date)}</span>}
                      {viewingDocId === d.id && (
                        <svg className="w-4 h-4 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24" aria-label="Abriendo…">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Cotizaciones generadas (IA) */}
            <SectionCard title="Cotizaciones generadas (IA)" count={aiQuotations.length} emptyText="Sin cotizaciones generadas por IA." isEmpty={aiQuotations.length === 0}>
              <div className="divide-y divide-gray-50">
                {aiQuotations.map(a => (
                  <Link
                    key={a.id}
                    to={`/quotation-history/${a.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-blue-600 hover:underline truncate">{a.title || '(sin título)'}</span>
                    {a.created_at && <span className="text-xs text-gray-400 shrink-0">{relativeTime(a.created_at)}</span>}
                  </Link>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs text-gray-400 uppercase tracking-wider w-28 shrink-0">{label}</dt>
      <dd className="text-gray-700">{children}</dd>
    </div>
  );
}

function SectionCard({ title, count, emptyText, isEmpty, children }: {
  title: string;
  count: number;
  emptyText: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">
          {title} <span className="font-normal text-gray-500">({count})</span>
        </h2>
      </div>
      {isEmpty ? <p className="px-4 py-4 text-sm text-gray-400">{emptyText}</p> : children}
    </div>
  );
}
