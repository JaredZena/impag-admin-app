import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Calendar as CalendarIcon, AlertCircle, Check, AlertTriangle, X, RefreshCw, ArrowRight } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import SuggestionCard from './SuggestionCard';
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
  saveDaySuggestions
} from '../../lib/socialCalendarStorage';
import { socialCalendarGenerator, loadPostsFromDatabase, loadPostsForDate, saveDaySuggestionsToDatabase } from '../../lib/socialCalendar';
import { formatDate, parseDate } from '../../lib/socialCalendarHelpers';
import './SocialCalendar.css';

const SocialCalendarPage: React.FC = () => {
  // State
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  
  const [currentSuggestions, setCurrentSuggestions] = useState<DaySuggestions | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, SuggestionStatus>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMsg, setGenerationMsg] = useState<{type: 'success' | 'warning', text: string} | null>(null);
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
        
        // Merge with localStorage (database takes priority)
        for (const dbDay of dbPosts) {
          saveDaySuggestions(dbDay); // Update localStorage with DB data
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
    
    // Fallback to localStorage
    const data = getDaySuggestions(date);
    setCurrentSuggestions(data);
  };

  const refreshStatusMap = () => {
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

      // Generate
      const result = await socialCalendarGenerator.generate(targetDate);
      
      if (abortGenRef.current) return;

      // Update state
      setCurrentSuggestions(result);
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
      if (!abortGenRef.current) setIsGenerating(false);
    }
  };

  const handleGenerateNextEmpty = async () => {
    abortGenRef.current = false;
    setIsGenerating(true);
    try {
      const nextDate = getNextEmptyDate(); // defaults to tomorrow+
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
      if (!abortGenRef.current) setIsGenerating(false);
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
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.75rem',
            color: '#e2e8f0'
          }}>
            <div className="animate-spin mb-4">
              <Sparkles size={48} className="text-purple-500" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Analizando tendencias e inventario...
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center' }}>
              La IA está revisando tus productos, fechas importantes y patrones de venta para crear el post ideal.
            </p>
            <button 
              onClick={handleCancelGeneration}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
            >
              <X size={14} /> Cancelar Generación
            </button>
          </div>
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


        {currentSuggestions ? (
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
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <CalendarIcon size={48} className="empty-icon" />
            <h3>No hay contenido planeado para este día</h3>
            <p>Haz clic en "Generar Próximo Libre" o regenera este día.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialCalendarPage;
