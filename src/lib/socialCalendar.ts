import {
  Suggestion, 
  DaySuggestions, 
  SuggestionStatus, 
  Channel, 
  PostType, 
  SuggestionTag, 
  ProductCategory, 
  ProductRef, 
  GeneratorConfig, 
  DEFAULT_GENERATOR_CONFIG, 
  HookType, 
  MonthPattern, 
  PHASE_LABELS, 
  CHANNEL_LABELS
} from '../types/socialCalendar';

import { getMonthPattern } from '../data/social/salesPatterns';
import { getImportantDatesInWindow } from '../data/social/importantDates';
import { getPostTemplate } from '../data/social/postTemplates';
import { getChannelConfig } from '../data/social/channelConfig';
import { getPromptsForContext, hydratePrompt } from '../data/social/imagePrompts';
// Removed unused imports: fetchSocialGenConfig, updateSocialGenConfig, PHASE_DEFINITIONS, SEASON_PATTERNS
import { saveDaySuggestions, getHistory, cleanupOldEntries, getDaySuggestions } from './socialCalendarStorage';
import { generateId, weightedRandomSelect, formatDate, parseDate, randomInt, shuffle, replaceVariables } from './socialCalendarHelpers';
import { apiRequest } from '../utils/api';

const DEFAULT_CONTACT_INFO = {
  web: 'todoparaelcampo.com.mx',
  location: 'Nuevo Ideal, Durango',
  whatsapp: '677-119-7737',
  social: '@impag.tech',
  email: 'impagtodoparaelcampo@gmail.com'
};

// -----------------------------------------------------------------------------
// Database Sync Functions (Shared across users)
// -----------------------------------------------------------------------------

/**
 * Save day suggestions to database (shared across all users)
 */
export async function saveDaySuggestionsToDatabase(daySuggestions: DaySuggestions): Promise<void> {
  try {
    // Save each suggestion as a separate post in the database
    for (const suggestion of daySuggestions.suggestions) {
      await apiRequest('/social/save', {
        method: 'POST',
        body: JSON.stringify({
          date_for: daySuggestions.date,
          caption: suggestion.caption,
          image_prompt: suggestion.imagePrompt,
          post_type: suggestion.postType,
          status: suggestion.status,
          selected_product_id: suggestion.products[0]?.id || null,
          formatted_content: {
            id: suggestion.id,
            postType: suggestion.postType,
            channels: suggestion.channels,
            hook: suggestion.hook,
            hookType: suggestion.hookType,
            products: suggestion.products,
            tags: suggestion.tags,
            instructions: suggestion.instructions,
            postingTime: suggestion.postingTime,
            generationSource: suggestion.generationSource,
            // Extract strategy notes from instructions if present
            strategyNotes: suggestion.instructions?.includes('🧠 Estrategia IA:') 
              ? suggestion.instructions.split('🧠 Estrategia IA:')[1]?.split('\n\n')[0]?.trim() || null
              : null
          }
        })
      });
    }
  } catch (error) {
    console.error('Failed to save suggestions to database:', error);
    // Don't throw - allow localStorage to work as fallback
  }
}

/**
 * Load posts from database and convert to DaySuggestions format
 */
export async function loadPostsFromDatabase(
  startDate?: string,
  endDate?: string
): Promise<DaySuggestions[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await apiRequest(`/social/posts?${params.toString()}`);
    
    if (response.status === 'success' && response.posts) {
      // Group posts by date_for
      const postsByDate = new Map<string, any[]>();
      
      for (const post of response.posts) {
        if (!postsByDate.has(post.date_for)) {
          postsByDate.set(post.date_for, []);
        }
        postsByDate.get(post.date_for)!.push(post);
      }
      
      // Convert to DaySuggestions format
      const daySuggestions: DaySuggestions[] = [];
      
      for (const [date, posts] of postsByDate.entries()) {
        const suggestions: Suggestion[] = posts.map((post: any) => {
          const formattedContent = post.formatted_content || {};
          return {
            id: formattedContent.id || `db-${post.id}`,
            postType: formattedContent.postType || post.post_type || 'promo',
            channels: formattedContent.channels || ['fb-post'],
            hook: formattedContent.hook || '',
            hookType: formattedContent.hookType || 'seasonality',
            products: formattedContent.products || (post.selected_product_id ? [{
              id: post.selected_product_id,
              name: '',
              category: 'vivero' as ProductCategory
            }] : []),
            caption: post.caption,
            imagePrompt: post.image_prompt || '',
            tags: formattedContent.tags || [],
            status: (post.status as SuggestionStatus) || 'planned',
            instructions: formattedContent.instructions,
            postingTime: formattedContent.postingTime || post.posting_time,
            generationSource: formattedContent.generationSource || 'template'
          };
        });
        
        daySuggestions.push({
          date,
          generatedAt: posts[0]?.created_at || new Date().toISOString(),
          suggestions,
          metadata: {
            monthPhase: 'germinacion' as any, // Will be calculated if needed
            relevantDates: [],
            priorityCategories: []
          }
        });
      }
      
      return daySuggestions.sort((a, b) => a.date.localeCompare(b.date));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to load posts from database:', error);
    return [];
  }
}

/**
 * Load posts for a specific date from database
 */
export async function loadPostsForDate(date: string): Promise<DaySuggestions | null> {
  try {
    const response = await apiRequest(`/social/posts/by-date/${date}`);
    
    if (response.status === 'success' && response.posts && response.posts.length > 0) {
      const posts = response.posts;
      const formattedContent = posts[0].formatted_content || {};
      
      const suggestions: Suggestion[] = posts.map((post: any) => {
        const fc = post.formatted_content || {};
        return {
          id: fc.id || `db-${post.id}`,
          postType: fc.postType || post.post_type || 'promo',
          channels: fc.channels || ['fb-post'],
          hook: fc.hook || '',
          hookType: fc.hookType || 'seasonality',
          products: fc.products || (post.selected_product_id ? [{
            id: post.selected_product_id,
            name: '',
            category: 'vivero' as ProductCategory
          }] : []),
          caption: post.caption,
          imagePrompt: post.image_prompt || '',
          tags: fc.tags || [],
          status: (post.status as SuggestionStatus) || 'planned',
          instructions: fc.instructions,
          postingTime: fc.postingTime || post.posting_time,
          generationSource: fc.generationSource || 'template'
        };
      });
      
      return {
        date,
        generatedAt: posts[0]?.created_at || new Date().toISOString(),
        suggestions,
        metadata: {
          monthPhase: 'germinacion' as any,
          relevantDates: [],
          priorityCategories: []
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to load posts for date ${date}:`, error);
    return null;
  }
}

const CATEGORY_KEYWORDS: Record<ProductCategory, RegExp[]> = {
  mallasombra: [/malla/i, /sombra/i, /monofil/i, /raschel/i],
  plasticos: [/pl[aá]stic/i, /polietileno/i, /acolchado/i],
  antiheladas: [/agroterm/i, /manta/i, /antihelada/i],
  riego: [/cintilla/i, /riego/i, /goteo/i, /tape/i],
  acolchado: [/acolchado/i, /mulch/i],
  'bombeo-solar': [/bomba/i, /solar/i, /panel/i],
  vivero: [/bolsa/i, /vivero/i, /peat/i, /sustrato/i],
  charolas: [/charola/i, /alm[aá]cigo/i, /bandeja/i],
  valvuleria: [/v[aá]lvul/i, /filtro/i, /conector/i],
  cercas: [/cerco/i, /post[eé]/i],
  'control-plagas': [/trampa/i, /plaga/i],
  estructuras: [/perfil/i, /estructura/i, /clip/i],
  kits: [/kit/i, /paquete/i]
};

// -----------------------------------------------------------------------------
// Category copy hints (used to build richer captions/prompts)
// -----------------------------------------------------------------------------

type CategoryCopy = {
  benefits: string[];
  tips: string[];
  threat?: string;
  offer?: string;
  useCase?: string;
  texture?: string;
  components?: string;
};

const CATEGORY_COPY: Record<ProductCategory, CategoryCopy> = {
  mallasombra: {
    benefits: ['Reduce golpe de calor', 'Protege floración y fruta', 'Alarga vida útil del cultivo'],
    tips: ['Tensa la malla para evitar bolsas de aire', 'Revisa fijaciones antes de vientos fuertes'],
    threat: 'exceso de radiación y calor',
    useCase: 'protección de cultivos sensibles a sol directo',
    texture: 'tejido Raschel/monofilamento'
  },
  plasticos: {
    benefits: ['Control de microclima', 'Filtra UV y difunde luz', 'Retiene temperatura nocturna'],
    tips: ['Sella juntas con cinta UV', 'Coloca a primera hora para evitar dilatación'],
    threat: 'heladas y lluvia',
    useCase: 'cubrir invernadero y proteger brotes',
    texture: 'polietileno calibre agrícola'
  },
  antiheladas: {
    benefits: ['Aísla temperatura del suelo', 'Reduce daño por helada', 'Permite respiración del cultivo'],
    tips: ['Instala 24-48h antes del pico de frío', 'Fija bordes al suelo para evitar entradas de aire'],
    threat: 'heladas nocturnas',
    useCase: 'protección temporal contra frío extremo',
    texture: 'manta térmica de polipropileno'
  },
  riego: {
    benefits: ['Ahorra agua y fertilizante', 'Entrega uniforme por metro', 'Reduce maleza por humedad controlada'],
    tips: ['Purgar líneas antes de cerrar', 'Revisar presión y filtrado'],
    offer: 'paquetes por hectárea listos para instalar',
    useCase: 'riego preciso para hortalizas y granos'
  },
  valvuleria: {
    benefits: ['Controla presión y caudal', 'Evita golpes de ariete', 'Protege la red completa'],
    tips: ['Calibra a presión de trabajo', 'Instala válvula de aire en puntos altos'],
    useCase: 'maniobra segura en sistemas de riego'
  },
  acolchado: {
    benefits: ['Bloquea maleza', 'Conserva humedad', 'Refleja luz para vigor vegetativo'],
    tips: ['Enterrar bordes 10 cm', 'Perforar justo en la línea de plantación'],
    useCase: 'preparación de camas y control de maleza',
    texture: 'plástico plata/negro agrícola'
  },
  'bombeo-solar': {
    benefits: ['Ahorro energético inmediato', 'Operación autónoma', 'Menor mantenimiento'],
    tips: ['Dimensionar según columna de agua', 'Colocar protecciones contra picos de tensión'],
    offer: 'kits listos con bomba + paneles + controlador',
    useCase: 'extracción y presurización con energía limpia'
  },
  charolas: {
    benefits: ['Distribución pareja de semilla', 'Mejor manejo en vivero', 'Reduce pérdidas por trasplante'],
    tips: ['Desinfectar entre ciclos', 'Etiquetar por lote y fecha de siembra'],
    useCase: 'producción ordenada de plántulas'
  },
  kits: {
    benefits: ['Todo en un solo envío', 'Compatibilidad garantizada', 'Menos tiempo de armado'],
    tips: ['Verificar lista de componentes al recibir', 'Planear instalación con mapa de campo'],
    components: 'tubería, conexiones, válvulas, accesorios',
    useCase: 'proyectos llave en mano'
  },
  // Fallbacks for categories without tailored copy
  cercas: {
    benefits: ['Delimita y protege cultivos', 'Resiste intemperie'],
    tips: ['Refuerza esquinas y portones'],
    useCase: 'protección perimetral'
  },
  estructuras: {
    benefits: ['Soporta coberturas', 'Resiste viento', 'Mejora estabilidad'],
    tips: ['Revisar uniones y tensores'],
    useCase: 'montaje de invernaderos y mallas'
  },
  'control-plagas': {
    benefits: ['Disminuye presión de plaga', 'Protege rendimiento'],
    tips: ['Aplicar en horas frescas', 'Rotar modos de acción'],
    useCase: 'manejo integrado de plagas'
  },
  'vivero': {
    benefits: ['Inicio vigoroso del cultivo', 'Raíz bien formada'],
    tips: ['Monitorear humedad constantemente', 'Aclimatar antes de salida'],
    useCase: 'etapa de semillero'
  },
} as Record<ProductCategory, CategoryCopy>;

const DEFAULT_COPY: CategoryCopy = {
  benefits: ['Calidad agrícola', 'Entrega inmediata', 'Soporte técnico'],
  tips: ['Confirma existencia antes de programar instalación'],
  useCase: 'aplicación agrícola general',
  offer: 'precio especial por temporada'
};



const pick = (list: string[] | undefined, fallback: string) => (list && list.length > 0 ? list[0] : fallback);

function hookEmoji(hookType: HookType) {
  switch (hookType) {
    case 'important-date': return '📅';
    case 'sales-peak': return '📈';
    case 'ugc': return '🤳';
    case 'seasonality': default: return '🌱';
  }
}

// -----------------------------------------------------------------------------
// Real Data Integration
// -----------------------------------------------------------------------------

function normalizeCategory(categoryName: string): ProductCategory {
  // Use regex patterns defined in CATEGORY_KEYWORDS
  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    if (patterns.some(p => p.test(categoryName))) return category as ProductCategory;
  }
  
  // Fallback checks if regex didn't catch it
  const normalized = categoryName.toLowerCase();
  if (normalized.includes('malla')) return 'mallasombra';
  if (normalized.includes('riego')) return 'riego';
  
  return 'vivero'; // Default fallback
}

/**
 * Fetch real products from API
 */
async function fetchRealProducts(): Promise<ProductRef[]> {
  try {
    // Fetch top 100 products to have a good pool
    const response = await apiRequest('/products/supplier-products?limit=100');
    if (!response || !response.data || !response.data.supplier_products) {
      console.warn('API returned no products, using mock data fallback.');
      return MOCK_PRODUCTS;
    }

    const realProducts: any[] = response.data.supplier_products;
    
    // Transform to ProductRef
    const groupedProducts = realProducts.map(p => ({
      id: p.id.toString(),
      name: p.product_name,
      category: normalizeCategory(p.category_name || ''),
      price: p.unit_price_with_iva || p.cost,
      inStock: p.stock > 0,
      imageUrl: p.image_url,
      sku: p.product_sku || p.supplier_sku,
      specs: [
        p.description,
        p.unit ? `Unidad: ${p.unit}` : null,
        p.supplier_name ? `Prov: ${p.supplier_name}` : null
      ].filter(Boolean)
    }));

    if (groupedProducts.length === 0) return MOCK_PRODUCTS;
    return groupedProducts;
    
  } catch (error) {
    console.error('Error fetching real products for Social Calendar:', error);
    return MOCK_PRODUCTS;
  }
}

// -----------------------------------------------------------------------------
// Logic Builders
// -----------------------------------------------------------------------------

type VariableContext = {
  mainProduct: ProductRef;
  category: ProductCategory;
  hookType: HookType;
  hookText: string;
  relevantDate?: any;
  monthPattern?: MonthPattern;
};

function buildVariablePack(ctx: VariableContext) {
  const categoryCopy = CATEGORY_COPY[ctx.category] ?? DEFAULT_COPY;
  const dateLabel = ctx.relevantDate ? ctx.relevantDate.name : 'esta temporada';
  const urgency = ctx.relevantDate
    ? `antes de ${ctx.relevantDate.name} (en ${ctx.relevantDate.daysUntil} días)`
    : 'por disponibilidad limitada';

  // Extract specs from Real Product Data if available
  const pSpecs = ctx.mainProduct.specs || [];
  const pSpec1 = pSpecs[0] || pick(categoryCopy.benefits, 'Alta calidad');
  const pSpec2 = pSpecs[1] || pick(categoryCopy.tips, 'Uso agrícola');

  return {
    '[PRODUCTO]': ctx.mainProduct.name,
    '[FECHA]': dateLabel,
    '[LIMITE]': urgency,
    '[OFERTA/MENSAJE]':
      ctx.hookType === 'sales-peak'
        ? 'aprovecha la alta demanda'
        : ctx.hookType === 'important-date'
          ? `prepárate para ${dateLabel}`
          : categoryCopy.offer ?? 'precios especiales',
    '[ITEM 1]': categoryCopy.components?.split(',')[0]?.trim() || 'Componente principal',
    '[ITEM 2]': categoryCopy.components?.split(',')[1]?.trim() || 'Accesorio clave',
    '[ITEM 3]': categoryCopy.components?.split(',')[2]?.trim() || 'Soporte/servicio',
    '[MEDIDAS]': ctx.mainProduct.specs?.find(s => s.includes('m') || s.includes('kg')) || 'medidas estándar',
    '[CALIDAD]': 'grado profesional IMPAG',
    '[PUNTO 1]': pSpec1,
    '[PUNTO 2]': pSpec2,
    '[PUNTO 3]': categoryCopy.benefits?.[2] ?? 'Soporte técnico incluido',
    '[BENEFICIO CLAVE]': pick(categoryCopy.benefits, 'Mejora tu rendimiento'),
    '[BENEFICIO 1]': pick(categoryCopy.benefits, 'Durabilidad garantizada'),
    '[BENEFICIO 2]': categoryCopy.benefits?.[1] ?? 'Instalación sencilla',
    '[PREGUNTA]': `¿Sirve para tu cultivo (${categoryCopy.useCase ?? 'uso agrícola'})?`,
    '[RESPUESTA]': 'Sí, adaptamos la solución a tu rancho.',
    '[DATO CLAVE]': categoryCopy.useCase ?? 'Diseñado para el campo mexicano',
    '[AMENAZA]': categoryCopy.threat ?? 'condiciones adversas',
    '[TIP 1]': pick(categoryCopy.tips, 'Revísalo antes de cada ciclo'),
    '[TIP 2]': categoryCopy.tips?.[1] ?? 'Manténlo limpio y protegido',
    '[MONTO]': ctx.mainProduct.price ? `$${ctx.mainProduct.price.toLocaleString('es-MX')}` : 'precio especial',
    '[TIEMPO]': 'una sola cosecha',
    '[KIT_NAME]': ctx.mainProduct.name,
    '[COMPONENTES]': categoryCopy.components ?? 'componentes principales listos para instalar',
    '[CULTIVO]': categoryCopy.useCase ?? 'cultivos de la región',
    '[CLIMA]': ctx.monthPattern ? PHASE_LABELS[ctx.monthPattern.phase] : 'clima de la temporada',
    '[ACCION]': 'instalando el equipo en campo',
    '[HERRAMIENTA]': 'con herramientas agrícolas',
    '[TITULO]': ctx.mainProduct.name,
    '[SUBTITULO]': categoryCopy.useCase ?? 'Solución profesional',
    '[ESPECIFICACIONES]': pSpecs.length > 0 
       ? pSpecs.map(s => `• ${s}`).join('\n') 
       : `• Calidad certificada\n• Material UV\n• Garantía IMPAG`,
    '[TEXTURA]': categoryCopy.texture ?? 'textura agrícola premium'
  };
}

type CaptionContext = {
  template: ReturnType<typeof getPostTemplate>;
  variables: Record<string, string>;
  hookText: string;
  hookType: HookType;
  mainProduct: ProductRef;
  relevantDate?: any;
  category: ProductCategory;
  channels: Channel[];
  monthPattern?: MonthPattern;
};

function selectCTA(template: ReturnType<typeof getPostTemplate>, channel: Channel | undefined) {
  const channelConfig = channel ? getChannelConfig(channel) : undefined;
  if (channelConfig?.ctaStyle) return `(${channelConfig.ctaStyle}) Escríbenos para cotizar`;
  if (template?.ctaExamples?.length) return template.ctaExamples[0];
  return 'Escríbenos para cotizar ahora mismo.';
}

function selectPostingTime(channel: Channel): string {
  // Simple heuristic
  if (channel === 'wa-status' || channel === 'wa-broadcast') return '09:00 AM (Apertura)';
  if (channel === 'fb-post' || channel === 'ig-post') return '07:00 PM (Descanso)';
  if (channel === 'tiktok' || channel === 'ig-reel') return '01:00 PM (Almuerzo)';
  return '10:00 AM';
}

function buildCaptionWithContext(ctx: CaptionContext) {
  const baseCaption = replaceVariables(ctx.template.captionTemplate || '', ctx.variables);
  const primaryChannel = ctx.channels[0];
  const channelConfig = primaryChannel ? getChannelConfig(primaryChannel) : undefined;
  const categoryCopy = CATEGORY_COPY[ctx.category] ?? DEFAULT_COPY;
  
  const seasonText = ctx.monthPattern
    ? `Temporada: ${ctx.monthPattern.name} (${PHASE_LABELS[ctx.monthPattern.phase]})`
    : '';
    
  const dateContext = ctx.relevantDate
    ? `Urgencia: ${ctx.relevantDate.name} en ${ctx.relevantDate.daysUntil} días.`
    : null;

  const hookLine = `${hookEmoji(ctx.hookType)} ${ctx.hookText || `Impulsa ${ctx.mainProduct.name}`}`;
  const cta = selectCTA(ctx.template, primaryChannel);
  
  // Clean up the caption logic
  const content = [
    hookLine,
    '', // Empty line
    baseCaption,
    '',
    `💡 ${pick(categoryCopy.tips, 'Dato técnico')}: ${categoryCopy.useCase || 'Uso profesional.'}`,
    '', // Empty line
    ctx.mainProduct.specs ? `📋 Specs: ${ctx.mainProduct.specs.slice(0, 2).join(', ')}` : null,
    (ctx.mainProduct.price && ctx.mainProduct.price > 0) ? `💰 Precio ref: $${ctx.mainProduct.price.toLocaleString('es-MX')}` : null,
    '',
    (seasonText || dateContext) ? `📅 Contexto: ${seasonText} ${dateContext || ''}` : null,
    `📣 CTA: ${cta}`,
    '',
    `🏷️ #${ctx.category} #agricultura #IMPAG`
  ].filter(line => line !== null).join('\n');

  return content;
}

type ImagePromptContext = {
  selectedPromptTemplate: any;
  variables: Record<string, string>;
  fallbackPrompt: string;
  hookText: string;
  hookType: HookType;
  mainProduct: ProductRef;
  category: ProductCategory;
  channels: Channel[];
  monthPattern?: MonthPattern;
  relevantDate?: any;
  postType: PostType;
};

function buildImagePromptWithContext(ctx: ImagePromptContext) {
  const channelConfig = ctx.channels[0] ? getChannelConfig(ctx.channels[0]) : undefined;
  const categoryCopy = CATEGORY_COPY[ctx.category] ?? DEFAULT_COPY;
  const basePrompt = ctx.selectedPromptTemplate
    ? hydratePrompt(ctx.selectedPromptTemplate, ctx.variables)
    : ctx.fallbackPrompt;

  // Build detailed specifications list
  const specsList = ctx.mainProduct.specs && ctx.mainProduct.specs.length > 0
    ? ctx.mainProduct.specs.slice(0, 6).map(spec => `  • ${spec}`).join('\n')
    : `  • Material robusto y resistente\n  • Colores verde/negro/blanco agrícolas\n  • Alta durabilidad`;

  // Add comprehensive instructions block matching IMPAG style
  const instructionsBlock = [
    '',
    'Genera una imagen cuadrada 1080×1080 px, estilo flyer técnico IMPAG, con diseño limpio, moderno y profesional.',
    'Mantén siempre la estética corporativa IMPAG: fondo agrícola difuminado, tonos blanco–gris, acentos verde–azul, sombras suaves, tipografías gruesas para títulos y delgadas para texto técnico.',
    '',
    'Instrucciones de diseño:',
    '',
    'Logo IMPAG',
    '- Colocar el logo "IMPAG Agricultura Inteligente" en la esquina superior derecha, sin deformarlo y manteniendo la proporción.',
    '',
    'Título del producto',
    `- Producto: ${ctx.mainProduct.name}`,
    `- Categoría: ${ctx.category}`,
    '- Mantener alineación, tamaño, tipografía y jerarquía visual estilo IMPAG.',
    '',
    'Imagen principal',
    `- Imagen realista del producto ${ctx.mainProduct.name} en alta resolución, fotorealista, iluminación de estudio suave o golden hour.`,
    `- Textura visual: ${categoryCopy.texture || 'Material agro-industrial robusto'}`,
    '- Mantener misma proporción, ubicación, integración suave con fondo, estilo profesional tipo catálogo.',
    '',
    'Especificaciones Técnicas',
    '- Sustituir todo el bloque técnico por:',
    '  📏 Especificaciones Técnicas:',
    specsList,
    '- Respetar viñetas, colores, alineación, tipografía, fondo del recuadro y sombra.',
    '',
    'Pie del flyer (mantener estilo IMPAG)',
    `- ${DEFAULT_CONTACT_INFO.web}`,
    '- Envíos a todo México',
    `- WhatsApp: ${DEFAULT_CONTACT_INFO.whatsapp}`,
    `- 📍 ${DEFAULT_CONTACT_INFO.location}`,
    '',
    'Estilo general: flyer técnico–comercial IMPAG, moderno, limpio, con fuerte presencia visual del producto, enfoque agrícola profesional y composición integrada.',
    'Fotografía realista, NO estilo cartoon o ilustración. Alta definición, colores vibrantes pero naturales.',
    'Iluminación: Golden hour, amanecer, o estudio suave. Profundidad de campo controlada (bokeh en fondos si aplica).'
  ].join('\n');

  return basePrompt + instructionsBlock;
}

function buildInstructions(ctx: CaptionContext) {
  const channel = ctx.channels[0];
  const config = channel ? getChannelConfig(channel) : null;
  
  return [
    `Plataforma sugerida: ${CHANNEL_LABELS[channel] || channel}`,
    `Formato: ${config?.format || 'Standard'}`,
    `Hora sugerida: ${selectPostingTime(channel)}`,
    '',
    'Pasos para crear:',
    '1. Copia el PROMPT DE IMAGEN y pégalo en Midjourney/DALL-E 3.',
    '2. Copia el CAPTION y adáptalo ligeramente al tono de tu audiencia.',
    '3. Si es video (Reel/TikTok): Usa clips de stock de campo + el producto + textos superpuestos rápidos.',
    '4. Publicar verificando que el link en bio funcione.'
  ].join('\n');
}

// -----------------------------------------------------------------------------
// Generator Class
// -----------------------------------------------------------------------------

export class SocialCalendarGenerator {
  private static instance: SocialCalendarGenerator;
  private config: GeneratorConfig;

  private constructor(config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG) {
    this.config = config;
  }

  public static getInstance(config?: GeneratorConfig): SocialCalendarGenerator {
    if (!SocialCalendarGenerator.instance) {
      SocialCalendarGenerator.instance = new SocialCalendarGenerator(config);
    }
    return SocialCalendarGenerator.instance;
  }

  public async generate(dateStr: string): Promise<DaySuggestions> {
    const targetDate = parseDate(dateStr);
    const month = targetDate.getMonth() + 1; // 1-12
    const monthPattern = getMonthPattern(month);
    
    // 0. Get Context
    const nearbyDates = getImportantDatesInWindow(targetDate, this.config.dateWindowDays);
    const dateBoostedCategories = nearbyDates.flatMap(d => d.relatedCategories);
    
    // Load history from database (last 10 days) for better deduplication
    const historyStartDate = new Date(targetDate);
    historyStartDate.setDate(historyStartDate.getDate() - 10);
    
    let history: DaySuggestions[] = [];
    try {
      // Try to load from database first (shared across users)
      history = await loadPostsFromDatabase(
        formatDate(historyStartDate),
        formatDate(targetDate)
      );
      
      // If database is empty, fallback to localStorage
      if (history.length === 0) {
        history = getHistory(
          formatDate(historyStartDate),
          formatDate(targetDate)
        );
      }
    } catch (error) {
      console.warn('Failed to load history from database, using localStorage:', error);
      history = getHistory(
        formatDate(historyStartDate),
        formatDate(targetDate)
      );
    }

    // 2. Autonomous Generation Loop
    const count = randomInt(this.config.minSuggestions, this.config.maxSuggestions);
    const suggestions: Suggestion[] = [];
    
    // Prepare comprehensive history for deduplication
    // Extract products, categories, and topics from last 10 days
    const recentPosts = history
      .flatMap(day => day.suggestions)
      .slice(-20); // Last 20 posts for better context
    
    const recentProductIds = new Set<string>();
    const recentCategories = new Set<string>();
    const recentTopics = new Set<string>();
    
    recentPosts.forEach(post => {
      // Track product IDs
      post.products.forEach(p => {
        if (p.id) recentProductIds.add(p.id);
        if (p.category) recentCategories.add(p.category);
      });
      
      // Extract topics from captions (first few words)
      const captionWords = post.caption.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      if (captionWords) recentTopics.add(captionWords);
    });
    
    // Create history summary for backend
    const recentHistory = recentPosts
      .slice(-10)
      .map(h => `${h.caption.substring(0, 50)}... [${h.postType}]`);
    
    // Create deduplication context
    const dedupContext = {
      recentProductIds: Array.from(recentProductIds),
      recentCategories: Array.from(recentCategories),
      recentTopics: Array.from(recentTopics),
      recentPostCount: recentPosts.length
    };

    // Track products/categories used in this generation batch to avoid duplicates
    const usedInBatch = {
      productIds: new Set<string>(),
      categories: new Set<string>()
    };
    
    for (let i = 0; i < count; i++) {
       const suggestion = await this.createAutonomousSuggestion(
         targetDate,
         nearbyDates,
         monthPattern,
         recentHistory,
         dedupContext,
         usedInBatch
       );
       if (suggestion) {
         suggestions.push(suggestion);
         // Track what we just used
         suggestion.products.forEach(p => {
           if (p.id) usedInBatch.productIds.add(p.id);
           if (p.category) usedInBatch.categories.add(p.category);
         });
       }
    }

    const daySuggestions: DaySuggestions = {
      date: dateStr,
      generatedAt: new Date().toISOString(),
      suggestions,
      metadata: {
        monthPhase: monthPattern.phase,
        relevantDates: nearbyDates.map(d => d.name),
        priorityCategories: dateBoostedCategories
      }
    };

    saveDaySuggestions(daySuggestions);
    
    // Also save to database (shared across users)
    await saveDaySuggestionsToDatabase(daySuggestions);
    
    return daySuggestions;
  }

  private calculateCategoryScores(
    available: ProductCategory[], 
    month: MonthPattern, 
    boosted: ProductCategory[],
    history: DaySuggestions[]
  ): Record<ProductCategory, number> {
    const scores: Record<string, number> = {};

    // Base scores from monthly pattern
    for (const cat of available) {
      const weightObj = month.categories.find(c => c.category === cat);
      scores[cat] = weightObj ? weightObj.weight : 0.3; // Default base
    }

    // Boost important dates
    for (const cat of boosted) {
      if (scores[cat]) {
        scores[cat] *= this.config.dateBoostMultiplier;
      }
    }

    // Penalty for recent usage (Simple Bloom filterish or direct check)
    // Flatten recent history tags/categories
    const recentCategories = new Set<string>(); // simplified
    // In a real implementation we would parse history. For now, assume we want variety.
    
    return scores;
  }

  private async createAutonomousSuggestion(
    date: Date,
    nearbyDates: any[],
    monthPattern: MonthPattern,
    recentHistory: string[] = [],
    dedupContext?: {
      recentProductIds: string[];
      recentCategories: string[];
      recentTopics: string[];
      recentPostCount: number;
    },
    usedInBatch?: {
      productIds: Set<string>;
      categories: Set<string>;
    }
  ): Promise<Suggestion | null> {
    const id = generateId();
    // Default fallback values
    let mainProduct: ProductRef | undefined = undefined; // No local pool to pick from
    let category: string = 'vivero'; // Default general category if no product
    
    let hookType: HookType = 'seasonality';
    let hookText = 'Tendencias agrícolas';
    let postType: PostType = 'promo';
    const channels: Channel[] = ['wa-status', 'fb-post', 'ig-post'];
    
    let caption = 'Contenido generado automáticamente.';
    let imagePrompt = 'Imagen agrícola profesional.';
    let postingTime = '10:00 AM';
    let instructions = 'Revisar antes de publicar.';
    let generationSource: 'llm' | 'template' = 'template';

    try {
      // Send comprehensive context to backend for better deduplication
      const llmResponse: any = await apiRequest('/social/generate', {
        method: 'POST',
        body: JSON.stringify({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD
          category: undefined,
          recentPostHistory: recentHistory, // Context to avoid repetition
          dedupContext: dedupContext ? {
            recent_product_ids: dedupContext.recentProductIds,
            recent_categories: dedupContext.recentCategories,
            recent_topics: dedupContext.recentTopics,
            recent_post_count: dedupContext.recentPostCount
          } : undefined,
          used_in_batch: usedInBatch ? {
            product_ids: Array.from(usedInBatch.productIds),
            categories: Array.from(usedInBatch.categories)
          } : undefined
        })
      });

      // Helper to clean potential raw JSON leaks
      const cleanText = (text: string) => {
        if (!text) return '';
        if (typeof text === 'string' && (text.trim().startsWith('```') || text.trim().startsWith('{'))) {
           try {
             const raw = text.replace(/```json/g, '').replace(/```/g, '').trim();
             const parsed = JSON.parse(raw);
             return parsed.caption || parsed.text || text;
           } catch (e) { 
             return text.replace(/```json/g, '').replace(/```/g, '').trim();
           }
        }
        return text;
      };

      if (llmResponse) {
         // 1. Resolve Category
         if (llmResponse.selected_category) {
             category = normalizeCategory(llmResponse.selected_category);
         }
         
         // 2. Resolve Product from Backend Response
         if (llmResponse.selected_product_details) {
            const p = llmResponse.selected_product_details;
            mainProduct = {
               id: String(p.id),
               name: p.name,
               category: normalizeCategory(p.category),
               sku: p.sku,
               inStock: p.inStock,
               price: p.price
            };
         }

         caption = cleanText(llmResponse.caption) || caption;
         
         let rawPrompt = llmResponse.image_prompt || llmResponse.imagePrompt;
         if (rawPrompt) imagePrompt = cleanText(rawPrompt);

         postingTime = llmResponse.posting_time || llmResponse.postingTime || postingTime;
         
         if (llmResponse.notes) {
           instructions = `🧠 Estrategia IA:\n${llmResponse.notes}\n\n${instructions}`;
         }
         
         generationSource = 'llm';
      }

    } catch (err) {
      console.warn('Autonomous LLM generation failed', err);
      // Fallback: Continue with random mainProduct selected at top
    }

    return {
      id,
      postType,
      channels,
      status: 'planned',
      products: mainProduct ? [mainProduct] : [],
      hook: hookText,
      hookType,
      tags: [],
      caption,
      imagePrompt,
      instructions,
      postingTime,
      generationSource
    };
  }

  // Deprecated but kept to avoid breaking interface if called elsewhere (unlikely private)
  private async createSuggestionForCategory(
    category: ProductCategory, 
    date: Date,
    nearbyDates: any[],
    monthPattern: MonthPattern,
    productPool: ProductRef[]
  ): Promise<Suggestion | null> {
    
    // A. Find Product in that category
    const categoryProducts = productPool.filter(p => p.category === category);
    if (categoryProducts.length === 0) return null;
    let mainProduct = categoryProducts[randomInt(0, categoryProducts.length - 1)];

    // B. Determine Hook
    let hookType: HookType = 'seasonality';
    let hookText = `Temporada de ${category}`;
    const relevantDate = nearbyDates.find(d => d.relatedCategories.includes(category));
    
    if (relevantDate) {
      hookType = 'important-date';
      hookText = relevantDate.suggestedHooks[randomInt(0, relevantDate.suggestedHooks.length - 1)];
    } else if (mainProduct.category === 'kits' || mainProduct.category === 'bombeo-solar') {
      hookType = 'sales-peak';
      hookText = 'Alta demanda agrícola';
    }

    // C. Select Post Type
    // Logic: If important date -> 'important-date' type
    // If specific product -> 'promo' or 'kit'
    let postType: PostType = 'promo';
    if (hookType === 'important-date') postType = 'important-date';
    else if (mainProduct.category === 'kits') postType = 'kit';
    else if (Math.random() > 0.7) postType = 'infographic';

    const template = getPostTemplate(postType) || getPostTemplate('promo');
    if (!template) return null;

    // D. Select Channels
    const channels = shuffle(template.applicableChannels).slice(0, 1); // Focus on 1 main channel for clarity

    // E. Prepare Variables and LLM payload
    const variables = buildVariablePack({
      mainProduct,
      category,
      hookType,
      hookText,
      relevantDate,
      monthPattern
    });

    const contextForBuilder = {
      template,
      variables,
      hookText,
      hookType,
      mainProduct,
      relevantDate,
      category,
      channels,
      monthPattern
    };

    let caption = buildCaptionWithContext(contextForBuilder);
    let instructions = buildInstructions(contextForBuilder);
    let postingTime = selectPostingTime(channels[0]);
    let imagePrompt = '';

    // Prompt (template fallback)
    const promptTemplates = getPromptsForContext(category, postType);
    const selectedPromptTemplate = promptTemplates.length > 0 
      ? promptTemplates[randomInt(0, promptTemplates.length - 1)]
      : null;
    const fallbackPrompt = 'Generar imagen de producto agrícola, iluminación limpia, estilo IMPAG.';
    imagePrompt = buildImagePromptWithContext({
      selectedPromptTemplate,
      variables,
      fallbackPrompt,
      hookText,
      hookType,
      mainProduct,
      category,
      channels,
      monthPattern,
      relevantDate,
      postType
    });

    // F. Call Claude API - "Strategy Mode" (No hard constraints)
    let generationSource: 'llm' | 'template' = 'template';

    try {
      const llmResponse: any = await apiRequest('/social/generate', {
        method: 'POST',
        body: JSON.stringify({
          category,
          // We set these to null/undefined to let Claude decide based on context
          postType: 'auto', 
          mainProduct: undefined, 
          hookType: 'auto',
          hookText: undefined,
          postTemplate: undefined, 
          
          channels,
          contactInfo: DEFAULT_CONTACT_INFO,
          channelConfigs: channels.map(c => getChannelConfig(c)).filter(Boolean),
          importantDates: nearbyDates,
          salesContext: {
            phase: monthPattern.phase,
            name: monthPattern.name,
            suggestedActions: monthPattern.suggestedActions
          },
          productCatalogSample: productPool.filter(p => p.category === category).slice(0, 20),
          pastQuotations: [] 
        })
      });

      // Helper to clean potential raw JSON leaks
      const cleanText = (text: string) => {
        if (!text) return '';
        if (typeof text === 'string' && (text.trim().startsWith('```') || text.trim().startsWith('{'))) {
           try {
             const raw = text.replace(/```json/g, '').replace(/```/g, '').trim();
             const parsed = JSON.parse(raw);
             return parsed.caption || parsed.text || text;
           } catch (e) { 
             return text.replace(/```json/g, '').replace(/```/g, '').trim();
           }
        }
        return text;
      };

      if (llmResponse) {
        caption = cleanText(llmResponse.caption) || caption;
        
        let rawPrompt = llmResponse.image_prompt || llmResponse.imagePrompt;
        if (rawPrompt) {
           imagePrompt = cleanText(rawPrompt);
        }

        postingTime = llmResponse.posting_time || llmResponse.postingTime || postingTime;
        
        if (llmResponse.notes) {
          instructions = `${instructions}\n\n🧠 Estrategia IA:\n${llmResponse.notes}`;
        }
        
        // If AI selected a different product, update our reference
        if (llmResponse.selected_product_id) {
            const aiProduct = productPool.find(p => p.id === String(llmResponse.selected_product_id));
            if (aiProduct) {
                mainProduct = aiProduct;
                // Update instructions to reflect the pivot
                instructions = `(Producto cambiado por IA a ${aiProduct.name})\n\n${instructions}`;
            }
        }
        
        generationSource = 'llm';
      }
    } catch (err) {
      console.warn('LLM generation failed, using template fallback', err);
    }
    
    return {
      id: generateId(),
      postType,
      channels, // Array
      hook: hookText,
      hookType,
      products: [mainProduct],
      caption, 
      tags: [hookType === 'important-date' ? 'fecha-relevante' : 'alta-rotacion'],
      status: 'planned',
      imagePrompt,
      instructions,
      postingTime,
      generationSource
    };
  }
}

// -----------------------------------------------------------------------------
// Fallback Mock Data
// -----------------------------------------------------------------------------

const MOCK_PRODUCTS: ProductRef[] = [
  { id: '1', name: 'Malla Sombra Raschel 90%', category: 'mallasombra', price: 2500, inStock: true, specs: ['90% Sombra', 'Rollo 4x100m', 'UV 5 años'] },
  { id: '2', name: 'Cinta Riego Calibre 6mil', category: 'riego', price: 1800, inStock: true, specs: ['Calibre 6000', 'Gotero 10cm', 'Rollo 3000m'] },
  { id: '3', name: 'Kit Bombeo Solar 3HP', category: 'bombeo-solar', price: 45000, inStock: true, specs: ['Bomba 3HP', '8 Paneles 550W', 'Controlador MPPT'] },
  { id: '4', name: 'Manta Térmica 17gr', category: 'antiheladas', price: 1200, inStock: true, specs: ['17 gramos/m2', 'Ancho 2m', 'Protección -2°C'] },
];

export const socialCalendarGenerator = SocialCalendarGenerator.getInstance();
