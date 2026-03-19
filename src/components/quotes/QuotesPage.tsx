import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText } from 'lucide-react';
import { listQuotes, getQuoteStats } from '@/utils/quotesApi';
import type { Quote, QuoteStats } from '@/types/quotes';
import QuoteStatusBadge from './QuoteStatusBadge';
import MainLayout from '@/components/layout/MainLayout';

const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'viewed', label: 'Vistas' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'expired', label: 'Expiradas' },
];

export default function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const [quotesRes, statsRes] = await Promise.all([
        listQuotes({ status: statusFilter || undefined, search: searchQuery || undefined }),
        getQuoteStats(),
      ]);
      setQuotes(quotesRes.data);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cotizaciones B2B</h1>
            <p className="text-sm text-gray-500 mt-1">Gestiona cotizaciones para tus clientes</p>
          </div>
          <button
            onClick={() => navigate('/quotes/new')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nueva cotización
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Este mes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_this_month}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Aceptadas (MXN)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">${stats.accepted_value.toLocaleString('es-MX')}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Enviadas</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.pending_sent}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Vistas</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending_viewed}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o número..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === f.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quote List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No hay cotizaciones{statusFilter ? ` con estado "${statusFilter}"` : ''}</p>
            <button
              onClick={() => navigate('/quotes/new')}
              className="text-blue-600 font-medium text-sm hover:text-blue-700"
            >
              Crear la primera cotización →
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Cotización</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Estado</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Total</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => navigate(`/quotes/${quote.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{quote.quote_number}</p>
                      <span className="md:hidden"><QuoteStatusBadge status={quote.status} /></span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{quote.customer_name}</p>
                      <p className="text-xs text-gray-400">{quote.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <QuoteStatusBadge status={quote.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-400">{quote.items.length} items</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <p className="text-xs text-gray-500">{formatDate(quote.created_at)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
