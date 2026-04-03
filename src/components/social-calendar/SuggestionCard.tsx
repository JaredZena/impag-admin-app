import React, { useState } from 'react';
import {
  Copy, Check, Instagram, Facebook, MessageCircle, Video, Share2,
  Clock, ChevronDown, ChevronUp, Info, Sparkles, Music,
  Image as ImageIcon, ThumbsUp, ThumbsDown, Package,
  CalendarCheck, ClipboardList, CheckCircle2,
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
  'wa-status':    { label: 'WhatsApp Status', icon: <MessageCircle size={13} />, cls: 'text-green-700 bg-green-50 border-green-200' },
  'wa-broadcast': { label: 'WA Difusión',     icon: <Share2 size={13} />,        cls: 'text-green-700 bg-green-50 border-green-200' },
  'wa-message':   { label: 'WA Mensaje',      icon: <MessageCircle size={13} />, cls: 'text-green-700 bg-green-50 border-green-200' },
  'fb-post':      { label: 'FB + IG Post',    icon: <Facebook size={13} />,      cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  'fb-reel':      { label: 'FB + IG Reel',    icon: <Video size={13} />,         cls: 'text-purple-700 bg-purple-50 border-purple-200' },
  'ig-post':      { label: 'IG Post',         icon: <Instagram size={13} />,     cls: 'text-pink-700 bg-pink-50 border-pink-200' },
  'ig-reel':      { label: 'IG Reel',         icon: <Video size={13} />,         cls: 'text-purple-700 bg-purple-50 border-purple-200' },
  'tiktok':       { label: 'TikTok',          icon: <Video size={13} />,         cls: 'text-gray-700 bg-gray-100 border-gray-200' },
};

const STATUS_CONFIG: Record<SuggestionStatus, {
  label: string; icon: React.ReactNode; activeCls: string; inactiveCls: string;
}> = {
  planned:   {
    label: 'Planeado',  icon: <ClipboardList size={12} />,
    activeCls:   'text-amber-700 bg-amber-50 border-amber-200',
    inactiveCls: 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100',
  },
  scheduled: {
    label: 'Agendado',  icon: <CalendarCheck size={12} />,
    activeCls:   'text-blue-700 bg-blue-50 border-blue-200',
    inactiveCls: 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100',
  },
  done:      {
    label: 'Publicado', icon: <CheckCircle2 size={12} />,
    activeCls:   'text-green-700 bg-green-50 border-green-200',
    inactiveCls: 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100',
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
          <div className="flex gap-0.5 bg-gray-100 p-1 rounded-lg">
            {(['planned', 'scheduled', 'done'] as SuggestionStatus[]).map(status => {
              const cfg = STATUS_CONFIG[status];
              const isActive = suggestion.status === status;
              return (
                <button
                  key={status}
                  onClick={() => onStatusChange(suggestion.id, status)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all duration-150 cursor-pointer',
                    isActive ? cfg.activeCls : cfg.inactiveCls
                  )}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium',
              channelConfig.cls
            )}>
              {channelConfig.icon}
              <span>{channelConfig.label}</span>
              {hasCarousel && (
                <span className="flex items-center gap-0.5 ml-1 bg-black/5 px-1.5 py-0.5 rounded-full text-[10px]">
                  <ImageIcon size={9} /> Carrusel
                </span>
              )}
              {needsMusic && <Music size={11} className="ml-0.5 opacity-60" />}
            </div>

            {suggestion.postingTime && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium">
                <Clock size={12} />
                {suggestion.postingTime}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Post type + Product + AI badge */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
            {POST_TYPE_LABELS[suggestion.postType]}
          </span>
          {productName && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              <Package size={10} />
              {productName}
              {productInStock !== null && (
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ml-0.5',
                  productInStock
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : 'text-red-600 bg-red-50 border-red-200'
                )}>
                  {productInStock ? 'En stock' : 'Sin stock'}
                </span>
              )}
            </span>
          )}
          {suggestion.generationSource === 'llm' && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
              <Sparkles size={9} /> IA
            </span>
          )}
        </div>

        {/* Row 3: Hook title */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-2">
          {suggestion.hook}
        </h3>

        {/* Row 4: Caption (clamped) */}
        <div className="relative">
          <pre className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap font-sans text-gray-600',
            !isExpanded && 'line-clamp-3'
          )}>
            {suggestion.caption}
          </pre>
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        {/* Row 5: Action bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCopy(suggestion.caption, 'caption')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-200 text-xs font-medium transition-all duration-150 cursor-pointer"
              title="Copiar caption"
            >
              {copiedField === 'caption'
                ? <><Check size={12} className="text-green-600" /> Copiado</>
                : <><Copy size={12} /> Copiar</>}
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
                    'p-1.5 rounded-md border transition-all duration-150 cursor-pointer',
                    currentFeedback === 'like'
                      ? 'text-green-600 bg-green-50 border-green-200'
                      : 'text-gray-300 border-gray-200 hover:text-green-500 hover:bg-green-50 hover:border-green-200'
                  )}
                  title="Me gusta"
                >
                  <ThumbsUp size={13} />
                </button>
                <button
                  onClick={() => {
                    const next = currentFeedback === 'dislike' ? null : 'dislike';
                    setCurrentFeedback(next);
                    onFeedbackChange(suggestion.id, next);
                  }}
                  className={cn(
                    'p-1.5 rounded-md border transition-all duration-150 cursor-pointer',
                    currentFeedback === 'dislike'
                      ? 'text-red-600 bg-red-50 border-red-200'
                      : 'text-gray-300 border-gray-200 hover:text-red-500 hover:bg-red-50 hover:border-red-200'
                  )}
                  title="No me gusta"
                >
                  <ThumbsDown size={13} />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150 cursor-pointer"
          >
            {isExpanded ? <><ChevronUp size={13} /> Menos</> : <><ChevronDown size={13} /> Ver más</>}
          </button>
        </div>
      </div>

      {/* ── Expanded Detail ───────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 pb-4 pt-3 space-y-3">

          {/* Tags */}
          {suggestion.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {suggestion.tags.map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-500">
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {/* Instructions */}
          {suggestion.instructions && (
            <div className="rounded-lg bg-white border border-gray-200 border-l-2 border-l-blue-400 p-3">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
                <Info size={11} /> Estrategia & Instrucciones
              </span>
              <div className="text-xs text-gray-600 leading-relaxed space-y-0.5">
                {suggestion.instructions.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {/* Full caption */}
          <div className="rounded-lg bg-white border border-gray-200 p-3 relative">
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2 block">
              Caption / Copy
            </span>
            <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans pr-8">
              {suggestion.caption}
            </pre>
            <button
              className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-150 cursor-pointer"
              onClick={() => handleCopy(suggestion.caption, 'caption-full')}
              title="Copiar texto"
            >
              {copiedField === 'caption-full' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            </button>
          </div>

          {/* Image prompt */}
          <div className="rounded-lg bg-white border border-gray-200 p-3 relative">
            <button
              className="flex items-center justify-between w-full cursor-pointer"
              onClick={() => setShowPrompt(!showPrompt)}
            >
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                <ImageIcon size={11} />
                {hasCarousel ? `Prompts de Imágenes (${carouselSlidesMatch?.[1]} slides)` : 'AI Image Prompt'}
              </span>
              {showPrompt ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
            </button>

            {showPrompt && (
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 leading-relaxed space-y-0.5">
                <p className="text-gray-400 mb-1.5">
                  Copia {hasCarousel ? 'cada prompt' : 'este prompt'} y pégalo en Midjourney, DALL-E 3 o Adobe Firefly.
                </p>
                {suggestion.imagePrompt.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            <button
              className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-150 cursor-pointer"
              onClick={() => handleCopy(suggestion.imagePrompt, 'prompt')}
              title="Copiar prompt"
            >
              {copiedField === 'prompt' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            </button>
          </div>

          {/* Multi-product list */}
          {(suggestion.products.length > 1 || (suggestion.products.length === 1 && (suggestion.products[0].specs?.length ?? 0) > 0)) && (
            <div className="text-xs space-y-1">
              <span className="text-gray-500 font-medium block">Productos relacionados:</span>
              {suggestion.products.map(p => (
                <div key={p.id} className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-600">• {p.name}</span>
                  {p.inStock !== undefined && (
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      p.inStock
                        ? 'text-green-700 bg-green-50 border-green-200'
                        : 'text-red-600 bg-red-50 border-red-200'
                    )}>
                      {p.inStock ? 'En stock' : 'Sin stock'}
                    </span>
                  )}
                  {p.specs && p.specs.length > 0 && (
                    <span className="text-gray-400 truncate max-w-[150px]">({p.specs[0]})</span>
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
