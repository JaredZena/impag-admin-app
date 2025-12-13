import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Calendar as CalendarIcon, AlertCircle, Check, AlertTriangle, X, RefreshCw, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import SuggestionCard from './SuggestionCard';
import StepIndicator from './StepIndicator';
import { 
  DaySuggestions, 
  SuggestionStatus, 
  AgriculturalPhase, 
  PHASE_LABELS 
} from '../../types/socialCalendar';
import { 
  getDaySuggestions, 
  updateSuggestionStatus, 
  getNextEmptyDate, 
  getAllDatesWithSuggestions,
  saveDaySuggestions,
  deleteDaySuggestions
} from '../../lib/socialCalendarStorage';
import { socialCalendarGenerator, loadPostsFromDatabase, loadPostsForDate, saveDaySuggestionsToDatabase, updatePostFeedback } from '../../lib/socialCalendar';
import { formatDate, parseDate } from '../../lib/socialCalendarHelpers';
import './SocialCalendar.css';

const SocialCalendarPage: React.FC = () => {
  // State
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  
  const [currentSuggestions, setCurrentSuggestions] = useState<DaySuggestions | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, SuggestionStatus>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationMsg, setGenerationMsg] = useState<{type: 'success' | 'warning', text: string} | null>(null);
  const [suggestedTopic, setSuggestedTopic] = useState<string>('');
  const abortGenRef = useRef(false);

  const handleCancelGeneration = () => {
    abortGenRef.current = true;
    setIsGenerating(false);
  };

  // Load status map for calendar view (batch load)
  useEffect(() => {
    // In a real app with DB, we'd query by month range.
    // Here with localStorage, we just iterate all known dates or lazy load.
    // For simplicity, we'll reload the map when the month changes or after generation.
    refreshStatusMap();
  }, [viewMonth]);

  // Load all posts from database on mount (shared across users)
  useEffect(() => {
    const loadFromDatabase = async () => {
      try {
        // Load posts for the current month and surrounding months
        const start = new Date(viewMonth);
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        
        const end = new Date(viewMonth);
        end.setMonth(end.getMonth() + 2);
        end.setDate(0); // Last day of the month
        
        const dbPosts = await loadPostsFromDatabase(
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0]
        );
        
        // Get all dates that have data in localStorage for this range
        const allLocalDates = getAllDatesWithSuggestions().filter(dateStr => {
          const date = new Date(dateStr);
          return date >= start && date <= end;
        });
        
        // Create a set of dates that have posts in DB
        const dbDatesSet = new Set(dbPosts.map(p => p.date));
        
        // Update localStorage: save DB posts, remove dates that are no longer in DB
        for (const dbDay of dbPosts) {
          saveDaySuggestions(dbDay); // Update localStorage with DB data
        }
        
        // Remove from localStorage any dates that are in localStorage but not in DB
        for (const localDate of allLocalDates) {
          if (!dbDatesSet.has(localDate)) {
            deleteDaySuggestions(localDate);
          }
        }
        
        refreshStatusMap();
      } catch (error) {
        console.error('Failed to load posts from database:', error);
        // Continue with localStorage only
      }
    };
    
    loadFromDatabase();
  }, [viewMonth]);

  // Load suggestions when selected date changes
  useEffect(() => {
    loadSuggestionsForDate(selectedDate);
  }, [selectedDate]);

  // Actions
  const loadSuggestionsForDate = async (date: string) => {
    // First try database (shared across users)
    const dbData = await loadPostsForDate(date);
    if (dbData) {
      setCurrentSuggestions(dbData);
      // Also update localStorage as cache
      saveDaySuggestions(dbData);
      return;
    }
    
    // If DB returns null/empty, check if we should clear localStorage for this date
    // This handles the case where posts were deleted from DB
    const localData = getDaySuggestions(date);
    if (localData) {
      // If we have local data but no DB data, the posts were likely deleted
      // Clear localStorage for this date to keep them in sync
      deleteDaySuggestions(date);
      setCurrentSuggestions(null);
      return;
    }
    
    // No data in DB or localStorage
    setCurrentSuggestions(null);
  };

  const refreshStatusMap = async () => {
    // First, sync with DB to ensure we're showing accurate data
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
      
      const dbDatesSet = new Set(dbPosts.map(p => p.date));
      const allLocalDates = getAllDatesWithSuggestions().filter(dateStr => {
        const date = new Date(dateStr);
        return date >= start && date <= end;
      });
      
      // Remove dates from localStorage that are no longer in DB
      for (const localDate of allLocalDates) {
        if (!dbDatesSet.has(localDate)) {
          deleteDaySuggestions(localDate);
        }
      }
    } catch (error) {
      console.error('Failed to sync status map with database:', error);
    }
    
    const allDates = getAllDatesWithSuggestions();
    const newMap: Record<string, SuggestionStatus> = {};
    
    // Filter for current view month to save processing if listing was huge (optional optimization)
    // But since localStorage is local, we can just read all or filter.
    allDates.forEach(dateStr => {
      const data = getDaySuggestions(dateStr);
      if (data && data.suggestions.length > 0) {
        // Determine aggregate status
        // Priority: Done > Scheduled > Planned
        // If *all* done -> done
        // If *any* scheduled -> scheduled
        // Else -> planned
        const statuses = data.suggestions.map(s => s.status);
        if (statuses.every(s => s === 'done')) {
          newMap[dateStr] = 'done';
        } else if (statuses.some(s => s === 'scheduled')) {
          newMap[dateStr] = 'scheduled';
        } else {
          newMap[dateStr] = 'planned';
        }
      }
    });
    setStatusMap(newMap);
  };

  const handleGenerate = async () => {
    abortGenRef.current = false;
    setIsGenerating(true);
    try {
      // 1. Determine target date
      // If current selected date is empty, use it.
      // If current selected has content, confirm overwrite OR auto-pick next empty?
      // Requirement: "user selects any date" OR "Generar día picks next unplanned day"
      // Let's implement: if no date specifically "selected" (or if we add a "Next" button), we pick next.
      // But UI shows a selected date. 
      // Logic: If I am on a date with content, and click Generate -> Confirm overwrite?
      // Logic: If I am on a date with content, maybe I meant "Generate Next Day"?
      // Let's keep it simple: "Generate for [Selected Date]" button text updates?
      // Or just a primary fab that generates for the *selected* date always.
      
      let targetDate = selectedDate;
      const existing = getDaySuggestions(targetDate);
      
      if (existing) {
        if (!window.confirm(`El día ${targetDate} ya tiene contenido. ¿Deseas regenerarlo?`)) {
          setIsGenerating(false);
          return;
        }
      }

      setGenerationStep('Generando contenido con IA...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Generate with optional topic suggestion
      const result = await socialCalendarGenerator.generate(targetDate, undefined, undefined, [], suggestedTopic || undefined);
      
      if (abortGenRef.current) return;

      // Update state
      setCurrentSuggestions(result);
      refreshStatusMap();

      // Check success
      const llmCount = result.suggestions.filter(s => s.generationSource === 'llm').length;
      if (result.suggestions.length > 0) {
        if (llmCount === result.suggestions.length) {
           setGenerationMsg({ type: 'success', text: '✨ Contenido generado con IA correctamente.' });
        } else if (llmCount > 0) {
           setGenerationMsg({ type: 'warning', text: '⚠️ Algunos contenidos usaron plantillas (IA parcial).' });
        } else {
           setGenerationMsg({ type: 'warning', text: '⚠️ Falló la conexión IA. Se generó contenido base con plantillas.' });
        }
        setTimeout(() => setGenerationMsg(null), 5000);
      }
      
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Error generando contenido.');
    } finally {
      if (!abortGenRef.current) {
        setIsGenerating(false);
        setGenerationStep('');
        setSuggestedTopic(''); // Clear topic after generation
      }
    }
  };

  const handleGenerateNextEmpty = async () => {
    abortGenRef.current = false;
    setIsGenerating(true);
    setGenerationStep('Buscando siguiente día disponible...');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationStep('Iniciando generación...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const nextDate = getNextEmptyDate(); // defaults to tomorrow+
      
      setGenerationStep('Analizando tendencias e inventario...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setGenerationStep('Consultando base de datos de productos...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setGenerationStep('Generando estrategia con IA...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setGenerationStep('Creando contenido y prompts de imagen...');
      
      const result = await socialCalendarGenerator.generate(nextDate);
      
      if (abortGenRef.current) return;

      // Switch view to that date
      setSelectedDate(nextDate);
      // Ensure month view follows if needed
      const resultDate = parseDate(nextDate);
      if (resultDate.getMonth() !== viewMonth.getMonth()) {
        setViewMonth(resultDate);
      }
      
      setCurrentSuggestions(result);
      refreshStatusMap();

      // Check success
      const llmCount = result.suggestions.filter(s => s.generationSource === 'llm').length;
      if (result.suggestions.length > 0) {
        if (llmCount === result.suggestions.length) {
           setGenerationMsg({ type: 'success', text: '✨ Contenido generado con IA correctamente.' });
        } else if (llmCount > 0) {
           setGenerationMsg({ type: 'warning', text: '⚠️ Algunos contenidos usaron plantillas (IA parcial).' });
        } else {
           setGenerationMsg({ type: 'warning', text: '⚠️ Falló la conexión IA. Se generó contenido base con plantillas.' });
        }
        setTimeout(() => setGenerationMsg(null), 5000);
      }
    } catch (error) {
      console.error(error);
      alert('Error buscando siguiente día libre.');
    } finally {
      if (!abortGenRef.current) {
        setIsGenerating(false);
        setGenerationStep('');
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: SuggestionStatus) => {
    if (!currentSuggestions) return;
    updateSuggestionStatus(selectedDate, id, newStatus);
    
    // Update local state largely to reflect UI immediately
    const updated = { ...currentSuggestions };
    const idx = updated.suggestions.findIndex(s => s.id === id);
    if (idx >= 0) {
      updated.suggestions[idx].status = newStatus;
      setCurrentSuggestions(updated); // Update detail view
      refreshStatusMap(); // Update calendar dots
      
      // Save updated status to database
      try {
        await saveDaySuggestionsToDatabase(updated);
      } catch (error) {
        console.error('Failed to save status update to database:', error);
      }
    }
  };

  // Derived display
  const dateObj = parseDate(selectedDate);
  const formattedDateHeader = dateObj.toLocaleDateString('es-MX', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });
  const capitalizedHeader = formattedDateHeader.charAt(0).toUpperCase() + formattedDateHeader.slice(1);
  const phaseLabel = currentSuggestions 
    ? PHASE_LABELS[currentSuggestions.metadata.monthPhase] 
    : PHASE_LABELS['mantenimiento']; // Fallback/Placeholder if empty

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
        {isGenerating && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.75rem',
            color: '#e2e8f0',
            padding: '2rem'
          }}>
            <div className="animate-spin mb-6">
              <Sparkles size={56} className="text-purple-500" />
            </div>
            
            {/* Multi-step progress indicator */}
            <div style={{ width: '100%', maxWidth: '400px', marginBottom: '2rem' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
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
                  active={generationStep.includes('Creando')}
                  completed={false}
                  label="Generación de contenido"
                />
              </div>
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center' }}>
              {generationStep || 'Generando contenido...'}
            </h3>
            <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '2rem', textAlign: 'center' }}>
              Esto puede tomar unos momentos...
            </p>
            <button
              onClick={handleCancelGeneration}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            >
              <X size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'middle' }} /> Cancelar
            </button>
          </div>
        )}
        
        {/* Step Indicator Animation */}
        {isGenerating && (
          <style>{`
            @keyframes stepPulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
            .step-active {
              animation: stepPulse 1.5s ease-in-out infinite;
            }
          `}</style>
        )}

        <div className="feed-header">
          <div className="feed-title">
            <div className="feed-subtitle">
              <span className="phase-tag">{phaseLabel || 'Calendario Social'}</span>
              <span>{dateObj.getFullYear()}</span>
            </div>
            <h1>{capitalizedHeader}</h1>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
                className="generate-btn" 
                onClick={handleGenerate}
                disabled={isGenerating}
                style={currentSuggestions && currentSuggestions.suggestions.length > 0 ? {
                  backgroundColor: 'transparent',
                  border: '1px solid var(--primary-color)',
                  color: 'var(--primary-color)'
                } : {}}
            >
                {currentSuggestions && currentSuggestions.suggestions.length > 0 ? (
                  <>
                    <RefreshCw size={18} /> Regenerar
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generar
                  </>
                )}
            </button>

            <button 
                className="generate-btn secondary" 
                onClick={handleGenerateNextEmpty}
                disabled={isGenerating}
                title="Buscar siguiente día vacío y generar"
            >
                <ArrowRight size={18} />
            </button>
          </div>
        </div>
        
        {generationMsg && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: generationMsg.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(250, 204, 21, 0.1)',
            border: `1px solid ${generationMsg.type === 'success' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(250, 204, 21, 0.2)'}`,
            color: generationMsg.type === 'success' ? '#4ade80' : '#facc15',
            fontSize: '0.9rem'
          }}>
            {generationMsg.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            {generationMsg.text}
          </div>
        )}


        {currentSuggestions && currentSuggestions.suggestions.length > 0 ? (
          <div>
            {currentSuggestions.metadata.relevantDates.length > 0 && (
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                backgroundColor: 'rgba(234, 179, 8, 0.1)', 
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: '0.75rem',
                color: '#fef08a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} />
                <span>Próxima fecha importante: <strong>{currentSuggestions.metadata.relevantDates.join(', ')}</strong></span>
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
                      saveDaySuggestions(updated);
                      
                      // Try to update feedback directly using PUT endpoint (most efficient)
                      // Extract post ID from suggestion ID (format: "db-{postId}")
                      const postIdMatch = id.match(/^db-(\d+)$/);
                      if (postIdMatch) {
                        const postId = parseInt(postIdMatch[1], 10);
                        try {
                          await updatePostFeedback(postId, feedback);
                          console.log(`✓ Feedback updated via PUT for post ${postId}`);
                          return; // Success - exit early
                        } catch (error) {
                          console.error('Failed to update feedback via PUT endpoint:', error);
                          // Fallback: update entire post (which will now update instead of create)
                          try {
                            await saveDaySuggestionsToDatabase(updated);
                            console.log(`✓ Feedback updated via full save for suggestion ${id}`);
                          } catch (fallbackError) {
                            console.error('Failed to save feedback to database:', fallbackError);
                          }
                        }
                      } else {
                        // If ID format doesn't match "db-{id}", the post might not be in DB yet
                        // Try to save/update anyway - it will create if new, update if exists
                        try {
                          await saveDaySuggestionsToDatabase(updated);
                          console.log(`✓ Feedback saved for suggestion ${id}`);
                        } catch (error) {
                          console.error('Failed to save feedback to database:', error);
                        }
                      }
                    }
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            textAlign: 'center',
            padding: '3rem 2rem'
          }}>
            <CalendarIcon size={64} className="empty-icon" style={{ 
              marginBottom: '1.5rem', 
              opacity: 0.5,
              color: '#64748b'
            }} />
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '1rem',
              color: '#e2e8f0'
            }}>
              No hay contenido planeado para este día
            </h3>
            <p style={{ 
              fontSize: '1rem', 
              color: '#94a3b8',
              marginBottom: '2rem',
              maxWidth: '400px'
            }}>
              Genera contenido automáticamente con IA o sugiere un tema específico
            </p>
            
            {/* Optional topic suggestion */}
            <div style={{
              width: '100%',
              maxWidth: '500px',
              marginBottom: '2rem'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                color: '#cbd5e1',
                marginBottom: '0.5rem',
                textAlign: 'left'
              }}>
                💡 Tema sugerido (opcional):
              </label>
              <input
                type="text"
                value={suggestedTopic}
                onChange={(e) => setSuggestedTopic(e.target.value)}
                placeholder="Ej: Preparación de suelo para primavera, Protección contra heladas..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>
            
            {/* Large generate button */}
            <button 
              className="generate-btn" 
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.125rem',
                fontWeight: 600,
                minWidth: '250px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}
            >
              <Sparkles size={24} /> Generar Contenido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialCalendarPage;
