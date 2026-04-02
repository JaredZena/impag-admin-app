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
  ThumbsDown,
  Package,
  CalendarCheck,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Suggestion, SuggestionStatus, Channel, TAG_LABELS, POST_TYPE_LABELS } from '../../types/socialCalendar';
import './SocialCalendar.css';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: SuggestionStatus) => void;
  onFeedbackChange?: (id: string, feedback: 'like' | 'dislike' | null) => void;
}

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ReactNode; colorClass: string; bgClass: string }> = {
  'wa-status':    { label: 'WhatsApp Status', icon: <MessageCircle size={14} />, colorClass: 'text-green-400',  bgClass: 'bg-green-400/10 border-green-400/25' },
  'wa-broadcast': { label: 'WA Difusión',     icon: <Share2 size={14} />,        colorClass: 'text-green-400',  bgClass: 'bg-green-400/10 border-green-400/25' },
  'wa-message':   { label: 'WA Mensaje',      icon: <MessageCircle size={14} />, colorClass: 'text-green-400',  bgClass: 'bg-green-400/10 border-green-400/25' },
  'fb-post':      { label: 'FB + IG Post',    icon: <Facebook size={14} />,      colorClass: 'text-blue-400',   bgClass: 'bg-blue-400/10 border-blue-400/25' },
  'fb-reel':      { label: 'FB + IG Reel',    icon: <Video size={14} />,         colorClass: 'text-pink-400',   bgClass: 'bg-pink-400/10 border-pink-400/25' },
  'ig-post':      { label: 'IG Post',         icon: <Instagram size={14} />,     colorClass: 'text-pink-400',   bgClass: 'bg-pink-400/10 border-pink-400/25' },
  'ig-reel':      { label: 'IG Reel',         icon: <Video size={14} />,         colorClass: 'text-pink-400',   bgClass: 'bg-pink-400/10 border-pink-400/25' },
  'tiktok':       { label: 'TikTok',          icon: <Video size={14} />,         colorClass: 'text-slate-200',  bgClass: 'bg-white/5 border-white/15' },
};

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; icon: React.ReactNode; colorClass: string; bgClass: string; borderClass: string }> = {
  planned:   { label: 'Planeado',  icon: <ClipboardList size={12} />,  colorClass: 'text-amber-300',  bgClass: 'bg-amber-300/15',  borderClass: 'border-amber-300/40' },
  scheduled: { label: 'Agendado',  icon: <CalendarCheck size={12} />,  colorClass: 'text-blue-400',   bgClass: 'bg-blue-400/15',   borderClass: 'border-blue-400/40' },
  done:      { label: 'Publicado', icon: <CheckCircle2 size={12} />,   colorClass: 'text-green-400',  bgClass: 'bg-green-400/15',  borderClass: 'border-green-400/40' },
};

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onStatusChange, onFeedbackChange }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<'like' | 'dislike' | null>(suggestion.userFeedback || null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const primaryChannel = suggestion.channels[0];
  const channelConfig = CHANNEL_CONFIG[primaryChannel] || CHANNEL_CONFIG['fb-post'];

  const carouselSlidesMatch = suggestion.instructions?.match(/Carrusel \((\d+) slides\):/);
  const hasCarousel = carouselSlidesMatch !== null;
  const needsMusic = suggestion.instructions?.includes('🎵');

  const firstProduct = suggestion.products[0] || null;
  const productName = firstProduct?.name || null;
  const productInStock = firstProduct?.inStock !== undefined ? firstProduct.inStock : null;

  const activeStatus = STATUS_CONFIG[suggestion.status];

  return (
    <div className="suggestion-card group rounded-xl border border-slate-700/40 bg-slate-800/60 backdrop-blur-sm mb-4 transition-all duration-200 hover:border-blue-500/25 hover:bg-slate-800/80">

      {/* ── Collapsed Header (always visible) ─────────────────────── */}
      <div className="p-4">

        {/* Row 1: Status selector + Channel + Time */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          {/* Status toggle group */}
          <div className="flex gap-0.5 bg-slate-900/70 p-1 rounded-lg">
            {(['planned', 'scheduled', 'done'] as SuggestionStatus[]).map(status => {
              const cfg = STATUS_CONFIG[status];
              const isActive = suggestion.status === status;
              return (
                <button
                  key={status}
                  onClick={() => onStatusChange(suggestion.id, status)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all duration-150 cursor-pointer',
                    isActive
                      ? `${cfg.colorClass} ${cfg.bgClass} ${cfg.borderClass}`
                      : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-700/50'
                  )}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Channel badge + Time */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold',
              channelConfig.colorClass, channelConfig.bgClass
            )}>
              {channelConfig.icon}
              <span>{channelConfig.label}</span>
              {hasCarousel && (
                <span className="flex items-center gap-0.5 ml-1 bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">
                  <ImageIcon size={9} /> Carrusel
                </span>
              )}
              {needsMusic && <Music size={12} className="ml-1 opacity-75" />}
            </div>

            {suggestion.postingTime && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                <Clock size={12} />
                {suggestion.postingTime}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Post type + Product + AI badge */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1">
            {POST_TYPE_LABELS[suggestion.postType]}
          </span>
          {productName && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-300 bg-green-400/10 border border-green-400/25 rounded-full px-2.5 py-1">
              <Package size={11} />
              {productName}
              {productInStock !== null && (
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                  productInStock
                    ? 'text-green-400 bg-green-400/15 border-green-400/30'
                    : 'text-red-400 bg-red-400/15 border-red-400/30'
                )}>
                  {productInStock ? 'En stock' : 'Sin stock'}
                </span>
              )}
            </span>
          )}
          {suggestion.generationSource === 'llm' && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/25 rounded-full px-2 py-0.5">
              <Sparkles size={9} /> IA
            </span>
          )}
        </div>

        {/* Row 3: Hook title */}
        <h3 className="text-[15px] font-semibold text-slate-100 leading-snug mb-3">
          {suggestion.hook}
        </h3>

        {/* Row 4: Caption (clamped) */}
        <div className="relative">
          <pre className={cn(
            'text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans',
            !isExpanded && 'line-clamp-3'
          )}>
            {suggestion.caption}
          </pre>
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/80 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Row 5: Action bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/40 gap-2 flex-wrap">
          {/* Left: Copy caption + Feedback */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(suggestion.caption, 'caption')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700 text-xs font-medium transition-all duration-150 cursor-pointer"
              title="Copiar caption"
            >
              {copiedField === 'caption'
                ? <><Check size={13} className="text-green-400" /> Copiado</>
                : <><Copy size={13} /> Copiar</>
              }
            </button>

            {onFeedbackChange && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const next = currentFeedback === 'like' ? null : 'like';
                    setCurrentFeedback(next);
                    onFeedbackChange(suggestion.id, next);
                  }}
                  className={cn(
                    'p-1.5 rounded-lg border transition-all duration-150 cursor-pointer',
                    currentFeedback === 'like'
                      ? 'text-green-400 bg-green-400/15 border-green-400/40'
                      : 'text-slate-500 border-slate-700/50 hover:text-green-400 hover:bg-green-400/10 hover:border-green-400/30'
                  )}
                  title="Me gusta"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={() => {
                    const next = currentFeedback === 'dislike' ? null : 'dislike';
                    setCurrentFeedback(next);
                    onFeedbackChange(suggestion.id, next);
                  }}
                  className={cn(
                    'p-1.5 rounded-lg border transition-all duration-150 cursor-pointer',
                    currentFeedback === 'dislike'
                      ? 'text-red-400 bg-red-400/15 border-red-400/40'
                      : 'text-slate-500 border-slate-700/50 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30'
                  )}
                  title="No me gusta"
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Right: Expand toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 cursor-pointer"
          >
            {isExpanded ? (
              <><ChevronUp size={14} /> Menos</>
            ) : (
              <><ChevronDown size={14} /> Ver más</>
            )}
          </button>
        </div>
      </div>

      {/* ── Expanded Detail Section ────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-slate-700/40 px-4 pb-4 pt-3 space-y-3">

          {/* Tags */}
          {suggestion.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {suggestion.tags.map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {/* Instructions */}
          {suggestion.instructions && (
            <div className="rounded-lg bg-slate-900/50 border-l-2 border-blue-500 p-3">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                <Info size={11} /> Estrategia & Instrucciones
              </span>
              <div className="text-xs text-slate-400 leading-relaxed space-y-0.5">
                {suggestion.instructions.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {/* Full caption */}
          <div className="rounded-lg bg-slate-900/50 p-3 relative">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2 block">
              Caption / Copy
            </span>
            <pre className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans pr-8">
              {suggestion.caption}
            </pre>
            <button
              className="absolute top-3 right-3 p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all duration-150 cursor-pointer"
              onClick={() => handleCopy(suggestion.caption, 'caption-full')}
              title="Copiar texto"
            >
              {copiedField === 'caption-full' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Image prompt (collapsible) */}
          <div className="rounded-lg bg-slate-900/50 p-3 relative">
            <button
              className="flex items-center justify-between w-full cursor-pointer"
              onClick={() => setShowPrompt(!showPrompt)}
            >
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <ImageIcon size={11} />
                {hasCarousel ? `Prompts de Imágenes (${carouselSlidesMatch?.[1]} slides)` : 'AI Image Prompt'}
              </span>
              {showPrompt ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
            </button>

            {showPrompt && (
              <div className="mt-2 pt-2 border-t border-white/5 text-xs text-slate-400 leading-relaxed space-y-0.5">
                <p className="text-slate-500 mb-1.5">
                  Copia {hasCarousel ? 'cada prompt' : 'este prompt'} y pégalo en Midjourney, DALL-E 3 o Adobe Firefly.
                </p>
                {suggestion.imagePrompt.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            <button
              className="absolute top-3 right-3 p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all duration-150 cursor-pointer"
              onClick={() => handleCopy(suggestion.imagePrompt, 'prompt')}
              title="Copiar prompt"
            >
              {copiedField === 'prompt' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Multi-product list (only if more than 1 or has specs) */}
          {(suggestion.products.length > 1 || (suggestion.products.length === 1 && (suggestion.products[0].specs?.length ?? 0) > 0)) && (
            <div className="text-xs text-slate-500 space-y-1">
              <span className="text-slate-400 font-medium block">Productos relacionados:</span>
              {suggestion.products.map(p => (
                <div key={p.id} className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400">• {p.name}</span>
                  {p.inStock !== undefined && (
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      p.inStock
                        ? 'text-green-400 bg-green-400/10 border-green-400/25'
                        : 'text-red-400 bg-red-400/10 border-red-400/25'
                    )}>
                      {p.inStock ? 'En stock' : 'Sin stock'}
                    </span>
                  )}
                  {p.specs && p.specs.length > 0 && (
                    <span className="text-slate-600 truncate max-w-[150px]">({p.specs[0]})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestionCard;
