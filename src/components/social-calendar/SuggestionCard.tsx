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

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ReactNode; cls: string }> = {
  'wa-status':    { label: 'WhatsApp Status', icon: <MessageCircle size={14} />, cls: 'text-green-400 bg-green-500/10 border-green-500/25' },
  'wa-broadcast': { label: 'WA Difusión',     icon: <Share2 size={14} />,        cls: 'text-green-400 bg-green-500/10 border-green-500/25' },
  'wa-message':   { label: 'WA Mensaje',      icon: <MessageCircle size={14} />, cls: 'text-green-400 bg-green-500/10 border-green-500/25' },
  'fb-post':      { label: 'FB + IG Post',    icon: <Facebook size={14} />,      cls: 'text-amber-400 bg-amber-600/10 border-amber-600/25' },
  'fb-reel':      { label: 'FB + IG Reel',    icon: <Video size={14} />,         cls: 'text-orange-400 bg-orange-600/10 border-orange-600/25' },
  'ig-post':      { label: 'IG Post',         icon: <Instagram size={14} />,     cls: 'text-amber-300 bg-amber-600/10 border-amber-600/25' },
  'ig-reel':      { label: 'IG Reel',         icon: <Video size={14} />,         cls: 'text-orange-300 bg-orange-600/10 border-orange-600/25' },
  'tiktok':       { label: 'TikTok',          icon: <Video size={14} />,         cls: 'text-stone-300 bg-stone-700/20 border-stone-600/30' },
};

const STATUS_CONFIG: Record<SuggestionStatus, {
  label: string; icon: React.ReactNode;
  activeCls: string; inactiveCls: string;
}> = {
  planned:   {
    label: 'Planeado',  icon: <ClipboardList size={12} />,
    activeCls:   'text-amber-300 bg-amber-700/20 border-amber-500/40',
    inactiveCls: 'text-green-900 border-transparent hover:text-amber-400 hover:bg-amber-900/20',
  },
  scheduled: {
    label: 'Agendado',  icon: <CalendarCheck size={12} />,
    activeCls:   'text-emerald-300 bg-emerald-800/25 border-emerald-600/40',
    inactiveCls: 'text-green-900 border-transparent hover:text-emerald-400 hover:bg-emerald-900/20',
  },
  done:      {
    label: 'Publicado', icon: <CheckCircle2 size={12} />,
    activeCls:   'text-lime-300 bg-lime-800/20 border-lime-600/40',
    inactiveCls: 'text-green-900 border-transparent hover:text-lime-400 hover:bg-lime-900/20',
  },
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

  return (
    <div className="suggestion-card">

      {/* ── Collapsed Header ─────────────────────────────────────── */}
      <div className="p-4">

        {/* Row 1: Status toggles + Channel + Time */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex gap-0.5 bg-black/25 p-1 rounded-xl">
            {(['planned', 'scheduled', 'done'] as SuggestionStatus[]).map(status => {
              const cfg = STATUS_CONFIG[status];
              const isActive = suggestion.status === status;
              return (
                <button
                  key={status}
                  onClick={() => onStatusChange(suggestion.id, status)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer',
                    isActive ? cfg.activeCls : cfg.inactiveCls
                  )}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold',
              channelConfig.cls
            )}>
              {channelConfig.icon}
              <span>{channelConfig.label}</span>
              {hasCarousel && (
                <span className="flex items-center gap-0.5 ml-1 bg-black/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  <ImageIcon size={9} /> Carrusel
                </span>
              )}
              {needsMusic && <Music size={12} className="ml-1 opacity-70" />}
            </div>

            {suggestion.postingTime && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-900/20 border border-green-800/30 text-green-400/80 text-xs font-semibold">
                <Clock size={12} />
                {suggestion.postingTime}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Post type + Product + AI badge */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-700/15 border border-amber-700/25 rounded-full px-2.5 py-1">
            {POST_TYPE_LABELS[suggestion.postType]}
          </span>
          {productName && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-800/15 border border-emerald-700/25 rounded-full px-2.5 py-1">
              <Package size={11} />
              {productName}
              {productInStock !== null && (
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                  productInStock
                    ? 'text-lime-300 bg-lime-800/20 border-lime-700/30'
                    : 'text-orange-400 bg-orange-800/20 border-orange-700/30'
                )}>
                  {productInStock ? 'En stock' : 'Sin stock'}
                </span>
              )}
            </span>
          )}
          {suggestion.generationSource === 'llm' && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-lime-300 bg-lime-800/15 border border-lime-700/20 rounded-full px-2 py-0.5">
              <Sparkles size={9} /> IA
            </span>
          )}
        </div>

        {/* Row 3: Hook title */}
        <h3 className="text-[15px] font-semibold text-green-50 leading-snug mb-3" style={{ fontFamily: "'Lora', serif" }}>
          {suggestion.hook}
        </h3>

        {/* Row 4: Caption (clamped) */}
        <div className="relative">
          <pre className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap font-sans text-green-200/80',
            !isExpanded && 'line-clamp-3'
          )}>
            {suggestion.caption}
          </pre>
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#0f1d11]/90 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Row 5: Action bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-green-900/40 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(suggestion.caption, 'caption')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-800/40 text-green-600 hover:text-green-300 hover:bg-green-900/50 text-xs font-semibold transition-all duration-150 cursor-pointer"
              title="Copiar caption"
            >
              {copiedField === 'caption'
                ? <><Check size={13} className="text-lime-400" /> Copiado</>
                : <><Copy size={13} /> Copiar</>}
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
                      ? 'text-lime-400 bg-lime-800/20 border-lime-600/40'
                      : 'text-green-800 border-green-900/50 hover:text-lime-400 hover:bg-lime-900/20 hover:border-lime-700/30'
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
                      ? 'text-orange-400 bg-orange-800/20 border-orange-600/40'
                      : 'text-green-800 border-green-900/50 hover:text-orange-400 hover:bg-orange-900/20 hover:border-orange-700/30'
                  )}
                  title="No me gusta"
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-green-800 hover:text-green-500 transition-colors duration-150 cursor-pointer"
          >
            {isExpanded ? <><ChevronUp size={14} /> Menos</> : <><ChevronDown size={14} /> Ver más</>}
          </button>
        </div>
      </div>

      {/* ── Expanded Detail ───────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-green-900/40 px-4 pb-4 pt-3 space-y-3">

          {/* Tags */}
          {suggestion.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {suggestion.tags.map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-amber-800/15 border border-amber-800/25 text-amber-400/80">
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {/* Instructions */}
          {suggestion.instructions && (
            <div className="rounded-xl bg-black/20 border-l-2 border-amber-600/50 p-3">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-green-700 font-bold mb-2">
                <Info size={11} /> Estrategia & Instrucciones
              </span>
              <div className="text-xs text-green-500/80 leading-relaxed space-y-0.5">
                {suggestion.instructions.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {/* Full caption */}
          <div className="rounded-xl bg-black/20 p-3 relative">
            <span className="text-[11px] uppercase tracking-wider text-green-700 font-bold mb-2 block">
              Caption / Copy
            </span>
            <pre className="text-sm text-green-100/90 leading-relaxed whitespace-pre-wrap font-sans pr-8">
              {suggestion.caption}
            </pre>
            <button
              className="absolute top-3 right-3 p-1.5 rounded-lg text-green-700 hover:text-green-300 hover:bg-green-900/40 transition-all duration-150 cursor-pointer"
              onClick={() => handleCopy(suggestion.caption, 'caption-full')}
              title="Copiar texto"
            >
              {copiedField === 'caption-full' ? <Check size={14} className="text-lime-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Image prompt */}
          <div className="rounded-xl bg-black/20 p-3 relative">
            <button
              className="flex items-center justify-between w-full cursor-pointer"
              onClick={() => setShowPrompt(!showPrompt)}
            >
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-green-700 font-bold">
                <ImageIcon size={11} />
                {hasCarousel ? `Prompts de Imágenes (${carouselSlidesMatch?.[1]} slides)` : 'AI Image Prompt'}
              </span>
              {showPrompt ? <ChevronUp size={13} className="text-green-700" /> : <ChevronDown size={13} className="text-green-700" />}
            </button>

            {showPrompt && (
              <div className="mt-2 pt-2 border-t border-green-900/30 text-xs text-green-600/70 leading-relaxed space-y-0.5">
                <p className="text-green-800 mb-1.5">
                  Copia {hasCarousel ? 'cada prompt' : 'este prompt'} y pégalo en Midjourney, DALL-E 3 o Adobe Firefly.
                </p>
                {suggestion.imagePrompt.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            <button
              className="absolute top-3 right-3 p-1.5 rounded-lg text-green-700 hover:text-green-300 hover:bg-green-900/40 transition-all duration-150 cursor-pointer"
              onClick={() => handleCopy(suggestion.imagePrompt, 'prompt')}
              title="Copiar prompt"
            >
              {copiedField === 'prompt' ? <Check size={14} className="text-lime-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Multi-product list */}
          {(suggestion.products.length > 1 || (suggestion.products.length === 1 && (suggestion.products[0].specs?.length ?? 0) > 0)) && (
            <div className="text-xs text-green-800 space-y-1">
              <span className="text-green-600 font-semibold block">Productos relacionados:</span>
              {suggestion.products.map(p => (
                <div key={p.id} className="flex items-center gap-2 flex-wrap">
                  <span className="text-green-600">• {p.name}</span>
                  {p.inStock !== undefined && (
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      p.inStock
                        ? 'text-lime-400 bg-lime-900/20 border-lime-800/30'
                        : 'text-orange-400 bg-orange-900/20 border-orange-800/30'
                    )}>
                      {p.inStock ? 'En stock' : 'Sin stock'}
                    </span>
                  )}
                  {p.specs && p.specs.length > 0 && (
                    <span className="text-green-800 truncate max-w-[150px]">({p.specs[0]})</span>
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
