// =============================================================================
// Sales Patterns by Month
// Derived from: Control de Ventas IMPAG - VENTAS_2024.csv and VENTAS_2025.csv
// Reference: docs/calendar/social-calendar-sales-analysis.md
// =============================================================================

import type { MonthPattern, CategoryWeight, AgriculturalPhase, ProductCategory } from '../../types/socialCalendar';

// -----------------------------------------------------------------------------
// Helper to create category weights
// -----------------------------------------------------------------------------

function createWeight(
  category: ProductCategory,
  weight: number,
  phase: AgriculturalPhase,
  keywords: string[]
): CategoryWeight {
  return { category, weight, phase, keywords };
}

// -----------------------------------------------------------------------------
// Monthly Sales Patterns
// -----------------------------------------------------------------------------

export const SALES_PATTERNS: MonthPattern[] = [
  // -------------------------------------------------------------------------
  // ENERO - Germinación bajo túnel
  // -------------------------------------------------------------------------
  {
    month: 1,
    name: 'Enero',
    phase: 'germinacion',
    categories: [
      createWeight('mallasombra', 0.85, 'germinacion', ['mallasombra 50%', 'malla sombra', 'sombreo']),
      createWeight('plasticos', 0.75, 'germinacion', ['plástico invernadero', 'plástico 25%', 'cobertura']),
      createWeight('vivero', 0.70, 'germinacion', ['bolsas vivero', 'bolsa negra', 'contenedor']),
      createWeight('antiheladas', 0.80, 'proteccion-frio', ['agrotermic', 'antihelada', 'protección frío']),
      createWeight('charolas', 0.50, 'germinacion', ['charola', 'almácigo', 'germinación']),
    ],
    suggestedActions: [
      'Kits de germinación (charolas + peat + bolsas)',
      'Sombra ligera para almácigos',
      'Antiáfidos y protección temprana',
      'Ofertas de arranque de ciclo',
    ],
  },

  // -------------------------------------------------------------------------
  // FEBRERO - Siembra/germinación temprana
  // -------------------------------------------------------------------------
  {
    month: 2,
    name: 'Febrero',
    phase: 'germinacion',
    categories: [
      createWeight('kits', 0.80, 'germinacion', ['kit invernadero', 'sembrando vida', 'paquete']),
      createWeight('charolas', 0.85, 'germinacion', ['charola 200', 'charola 338', 'almácigo']),
      createWeight('riego', 0.55, 'germinacion', ['cintilla inicial', 'riego ligero', 'aspersión']),
      createWeight('vivero', 0.70, 'germinacion', ['bolsas', 'sustrato', 'peat']),
      createWeight('antiheladas', 0.65, 'proteccion-frio', ['agrotermic', 'protección']),
    ],
    suggestedActions: [
      'Material "Sembrando Vida" y kits de invernadero',
      'Charolas 200/338 cavidades',
      'Sustratos (peat, vermiculita)',
      'Cintilla inicial para transplante próximo',
    ],
  },

  // -------------------------------------------------------------------------
  // MARZO - Pre-trasplante y sombreo preventivo
  // -------------------------------------------------------------------------
  {
    month: 3,
    name: 'Marzo',
    phase: 'trasplante',
    categories: [
      createWeight('mallasombra', 0.90, 'trasplante', ['mallasombra 50%', 'mallasombra 70%', 'sombra']),
      createWeight('vivero', 0.85, 'trasplante', ['bolsas vivero', 'bolsa grande']),
      createWeight('estructuras', 0.70, 'trasplante', ['perfiles', 'estructura invernadero', 'clips']),
      createWeight('plasticos', 0.65, 'trasplante', ['plástico 25%', 'cobertura']),
      createWeight('charolas', 0.60, 'germinacion', ['charola', 'almácigo']),
    ],
    suggestedActions: [
      'Paquetes mallasombra + bolsas + clips',
      'Checklist de montaje de invernadero',
      'UGC de almácigos en desarrollo',
      'Preparación para trasplante',
    ],
  },

  // -------------------------------------------------------------------------
  // ABRIL - Montaje de invernaderos y sombra
  // -------------------------------------------------------------------------
  {
    month: 4,
    name: 'Abril',
    phase: 'trasplante',
    categories: [
      createWeight('mallasombra', 0.90, 'trasplante', ['mallasombra', 'sombra', 'anti-calor']),
      createWeight('plasticos', 0.80, 'trasplante', ['plástico', 'cobertura', 'túnel']),
      createWeight('charolas', 0.65, 'trasplante', ['charola', 'transplante']),
      createWeight('estructuras', 0.70, 'trasplante', ['perfiles', 'estructura', 'fijación']),
      createWeight('riego', 0.55, 'trasplante', ['cintilla', 'válvula']),
    ],
    suggestedActions: [
      'Combos de sombra + fijación + plásticos',
      'Montaje de invernaderos antes del calor',
      'Preparación de sistemas de riego',
      'Checklist pre-verano',
    ],
  },

  // -------------------------------------------------------------------------
  // MAYO - Pico de riego y acolchado (máximo 2025)
  // -------------------------------------------------------------------------
  {
    month: 5,
    name: 'Mayo',
    phase: 'crecimiento',
    categories: [
      createWeight('riego', 0.95, 'crecimiento', ['cintilla', 'goteo', 'riego']),
      createWeight('valvuleria', 0.90, 'crecimiento', ['válvulas', 'filtros', 'conectores']),
      createWeight('acolchado', 0.90, 'crecimiento', ['acolchado', 'mulch', 'cubierta suelo']),
      createWeight('mallasombra', 0.75, 'crecimiento', ['mallasombra', 'sombra']),
      createWeight('control-plagas', 0.70, 'crecimiento', ['trampas', 'rafia', 'control']),
      createWeight('bombeo-solar', 0.65, 'crecimiento', ['kit solar', 'bomba', 'panel']),
    ],
    suggestedActions: [
      'Campañas de eficiencia de agua',
      'Bundles cintilla + válvulas + filtros',
      'Control de maleza con acolchado',
      'Trampas y control preventivo de plagas',
    ],
  },

  // -------------------------------------------------------------------------
  // JUNIO - Irrigación y protección de parcelas
  // -------------------------------------------------------------------------
  {
    month: 6,
    name: 'Junio',
    phase: 'crecimiento',
    categories: [
      createWeight('riego', 0.90, 'crecimiento', ['cintilla', 'válvulas', 'irrigación']),
      createWeight('acolchado', 0.85, 'crecimiento', ['acolchado', 'mulch']),
      createWeight('bombeo-solar', 0.80, 'crecimiento', ['bombas', 'solar', 'lámparas']),
      createWeight('cercas', 0.60, 'crecimiento', ['postes', 'cerco', 'protección']),
      createWeight('valvuleria', 0.75, 'crecimiento', ['válvulas', 'filtros']),
    ],
    suggestedActions: [
      'Bundles de riego + acolchado + repuestos',
      'Bombas y sistemas solares',
      'Protección de parcelas (cercas)',
      'Continuidad de campaña de agua',
    ],
  },

  // -------------------------------------------------------------------------
  // JULIO - Mitigar estrés hídrico
  // -------------------------------------------------------------------------
  {
    month: 7,
    name: 'Julio',
    phase: 'crecimiento',
    categories: [
      createWeight('mallasombra', 0.85, 'crecimiento', ['mallasombra', 'sombra refuerzo']),
      createWeight('vivero', 0.70, 'crecimiento', ['bolsas', 'vivero grande']),
      createWeight('bombeo-solar', 0.80, 'crecimiento', ['motobomba', 'picadora', 'bomba']),
      createWeight('charolas', 0.55, 'crecimiento', ['charolas', 'rafia']),
      createWeight('cercas', 0.65, 'crecimiento', ['postes ganaderos', 'cerco']),
    ],
    suggestedActions: [
      'Posts de sombra de refuerzo',
      'Bombeo para riegos largos',
      'Preparación de siguientes almácigos',
      'Material para parcelas ganaderas',
    ],
  },

  // -------------------------------------------------------------------------
  // AGOSTO - Bombeo/solar y preparación otoñal
  // -------------------------------------------------------------------------
  {
    month: 8,
    name: 'Agosto',
    phase: 'crecimiento',
    categories: [
      createWeight('bombeo-solar', 0.95, 'crecimiento', ['sistema bombeo', 'kit solar', 'motobomba']),
      createWeight('riego', 0.80, 'crecimiento', ['cintilla', 'riego largo']),
      createWeight('vivero', 0.75, 'crecimiento', ['material vivero', 'forestal']),
      createWeight('kits', 0.70, 'crecimiento', ['kit motobomba', 'paquete']),
      createWeight('mallasombra', 0.60, 'crecimiento', ['mallasombra', 'sombra']),
    ],
    suggestedActions: [
      'Historias de éxito de bombeo y ROI solar',
      'Preparación para siembras otoñales',
      'Material vivero para empresas forestales',
      'Promoción de financiamiento',
    ],
  },

  // -------------------------------------------------------------------------
  // SEPTIEMBRE - Bajo volumen, refrescamiento
  // -------------------------------------------------------------------------
  {
    month: 9,
    name: 'Septiembre',
    phase: 'mantenimiento',
    categories: [
      createWeight('mallasombra', 0.75, 'mantenimiento', ['mallasombra 70%', 'refrescamiento']),
      createWeight('vivero', 0.65, 'mantenimiento', ['bolsas', 'vivero']),
      createWeight('estructuras', 0.50, 'mantenimiento', ['limpieza', 'mantenimiento']),
      createWeight('plasticos', 0.45, 'mantenimiento', ['plástico', 'reposición']),
    ],
    suggestedActions: [
      'Limpieza y mantenimiento de invernaderos',
      'Pedidos anticipados de sombra/bolsas',
      'Preparación para temporada de frío',
      'Revisión de estructuras',
    ],
  },

  // -------------------------------------------------------------------------
  // OCTUBRE - Pre-fríos y re-cubiertas
  // -------------------------------------------------------------------------
  {
    month: 10,
    name: 'Octubre',
    phase: 'mantenimiento',
    categories: [
      createWeight('estructuras', 0.75, 'mantenimiento', ['perfiles', 'estructura invernadero']),
      createWeight('mallasombra', 0.70, 'mantenimiento', ['mallasombra', 'sombra 25%']),
      createWeight('plasticos', 0.80, 'proteccion-frio', ['plástico 25%', 'cobertura']),
      createWeight('antiheladas', 0.60, 'proteccion-frio', ['preparación', 'antihelada']),
    ],
    suggestedActions: [
      'Re-cubiertas de invernadero',
      'Plásticos y calefacción pasiva',
      'Preparación anticipada antiheladas',
      'Mantenimiento de estructuras',
    ],
  },

  // -------------------------------------------------------------------------
  // NOVIEMBRE - Antiheladas y promos retail
  // -------------------------------------------------------------------------
  {
    month: 11,
    name: 'Noviembre',
    phase: 'proteccion-frio',
    categories: [
      createWeight('antiheladas', 0.95, 'proteccion-frio', ['agrotermic', 'antihelada', 'protección frío']),
      createWeight('plasticos', 0.85, 'proteccion-frio', ['plástico 75%', 'cobertura térmica']),
      createWeight('vivero', 0.60, 'proteccion-frio', ['bolsas', 'vivero']),
      createWeight('bombeo-solar', 0.55, 'proteccion-frio', ['luces solares', 'iluminación']),
    ],
    suggestedActions: [
      'Promos urgentes antiheladas (Buen Fin/Black Friday)',
      'Plásticos de protección térmica',
      'Alertas de frentes fríos',
      'Kits de emergencia para heladas',
    ],
  },

  // -------------------------------------------------------------------------
  // DICIEMBRE - Heladas puntuales y cierre de año
  // -------------------------------------------------------------------------
  {
    month: 12,
    name: 'Diciembre',
    phase: 'proteccion-frio',
    categories: [
      createWeight('antiheladas', 0.90, 'proteccion-frio', ['agrotermic', 'antihelada', 'urgencia']),
      createWeight('plasticos', 0.75, 'proteccion-frio', ['plástico', 'protección']),
      createWeight('kits', 0.50, 'proteccion-frio', ['kit', 'paquete']),
    ],
    suggestedActions: [
      'Recordatorios de protección contra heladas',
      'Servicio exprés de entrega',
      'Cierre de año y agradecimientos',
      'Preparación para nuevo ciclo',
    ],
  },
];

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get the sales pattern for a given month (1-12)
 */
export function getMonthPattern(month: number): MonthPattern {
  const pattern = SALES_PATTERNS.find(p => p.month === month);
  if (!pattern) {
    throw new Error(`No pattern found for month ${month}`);
  }
  return pattern;
}

/**
 * Get the agricultural phase for a given month
 */
export function getMonthPhase(month: number): AgriculturalPhase {
  return getMonthPattern(month).phase;
}

/**
 * Get top N categories for a month, sorted by weight
 */
export function getTopCategories(month: number, count: number = 3): CategoryWeight[] {
  const pattern = getMonthPattern(month);
  return [...pattern.categories]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count);
}

/**
 * Get category weight for a specific category in a given month
 */
export function getCategoryWeight(month: number, category: ProductCategory): number {
  const pattern = getMonthPattern(month);
  const cat = pattern.categories.find(c => c.category === category);
  return cat?.weight ?? 0;
}

/**
 * Check if a category is high-priority (weight > 0.7) for a given month
 */
export function isHighPriority(month: number, category: ProductCategory): boolean {
  return getCategoryWeight(month, category) > 0.7;
}

/**
 * Get suggested actions for a month
 */
export function getSuggestedActions(month: number): string[] {
  return getMonthPattern(month).suggestedActions;
}
