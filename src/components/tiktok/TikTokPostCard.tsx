import React, { useState } from 'react';
import { Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Suggestion, SuggestionStatus } from '../../types/socialCalendar';
import TikTokCarouselViewer from './TikTokCarouselViewer';
import TikTokCapCutGuide from './TikTokCapCutGuide';

interface TikTokPostCardProps {
  suggestion: Suggestion;
  date: string;
  onStatusChange: (id: string, status: SuggestionStatus) => void;
  onFeedbackChange?: (id: string, feedback: 'like' | 'dislike' | null) => void;
}

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; color: string; bgColor: string }> = {
  planned: { label: '📋 Planeado', color: '#fcd34d', bgColor: 'rgba(252, 211, 77, 0.15)' },
  scheduled: { label: '📅 Agendado', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.15)' },
  done: { label: '✅ Publicado', color: '#4ade80', bgColor: 'rgba(74, 222, 128, 0.15)' }
};

const formatDateDisplay = (dateStr: string): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
};

const TikTokPostCard: React.FC<TikTokPostCardProps> = ({
  suggestion,
  date,
  onStatusChange,
  onFeedbackChange
}) => {
  const [activeTab, setActiveTab] = useState<'carousel' | 'capcut'>('carousel');
  const [currentFeedback, setCurrentFeedback] = useState<'like' | 'dislike' | null>(
    suggestion.userFeedback || null
  );

  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '1rem',
      padding: '1.25rem',
      marginBottom: '1rem'
    }}>
      {/* Header: date + time */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#e2e8f0',
          textTransform: 'capitalize'
        }}>
          {formatDateDisplay(date)}
        </div>
        {suggestion.postingTime && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#93c5fd',
            fontWeight: 600,
            fontSize: '0.8rem'
          }}>
            <Clock size={13} />
            {suggestion.postingTime}
          </div>
        )}
      </div>

      {/* Status selector */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: '0.25rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        width: 'fit-content'
      }}>
        {(['planned', 'scheduled', 'done'] as SuggestionStatus[]).map(status => {
          const config = STATUS_CONFIG[status];
          const isActive = suggestion.status === status;
          return (
            <button
              key={status}
              onClick={() => onStatusChange(suggestion.id, status)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                border: isActive ? `1px solid ${config.color}40` : '1px solid transparent',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                backgroundColor: isActive ? config.bgColor : 'transparent',
                color: isActive ? config.color : '#64748b'
              }}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Hook / topic */}
      {suggestion.hook && (
        <div style={{
          marginBottom: '0.75rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '0.5rem',
          borderLeft: '4px solid #3b82f6'
        }}>
          <div style={{
            fontSize: '0.7rem',
            color: '#93c5fd',
            fontWeight: 600,
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Tema
          </div>
          <div style={{ fontSize: '0.9rem', color: '#e0e7ff', fontWeight: 500 }}>{suggestion.hook}</div>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: '0.25rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem'
      }}>
        <button
          onClick={() => setActiveTab('carousel')}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s',
            backgroundColor: activeTab === 'carousel' ? 'rgba(255, 0, 80, 0.2)' : 'transparent',
            color: activeTab === 'carousel' ? '#ff6b8a' : '#64748b'
          }}
        >
          🎠 Carrusel
        </button>
        <button
          onClick={() => setActiveTab('capcut')}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s',
            backgroundColor: activeTab === 'capcut' ? 'rgba(255, 0, 80, 0.2)' : 'transparent',
            color: activeTab === 'capcut' ? '#ff6b8a' : '#64748b'
          }}
        >
          🎬 CapCut Video
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'carousel' ? (
        <TikTokCarouselViewer
          slides={suggestion.carouselSlides || []}
          coverPrompt={suggestion.imagePrompt}
        />
      ) : (
        <TikTokCapCutGuide suggestion={suggestion} />
      )}

      {/* Footer: feedback */}
      {onFeedbackChange && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '0.25rem' }}>
            ¿Te gusta este post?
          </span>
          <button
            onClick={() => {
              const newFeedback = currentFeedback === 'like' ? null : 'like';
              setCurrentFeedback(newFeedback);
              onFeedbackChange(suggestion.id, newFeedback);
            }}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: `1px solid ${currentFeedback === 'like' ? 'rgba(74, 222, 128, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
              backgroundColor: currentFeedback === 'like' ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
              color: currentFeedback === 'like' ? '#4ade80' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s',
              fontSize: '0.875rem'
            }}
            title="Me gusta este post"
          >
            <ThumbsUp size={16} />
          </button>
          <button
            onClick={() => {
              const newFeedback = currentFeedback === 'dislike' ? null : 'dislike';
              setCurrentFeedback(newFeedback);
              onFeedbackChange(suggestion.id, newFeedback);
            }}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: `1px solid ${currentFeedback === 'dislike' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
              backgroundColor: currentFeedback === 'dislike' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: currentFeedback === 'dislike' ? '#ef4444' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s',
              fontSize: '0.875rem'
            }}
            title="No me gusta este post"
          >
            <ThumbsDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TikTokPostCard;
