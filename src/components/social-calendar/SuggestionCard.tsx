import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Video, 
  Share2, 
  Smartphone,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles
} from 'lucide-react';
import { Suggestion, SuggestionStatus, Channel, TAG_LABELS, POST_TYPE_LABELS } from '../../types/socialCalendar';
import './SocialCalendar.css';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: SuggestionStatus) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onStatusChange }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getChannelIcon = (channel: Channel) => {
    switch (channel) {
      case 'ig-post':
      case 'ig-reel': return <Instagram size={18} />;
      case 'fb-post':
      case 'fb-reel': return <Facebook size={18} />;
      case 'wa-status':
      case 'wa-message':
        return <MessageCircle size={18} />;
      case 'wa-broadcast': return <Share2 size={18} />;
      case 'tiktok': return <Video size={18} />;
      default: return <Smartphone size={18} />;
    }
  };

  return (
    <div className="suggestion-card">
      <div className="card-header">
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="post-type-badge">{POST_TYPE_LABELS[suggestion.postType]}</span>
                {suggestion.generationSource === 'llm' && (
                    <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '0.1rem 0.4rem', 
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
            {suggestion.postingTime && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#94a3b8', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem'
              }}>
                <Clock size={12} />
                {suggestion.postingTime}
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

      <div className="card-channels">
        {suggestion.channels.map(channel => (
          <div key={channel} className="channel-icon" title={channel}>
            {getChannelIcon(channel)}
          </div>
        ))}
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

      {/* Collapsible Prompt */}
      <div className="content-section">
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => setShowPrompt(!showPrompt)}
        >
          <span className="content-label">AI Image Prompt</span>
          {showPrompt ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
        </div>
        
        {showPrompt && (
          <div className="content-text mt-2 animate-fade-in" style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              ℹ️ Copia este prompt y pégalo en Midjourney, DALL-E 3 o Adobe Firefly.
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

      <div className="action-bar">
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

        <div className="status-toggles">
          {(['planned', 'scheduled', 'done'] as SuggestionStatus[]).map(status => (
            <button
              key={status}
              className={`status-btn ${suggestion.status === status ? `active ${status}` : ''}`}
              onClick={() => onStatusChange(suggestion.id, status)}
            >
              {status === 'planned' && 'Planeado'}
              {status === 'scheduled' && 'Agendado'}
              {status === 'done' && 'Publicado'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuggestionCard;
