import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/ui/Navigation';
import { apiRequest } from '@/utils/api';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import QuotationDocument from './QuotationDocument';
import InternalQuotationDocument from './InternalQuotationDocument';
import { parseDualQuotationResponse, parseQuotationMarkdown, parseInternalQuotationMarkdown } from '@/utils/quotationParser';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Quotation {
  id: number;
  user_id: string;
  user_email: string;
  user_query: string;
  title: string | null;
  customer_name: string | null;
  customer_location: string | null;
  quotation_id: string | null;
  internal_quotation: string;
  customer_quotation: string;
  raw_response: string | null;
  created_at: string;
  updated_at: string;
}

const QuotationHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiRequest('/quotation-history/');
      setQuotations(data);
    } catch (err: any) {
      console.error('Failed to load quotations:', err);
      setError(err?.message || 'Error al cargar el historial de cotizaciones.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta cotización?')) {
      return;
    }

    try {
      await apiRequest(`/quotation-history/${id}`, {
        method: 'DELETE',
      });
      setQuotations(prev => prev.filter(q => q.id !== id));
      if (selectedQuotation?.id === id) {
        setSelectedQuotation(null);
        setViewMode('list');
      }
    } catch (err: any) {
      console.error('Failed to delete quotation:', err);
      alert('Error al eliminar la cotización.');
    }
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedQuotation(null);
    setViewMode('list');
  };

  if (viewMode === 'detail' && selectedQuotation) {
    // Prioritize database columns (internal_quotation, customer_quotation) over raw_response
    // This allows manual edits to the database to be reflected in the UI
    const responseText = selectedQuotation.internal_quotation && selectedQuotation.customer_quotation
      ? `<!-- INTERNAL_QUOTATION_START -->\n${selectedQuotation.internal_quotation}\n<!-- INTERNAL_QUOTATION_END -->\n\n<!-- CUSTOMER_QUOTATION_START -->\n${selectedQuotation.customer_quotation}\n<!-- CUSTOMER_QUOTATION_END -->`
      : selectedQuotation.raw_response || '';

    const dualQuotation = parseDualQuotationResponse(responseText);

    return (
      <>
        <Navigation />
        <div className="flex flex-col min-h-screen max-w-[1400px] mx-auto px-3 py-2 pb-4 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 sm:px-4 sm:py-3 md:px-6 md:py-4 md:pb-6">
          <div className="pt-16 sm:pt-20 md:pt-16 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:text-3xl">
                  {selectedQuotation.title || 'Cotización'}
                </h1>
                <p className="text-sm text-gray-500">
                  {dayjs(selectedQuotation.created_at).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToList}
                >
                  ← Volver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(selectedQuotation.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Eliminar
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Consulta Original:</h3>
              <p className="text-gray-700">{selectedQuotation.user_query}</p>
            </div>

            {dualQuotation.internal && dualQuotation.customer ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Internal Quotation */}
                <div>
                  <Card id={`internal-quotation-history-${selectedQuotation.id}`} className="p-4 bg-gray-50 border-2 border-gray-300">
                    <div className="mb-2">
                      <h3 className="text-xs font-bold text-gray-700 uppercase mb-1">Cotización Interna</h3>
                      <p className="text-[10px] text-gray-500 italic">Uso interno - No compartir con cliente</p>
                    </div>
                    <InternalQuotationDocument
                      quotation={dualQuotation.internal}
                      fecha={new Date(selectedQuotation.created_at)}
                    />
                  </Card>

                  {/* Internal Download Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(dualQuotation.internalMarkdown || dualQuotation.rawResponse);
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const markdown = dualQuotation.internalMarkdown || dualQuotation.rawResponse;
                        const blob = new Blob([markdown], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `cotizacion_interna_${dayjs(selectedQuotation.created_at).format('YYYY-MM-DD')}.md`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Markdown
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const html2canvas = (await import('html2canvas')).default;
                        const element = document.getElementById(`internal-quotation-history-${selectedQuotation.id}`);
                        if (element) {
                          const canvas = await html2canvas(element, { scale: 2 });
                          const link = document.createElement('a');
                          link.download = `cotizacion_interna_${dayjs(selectedQuotation.created_at).format('YYYY-MM-DD')}.png`;
                          link.href = canvas.toDataURL();
                          link.click();
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      PNG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const html2canvas = (await import('html2canvas')).default;
                        const jsPDF = (await import('jspdf')).default;
                        const element = document.getElementById(`internal-quotation-history-${selectedQuotation.id}`);
                        if (element) {
                          const canvas = await html2canvas(element, {
                            scale: 2,
                            useCORS: true,
                            allowTaint: false,
                            backgroundColor: '#ffffff',
                            logging: false
                          });
                          const imgData = canvas.toDataURL('image/png');
                          const pdf = new jsPDF('p', 'mm', 'a4');
                          const imgWidth = 210;
                          const pageHeight = 297;
                          const imgHeight = (canvas.height * imgWidth) / canvas.width;
                          let heightLeft = imgHeight;
                          let position = 0;
                          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                          heightLeft -= pageHeight;
                          while (heightLeft >= 0) {
                            position = heightLeft - imgHeight;
                            pdf.addPage();
                            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                            heightLeft -= pageHeight;
                          }
                          pdf.save(`cotizacion_interna_${dayjs(selectedQuotation.created_at).format('YYYY-MM-DD')}.pdf`);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      PDF
                    </Button>
                  </div>
                </div>

                {/* Customer Quotation */}
                <div>
                  <Card id={`customer-quotation-history-${selectedQuotation.id}`} className="p-4 bg-white border border-gray-200">
                    <div className="mb-2">
                      <h3 className="text-xs font-bold text-gray-700 uppercase mb-1">Cotización para Cliente</h3>
                      <p className="text-[10px] text-gray-500 italic">Lista para compartir</p>
                    </div>
                    {dualQuotation.customer.hasTable ? (
                      <QuotationDocument
                        quotation={dualQuotation.customer}
                        fecha={new Date(selectedQuotation.created_at)}
                        customerName={selectedQuotation.customer_name || undefined}
                        customerLocation={selectedQuotation.customer_location || undefined}
                        quotationId={selectedQuotation.quotation_id || undefined}
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedQuotation.customer_quotation}
                        </ReactMarkdown>
                      </div>
                    )}
                  </Card>

                  {/* Customer Download Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(dualQuotation.customerMarkdown || dualQuotation.rawResponse);
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const markdown = dualQuotation.customerMarkdown || dualQuotation.rawResponse;
                        const blob = new Blob([markdown], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `cotizacion_cliente_${dayjs(selectedQuotation.created_at).format('YYYY-MM-DD')}.md`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Markdown
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const html2canvas = (await import('html2canvas')).default;
                        const cardElement = document.getElementById(`customer-quotation-history-${selectedQuotation.id}`);
                        if (cardElement) {
                          const quotationElement = cardElement.querySelector('[id^="quotation-doc-"]') as HTMLElement;
                          const elementToExport = quotationElement || cardElement;
                          const canvas = await html2canvas(elementToExport, { scale: 2 });
                          const link = document.createElement('a');
                          link.download = `cotizacion_cliente_${dayjs(selectedQuotation.created_at).format('YYYY-MM-DD')}.png`;
                          link.href = canvas.toDataURL();
                          link.click();
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      PNG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const html2canvas = (await import('html2canvas')).default;
                        const jsPDF = (await import('jspdf')).default;
                        const cardElement = document.getElementById(`customer-quotation-history-${selectedQuotation.id}`);
                        if (cardElement) {
                          const quotationElement = cardElement.querySelector('[id^="quotation-doc-"]') as HTMLElement;
                          const elementToExport = quotationElement || cardElement;

                          const canvas = await html2canvas(elementToExport, {
                            scale: 2,
                            useCORS: true,
                            allowTaint: false,
                            backgroundColor: '#ffffff',
                            logging: false,
                            imageTimeout: 15000,
                            removeContainer: false
                          });

                          const imgData = canvas.toDataURL('image/png');
                          const pdf = new jsPDF('p', 'mm', 'a4');
                          const imgWidth = 210;
                          const pageHeight = 297;
                          const imgHeight = (canvas.height * imgWidth) / canvas.width;

                          let heightLeft = imgHeight;
                          let position = 0;

                          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                          heightLeft -= pageHeight;

                          while (heightLeft >= 0) {
                            position = heightLeft - imgHeight;
                            pdf.addPage();
                            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                            heightLeft -= pageHeight;
                          }

                          pdf.save(`cotizacion_cliente_${dayjs(selectedQuotation.created_at).format('YYYY-MM-DD')}.pdf`);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Card className="p-4">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedQuotation.customer_quotation}
                  </ReactMarkdown>
                </div>
              </Card>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="flex flex-col min-h-screen max-w-[1200px] mx-auto px-3 py-2 pb-4 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 sm:px-4 sm:py-3 md:px-6 md:py-4 md:pb-6">
        <div className="pt-16 sm:pt-20 md:pt-16 mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center tracking-tight sm:text-3xl md:text-3xl md:mb-3 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Historial de Cotizaciones
              </h1>
              <p className="text-xs text-gray-500 text-center sm:text-sm">
                Accede a todas tus cotizaciones generadas anteriormente
              </p>
            </div>
            <Button
              onClick={() => {
                sessionStorage.removeItem('quotation_chat_messages');
                navigate('/quotation-chat');
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Nueva Cotización
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.32s]"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.16s]"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <span className="ml-2">Cargando cotizaciones...</span>
            </div>
          </Card>
        ) : quotations.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold mb-2">No hay cotizaciones guardadas</p>
              <p className="text-sm">Genera tu primera cotización para comenzar</p>
            </div>
            <Button
              onClick={() => {
                sessionStorage.removeItem('quotation_chat_messages');
                navigate('/quotation-chat');
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Generar Cotización
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {quotations.map((quotation) => (
              <Card key={quotation.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {quotation.title || 'Cotización sin título'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {quotation.user_query}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{dayjs(quotation.created_at).format('DD/MM/YYYY HH:mm')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewQuotation(quotation)}
                    >
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(quotation.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default QuotationHistoryPage;

