// =============================================================================
// Post Templates & Config
// Reference: docs/calendar/social-calendar-post-types.md
// =============================================================================

import type { PostTemplate, PostType, Channel } from '../../types/socialCalendar';

export const POST_TEMPLATES: Record<PostType, PostTemplate> = {
  // ---------------------------------------------------------------------------
  // INFOGRAPHIC
  // ---------------------------------------------------------------------------
  'infographic': {
    type: 'infographic',
    purpose: 'Explicar rápido conceptos técnicos (riego, acolchado, sombra)',
    formats: ['Carrusel 1:1 o 4:5', 'Versión resumida 9:16 para Reels'],
    ctaExamples: ['Escríbenos "riego" para cotizar', 'Guarda esta info para tu próximo ciclo'],
    applicableChannels: ['ig-post', 'fb-post', 'wa-status', 'wa-broadcast'],
    captionTemplate: '🧐 ¿Sabías esto sobre [PRODUCTO]?\n\nAquí te explicamos las claves de una buena instalación:\n\n1️⃣ [PUNTO 1]\n2️⃣ [PUNTO 2]\n3️⃣ [PUNTO 3]\n\n✅ [BENEFICIO CLAVE]\n\n💬 ¿Necesitas asesoría? Mándanos DM o escribe por WhatsApp.'
  },

  // ---------------------------------------------------------------------------
  // IMPORTANT DATE
  // ---------------------------------------------------------------------------
  'important-date': {
    type: 'important-date',
    purpose: 'Anclar promos o recordatorios a calendario (Buen Fin, Día de la Madre)',
    formats: ['Post estático', 'Reel corto', 'WhatsApp Status'],
    ctaExamples: ['Agenda antes de X', 'Entrega en 24h', 'Aprovecha la fecha'],
    applicableChannels: ['ig-post', 'fb-post', 'wa-status', 'wa-message'],
    captionTemplate: '🎉 ¡En IMPAG celebramos el [FECHA]!\n\nPor eso tenemos [OFERTA/MENSAJE] especial para ti.\n\n⏳ Solo válido hasta [LIMITE].\n\n👉 Mándanos mensaje para apartar tu pedido.'
  },

  // ---------------------------------------------------------------------------
  // MEME / TIP
  // ---------------------------------------------------------------------------
  'meme-tip': {
    type: 'meme-tip',
    purpose: 'Enganchar y educar con humor o tips rápidos',
    formats: ['Imagen 1:1', 'Video vertical 9:16'],
    ctaExamples: ['¿Te ha pasado? Manda DM', 'Etiqueta a tu compadre'],
    applicableChannels: ['ig-post', 'fb-post', 'tiktok'],
    captionTemplate: '😅 ¿A quién más le ha pasado esto con su [PRODUCTO]?\n\nRecuerda: lo barato sale caro. Mejor asegura tu inversión con calidad IMPAG.\n\n👍 Dale like si te identificas.'
  },

  // ---------------------------------------------------------------------------
  // PROMO
  // ---------------------------------------------------------------------------
  'promo': {
    type: 'promo',
    purpose: 'Liquidar overstock o empujar alta rotación',
    formats: ['Imagen simple con precio', 'WA Status', 'FB/IG Post'],
    ctaExamples: ['Sólo esta semana', 'Responde "sí" y aparta', 'Pide tu cotización ya'],
    applicableChannels: ['wa-broadcast', 'wa-status', 'fb-post', 'ig-post'],
    captionTemplate: '🚨 ¡OFERTA RELÁMPAGO!\n\n🔥 [PRODUCTO] con precio especial.\n\n✅ [BENEFICIO 1]\n✅ [BENEFICIO 2]\n\n📦 Envíos a todo México.\n\n📲 Responde este mensaje para cotizar ahora mismo.'
  },

  // ---------------------------------------------------------------------------
  // KIT
  // ---------------------------------------------------------------------------
  'kit': {
    type: 'kit',
    purpose: 'Ticket mayor y solución completa',
    formats: ['Carrusel con desglose', 'Reel mostrando armado'],
    ctaExamples: ['Arma tu kit según hectáreas', 'Entrega en campo'],
    applicableChannels: ['fb-post', 'ig-post', 'wa-broadcast'],
    captionTemplate: '🛠️ Todo lo que necesitas en un solo paquete:\n\nKit de [CATEGORIA] incluye:\n🔹 [ITEM 1]\n🔹 [ITEM 2]\n🔹 [ITEM 3]\n\n💡 Ideal para [USO/CULTIVO].\n\n🚚 Te lo enviamos hasta tu parcela.'
  },

  // ---------------------------------------------------------------------------
  // CASE STUDY / UGC
  // ---------------------------------------------------------------------------
  'case-study': {
    type: 'case-study',
    purpose: 'Prueba social (instalaciones, bombeo solar)',
    formats: ['Reel 20-40s', 'Carrusel de fotos', 'Testimonio'],
    ctaExamples: ['¿Quieres resultados similares?', 'Escríbenos "instalación"'],
    applicableChannels: ['ig-reel', 'tiktok', 'fb-reel', 'fb-post'],
    captionTemplate: '👀 Así quedó la instalación de [PRODUCTO] en [LUGAR].\n\nEl cliente buscaba [PROBLEMA] y con nuestra solución logró [RESULTADO].\n\n💪 Tecnología agrícola que sí funciona.\n\n💬 ¿Te interesa un proyecto así? Cotiza sin compromiso.'
  },

  // ---------------------------------------------------------------------------
  // BEFORE / AFTER
  // ---------------------------------------------------------------------------
  'before-after': {
    type: 'before-after',
    purpose: 'Demostrar impacto visual (sombra, antiheladas, acolchado)',
    formats: ['Carrusel split', 'Reel con transición'],
    ctaExamples: ['Cotiza tu cambio en X hrs', 'Mejora tu producción hoy'],
    applicableChannels: ['ig-reel', 'tiktok', 'wa-status'],
    captionTemplate: '🔄 El cambio es impresionante.\n\nMira cómo mejoró este cultivo con [PRODUCTO].\n\n⬅️ ANTES: [PROBLEMA]\n➡️ DESPUÉS: [MEJORA]\n\n📈 Aumenta tu rendimiento con IMPAG.'
  },

  // ---------------------------------------------------------------------------
  // CHECKLIST
  // ---------------------------------------------------------------------------
  'checklist': {
    type: 'checklist',
    purpose: 'Guiar acciones por temporada (previo a helada, arranque)',
    formats: ['Carrusel numerado', 'Reel con lista en pantalla'],
    ctaExamples: ['Guarda este checklist', 'Pide el PDF completo por WA'],
    applicableChannels: ['ig-post', 'fb-post', 'wa-status'],
    captionTemplate: '📋 Checklist para [TEMPORADA/TAREA]:\n\n✅ 1. [PASO 1]\n✅ 2. [PASO 2]\n✅ 3. [PASO 3]\n\nNo dejes pasar ningún detalle. En IMPAG tenemos todo lo que necesitas.'
  },

  // ---------------------------------------------------------------------------
  // TUTORIAL
  // ---------------------------------------------------------------------------
  'tutorial': {
    type: 'tutorial',
    purpose: 'Educar en 30-45s (instalar válvula, fijar malla)',
    formats: ['Reel/TikTok vertical'],
    ctaExamples: ['Guarda y comparte', 'Link en bio para kit'],
    applicableChannels: ['tiktok', 'ig-reel', 'fb-reel'],
    captionTemplate: '🔧 Cómo instalar [PRODUCTO] en 3 pasos:\n\n1️⃣ Paso uno...\n2️⃣ Paso dos...\n3️⃣ Paso tres...\n\n¿Dudas? Déjalas en los comentarios 👇'
  },

  // ---------------------------------------------------------------------------
  // NEW ARRIVALS
  // ---------------------------------------------------------------------------
  'new-arrivals': {
    type: 'new-arrivals',
    purpose: 'Mover inventario nuevo y generar urgencia',
    formats: ['Foto + texto breve', 'Reel rápido'],
    ctaExamples: ['Quedan X unidades', 'Aparta por WA'],
    applicableChannels: ['wa-status', 'wa-broadcast', 'ig-post'],
    captionTemplate: '✨ ¡Acaba de llegar!\n\nNuevo [PRODUCTO] ya disponible en bodega.\n\n📏 Medidas: [MEDIDAS]\n🛡️ Calidad: [CALIDAD]\n\n🏃‍♂️ Corre que vuelan. Manda mensaje para apartar.'
  },

  // ---------------------------------------------------------------------------
  // FAQ
  // ---------------------------------------------------------------------------
  'faq': {
    type: 'faq',
    purpose: 'Remover objeciones (costos, duración)',
    formats: ['Carrusel Q&A', 'Reel hablando a cámara'],
    ctaExamples: ['¿Más dudes?', 'Escribe "FAQ"'],
    applicableChannels: ['ig-post', 'tiktok', 'fb-post'],
    captionTemplate: '🤔 Pregunta frecuente: ¿[PREGUNTA]?\n\nLa respuesta es: [RESPUESTA].\n\nMuchos clientes tienen esta duda antes de comprar [PRODUCTO], pero la realidad es que [DATO CLAVE].'
  },

  // ---------------------------------------------------------------------------
  // SAFETY
  // ---------------------------------------------------------------------------
  'safety': {
    type: 'safety',
    purpose: 'Cuidado de personal/equipo, heladas, plagas',
    formats: ['Infografía de precaución'],
    ctaExamples: ['Envía "seguridad" y te mando info', 'Comparte con tu equipo'],
    applicableChannels: ['fb-post', 'wa-status'],
    captionTemplate: '⚠️ ¡Atención agricultor!\n\nProtege tu cultivo de [AMENAZA].\n\nRecomendamos:\n🔸 [TIP 1]\n🔸 [TIP 2]\n\nMás vale prevenir. Revisa nuestro catálogo de protección.'
  },

  // ---------------------------------------------------------------------------
  // ROI
  // ---------------------------------------------------------------------------
  'roi': {
    type: 'roi',
    purpose: 'Justificar inversión (bomba solar, sombra)',
    formats: ['Carrusel con números', 'Reel interactivo'],
    ctaExamples: ['Calcula tu ROI', 'Escribe "inversión"'],
    applicableChannels: ['fb-post', 'ig-post'], // LinkedIn not available as channel type
    captionTemplate: '💰 ¿Cuánto ahorras con [PRODUCTO]?\n\nHagamos cuentas:\n\n📉 Gasto anterior: $[MONTO]\n📈 Ahorro mensual: $[MONTO]\n\nTu inversión se paga sola en [TIEMPO].\n\nCotiza tu proyecto hoy mismo.'
  },

  // ---------------------------------------------------------------------------
  // UGC REQUEST
  // ---------------------------------------------------------------------------
  'ugc-request': {
    type: 'ugc-request',
    purpose: 'Pedir fotos/video de clientes',
    formats: ['WA Status', 'Post de texto simple'],
    ctaExamples: ['Mándanos tu video', 'Queremos presumir tu campo'],
    applicableChannels: ['wa-status', 'wa-broadcast', 'fb-post'],
    captionTemplate: '📸 ¡Queremos ver tu campo!\n\nSi usas insumos IMPAG, mándanos foto o video de tu cultivo.\n\nEtiquetaremos tu rancho en nuestras redes.\n\n📲 Envíalo por aquí mismo.'
  },

  // ---------------------------------------------------------------------------
  // SERVICE REMINDER
  // ---------------------------------------------------------------------------
  'service-reminder': {
    type: 'service-reminder',
    purpose: 'Capturar servicios (mantenimiento, cambios)',
    formats: ['Post tipo recordatorio', 'WA Status'],
    ctaExamples: ['Agenda visita', 'Responde "servicio"'],
    applicableChannels: ['wa-broadcast', 'wa-status'],
    captionTemplate: '🔧 Recordatorio de mantenimiento.\n\nEs buen momento para revisar [SISTEMA/PRODUCTO] antes de la temporada fuerte.\n\nEvita fallas cuando más lo necesitas.\n\n🗓️ Agenda tu revisión con nosotros.'
  },

  // ---------------------------------------------------------------------------
  // AB TEST
  // ---------------------------------------------------------------------------
  'ab-test': {
    type: 'ab-test',
    purpose: 'Probar hooks/visuals distintos',
    formats: ['Dos versiones de reel/post'],
    ctaExamples: ['¿Cuál prefieres?', 'Vota 1 o 2'],
    applicableChannels: ['ig-post', 'fb-post'],
    captionTemplate: '🆚 Batalla de productos:\n\n¿Qué prefieres para tu cultivo?\n\n1️⃣ [OPCION A]\n2️⃣ [OPCION B]\n\nDéjalo en los comentarios 👇'
  },

  // ---------------------------------------------------------------------------
  // HOW TO ORDER
  // ---------------------------------------------------------------------------
  'how-to-order': {
    type: 'how-to-order',
    purpose: 'Simplificar proceso de compra',
    formats: ['Carrusel paso a paso', 'Mensaje fijo'],
    ctaExamples: ['Copia y pega este formato', 'Haz tu pedido'],
    applicableChannels: ['wa-status', 'wa-message'],
    captionTemplate: '🛒 Cómo hacer tu pedido en 3 pasos:\n\n1. Envía tu lista de materiales.\n2. Recibe tu cotización formal.\n3. Confirma pago y dirección.\n\n¡Así de fácil! Enviamos a todo México 🇲🇽'
  }
};

/**
 * Helper to get template by type
 */
export function getPostTemplate(type: PostType): PostTemplate {
  return POST_TEMPLATES[type] || POST_TEMPLATES['promo']; // Fallback to promo
}

/**
 * Helper to get templates suitable for a specific channel
 */
export function getTemplatesForChannel(channel: Channel): PostTemplate[] {
  return Object.values(POST_TEMPLATES).filter(t => 
    t.applicableChannels.includes(channel)
  );
}
