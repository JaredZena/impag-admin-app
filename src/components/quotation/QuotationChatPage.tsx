import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiRequest } from '@/utils/api';
import Navigation from '@/components/ui/Navigation';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import QuotationDocument from './QuotationDocument';
import InternalQuotationDocument from './InternalQuotationDocument';
import { parseQuotationMarkdown, parseDualQuotationResponse } from '@/utils/quotationParser';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  customerName?: string;
  customerLocation?: string;
  quotationId?: string;
}

type ConversationState = 'initial' | 'follow-up' | 'blocked';

const QuotationChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('initial');
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from session storage on mount
  useEffect(() => {
    const savedMessages = sessionStorage.getItem('quotation_chat_messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
      } catch (err) {
        console.error('Failed to load saved messages:', err);
      }
    }
  }, []);

  // Save messages to session storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('quotation_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Check if conversation is blocked
    if (conversationState === 'blocked') {
      setError('Esta conversación ha alcanzado el límite de mensajes. Usa "Nueva conversación" para empezar una nueva cotización.');
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message
    const userMessageObj: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessageObj]);
    setIsLoading(true);

    // Update message count and conversation state
    const newCount = messageCount + 1;
    setMessageCount(newCount);

    if (newCount === 1) {
      setConversationState('follow-up'); // After first message, allow one follow-up
    } else if (newCount >= 2) {
      setConversationState('blocked'); // After second message, block further messages
    }

    try {
      // Prepare chat history (last 6 messages for context)
      const chatHistory = messages.slice(-6).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Call API with chat history for conversation context
      const response = await apiRequest('/query', {
        method: 'POST',
        body: JSON.stringify({
          query: userMessage,
          messages: chatHistory,  // Send conversation context
          customer_name: customerName || undefined,
          customer_location: customerLocation || undefined
        }),
      });

      // Generate quotation ID (format: random number + date + location code if available)
      const locationCode = customerLocation
        ? customerLocation.split(',').map(w => w.trim().substring(0, 3).toUpperCase()).join('').substring(0, 3)
        : '';
      const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const dateCode = dayjs().format('DDMMYY');
      const quotationId = `${randomNum}${dateCode}${locationCode}`;

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
        customerName: customerName || undefined,
        customerLocation: customerLocation || undefined,
        quotationId: quotationId
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save quotation to database if it contains both internal and customer quotations
      try {
        const dualQuotation = parseDualQuotationResponse(response.response);
        if (dualQuotation.internal && dualQuotation.customer) {
          await apiRequest('/quotation-history/', {
            method: 'POST',
            body: JSON.stringify({
              user_query: userMessage,
              title: `${quotationId} - ${customerName || 'Cotización'}`,
              customer_name: customerName || null,
              customer_location: customerLocation || null,
              quotation_id: quotationId,
              internal_quotation: dualQuotation.internalMarkdown || dualQuotation.rawResponse,
              customer_quotation: dualQuotation.customerMarkdown || dualQuotation.rawResponse,
              raw_response: dualQuotation.rawResponse
            }),
          });
        }
      } catch (saveError) {
        // Don't block the UI if saving fails - just log it
        console.error('Failed to save quotation:', saveError);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err?.message || 'Error al generar la cotización. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
      console.log('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setMessageCount(0);
    setConversationState('initial');
    sessionStorage.removeItem('quotation_chat_messages');
  };

  return (
    <>
      <Navigation />
      <div className="flex flex-col min-h-screen max-w-[1200px] mx-auto px-3 py-2 pb-4 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 sm:px-4 sm:py-3 md:px-6 md:py-4 md:pb-6">
        {/* Header with better mobile spacing */}
        <div className="pt-16 sm:pt-20 md:pt-16 mb-4 sm:mb-5 md:mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center tracking-tight sm:text-3xl md:text-3xl md:mb-3 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Generar Cotización con IA
          </h1>
          <p className="text-xs text-gray-500 text-center sm:text-sm md:hidden">
            Escribe tu solicitud y la IA generará una cotización detallada
          </p>
        </div>

        {/* Error and state indicators with better mobile styling */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium shadow-sm sm:gap-3 sm:p-4 sm:text-sm sm:mb-4">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {conversationState === 'follow-up' && (
          <div className="flex items-start gap-2.5 p-3 mb-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium shadow-sm sm:gap-3 sm:p-4 sm:text-sm sm:mb-4">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1 leading-relaxed">⚠️ Último mensaje de refinamiento disponible. Después deberás iniciar una nueva cotización.</span>
          </div>
        )}

        {conversationState === 'blocked' && (
          <div className="flex items-start gap-2.5 p-3 mb-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-medium shadow-sm sm:gap-3 sm:p-4 sm:text-sm sm:mb-4">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 leading-relaxed">💡 Cotización completa. Haz clic en "Nueva Conversación" para una nueva cotización.</span>
          </div>
        )}

        {/* Messages container with improved mobile height */}
        <Card className="flex-1 overflow-y-auto overflow-x-hidden p-3 bg-white rounded-2xl shadow-lg mb-3 flex flex-col gap-3 min-h-0 sm:p-4 sm:gap-4 sm:mb-4 sm:rounded-2xl md:p-6 md:gap-5" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-4 py-8 sm:px-6 sm:py-12 md:px-6 md:py-12">
              <div className="relative mb-4 sm:mb-5 md:mb-6">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <svg className="relative w-16 h-16 text-blue-500 sm:w-20 sm:h-20 md:w-24 md:h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-800 sm:text-xl sm:mb-3 md:text-xl md:mb-3">
                ¡Comienza a generar cotizaciones!
              </h3>
              <p className="text-sm max-w-md text-gray-600 leading-relaxed mb-4 sm:text-base sm:mb-5 md:text-base md:mb-6">
                Escribe tu solicitud de cotización y la IA generará una cotización detallada
                basada en el catálogo de productos, precios actuales y cotizaciones previas.
              </p>
              <div className="w-full max-w-md space-y-2 text-left sm:space-y-2.5 md:space-y-3">
                <p className="text-xs font-semibold text-gray-700 sm:text-sm md:text-sm">
                  Ejemplos:
                </p>
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors sm:p-3">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span className="text-xs text-gray-600 flex-1 sm:text-sm">Cotización para 2 hectáreas de acolchado agrícola</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors sm:p-3">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span className="text-xs text-gray-600 flex-1 sm:text-sm">Necesito malla sombra 35% para 100 metros</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors sm:p-3">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span className="text-xs text-gray-600 flex-1 sm:text-sm">Cotización de sistema de riego por goteo</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${message.type === 'user' ? 'items-end ml-auto' : 'items-start mr-auto'} ${message.type === 'assistant' ? 'w-full max-w-full' : 'max-w-[90%] sm:max-w-[85%] md:max-w-[85%]'}`}
            >
              {message.type === 'user' ? (
                <>
                  <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg text-sm leading-relaxed break-words sm:px-5 sm:py-4 sm:text-base sm:rounded-2xl">
                    {message.content}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 font-normal sm:text-xs">
                    {dayjs(message.timestamp).format('HH:mm')}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-full">
                    {(() => {
                      // Try to parse as dual quotation first
                      const dualQuotation = parseDualQuotationResponse(message.content);

                      // If we have both internal and customer quotations, display side by side
                      if (dualQuotation.internal && dualQuotation.customer) {
                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                            {/* Internal Quotation - Left Side */}
                            <div id={`internal-quotation-${message.id}`} className="px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-300 shadow-md min-w-0 overflow-x-auto">
                              <div className="mb-2">
                                <h3 className="text-xs font-bold text-gray-700 uppercase mb-1">Cotización Interna</h3>
                                <p className="text-[10px] text-gray-500 italic">Uso interno - No compartir con cliente</p>
                              </div>
                              <InternalQuotationDocument
                                quotation={dualQuotation.internal}
                                fecha={message.timestamp}
                              />
                              <div className="flex flex-wrap gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyToClipboard(dualQuotation.internalMarkdown || dualQuotation.rawResponse)}
                                  className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 text-xs"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copiar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const markdown = dualQuotation.internalMarkdown || dualQuotation.rawResponse;
                                    const blob = new Blob([markdown], { type: 'text/markdown' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `cotizacion_interna_${dayjs(message.timestamp).format('YYYY-MM-DD')}.md`;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 text-xs"
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
                                    const element = document.getElementById(`internal-quotation-${message.id}`);
                                    if (element) {
                                      const canvas = await html2canvas(element, { scale: 2 });
                                      const link = document.createElement('a');
                                      link.download = `cotizacion_interna_${dayjs(message.timestamp).format('YYYY-MM-DD')}.png`;
                                      link.href = canvas.toDataURL();
                                      link.click();
                                    }
                                  }}
                                  className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 text-xs"
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
                                    const element = document.getElementById(`internal-quotation-${message.id}`);
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
                                      pdf.save(`cotizacion_interna_${dayjs(message.timestamp).format('YYYY-MM-DD')}.pdf`);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 text-xs"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  PDF
                                </Button>
                              </div>
                            </div>

                            {/* Customer Quotation - Right Side */}
                            <div id={`customer-quotation-${message.id}`} className="px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-md min-w-0 overflow-x-auto">
                              <div className="mb-2">
                                <h3 className="text-xs font-bold text-gray-700 uppercase mb-1">Cotización para Cliente</h3>
                                <p className="text-[10px] text-gray-500 italic">Lista para compartir</p>
                              </div>
                              {dualQuotation.customer.hasTable ? (
                                <QuotationDocument
                                  quotation={dualQuotation.customer}
                                  fecha={message.timestamp}
                                  customerName={message.customerName}
                                  customerLocation={message.customerLocation}
                                  quotationId={message.quotationId}
                                />
                              ) : (
                                <div className="prose prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {dualQuotation.customer.title || 'Cotización'}
                                  </ReactMarkdown>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyToClipboard(dualQuotation.customerMarkdown || dualQuotation.rawResponse)}
                                  className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 text-xs"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copiar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const markdown = dualQuotation.customerMarkdown || dualQuotation.rawResponse;
                                    const blob = new Blob([markdown], { type: 'text/markdown' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `cotizacion_cliente_${dayjs(message.timestamp).format('YYYY-MM-DD')}.md`;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 text-xs"
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
                                    const cardElement = document.getElementById(`customer-quotation-${message.id}`);
                                    if (cardElement) {
                                      const quotationElement = cardElement.querySelector('[id^="quotation-doc-"]') as HTMLElement;
                                      const elementToExport = quotationElement || cardElement;
                                      const canvas = await html2canvas(elementToExport, { scale: 2 });
                                      const link = document.createElement('a');
                                      link.download = `cotizacion_cliente_${dayjs(message.timestamp).format('YYYY-MM-DD')}.png`;
                                      link.href = canvas.toDataURL();
                                      link.click();
                                    }
                                  }}
                                  className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 text-xs"
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
                                    const cardElement = document.getElementById(`customer-quotation-${message.id}`);
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

                                      pdf.save(`cotizacion_cliente_${dayjs(message.timestamp).format('YYYY-MM-DD')}.pdf`);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 text-xs"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  PDF
                                </Button>

                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Fallback: Try parsing as single quotation
                      const parsedQuotation = parseQuotationMarkdown(message.content);

                      // If we successfully parsed a quotation with tables, use structured format
                      if (parsedQuotation.hasTable) {
                        return (
                          <div id={`quotation-${message.id}`} className="px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-md text-sm leading-relaxed break-words overflow-x-auto sm:px-5 sm:py-4 sm:text-base sm:rounded-2xl md:shadow-lg">
                            <QuotationDocument
                              quotation={parsedQuotation}
                              fecha={message.timestamp}
                              customerName={message.customerName}
                              customerLocation={message.customerLocation}
                              quotationId={message.quotationId}
                            />
                            <div className="flex flex-wrap gap-2 mt-4 sm:gap-2.5 sm:mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyToClipboard(message.content)}
                                className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 sm:text-xs sm:px-3 sm:py-2"
                              >
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copiar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const markdown = message.content;
                                  const blob = new Blob([markdown], { type: 'text/markdown' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `cotizacion_${dayjs(message.timestamp).format('YYYY-MM-DD')}.md`;
                                  link.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 sm:text-xs sm:px-3 sm:py-2"
                              >
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Markdown
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const html2canvas = (await import('html2canvas')).default;
                                  const element = document.getElementById(`quotation-${message.id}`);
                                  if (element) {
                                    const canvas = await html2canvas(element, { scale: 2 });
                                    const link = document.createElement('a');
                                    link.download = `cotizacion_${dayjs(message.timestamp).format('YYYY-MM-DD')}.png`;
                                    link.href = canvas.toDataURL();
                                    link.click();
                                  }
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 sm:text-xs sm:px-3 sm:py-2"
                              >
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                  const element = document.getElementById(`quotation-${message.id}`);
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
                                    pdf.save(`cotizacion_${dayjs(message.timestamp).format('YYYY-MM-DD')}.pdf`);
                                  }
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 px-2.5 py-1.5 sm:text-xs sm:px-3 sm:py-2"
                              >
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                PDF
                              </Button>

                            </div>
                          </div>
                        );
                      }

                      // Fallback to markdown rendering for non-table content
                      return (
                        <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-md text-sm leading-relaxed break-words sm:px-5 sm:py-4 sm:text-base sm:rounded-2xl md:shadow-lg">
                          <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-h1:text-xl prose-h1:border-b-2 prose-h1:border-blue-600 prose-h1:pb-2 prose-h1:mt-0 prose-h1:mb-3 prose-h2:text-lg prose-h2:text-gray-700 prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:text-gray-700 prose-h3:mt-3 prose-h3:mb-2 prose-p:text-gray-600 prose-p:my-2 prose-p:leading-relaxed prose-p:text-sm prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:my-2 prose-ul:ml-4 prose-ul:list-disc prose-ul:space-y-1 prose-ul:text-sm prose-ol:my-2 prose-ol:ml-4 prose-ol:list-decimal prose-ol:space-y-1 prose-ol:text-sm prose-li:text-gray-600 prose-li:mb-1 prose-code:bg-gray-100 prose-code:text-red-600 prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:border prose-code:border-gray-200 sm:prose-base">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyToClipboard(message.content)}
                            className="mt-3 flex items-center gap-1.5 text-[10px] font-medium hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 px-2.5 py-1.5 sm:text-xs sm:gap-2 sm:px-3 sm:py-2"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copiar
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 font-normal sm:text-xs">
                    {dayjs(message.timestamp).format('HH:mm')}
                  </span>
                </>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start mr-auto max-w-[90%] sm:max-w-[85%] md:max-w-[85%]">
              <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-md sm:px-5 sm:py-4 sm:rounded-2xl">
                <div className="flex items-center justify-center gap-2 py-4 text-gray-600 text-xs font-medium sm:gap-2.5 sm:py-5 sm:text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.32s] sm:w-2.5 sm:h-2.5"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.16s] sm:w-2.5 sm:h-2.5"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce sm:w-2.5 sm:h-2.5"></div>
                  <span className="ml-1.5 sm:ml-2">Generando cotización...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </Card>

        {/* Customer Info Inputs */}
        <Card className="flex flex-col gap-2 p-3 bg-white rounded-2xl shadow-lg border border-gray-200 sm:flex-row sm:gap-3 sm:p-4 md:rounded-2xl mb-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Cliente</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente (opcional)"
              disabled={isLoading}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm outline-none transition-all bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-50 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación</label>
            <input
              type="text"
              value={customerLocation}
              onChange={(e) => setCustomerLocation(e.target.value)}
              placeholder="Ubicación (opcional)"
              disabled={isLoading}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl text-sm outline-none transition-all bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-50 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
            />
          </div>
        </Card>

        {/* Input area with better mobile styling */}
        <Card className="flex flex-col gap-2 p-3 bg-white rounded-2xl shadow-lg border border-gray-200 sm:flex-row sm:items-end sm:gap-3 sm:p-4 md:rounded-2xl">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu solicitud de cotización... (Shift+Enter para nueva línea)"
            disabled={isLoading}
            rows={1}
            className="flex-1 px-3 py-3 border-2 border-gray-300 rounded-xl text-sm resize-none min-h-[52px] max-h-[120px] outline-none transition-all bg-white text-gray-900 leading-normal focus:border-blue-600 focus:ring-4 focus:ring-blue-50 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200 disabled:opacity-70 sm:px-4 sm:py-3.5 sm:text-base sm:min-h-[56px]"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="w-full px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold h-[52px] whitespace-nowrap shadow-md hover:from-blue-700 hover:to-blue-800 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md focus-visible:ring-3 focus-visible:ring-blue-200 focus-visible:ring-offset-2 disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 transition-all duration-200 sm:w-auto sm:px-7 sm:py-3.5 sm:h-[56px] sm:text-base"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.868l-3.182-1.636C2.256 14.233 2 13.123 2 12c0-1.123.256-2.233.818-3.232L6 7.132V12h.01zm8-7.868V0C18.627 0 24 5.373 24 12h-4c0-4.418-3.582-8-8-8z"></path>
                </svg>
                Enviando...
              </span>
            ) : (
              'Enviar'
            )}
          </Button>
        </Card>

        {/* Clear chat button with better mobile styling */}
        {messages.length > 0 && (
          <div className="flex justify-center mt-2 sm:mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="text-[10px] font-medium hover:bg-gray-100 text-gray-600 flex items-center gap-1.5 px-3 py-1.5 sm:text-xs sm:gap-2 sm:px-4 sm:py-2"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Conversación
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default QuotationChatPage;
