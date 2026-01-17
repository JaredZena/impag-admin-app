// =============================================================================
// Social Calendar Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Channel Types
// -----------------------------------------------------------------------------

export type Channel =
  | 'wa-status'
  | 'wa-broadcast'
  | 'wa-message'
  | 'fb-post'
  | 'fb-reel'
  | 'ig-post'
  | 'ig-reel'
  | 'tiktok';

export const CHANNEL_LABELS: Record<Channel, string> = {
  'wa-status': 'WA Status',
  'wa-broadcast': 'WA Broadcast',
  'wa-message': 'WA Message',
  'fb-post': 'FB Post',
  'fb-reel': 'FB Reel',
  'ig-post': 'IG Post',
  'ig-reel': 'IG Reel',
  'tiktok': 'TikTok',
};

// -----------------------------------------------------------------------------
// Post Types (from social-calendar-post-types.md)
// -----------------------------------------------------------------------------

export type PostType =
  | 'infographic'
  | 'important-date'
  | 'meme-tip'
  | 'promo'
  | 'kit'
  | 'case-study'
  | 'before-after'
  | 'checklist'
  | 'tutorial'
  | 'new-arrivals'
  | 'faq'
  | 'safety'
  | 'roi'
  | 'ugc-request'
  | 'service-reminder'
  | 'ab-test'
  | 'how-to-order';

export const POST_TYPE_LABELS: Record<PostType, string> = {
  'infographic': 'Infografía',
  'important-date': 'Fecha Importante',
  'meme-tip': 'Meme/Tip Rápido',
  'promo': 'Promoción',
  'kit': 'Kit/Combo',
  'case-study': 'Caso de Éxito',
  'before-after': 'Antes/Después',
  'checklist': 'Checklist',
  'tutorial': 'Tutorial',
  'new-arrivals': 'Novedades',
  'faq': 'FAQ/Mitos',
  'safety': 'Seguridad',
  'roi': 'ROI/Números',
  'ugc-request': 'Solicitud UGC',
  'service-reminder': 'Recordatorio Servicio',
  'ab-test': 'Test A/B',
  'how-to-order': 'Cómo Pedir',
};

// -----------------------------------------------------------------------------
// Tags & Status
// -----------------------------------------------------------------------------

export type SuggestionTag =
  | 'lead-time'
  | 'alta-rotacion'
  | 'fecha-relevante'
  | 'ugc-request';

export const TAG_LABELS: Record<SuggestionTag, string> = {
  'lead-time': '⏰ Lead Time',
  'alta-rotacion': '🔥 Alta Rotación',
  'fecha-relevante': '📅 Fecha Relevante',
  'ugc-request': '📸 UGC Request',
};

export type SuggestionStatus = 'planned' | 'scheduled' | 'done';

export const STATUS_LABELS: Record<SuggestionStatus, string> = {
  'planned': 'Planeado',
  'scheduled': 'Agendado',
  'done': 'Publicado',
};

// -----------------------------------------------------------------------------
// Hook Types
// -----------------------------------------------------------------------------

export type HookType = 'seasonality' | 'important-date' | 'sales-peak' | 'ugc';

// -----------------------------------------------------------------------------
// Product Categories
// -----------------------------------------------------------------------------

export type ProductCategory =
  | 'mallasombra'
  | 'plasticos'
  | 'antiheladas'
  | 'riego'
  | 'acolchado'
  | 'bombeo-solar'
  | 'vivero'
  | 'charolas'
  | 'valvuleria'
  | 'cercas'
  | 'control-plagas'
  | 'estructuras'
  | 'kits';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  'mallasombra': 'Mallasombra',
  'plasticos': 'Plásticos',
  'antiheladas': 'Antiheladas',
  'riego': 'Riego/Cintilla',
  'acolchado': 'Acolchado',
  'bombeo-solar': 'Bombeo Solar',
  'vivero': 'Material Vivero',
  'charolas': 'Charolas/Almácigo',
  'valvuleria': 'Válvulas/Filtros',
  'cercas': 'Postes/Cercos',
  'control-plagas': 'Control de Plagas',
  'estructuras': 'Estructuras/Perfiles',
  'kits': 'Kits Completos',
};

// -----------------------------------------------------------------------------
// Agricultural Phases (Durango)
// -----------------------------------------------------------------------------

export type AgriculturalPhase =
  | 'germinacion'
  | 'trasplante'
  | 'crecimiento'
  | 'proteccion-frio'
  | 'mantenimiento';

export const PHASE_LABELS: Record<AgriculturalPhase, string> = {
  'germinacion': 'Germinación/Almácigos',
  'trasplante': 'Trasplante/Pre-calor',
  'crecimiento': 'Crecimiento/Verano',
  'proteccion-frio': 'Protección Frío',
  'mantenimiento': 'Mantenimiento/Re-cubiertas',
};

// -----------------------------------------------------------------------------
// Important Date Types
// -----------------------------------------------------------------------------

export type ImportantDateType = 'civic' | 'cultural' | 'retail' | 'agro' | 'seasonal';

export const DATE_TYPE_LABELS: Record<ImportantDateType, string> = {
  'civic': 'Cívica/Oficial',
  'cultural': 'Cultural',
  'retail': 'Marketing/Retail',
  'agro': 'Agro-ambiental',
  'seasonal': 'Estacional',
};

// -----------------------------------------------------------------------------
// Core Data Structures
// -----------------------------------------------------------------------------

/**
 * Reference to a product for suggestions
 */
export interface ProductRef {
  id: string;
  name: string;
  category: ProductCategory;
  imageUrl?: string;
  price?: number;
  inStock?: boolean;
  specs?: string[];
  sku?: string;
}

export interface Suggestion {
  id: string; // DB ID as string (numeric)
  postType: PostType;
  channels: Channel[];
  hook: string;
  hookType: HookType;
  products: ProductRef[];
  caption: string;
  captionVariants?: Partial<Record<Channel, string>>;
  imagePrompt: string;
  carouselSlides?: string[];      // Explicit carousel data
  needsMusic?: boolean;           // Explicit music flag
  tags: SuggestionTag[];
  status: SuggestionStatus;
  notes?: string;
  instructions?: string;
  strategyNotes?: string;
  postingTime?: string;
  generationSource?: 'llm' | 'template';
  generatedContext?: {
    monthPhase: AgriculturalPhase;
    nearbyDates: ImportantDate[];
    selectedCategories: ProductCategory[];
  };
  // Feedback fields
  userFeedback?: 'like' | 'dislike' | null;
  // Topic-based deduplication fields (CRITICAL)
  topic?: string; // Topic in format "Problema → Solución" (canonical unit of deduplication)
  problem_identified?: string; // Problem description from strategy phase
}

/**
 * All suggestions for a single day
 */
export interface DaySuggestions {
  date: string; // YYYY-MM-DD
  generatedAt: string; // ISO timestamp
  suggestions: Suggestion[];
  metadata: {
    monthPhase: AgriculturalPhase;
    relevantDates: string[];
    priorityCategories: ProductCategory[];
  };
}

// -----------------------------------------------------------------------------
// Data Source Structures
// -----------------------------------------------------------------------------

/**
 * Category weight for a given month
 */
export interface CategoryWeight {
  category: ProductCategory;
  weight: number; // 0-1, higher = more priority
  phase: AgriculturalPhase;
  keywords: string[]; // Product keywords for matching
}

/**
 * Sales pattern for a month
 */
export interface MonthPattern {
  month: number; // 1-12
  name: string;
  phase: AgriculturalPhase;
  categories: CategoryWeight[];
  suggestedActions: string[];
}

/**
 * Important date definition
 */
export interface ImportantDate {
  /** MM-DD for recurring, or YYYY-MM-DD for specific */
  date: string;
  name: string;
  type: ImportantDateType;
  /** Start promoting X days before */
  leadTimeDays: number;
  /** Final push X days before (optional) */
  urgencyDays?: number;
  relatedCategories: ProductCategory[];
  suggestedHooks: string[];
  /** Whether date is movable (e.g., "tercer lunes de noviembre") */
  isMovable?: boolean;
  /** Description of how to calculate movable date */
  movableRule?: string;
}

/**
 * Channel configuration (Frontend display only)
 * Detailed AI context (format specs, music requirements, etc.) is in backend: social.py
 */
export interface ChannelConfig {
  channel: Channel;
  label: string;
  icon: string;
  color: string;
}

/**
 * Post type template
 */
export interface PostTemplate {
  type: PostType;
  purpose: string;
  formats: string[];
  ctaExamples: string[];
  applicableChannels: Channel[];
  captionTemplate?: string;
}

/**
 * Image prompt template
 */
export interface ImagePromptTemplate {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  applicablePostTypes: PostType[];
  applicableCategories: ProductCategory[];
  variables: string[]; // Placeholders like [PRODUCTO], [TITULO], etc.
}

// -----------------------------------------------------------------------------
// Generator Configuration
// -----------------------------------------------------------------------------

export interface GeneratorConfig {
  /** Minimum suggestions per day */
  minSuggestions: number;
  /** Maximum suggestions per day */
  maxSuggestions: number;
  /** Days to look ahead for important dates */
  dateWindowDays: number;
  /** Days to look back for deduplication */
  dedupWindowDays: number;
  /** Maximum times same category can appear in dedup window */
  maxCategoryRepeat: number;
  /** Boost multiplier for important date categories */
  dateBoostMultiplier: number;
  /** Penalty multiplier for recently used categories */
  recentPenaltyMultiplier: number;
}

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  minSuggestions: 1,
  maxSuggestions: 3,
  dateWindowDays: 14,
  dedupWindowDays: 7,
  maxCategoryRepeat: 2,
  dateBoostMultiplier: 1.5,
  recentPenaltyMultiplier: 0.7,
};

// -----------------------------------------------------------------------------
// Storage Types
// -----------------------------------------------------------------------------

export interface SocialCalendarIndex {
  dates: string[];
  lastUpdated: string;
}

export interface StorageStats {
  totalEntries: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  totalSuggestions: number;
  byStatus: Record<SuggestionStatus, number>;
}
