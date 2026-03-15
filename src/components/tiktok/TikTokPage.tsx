import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Music, Sparkles } from 'lucide-react';
import { Suggestion, SuggestionStatus } from '../../types/socialCalendar';
import { loadPostsFromDatabase, updatePostFeedback } from '../../lib/socialCalendar';
import { apiRequest } from '../../utils/api';
import TikTokPostCard from './TikTokPostCard';

interface SuggestionWithDate {
  date: string;
  suggestion: Suggestion;
}

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDateString = (date: Date): string => date.toISOString().split('T')[0];

const formatWeekLabel = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const start = weekStart.toLocaleDateString('es-MX', opts);
  const end = weekEnd.toLocaleDateString('es-MX', { ...opts, year: 'numeric' });
  return `${start} — ${end}`;
};

const TikTokPage: React.FC = () => {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [posts, setPosts] = useState<SuggestionWithDate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDate, setGenerateDate] = useState<string>(toDateString(new Date()));
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  useEffect(() => {
    loadTikTokPosts();
  }, [weekStart]);

  const loadTikTokPosts = async () => {
    setIsLoading(true);
    try {
      const allDays = await loadPostsFromDatabase(
        toDateString(weekStart),
        toDateString(weekEnd)
      );
      const tiktokPosts: SuggestionWithDate[] = [];
      for (const day of allDays) {
        for (const suggestion of day.suggestions) {
          if (suggestion.channels.includes('tiktok')) {
            tiktokPosts.push({ date: day.date, suggestion });
          }
        }
      }
      tiktokPosts.sort((a, b) => a.date.localeCompare(b.date));
      setPosts(tiktokPosts);
    } catch (error) {
      console.error('Failed to load TikTok posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateMsg(null);
    try {
      await apiRequest('/social/generate', {
        method: 'POST',
        body: JSON.stringify({ date: generateDate })
      });
      setGenerateMsg('✅ Post generado. Recargando...');
      await loadTikTokPosts();
      setGenerateMsg(null);
    } catch (error) {
      setGenerateMsg('❌ Error al generar el post. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = (id: string, status: SuggestionStatus) => {
    setPosts(prev =>
      prev.map(p =>
        p.suggestion.id === id ? { ...p, suggestion: { ...p.suggestion, status } } : p
      )
    );
  };

  const handleFeedbackChange = async (id: string, feedback: 'like' | 'dislike' | null) => {
    setPosts(prev =>
      prev.map(p =>
        p.suggestion.id === id ? { ...p, suggestion: { ...p.suggestion, userFeedback: feedback } } : p
      )
    );
    try {
      await updatePostFeedback(parseInt(id), feedback);
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  const navBtnStyle: React.CSSProperties = {
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a14', color: '#e2e8f0', fontFamily: 'inherit' }}>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a14 0%, #1a0a14 100%)',
        borderBottom: '1px solid rgba(255, 0, 80, 0.2)',
        padding: '1.5rem 2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '0.5rem',
            backgroundColor: '#ff0050',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Music size={20} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            TikTok Studio
          </h1>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
          Gestiona tus posts de TikTok con carousel viewer y guía CapCut paso a paso.
        </p>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
        {/* Controls row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Week picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={handlePrevWeek} style={navBtnStyle} title="Semana anterior">
              <ChevronLeft size={18} />
            </button>
            <div style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(255, 0, 80, 0.1)',
              border: '1px solid rgba(255, 0, 80, 0.2)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#ff6b8a',
              minWidth: '200px',
              textAlign: 'center'
            }}>
              {formatWeekLabel(weekStart)}
            </div>
            <button onClick={handleNextWeek} style={navBtnStyle} title="Semana siguiente">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Generate section */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={generateDate}
              onChange={e => setGenerateDate(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: isGenerating ? '#334155' : '#ff0050',
                color: '#fff',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generando...
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Generar post TikTok
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generate message */}
        {generateMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#e2e8f0'
          }}>
            {generateMsg}
          </div>
        )}

        {/* Posts list */}
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '4rem',
            color: '#64748b'
          }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : posts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            borderRadius: '1rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎵</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
              No hay posts de TikTok esta semana
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Genera un post usando el botón de arriba o navega a otra semana.
            </div>
          </div>
        ) : (
          posts.map(({ date, suggestion }) => (
            <TikTokPostCard
              key={suggestion.id}
              suggestion={suggestion}
              date={date}
              onStatusChange={handleStatusChange}
              onFeedbackChange={handleFeedbackChange}
            />
          ))
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TikTokPage;
