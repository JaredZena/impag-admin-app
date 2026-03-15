import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Suggestion } from '../../types/socialCalendar';

interface TikTokCapCutGuideProps {
  suggestion: Suggestion;
}

const getVoiceoverScript = (caption: string): string => {
  return caption
    .split('\n')
    .filter(line => !line.trim().startsWith('#'))
    .join('\n')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '')
    .trim();
};

const getHashtags = (caption: string): string => {
  const hashtagLines = caption
    .split('\n')
    .filter(line => line.trim().startsWith('#'));
  if (hashtagLines.length > 0) {
    return hashtagLines.join(' ');
  }
  const matches = caption.match(/#\w+/g);
  return matches ? matches.join(' ') : '';
};

const TikTokCapCutGuide: React.FC<TikTokCapCutGuideProps> = ({ suggestion }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const effectiveSlides =
    suggestion.carouselSlides && suggestion.carouselSlides.length > 0
      ? suggestion.carouselSlides
      : [suggestion.imagePrompt];

  const voiceoverScript = getVoiceoverScript(suggestion.caption);
  const hashtags = getHashtags(suggestion.caption);

  const stepStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '0.75rem',
    padding: '1rem',
    marginBottom: '0.75rem'
  };

  const stepHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem'
  };

  const stepNumberStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#ff0050',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.8rem',
    flexShrink: 0
  };

  const stepTitleStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#e2e8f0'
  };

  const stepContentStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: 1.6
  };

  const copyBtnStyle: React.CSSProperties = {
    padding: '0.375rem 0.75rem',
    borderRadius: '0.375rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    marginTop: '0.5rem'
  };

  const slideBoxStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '0.5rem',
    padding: '0.625rem 0.75rem',
    marginTop: '0.375rem'
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Step 1 — Generate images */}
      <div style={stepStyle}>
        <div style={stepHeaderStyle}>
          <div style={stepNumberStyle}>1</div>
          <div style={stepTitleStyle}>Genera las imágenes con IA</div>
        </div>
        <div style={stepContentStyle}>
          <div style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}>
            Pega cada prompt en Midjourney, DALL-E 3 o Adobe Firefly. Genera 1 imagen por prompt.
          </div>
          {effectiveSlides.map((slide, i) => (
            <div key={i} style={slideBoxStyle}>
              <div style={{ fontSize: '0.7rem', color: '#ff0050', fontWeight: 600, marginBottom: '0.25rem' }}>
                SLIDE {i + 1}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{slide}</div>
              <button
                onClick={() => handleCopy(slide, `step1-slide-${i}`)}
                style={{ ...copyBtnStyle, marginTop: '0.375rem' }}
              >
                {copiedField === `step1-slide-${i}` ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                Copiar prompt
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 — Create CapCut project */}
      <div style={stepStyle}>
        <div style={stepHeaderStyle}>
          <div style={stepNumberStyle}>2</div>
          <div style={stepTitleStyle}>Crea el proyecto en CapCut</div>
        </div>
        <div style={stepContentStyle}>
          <p>
            Nuevo proyecto → selecciona todas las imágenes generadas → ordénalas en el mismo orden
            que los slides.
          </p>
          <p style={{ marginTop: '0.5rem', color: '#60a5fa' }}>
            Duración: Usa 2-3 segundos por imagen para carrusel rápido, 4-5 segundos para contenido
            educativo.
          </p>
        </div>
      </div>

      {/* Step 3 — Voiceover */}
      <div style={stepStyle}>
        <div style={stepHeaderStyle}>
          <div style={stepNumberStyle}>3</div>
          <div style={stepTitleStyle}>Voiceover / Locución</div>
        </div>
        <div style={stepContentStyle}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            fontSize: '0.8rem',
            color: '#cbd5e1',
            whiteSpace: 'pre-wrap',
            marginBottom: '0.5rem'
          }}>
            {voiceoverScript || suggestion.caption}
          </div>
          <button onClick={() => handleCopy(voiceoverScript || suggestion.caption, 'voiceover')} style={copyBtnStyle}>
            {copiedField === 'voiceover' ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
            Copiar guión de voz
          </button>
          <p style={{ marginTop: '0.75rem', color: '#94a3b8' }}>
            En CapCut: Texto → Texto a voz → selecciona voz en español → pega el guión.
          </p>
        </div>
      </div>

      {/* Step 4 — On-screen text */}
      <div style={stepStyle}>
        <div style={stepHeaderStyle}>
          <div style={stepNumberStyle}>4</div>
          <div style={stepTitleStyle}>Texto en pantalla</div>
        </div>
        <div style={stepContentStyle}>
          <div style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}>
            Añade un texto grande y visible por slide. Usa la tipografía Bold en CapCut.
          </div>
          {effectiveSlides.map((slide, i) => {
            const firstSentence = slide.split(/[.!?]/)[0].trim();
            return (
              <div key={i} style={slideBoxStyle}>
                <div style={{ fontSize: '0.7rem', color: '#ff0050', fontWeight: 600, marginBottom: '0.2rem' }}>
                  SLIDE {i + 1}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{firstSentence}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 5 — Music */}
      <div style={stepStyle}>
        <div style={stepHeaderStyle}>
          <div style={stepNumberStyle}>5</div>
          <div style={stepTitleStyle}>Música</div>
        </div>
        <div style={stepContentStyle}>
          {suggestion.needsMusic ? (
            <p style={{ color: '#60a5fa' }}>
              🎵 Agrega música de tendencia en TikTok. Volumen al 20-30% para no tapar el voiceover.
            </p>
          ) : (
            <p style={{ color: '#64748b' }}>Este post no requiere música de fondo.</p>
          )}
        </div>
      </div>

      {/* Step 6 — Export and publish */}
      <div style={stepStyle}>
        <div style={stepHeaderStyle}>
          <div style={stepNumberStyle}>6</div>
          <div style={stepTitleStyle}>Exportar y publicar</div>
        </div>
        <div style={stepContentStyle}>
          <p>Exporta en 1080×1920 (vertical). Sube a TikTok con este caption:</p>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            fontSize: '0.8rem',
            color: '#cbd5e1',
            whiteSpace: 'pre-wrap',
            marginTop: '0.5rem',
            marginBottom: '0.375rem'
          }}>
            {suggestion.caption}
          </div>
          <button onClick={() => handleCopy(suggestion.caption, 'caption')} style={copyBtnStyle}>
            {copiedField === 'caption' ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
            Copiar caption
          </button>

          {hashtags && (
            <>
              <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                Hashtags:
              </div>
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                color: '#60a5fa',
                marginBottom: '0.375rem'
              }}>
                {hashtags}
              </div>
              <button onClick={() => handleCopy(hashtags, 'hashtags')} style={copyBtnStyle}>
                {copiedField === 'hashtags' ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                Copiar hashtags
              </button>
            </>
          )}

          {suggestion.postingTime && (
            <p style={{ marginTop: '0.75rem', color: '#fcd34d', fontSize: '0.85rem', fontWeight: 600 }}>
              Hora recomendada: {suggestion.postingTime}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TikTokCapCutGuide;
