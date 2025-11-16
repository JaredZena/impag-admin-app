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
import { parseQuotationMarkdown } from '@/utils/quotationParser';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type ConversationState = 'initial' | 'follow-up' | 'blocked';

const QuotationChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
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
          messages: chatHistory  // Send conversation context
        }),
      });

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
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
      <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1200px] mx-auto p-6 bg-gray-50 md:p-4">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6 text-center tracking-tight md:text-2xl md:mb-5">
          Generar Cotización con IA
        </h1>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-medium shadow-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Conversation state indicator */}
        {conversationState === 'follow-up' && (
          <div className="flex items-center gap-3 p-3 mb-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-700 text-sm font-medium shadow-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>⚠️ Último mensaje de refinamiento disponible. Después deberás iniciar una nueva cotización.</span>
          </div>
        )}

        {conversationState === 'blocked' && (
          <div className="flex items-center gap-3 p-3 mb-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-700 text-sm font-medium shadow-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>💡 Cotización completa. Haz clic en "Nueva Conversación" para una nueva cotización.</span>
          </div>
        )}

        <Card className="flex-1 overflow-y-auto p-6 bg-white rounded-2xl shadow-sm mb-4 flex flex-col gap-5 md:p-4 md:gap-4 md:rounded-xl">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-6 py-12 md:px-4 md:py-8">
              <svg className="w-18 h-18 mb-5 opacity-60 text-gray-400 md:w-14 md:h-14 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="text-xl font-semibold mb-3 text-gray-700 md:text-lg md:mb-2">
                ¡Comienza a generar cotizaciones!
              </h3>
              <p className="text-base max-w-lg text-gray-600 leading-relaxed mb-2 md:text-sm">
                Escribe tu solicitud de cotización y la IA generará una cotización detallada
                basada en el catálogo de productos, precios actuales y cotizaciones previas.
              </p>
              <p className="text-sm max-w-lg text-gray-400 mt-4 md:text-xs">
                <strong className="text-gray-600">Ejemplos:</strong><br />
                • "Cotización para 2 hectáreas de acolchado agrícola"<br />
                • "Necesito malla sombra 35% para 100 metros"<br />
                • "Cotización de sistema de riego por goteo"
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${message.type === 'user' ? 'items-end ml-auto' : 'items-start mr-auto'} max-w-[85%] md:max-w-[95%]`}
            >
              {message.type === 'user' ? (
                <>
                  <div className="px-5 py-4 rounded-[20px_20px_4px_20px] bg-blue-600 text-white shadow-md text-base leading-relaxed break-words md:px-4 md:py-3 md:text-sm md:rounded-[16px_16px_4px_16px]">
                    {message.content}
                  </div>
                  <span className="text-xs text-gray-500 mt-1.5 font-normal">
                    {dayjs(message.timestamp).format('HH:mm')}
                  </span>
                </>
              ) : (
                <>
                  <div id={`quotation-${message.id}`} className="px-5 py-4 rounded-[20px_20px_20px_4px] bg-white border border-gray-200 shadow-md text-base leading-relaxed break-words md:px-4 md:py-3 md:text-sm md:rounded-[16px_16px_16px_4px]">
                    {(() => {
                      const parsedQuotation = parseQuotationMarkdown(message.content);
                      
                      // If we successfully parsed a quotation with tables, use structured format
                      if (parsedQuotation.hasTable) {
                        return (
                          <>
                            <QuotationDocument 
                              quotation={parsedQuotation}
                              fecha={message.timestamp}
                            />
                            <div className="flex flex-wrap gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyToClipboard(message.content)}
                                className="flex items-center gap-1.5 text-xs font-medium hover:bg-gray-100"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copiar
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
                                className="flex items-center gap-1.5 text-xs font-medium hover:bg-gray-100"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                    const canvas = await html2canvas(element, { scale: 2 });
                                    const imgData = canvas.toDataURL('image/png');
                                    const pdf = new jsPDF('p', 'mm', 'a4');
                                    const imgWidth = 210;
                                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                                    pdf.save(`cotizacion_${dayjs(message.timestamp).format('YYYY-MM-DD')}.pdf`);
                                  }
                                }}
                                className="flex items-center gap-1.5 text-xs font-medium hover:bg-gray-100"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                PDF
                              </Button>
                            </div>
                          </>
                        );
                      }
                      
                      // Fallback to markdown rendering for non-table content
                      return (
                        <>
                          <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-h1:text-xl prose-h1:border-b-2 prose-h1:border-blue-600 prose-h1:pb-2 prose-h1:mt-0 prose-h1:mb-3 prose-h2:text-lg prose-h2:text-gray-700 prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:text-gray-700 prose-h3:mt-3 prose-h3:mb-2 prose-p:text-gray-600 prose-p:my-2 prose-p:leading-relaxed prose-p:text-sm prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:my-2 prose-ul:ml-4 prose-ul:list-disc prose-ul:space-y-1 prose-ul:text-sm prose-ol:my-2 prose-ol:ml-4 prose-ol:list-decimal prose-ol:space-y-1 prose-ol:text-sm prose-li:text-gray-600 prose-li:mb-1 prose-code:bg-gray-100 prose-code:text-red-600 prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:border prose-code:border-gray-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyToClipboard(message.content)}
                            className="mt-3 flex items-center gap-2 text-xs font-medium hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:text-xs md:gap-1.5"
                          >
                            <svg className="w-4 h-4 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copiar
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                  <span className="text-xs text-gray-500 mt-1.5 font-normal">
                    {dayjs(message.timestamp).format('HH:mm')}
                  </span>
                </>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start mr-auto max-w-[85%] md:max-w-[95%]">
              <div className="px-5 py-4 rounded-[20px_20px_20px_4px] bg-white border border-gray-200 shadow-md md:px-4 md:py-3 md:rounded-[16px_16px_16px_4px]">
                <div className="flex items-center justify-center gap-2.5 py-5 text-gray-600 text-sm font-medium md:py-4 md:text-xs">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.32s] md:w-2 md:h-2"></div>
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.16s] md:w-2 md:h-2"></div>
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce md:w-2 md:h-2"></div>
                  <span className="ml-2">Generando cotización...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </Card>

        <Card className="flex gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-200 items-end md:gap-2 md:p-3 md:rounded-xl">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu solicitud de cotización... (Shift+Enter para nueva línea)"
            disabled={isLoading}
            rows={1}
            className="flex-1 px-4 py-3.5 border-2 border-gray-300 rounded-xl text-base resize-none min-h-[56px] max-h-[120px] outline-none transition-all bg-white text-gray-900 leading-normal focus:border-blue-600 focus:ring-4 focus:ring-blue-50 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200 disabled:opacity-70 md:px-3 md:py-3 md:text-sm md:min-h-[48px]"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-7 py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold h-[56px] whitespace-nowrap shadow-md hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md focus-visible:ring-3 focus-visible:ring-blue-200 focus-visible:ring-offset-2 disabled:bg-gray-400 disabled:text-gray-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none transition-all duration-200 md:px-5 md:py-3 md:h-[48px] md:text-sm"
          >
            {isLoading ? 'Enviando...' : 'Enviar'}
          </Button>
        </Card>

        {messages.length > 0 && (
          <div className="flex justify-center gap-3 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="text-xs font-medium hover:bg-gray-100 text-gray-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
