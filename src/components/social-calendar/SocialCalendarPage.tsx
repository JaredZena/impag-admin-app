import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Leaf,
  AlertCircle,
  Check,
  AlertTriangle,
  X,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import CalendarGrid from './CalendarGrid';
import SuggestionCard from './SuggestionCard';
import StepIndicator from './StepIndicator';
import {
  DaySuggestions,
  SuggestionStatus,
  AgriculturalPhase,
  PHASE_LABELS,
} from '../../types/socialCalendar';
import {
  getDaySuggestions,
  updateSuggestionStatus,
  getNextEmptyDate,
} from '../../lib/socialCalendarStorage';
import {
  socialCalendarGenerator,
  loadPostsFromDatabase,
  loadPostsForDate,
  saveDaySuggestionsToDatabase,
  updatePostFeedback,
} from '../../lib/socialCalendar';
import { formatDate, parseDate } from '../../lib/socialCalendarHelpers';
import './SocialCalendar.css';

const SocialCalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [currentSuggestions, setCurrentSuggestions] = useState<DaySuggestions | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, SuggestionStatus>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationMsg, setGenerationMsg] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [suggestedTopic, setSuggestedTopic] = useState<string>('');
  // Inline confirm dialog state (replaces window.confirm)
  const [confirmPendingDate, setConfirmPendingDate] = useState<string | null>(null);
  const abortGenRef = useRef(false);

  const handleCancelGeneration = () => {
    abortGenRef.current = true;
    setIsGenerating(false);
  };

  useEffect(() => { loadStatusMap(); }, [viewMonth]);
  useEffect(() => { loadSuggestionsForDate(selectedDate); }, [selectedDate]);

  const loadSuggestionsForDate = async (date: string) => {
    const dbData = await loadPostsForDate(date);
    setCurrentSuggestions(dbData);
  };

  const loadStatusMap = async () => {
    try {
      const start = new Date(viewMonth);
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      const end = new Date(viewMonth);
      end.setMonth(end.getMonth() + 2);
      end.setDate(0);
      const dbPosts = await loadPostsFromDatabase(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );
      const newMap: Record<string, SuggestionStatus> = {};
      dbPosts.forEach(day => {
        const statuses = day.suggestions.map(s => s.status);
        if (statuses.length === 0) return;
        if (statuses.every(s => s === 'done')) newMap[day.date] = 'done';
        else if (statuses.some(s => s === 'scheduled')) newMap[day.date] = 'scheduled';
        else newMap[day.date] = 'planned';
      });
      setStatusMap(newMap);
    } catch (error) {
      console.error('Failed to load status map from database:', error);
    }
  };

  const runGenerate = async (targetDate: string) => {
    abortGenRef.current = false;
    setIsGenerating(true);
    setConfirmPendingDate(null);
    try {
      setGenerationStep('Generando contenido con IA...');
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = await socialCalendarGenerator.generate(targetDate, undefined, undefined, [], suggestedTopic || undefined);
      if (abortGenRef.current) return;
      setCurrentSuggestions(result);
      await loadStatusMap();
      const llmCount = result.suggestions.filter(s => s.generationSource === 'llm').length;
      if (result.suggestions.length > 0) {
        if (llmCount === result.suggestions.length)
          setGenerationMsg({ type: 'success', text: 'Contenido generado con IA correctamente.' });
        else if (llmCount > 0)
          setGenerationMsg({ type: 'warning', text: 'Algunos contenidos usaron plantillas (IA parcial).' });
        else
          setGenerationMsg({ type: 'warning', text: 'Falló la conexión IA. Se generó contenido base con plantillas.' });
        setTimeout(() => setGenerationMsg(null), 5000);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationMsg({ type: 'error', text: 'Error generando contenido. Intenta nuevamente.' });
      setTimeout(() => setGenerationMsg(null), 6000);
    } finally {
      if (!abortGenRef.current) {
        setIsGenerating(false);
        setGenerationStep('');
        setSuggestedTopic('');
      }
    }
  };

  const handleGenerate = async () => {
    const targetDate = selectedDate;
    const existing = await getDaySuggestions(targetDate);
    if (existing && existing.suggestions.length > 0) {
      setConfirmPendingDate(targetDate);
      return;
    }
    await runGenerate(targetDate);
  };

  const handleGenerateNextEmpty = async () => {
    abortGenRef.current = false;
    setIsGenerating(true);
    setGenerationStep('Buscando siguiente día disponible...');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationStep('Iniciando generación...');
      await new Promise(resolve => setTimeout(resolve, 300));
      const nextDate = await getNextEmptyDate();
      setGenerationStep('Analizando tendencias e inventario...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationStep('Consultando base de datos de productos...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationStep('Generando estrategia con IA...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationStep('Creando contenido y prompts de imagen...');
      const result = await socialCalendarGenerator.generate(nextDate);
      if (abortGenRef.current) return;
      setSelectedDate(nextDate);
      const resultDate = parseDate(nextDate);
      if (resultDate.getMonth() !== viewMonth.getMonth()) setViewMonth(resultDate);
      setCurrentSuggestions(result);
      await loadStatusMap();
      if (result.suggestions.length === 0) {
        setGenerationMsg({ type: 'error', text: 'El backend no pudo generar contenido. Por favor, intenta nuevamente.' });
        setTimeout(() => setGenerationMsg(null), 8000);
      } else {
        const llmCount = result.suggestions.filter(s => s.generationSource === 'llm').length;
        if (llmCount === result.suggestions.length)
          setGenerationMsg({ type: 'success', text: 'Contenido generado con IA correctamente.' });
        else
          setGenerationMsg({ type: 'warning', text: 'Algunos contenidos no se generaron correctamente.' });
        setTimeout(() => setGenerationMsg(null), 5000);
      }
    } catch (error) {
      console.error(error);
      setGenerationMsg({ type: 'error', text: 'Error buscando siguiente día libre.' });
      setTimeout(() => setGenerationMsg(null), 6000);
    } finally {
      if (!abortGenRef.current) {
        setIsGenerating(false);
        setGenerationStep('');
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: SuggestionStatus) => {
    if (!currentSuggestions) return;
    const updated = { ...currentSuggestions };
    const idx = updated.suggestions.findIndex(s => s.id === id);
    if (idx >= 0) {
      updated.suggestions[idx].status = newStatus;
      setCurrentSuggestions(updated);
      try {
        await updateSuggestionStatus(selectedDate, id, newStatus);
        await loadStatusMap();
      } catch (error) {
        console.error('Failed to save status update to database:', error);
      }
    }
  };

  const dateObj = parseDate(selectedDate);
  const formattedDateHeader = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const capitalizedHeader = formattedDateHeader.charAt(0).toUpperCase() + formattedDateHeader.slice(1);
  const phaseLabel = currentSuggestions
    ? PHASE_LABELS[currentSuggestions.metadata.monthPhase]
    : PHASE_LABELS['mantenimiento'];

  const hasContent = currentSuggestions && currentSuggestions.suggestions.length > 0;

  return (
    <div className="social-calendar-container">
      {/* Left Panel */}
      <CalendarGrid
        currentMonth={viewMonth}
        onMonthChange={setViewMonth}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        statusMap={statusMap}
      />

      {/* Right Panel */}
      <div className="feed-panel" style={{ position: 'relative' }}>

        {/* ── Generation Loading Overlay ───────────────────────────── */}
        {isGenerating && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm p-8 bg-green-50/95">
            {/* Pulsing orb */}
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" style={{ animationDuration: '2.5s' }} />
              <div className="w-16 h-16 rounded-full bg-white border-2 border-green-200 flex items-center justify-center shadow-lg relative">
                <Sparkles className="w-7 h-7 text-green-600" />
              </div>
            </div>

            {/* Steps */}
            <div className="w-full max-w-xs mb-6 space-y-3">
              <StepIndicator
                active={generationStep.includes('Iniciando') || generationStep.includes('Analizando')}
                completed={generationStep.includes('Consultando') || generationStep.includes('Generando') || generationStep.includes('Creando')}
                label="Análisis de tendencias"
              />
              <StepIndicator
                active={generationStep.includes('Consultando')}
                completed={generationStep.includes('Generando') || generationStep.includes('Creando')}
                label="Consulta de productos"
              />
              <StepIndicator
                active={generationStep.includes('Generando')}
                completed={generationStep.includes('Creando')}
                label="Estrategia con IA"
              />
              <StepIndicator
                active={generationStep.includes('Creando') || generationStep.includes('Generando contenido')}
                completed={false}
                label="Generación de contenido"
              />
            </div>

            <p className="text-sm mb-6 text-center text-green-600">
              {generationStep || 'Generando contenido...'}
            </p>

            <button
              onClick={handleCancelGeneration}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-200 bg-white text-orange-600 text-sm font-semibold hover:bg-orange-50 transition-all duration-150 cursor-pointer shadow-sm"
            >
              <X size={15} /> Cancelar
            </button>
          </div>
        )}

        {/* ── Inline Confirm Dialog (replaces window.confirm) ─────── */}
        {confirmPendingDate && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-green-50/80 backdrop-blur-sm p-8">
            <div className="rounded-2xl p-6 max-w-sm w-full shadow-xl border border-green-100 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-green-900" style={{ fontFamily: "'Lora', serif" }}>Regenerar contenido</h3>
                  <p className="text-xs mt-0.5 text-green-500">
                    El día {confirmPendingDate} ya tiene contenido generado.
                  </p>
                </div>
              </div>
              <p className="text-sm mb-5 text-green-800/80">
                ¿Deseas reemplazar el contenido existente con nueva generación IA?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmPendingDate(null)}
                  className="px-4 py-2 rounded-xl border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 transition-all duration-150 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => runGenerate(confirmPendingDate)}
                  className="generate-btn"
                >
                  Sí, regenerar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Feed Header ─────────────────────────────────────────── */}
        <div className="feed-header">
          <div className="feed-title">
            <div className="feed-subtitle">
              <span className="phase-tag">{phaseLabel || 'Calendario Social'}</span>
              <span>{dateObj.getFullYear()}</span>
            </div>
            <h1>{capitalizedHeader}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={cn(
                'generate-btn',
                hasContent && 'generate-btn-secondary'
              )}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {hasContent ? (
                <><RefreshCw size={16} /> Regenerar</>
              ) : (
                <><Sparkles size={16} /> Generar</>
              )}
            </button>

            <button
              className="generate-btn generate-btn-icon"
              onClick={handleGenerateNextEmpty}
              disabled={isGenerating}
              title="Generar siguiente día vacío"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Generation Status Message ────────────────────────────── */}
        {generationMsg && (
          <div className={cn(
            'flex items-center gap-2 mb-5 px-4 py-3 rounded-xl border text-sm font-semibold',
            generationMsg.type === 'success' && 'bg-green-50 border-green-200 text-green-700',
            generationMsg.type === 'warning' && 'bg-amber-50 border-amber-200 text-amber-700',
            generationMsg.type === 'error'   && 'bg-orange-50 border-orange-200 text-orange-700',
          )}>
            {generationMsg.type === 'success' && <Check size={15} />}
            {generationMsg.type === 'warning' && <AlertTriangle size={15} />}
            {generationMsg.type === 'error'   && <X size={15} />}
            {generationMsg.text}
          </div>
        )}

        {/* ── Content or Empty State ───────────────────────────────── */}
        {hasContent ? (
          <div>
            {currentSuggestions.metadata.relevantDates.length > 0 && (
              <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl text-sm font-medium border bg-amber-50 border-amber-200 text-amber-800">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>
                  Próxima fecha importante:{' '}
                  <strong>{currentSuggestions.metadata.relevantDates.join(', ')}</strong>
                </span>
              </div>
            )}

            {currentSuggestions.suggestions.map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onStatusChange={handleStatusChange}
                onFeedbackChange={async (id, feedback) => {
                  if (currentSuggestions) {
                    const updated = { ...currentSuggestions };
                    const idx = updated.suggestions.findIndex(s => s.id === id);
                    if (idx >= 0) {
                      updated.suggestions[idx].userFeedback = feedback;
                      setCurrentSuggestions(updated);
                      const postId = Number(id);
                      if (!Number.isNaN(postId)) {
                        try {
                          await updatePostFeedback(postId, feedback);
                          return;
                        } catch (error) {
                          console.error('Failed to update feedback via PUT endpoint:', error);
                        }
                      }
                      try {
                        await saveDaySuggestionsToDatabase(updated);
                      } catch (error) {
                        console.error('Failed to save feedback to database:', error);
                      }
                    }
                  }
                }}
              />
            ))}
          </div>
        ) : (
          /* ── Empty State ─────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center min-h-[440px] text-center px-8 py-12">
            {/* Leaf icon */}
            <div className="w-20 h-20 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center mb-6 shadow-sm">
              <Leaf size={36} className="text-green-600" />
            </div>

            <h3 className="text-lg font-semibold text-green-900 mb-2" style={{ fontFamily: "'Lora', serif" }}>
              Sin contenido para este día
            </h3>
            <p className="text-sm text-green-600/70 mb-8 max-w-xs leading-relaxed">
              Genera contenido automáticamente con IA o sugiere un tema específico para orientar la generación.
            </p>

            {/* Topic input */}
            <div className="w-full max-w-md mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-green-500 mb-2 text-left">
                Tema sugerido <span className="normal-case font-normal text-green-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={suggestedTopic}
                onChange={e => setSuggestedTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="Ej: Protección contra heladas, Riego por goteo..."
                className="w-full px-4 py-3 rounded-xl bg-white border border-green-200 text-green-900 placeholder-green-300 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all duration-150 shadow-sm"
              />
            </div>

            <button
              className="generate-btn generate-btn-large"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <Sparkles size={20} /> Generar Contenido con IA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialCalendarPage;
