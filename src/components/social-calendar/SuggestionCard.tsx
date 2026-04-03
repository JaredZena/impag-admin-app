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
  'wa-status':    { label: 'WhatsApp Status', icon: <MessageCircle size={14} />, cls: 'text-green-700 bg-green-50 border-green-200' },
  'wa-broadcast': { label: 'WA Difusión',     icon: <Share2 size={14} />,        cls: 'text-green-700 bg-green-50 border-green-200' },
  'wa-message':   { label: 'WA Mensaje',      icon: <MessageCircle size={14} />, cls: 'text-green-700 bg-green-50 border-green-200' },
  'fb-post':      { label: 'FB + IG Post',    icon: <Facebook size={14} />,      cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  'fb-reel':      { label: 'FB + IG Reel',    icon: <Video size={14} />,         cls: 'text-purple-700 bg-purple-50 border-purple-200' },
  'ig-post':      { label: 'IG Post',         icon: <Instagram size={14} />,     cls: 'text-pink-700 bg-pink-50 border-pink-200' },
  'ig-reel':      { label: 'IG Reel',         icon: <Video size={14} />,         cls: 'text-purple-700 bg-purple-50 border-purple-200' },
  'tiktok':       { label: 'TikTok',          icon: <Video size={14} />,         cls: 'text-stone-700 bg-stone-50 border-stone-200' },
};

const STATUS_CONFIG: Record<SuggestionStatus, {
  label: string; icon: React.ReactNode;
  activeCls: string; inactiveCls: string;
}> = {
  planned:   {
    label: 'Planeado',  icon: <ClipboardList size={12} />,
    activeCls:   'text-amber-700 bg-amber-50 border-amber-300',
    inactiveCls: 'text-gray-400 border-transparent hover:text-amber-600 hover:bg-amber-50',
  },
  scheduled: {
    label: 'Agendado',  icon: <CalendarCheck size={12} />,
    activeCls:   'text-green-700 bg-green-50 border-green-300',
    inactiveCls: 'text-gray-400 border-transparent hover:text-green-600 hover:bg-green-50',
  },
  done:      {
    label: 'Publicado', icon: <CheckCircle2 size={12} />,
    activeCls:   'text-emerald-700 bg-emerald-50 border-emerald-300',
    inactiveCls: 'text-gray-400 border-transparent hover:text-emerald-600 hover:bg-emerald-50',
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
          <div className="flex gap-0.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
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
                <span className="flex items-center gap-0.5 ml-1 bg-black/5 px-1.5 py-0.5 rounded-full text-[10px]">
                  <ImageIcon size={9} /> Carrusel
                </span>
              )}
              {needsMusic && <Music size={12} className="ml-1 opacity-60" />}
            </div>

            {suggestion.postingTime && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                <Clock size={12} />
                {suggestion.postingTime}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Post type + Product + AI badge */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            {POST_TYPE_LABELS[suggestion.postType]}
          </span>
          {productName && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <Package size={11} />
              {productName}
              {productInStock !== null && (
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                  productInStock
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-orange-700 bg-orange-50 border-orange-200'
                )}>
                  {productInStock ? 'En stock' : 'Sin stock'}
                </span>
              )}
            </span>
          )}
          {suggestion.generationSource === 'llm' && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <Sparkles size={9} /> IA
            </span>
          )}
        </div>

        {/* Row 3: Hook title */}
        <h3 className="text-[15px] font-semibold text-green-900 leading-snug mb-3" style={{ fontFamily: "'Lora', serif" }}>
          {suggestion.hook}
        </h3>

        {/* Row 4: Caption (clamped) */}
        <div className="relative">
          <pre className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap font-sans text-green-800/70',
            !isExpanded && 'line-clamp-3'
          )}>
            {suggestion.caption}
          </pre>
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        {/* Row 5: Action bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-green-100 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(suggestion.caption, 'caption')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-600 hover:text-green-800 hover:bg-green-100 text-xs font-semibold transition-all duration-150 cursor-pointer"
              title="Copiar caption"
            >
              {copiedField === 'caption'
                ? <><Check size={13} className="text-green-600" /> Copiado</>
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
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                      : 'text-gray-300 border-gray-200 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
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
                      ? 'text-orange-600 bg-orange-50 border-orange-300'
                      : 'text-gray-300 border-gray-200 hover:text-orange-500 hover:bg-orange-50 hover:border-orange-200'
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
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-600 transition-colors duration-150 cursor-pointer"
          >
            {isExpanded ? <><ChevronUp size={14} /> Menos</> : <><ChevronDown size={14} /> Ver más</>}
          </button>
        </div>
      </div>

      {/* ── Expanded Detail ───────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-green-100 bg-green-50/40 px-4 pb-4 pt-3 space-y-3">

          {/* Tags */}
          {suggestion.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {suggestion.tags.map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-700">
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {/* Instructions */}
          {suggestion.instructions && (
            <div className="rounded-xl bg-white border-l-2 border-amber-400 p-3 shadow-sm">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-green-500 font-bold mb-2">
                <Info size={11} /> Estrategia & Instrucciones
              </span>
              <div className="text-xs text-green-700/80 leading-relaxed space-y-0.5">
                {suggestion.instructions.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {/* Full caption */}
          <div className="rounded-xl bg-white p-3 relative shadow-sm border border-green-100">
            <span className="text-[11px] uppercase tracking-wider text-green-500 font-bold mb-2 block">
              Caption / Copy
            </span>
            <pre className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap font-sans pr-8">
              {suggestion.caption}
            </pre>
            <button
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-all duration-150 cursor-pointer"
              onClick={() => handleCopy(suggestion.caption, 'caption-full')}
              title="Copiar texto"
            >
              {copiedField === 'caption-full' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Image prompt */}
          <div className="rounded-xl bg-white p-3 relative shadow-sm border border-green-100">
            <button
              className="flex items-center justify-between w-full cursor-pointer"
              onClick={() => setShowPrompt(!showPrompt)}
            >
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-green-500 font-bold">
                <ImageIcon size={11} />
                {hasCarousel ? `Prompts de Imágenes (${carouselSlidesMatch?.[1]} slides)` : 'AI Image Prompt'}
              </span>
              {showPrompt ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
            </button>

            {showPrompt && (
              <div className="mt-2 pt-2 border-t border-green-100 text-xs text-green-600/80 leading-relaxed space-y-0.5">
                <p className="text-green-400 mb-1.5">
                  Copia {hasCarousel ? 'cada prompt' : 'este prompt'} y pégalo en Midjourney, DALL-E 3 o Adobe Firefly.
                </p>
                {suggestion.imagePrompt.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            <button
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-all duration-150 cursor-pointer"
              onClick={() => handleCopy(suggestion.imagePrompt, 'prompt')}
              title="Copiar prompt"
            >
              {copiedField === 'prompt' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Multi-product list */}
          {(suggestion.products.length > 1 || (suggestion.products.length === 1 && (suggestion.products[0].specs?.length ?? 0) > 0)) && (
            <div className="text-xs space-y-1">
              <span className="text-green-600 font-semibold block">Productos relacionados:</span>
              {suggestion.products.map(p => (
                <div key={p.id} className="flex items-center gap-2 flex-wrap">
                  <span className="text-green-700">• {p.name}</span>
                  {p.inStock !== undefined && (
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      p.inStock
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-orange-600 bg-orange-50 border-orange-200'
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
