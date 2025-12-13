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
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Suggestion, SuggestionStatus, Channel, TAG_LABELS, POST_TYPE_LABELS } from '../../types/socialCalendar';
import './SocialCalendar.css';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: SuggestionStatus) => void;
  onFeedbackChange?: (id: string, feedback: 'like' | 'dislike' | null) => void;
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

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onStatusChange, onFeedbackChange }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<'like' | 'dislike' | null>(suggestion.userFeedback || null);

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
  
  // Extract topic from caption (first line, remove emojis)
  const extractTopic = (caption: string): string => {
    if (!caption) return '';
    const firstLine = caption.split('\n')[0].trim();
    // Remove emojis and clean up
    return firstLine.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || firstLine.trim();
  };
  const topic = extractTopic(suggestion.caption);
  
  // Get product name and stock status (first product if available)
  const firstProduct = suggestion.products[0] || null;
  const productName = firstProduct?.name || null;
  const productInStock = firstProduct?.inStock !== undefined ? firstProduct.inStock : null;

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

      {/* Topic Badge - Very Visible */}
      {topic && (
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
          <div style={{ 
            fontSize: '0.9rem', 
            color: '#e0e7ff', 
            fontWeight: 500 
          }}>
            {topic}
          </div>
        </div>
      )}

      {/* Post Type + Product Name + AI Badge */}
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span className="post-type-badge" style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem' }}>
              {POST_TYPE_LABELS[suggestion.postType]}
            </span>
            {productName && (
              <span style={{ 
                fontSize: '0.75rem', 
                padding: '0.375rem 0.75rem', 
                borderRadius: '999px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)', 
                color: '#86efac',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontWeight: 600
              }}>
                📦 {productName}
                {productInStock !== null && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.7rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '999px',
                    backgroundColor: productInStock 
                      ? 'rgba(74, 222, 128, 0.2)' 
                      : 'rgba(239, 68, 68, 0.2)',
                    color: productInStock 
                      ? '#4ade80' 
                      : '#ef4444',
                    border: `1px solid ${productInStock 
                      ? 'rgba(74, 222, 128, 0.4)' 
                      : 'rgba(239, 68, 68, 0.4)'}`,
                    fontWeight: 600,
                    marginLeft: '0.25rem'
                  }}>
                    {productInStock ? '✅ En stock' : '⚠️ Sin stock'}
                  </span>
                )}
              </span>
            )}
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

      {/* Footer: Products + Feedback */}
      <div className="action-bar" style={{ 
        marginTop: '1rem', 
        paddingTop: '1rem', 
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        {/* Products */}
        {(suggestion.products.length > 1 || (suggestion.products.length === 1 && suggestion.products[0].specs && suggestion.products[0].specs.length > 0)) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#64748b', flex: 1 }}>
            <span style={{ fontWeight: 500, color: '#94a3b8' }}>Productos relacionados:</span>
            {suggestion.products.map(p => (
              <div key={p.id} className="flex items-center gap-1" style={{ flexWrap: 'wrap' }}>
                 <span>• {p.name}</span>
                 {p.inStock !== undefined && (
                   <span style={{
                     fontSize: '0.7rem',
                     padding: '0.125rem 0.375rem',
                     borderRadius: '999px',
                     backgroundColor: p.inStock 
                       ? 'rgba(74, 222, 128, 0.15)' 
                       : 'rgba(239, 68, 68, 0.15)',
                     color: p.inStock 
                       ? '#4ade80' 
                       : '#ef4444',
                     border: `1px solid ${p.inStock 
                       ? 'rgba(74, 222, 128, 0.3)' 
                       : 'rgba(239, 68, 68, 0.3)'}`,
                     fontWeight: 600,
                     display: 'inline-flex',
                     alignItems: 'center',
                     gap: '0.25rem'
                   }}>
                     {p.inStock ? '✅' : '⚠️'}
                     {p.inStock ? 'En stock' : 'Sin stock'}
                   </span>
                 )}
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
        ) : <div style={{ flex: 1 }} />}
        
        {/* Feedback buttons */}
        {onFeedbackChange && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <span style={{ 
              fontSize: '0.75rem', 
              color: '#64748b',
              marginRight: '0.25rem'
            }}>
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
              onMouseOver={(e) => {
                if (currentFeedback !== 'like') {
                  e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                if (currentFeedback !== 'like') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
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
              onMouseOver={(e) => {
                if (currentFeedback !== 'dislike') {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                if (currentFeedback !== 'dislike') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title="No me gusta este post"
            >
              <ThumbsDown size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionCard;
