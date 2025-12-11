// =============================================================================
// Channel Configuration
// Reference: docs/calendar/social-calendar-channels.md
// =============================================================================

import type { Channel, ChannelConfig } from '../../types/socialCalendar';

export const CHANNEL_CONFIG: Record<Channel, ChannelConfig> = {
  // ---------------------------------------------------------------------------
  // WhatsApp Status
  // ---------------------------------------------------------------------------
  'wa-status': {
    channel: 'wa-status',
    bestFor: ['Avisos urgentes', 'Promos cortas', 'Recordatorios', 'UGC'],
    format: 'Imagen vertical 9:16 o Video 15-30s',
    tone: 'Directo y útil',
    ctaStyle: 'Responde "Sí" o pide info',
    maxPerWeek: 5, // Daily is fine
    examples: ['Mañana llega camión', 'Quedan 3 rollos', 'Mira este cliente']
  },

  // ---------------------------------------------------------------------------
  // WhatsApp Broadcast
  // ---------------------------------------------------------------------------
  'wa-broadcast': {
    channel: 'wa-broadcast',
    bestFor: ['Ofertas limitadas', 'Avisos de stock', 'Novedades importantes'],
    format: 'Imagen + Texto corto',
    tone: 'De servicio y valor (no spam)',
    ctaStyle: 'Botón o link directo',
    maxPerWeek: 2, // Avoid spamming
    examples: ['Promo de la semana', 'Ya tenemos antiheladas']
  },

  // ---------------------------------------------------------------------------
  // WhatsApp Message (Direct)
  // ---------------------------------------------------------------------------
  'wa-message': {
    channel: 'wa-message',
    bestFor: ['Seguimiento', 'Cierre de venta', 'Respuesta a dudas'],
    format: 'Texto conversacional',
    tone: 'Personal y amable',
    ctaStyle: 'Pregunta abierta',
    maxPerWeek: 100, // Reactive, no limit
    examples: ['Hola, ¿te interesó la cotización?', 'Ya salió tu envío']
  },

  // ---------------------------------------------------------------------------
  // Facebook Post
  // ---------------------------------------------------------------------------
  'fb-post': {
    channel: 'fb-post',
    bestFor: ['Infografías', 'Promos detalladas', 'Artículos', 'Álbumes'],
    format: 'Cuadrado 1:1 o Vertical 4:5',
    tone: 'Educativo y comunitario',
    ctaStyle: 'Link en comentario o botón WhatsApp',
    maxPerWeek: 4,
    examples: ['Guía de riego', 'Fotos de entrega', 'Promoción mensual']
  },

  // ---------------------------------------------------------------------------
  // Facebook Reel
  // ---------------------------------------------------------------------------
  'fb-reel': {
    channel: 'fb-reel',
    bestFor: ['Demostraciones', 'Antes/Después', 'Humor'],
    format: 'Vertical 9:16 (15-60s)',
    tone: 'Entretenido y visual',
    ctaStyle: 'Texto en pantalla',
    maxPerWeek: 3,
    examples: ['Instalación rápida', 'Cliente satisfecho', 'Tip del día']
  },

  // ---------------------------------------------------------------------------
  // Instagram Post
  // ---------------------------------------------------------------------------
  'ig-post': {
    channel: 'ig-post',
    bestFor: ['Estética', 'Producto', 'Frases', 'Carruseles educativos'],
    format: 'Cuadrado 1:1 o Vertical 4:5',
    tone: 'Inspiracional y visual',
    ctaStyle: 'Link en bio o DM',
    maxPerWeek: 4,
    examples: ['Foto de producto HD', 'Carrusel de 5 tips', 'Frase motivacional']
  },

  // ---------------------------------------------------------------------------
  // Instagram Reel
  // ---------------------------------------------------------------------------
  'ig-reel': {
    channel: 'ig-reel',
    bestFor: ['Alcance', 'Tendencias', 'Procesos'],
    format: 'Vertical 9:16 (15-60s)',
    tone: 'Dinámico y moderno',
    ctaStyle: 'Lee la descripción',
    maxPerWeek: 3,
    examples: ['Trending audio con producto', 'Unboxing', 'Timelapse']
  },

  // ---------------------------------------------------------------------------
  // TikTok
  // ---------------------------------------------------------------------------
  'tiktok': {
    channel: 'tiktok',
    bestFor: ['Virales', 'Tips rápidos', 'Humor', 'Storytelling'],
    format: 'Vertical 9:16 (15-60s+)',
    tone: 'Auténtico, sin filtro, divertido',
    ctaStyle: 'Link en perfil',
    maxPerWeek: 3,
    examples: ['Storytime de un cliente', 'Hack de agricultura', 'Fail vs Win']
  }
};

/**
 * Get config for a channel
 */
export function getChannelConfig(channel: Channel): ChannelConfig {
  return CHANNEL_CONFIG[channel];
}

/**
 * Get primary text-based channels
 */
export function getTextChannels(): Channel[] {
  return ['fb-post', 'ig-post', 'wa-broadcast', 'wa-status'];
}

/**
 * Get primary video-based channels
 */
export function getVideoChannels(): Channel[] {
  return ['tiktok', 'ig-reel', 'fb-reel'];
}
