import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Video, 
  Share2, 

  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Music,
  Image as ImageIcon
} from 'lucide-react';
import { Suggestion, SuggestionStatus, Channel, TAG_LABELS, POST_TYPE_LABELS } from '../../types/socialCalendar';
import './SocialCalendar.css';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: SuggestionStatus) => void;
}

// Channel configuration for display
const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  'wa-status': { 
    label: 'WhatsApp Status', 
    icon: <MessageCircle size={16} />, 
    color: '#25D366',
    bgColor: 'rgba(37, 211, 102, 0.15)'
  },
  'wa-broadcast': { 
    label: 'WA Difusión', 
    icon: <Share2 size={16} />, 
    color: '#25D366',
    bgColor: 'rgba(37, 211, 102, 0.15)'
  },
  'wa-message': { 
    label: 'WA Mensaje', 
    icon: <MessageCircle size={16} />, 
    color: '#25D366',
    bgColor: 'rgba(37, 211, 102, 0.15)'
  },
  'fb-post': { 
    label: 'FB + IG Post', 
    icon: <Facebook size={16} />, 
    color: '#1877F2',
    bgColor: 'rgba(24, 119, 242, 0.15)'
  },
  'fb-reel': { 
    label: 'FB + IG Reel', 
    icon: <Video size={16} />, 
    color: '#E4405F',
    bgColor: 'rgba(228, 64, 95, 0.15)'
  },
  'ig-post': { 
    label: 'IG Post', 
    icon: <Instagram size={16} />, 
    color: '#E4405F',
    bgColor: 'rgba(228, 64, 95, 0.15)'
  },
  'ig-reel': { 
    label: 'IG Reel', 
    icon: <Video size={16} />, 
    color: '#E4405F',
    bgColor: 'rgba(228, 64, 95, 0.15)'
  },
  'tiktok': { 
    label: 'TikTok', 
    icon: <Video size={16} />, 
    color: '#000000',
    bgColor: 'rgba(255, 255, 255, 0.1)'
  }
};

// Status colors and labels
const STATUS_CONFIG: Record<SuggestionStatus, { label: string; color: string; bgColor: string }> = {
  'planned': { 
    label: '📋 Planeado', 
    color: '#fcd34d',
    bgColor: 'rgba(252, 211, 77, 0.15)'
  },
  'scheduled': { 
    label: '📅 Agendado', 
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.15)'
  },
  'done': { 
    label: '✅ Publicado', 
    color: '#4ade80',
    bgColor: 'rgba(74, 222, 128, 0.15)'
  }
};

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onStatusChange }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Get the primary channel (first one)
  const primaryChannel = suggestion.channels[0];
  const channelConfig = CHANNEL_CONFIG[primaryChannel] || CHANNEL_CONFIG['fb-post'];

  // Extract carousel slides from instructions if present
  const carouselSlidesMatch = suggestion.instructions?.match(/Carrusel \((\d+) slides\):/);
  const hasCarousel = carouselSlidesMatch !== null;
  
  // Check if needs music
  const needsMusic = suggestion.instructions?.includes('🎵');

  return (
    <div className="suggestion-card">
      {/* Header Row: Status + Channel + Time */}
      <div className="card-meta-row" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        {/* Left: Status Selector */}
        <div className="status-selector" style={{
          display: 'flex',
          gap: '0.25rem',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          padding: '0.25rem',
          borderRadius: '0.5rem'
        }}>
          {(['planned', 'scheduled', 'done'] as SuggestionStatus[]).map(status => {
            const config = STATUS_CONFIG[status];
            const isActive = suggestion.status === status;
            return (
              <button
                key={status}
                onClick={() => onStatusChange(suggestion.id, status)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? config.bgColor : 'transparent',
                  color: isActive ? config.color : '#64748b',
                  borderWidth: isActive ? '1px' : '1px',
                  borderStyle: 'solid',
                  borderColor: isActive ? `${config.color}40` : 'transparent'
                }}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Right: Channel + Time */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Channel Badge - Large and Prominent */}
          <div className="channel-badge" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: channelConfig.bgColor,
            border: `1px solid ${channelConfig.color}40`,
            color: channelConfig.color,
            fontWeight: 600,
            fontSize: '0.85rem'
          }}>
            {channelConfig.icon}
            <span>{channelConfig.label}</span>
            {hasCarousel && (
              <span style={{ 
                marginLeft: '0.25rem',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '0.125rem 0.375rem',
                borderRadius: '999px',
                fontSize: '0.7rem'
              }}>
                <ImageIcon size={10} style={{ marginRight: '0.25rem' }} />
                Carrusel
              </span>
            )}
            {needsMusic && (
              <span style={{ marginLeft: '0.25rem', opacity: 0.8, display: 'flex' }}><Music size={14} /></span>
            )}
          </div>

          {/* Posting Time */}
          {suggestion.postingTime && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#93c5fd',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}>
              <Clock size={14} />
              <span>{suggestion.postingTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Post Type + AI Badge + Hook */}
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="post-type-badge">{POST_TYPE_LABELS[suggestion.postType]}</span>
            {suggestion.generationSource === 'llm' && (
              <span style={{ 
                fontSize: '0.65rem', 
                padding: '0.125rem 0.5rem', 
                borderRadius: '999px',
                backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                color: '#c4b5fd',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: 600
              }}>
                <Sparkles size={10} /> IA Potenciada
              </span>
            )}
          </div>
          <h3 className="suggestion-title">{suggestion.hook}</h3>
          <div className="tag-list">
            {suggestion.tags.map(tag => (
              <span key={tag} className="suggestion-tag">
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Instructions / Strategy */}
      {suggestion.instructions && (
        <div className="content-section" style={{ borderLeft: '3px solid #3b82f6' }}>
          <span className="content-label flex items-center gap-2">
            <Info size={12} /> Estrategia & Instrucciones
          </span>
          <div className="content-text" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
            {suggestion.instructions.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Main Copy */}
      <div className="content-section">
        <span className="content-label">Caption / Copy</span>
        <pre className="content-text" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{suggestion.caption}</pre>
        <button 
          className="copy-btn"
          onClick={() => handleCopy(suggestion.caption, 'caption')}
          title="Copiar texto"
        >
          {copiedField === 'caption' ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
        </button>
      </div>

      {/* Image Prompt(s) - Show individually for carousels */}
      <div className="content-section">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => setShowPrompt(!showPrompt)}
        >
          <span className="content-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ImageIcon size={12} />
            {hasCarousel ? `Prompts de Imágenes (${carouselSlidesMatch?.[1]} slides)` : 'AI Image Prompt'}
          </span>
          {showPrompt ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
        </div>
        
        {showPrompt && (
          <div className="content-text mt-2 animate-fade-in" style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              ℹ️ Copia {hasCarousel ? 'cada prompt' : 'este prompt'} y pégalo en Midjourney, DALL-E 3 o Adobe Firefly.
            </div>
            {suggestion.imagePrompt.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
        
        <button 
          className="copy-btn"
          onClick={() => handleCopy(suggestion.imagePrompt, 'prompt')}
          title="Copiar prompt"
        >
          {copiedField === 'prompt' ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
        </button>
      </div>

      {/* Footer: Products */}
      <div className="action-bar" style={{ marginTop: '1rem', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#64748b' }}>
          <span style={{ fontWeight: 500, color: '#94a3b8' }}>Productos:</span>
          {suggestion.products.map(p => (
            <div key={p.id} className="flex items-center gap-1">
               <span>• {p.name}</span>
               {p.specs && p.specs.length > 0 && (
                 <span className="text-xs opacity-70" style={{ 
                    maxWidth: '150px', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    display: 'inline-block',
                    verticalAlign: 'bottom'
                 }}>
                   ({p.specs[0]})
                 </span>
               )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuggestionCard;
