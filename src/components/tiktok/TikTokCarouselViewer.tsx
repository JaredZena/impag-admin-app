import React, { useState } from 'react';
import { Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface TikTokCarouselViewerProps {
  slides: string[];
  coverPrompt: string;
}

const TikTokCarouselViewer: React.FC<TikTokCarouselViewerProps> = ({ slides, coverPrompt }) => {
  const effectiveSlides = slides && slides.length > 0 ? slides : [coverPrompt];
  const [activeSlide, setActiveSlide] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    const allText = effectiveSlides.map((slide, i) => `Slide ${i + 1}:\n${slide}`).join('\n\n');
    handleCopy(allText, 'all');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
      {/* Phone Frame */}
      <div style={{
        width: '280px',
        height: '497px',
        backgroundColor: '#0f0f1a',
        border: '3px solid #1a1a2e',
        borderRadius: '2rem',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Phone status bar */}
        <div style={{
          height: '28px',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 1rem'
        }}>
          <div style={{ width: '80px', height: '4px', backgroundColor: '#333', borderRadius: '2px' }} />
        </div>

        {/* Slide content */}
        <div style={{
          flex: 1,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflowY: 'auto'
        }}>
          {/* Slide number badge */}
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            backgroundColor: 'rgba(255, 0, 80, 0.85)',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.2rem 0.5rem',
            borderRadius: '999px'
          }}>
            {activeSlide + 1} / {effectiveSlides.length}
          </div>

          <div style={{
            color: '#e2e8f0',
            fontSize: '0.8rem',
            lineHeight: 1.6,
            fontFamily: 'inherit'
          }}>
            {effectiveSlides[activeSlide]}
          </div>
        </div>

        {/* Dot indicators */}
        <div style={{
          padding: '0.5rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '0.375rem',
          backgroundColor: '#0f0f1a'
        }}>
          {effectiveSlides.map((_, i) => (
            <div
              key={i}
              onClick={() => setActiveSlide(i)}
              style={{
                width: i === activeSlide ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: i === activeSlide ? '#ff0050' : '#333',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
          disabled={activeSlide === 0}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'transparent',
            color: activeSlide === 0 ? '#334155' : '#e2e8f0',
            cursor: activeSlide === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.85rem'
          }}
        >
          <ChevronLeft size={16} /> Anterior
        </button>

        <button
          onClick={() => setActiveSlide(Math.min(effectiveSlides.length - 1, activeSlide + 1))}
          disabled={activeSlide === effectiveSlides.length - 1}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'transparent',
            color: activeSlide === effectiveSlides.length - 1 ? '#334155' : '#e2e8f0',
            cursor: activeSlide === effectiveSlides.length - 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.85rem'
          }}
        >
          Siguiente <ChevronRight size={16} />
        </button>
      </div>

      {/* Copy buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => handleCopy(effectiveSlides[activeSlide], `slide-${activeSlide}`)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 0, 80, 0.3)',
            backgroundColor: 'rgba(255, 0, 80, 0.1)',
            color: '#ff0050',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          {copiedField === `slide-${activeSlide}` ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
          Copiar slide {activeSlide + 1}
        </button>

        <button
          onClick={handleCopyAll}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          {copiedField === 'all' ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
          Copiar todos los prompts
        </button>
      </div>
    </div>
  );
};

export default TikTokCarouselViewer;
