// =============================================================================
// Important Dates for Social Calendar
// Reference: docs/calendar/social-calendar-important-dates.md
// =============================================================================

import type { ImportantDate, ImportantDateType, ProductCategory } from '../../types/socialCalendar';

// -----------------------------------------------------------------------------
// Civic & Official Dates
// -----------------------------------------------------------------------------

const CIVIC_DATES: ImportantDate[] = [
  {
    date: '01-01',
    name: 'Año Nuevo',
    type: 'civic',
    leadTimeDays: 7,
    relatedCategories: [],
    suggestedHooks: ['Feliz Año Nuevo', 'Arrancamos el año con todo'],
  },
  {
    date: '02-05',
    name: 'Día de la Constitución',
    type: 'civic',
    leadTimeDays: 5,
    isMovable: true,
    movableRule: 'Primer lunes de febrero',
    relatedCategories: [],
    suggestedHooks: ['Día de la Constitución'],
  },
  {
    date: '03-21',
    name: 'Natalicio de Benito Juárez',
    type: 'civic',
    leadTimeDays: 5,
    isMovable: true,
    movableRule: 'Tercer lunes de marzo',
    relatedCategories: [],
    suggestedHooks: ['Natalicio de Juárez'],
  },
  {
    date: '05-01',
    name: 'Día del Trabajo',
    type: 'civic',
    leadTimeDays: 7,
    relatedCategories: ['riego', 'acolchado'],
    suggestedHooks: ['Día del Trabajo', 'Reconocimiento al esfuerzo del campo'],
  },
  {
    date: '05-05',
    name: 'Batalla de Puebla',
    type: 'civic',
    leadTimeDays: 5,
    relatedCategories: [],
    suggestedHooks: ['5 de Mayo'],
  },
  {
    date: '09-16',
    name: 'Independencia de México',
    type: 'civic',
    leadTimeDays: 10,
    urgencyDays: 3,
    relatedCategories: [],
    suggestedHooks: ['¡Viva México!', 'Fiestas Patrias'],
  },
  {
    date: '11-20',
    name: 'Día de la Revolución',
    type: 'civic',
    leadTimeDays: 7,
    isMovable: true,
    movableRule: 'Tercer lunes de noviembre',
    relatedCategories: ['antiheladas'],
    suggestedHooks: ['Día de la Revolución'],
  },
  {
    date: '12-25',
    name: 'Navidad',
    type: 'civic',
    leadTimeDays: 14,
    urgencyDays: 5,
    relatedCategories: [],
    suggestedHooks: ['Feliz Navidad', 'Temporada de agradecimiento'],
  },
];

// -----------------------------------------------------------------------------
// Cultural & High-Attention Dates
// -----------------------------------------------------------------------------

const CULTURAL_DATES: ImportantDate[] = [
  {
    date: '01-06',
    name: 'Día de Reyes',
    type: 'cultural',
    leadTimeDays: 5,
    relatedCategories: [],
    suggestedHooks: ['Día de Reyes'],
  },
  {
    date: '02-14',
    name: 'San Valentín',
    type: 'cultural',
    leadTimeDays: 10,
    relatedCategories: [],
    suggestedHooks: ['San Valentín', 'Amor por el campo'],
  },
  {
    date: '02-24',
    name: 'Día de la Bandera',
    type: 'cultural',
    leadTimeDays: 5,
    relatedCategories: [],
    suggestedHooks: ['Día de la Bandera'],
  },
  {
    date: '03-08',
    name: 'Día Internacional de la Mujer',
    type: 'cultural',
    leadTimeDays: 7,
    relatedCategories: [],
    suggestedHooks: ['8M', 'Mujeres en el campo'],
  },
  {
    date: '04-30',
    name: 'Día del Niño',
    type: 'cultural',
    leadTimeDays: 7,
    relatedCategories: [],
    suggestedHooks: ['Día del Niño'],
  },
  {
    date: '05-10',
    name: 'Día de la Madre',
    type: 'cultural',
    leadTimeDays: 14,
    urgencyDays: 5,
    relatedCategories: ['riego', 'mallasombra'],
    suggestedHooks: ['Día de las Madres', 'Gracias mamá'],
  },
  {
    date: '06-15',
    name: 'Día del Padre',
    type: 'cultural',
    leadTimeDays: 10,
    isMovable: true,
    movableRule: 'Tercer domingo de junio',
    relatedCategories: ['bombeo-solar', 'riego'],
    suggestedHooks: ['Día del Padre', 'Para los papás del campo'],
  },
  {
    date: '12-01',
    name: 'Aniversario Esfuerzos Unidos',
    type: 'cultural',
    leadTimeDays: 7,
    relatedCategories: [],
    suggestedHooks: ['Aniversario', 'Celebramos juntos'],
  },
  {
    date: '12-31',
    name: 'Fin de Año',
    type: 'cultural',
    leadTimeDays: 5,
    relatedCategories: [],
    suggestedHooks: ['Fin de año', 'Gracias por un año más'],
  },
];

// -----------------------------------------------------------------------------
// Marketing & Retail Dates
// -----------------------------------------------------------------------------

const RETAIL_DATES: ImportantDate[] = [
  {
    date: '05-28', // Approximate - last week of May / first of June
    name: 'Hot Sale',
    type: 'retail',
    leadTimeDays: 14,
    urgencyDays: 5,
    isMovable: true,
    movableRule: 'Última semana de mayo / primera de junio (fecha anual)',
    relatedCategories: ['riego', 'acolchado', 'valvuleria', 'mallasombra'],
    suggestedHooks: ['Hot Sale', 'Descuentos especiales', 'Solo esta semana'],
  },
  {
    date: '07-20', // Back to school starts ~July 20
    name: 'Regreso a Clases (inicio)',
    type: 'retail',
    leadTimeDays: 10,
    isMovable: true,
    movableRule: 'Últimas 2 semanas de julio',
    relatedCategories: [],
    suggestedHooks: ['Regreso a clases', 'Prepárate'],
  },
  {
    date: '10-31',
    name: 'Halloween',
    type: 'retail',
    leadTimeDays: 7,
    relatedCategories: [],
    suggestedHooks: ['Halloween', 'Previo a Día de Muertos'],
  },
  {
    date: '11-01',
    name: 'Día de Muertos',
    type: 'retail',
    leadTimeDays: 10,
    urgencyDays: 3,
    relatedCategories: ['antiheladas'],
    suggestedHooks: ['Día de Muertos', 'Tradición mexicana'],
  },
  {
    date: '11-15', // Approximate - weekend before Nov 20
    name: 'El Buen Fin',
    type: 'retail',
    leadTimeDays: 14,
    urgencyDays: 5,
    isMovable: true,
    movableRule: 'Fin de semana previo al 20 de noviembre (jue-dom)',
    relatedCategories: ['antiheladas', 'plasticos', 'kits', 'bombeo-solar'],
    suggestedHooks: ['Buen Fin', 'Las mejores ofertas del año', 'Aprovecha ahora'],
  },
  {
    date: '11-29', // Approximate - last Friday of November
    name: 'Black Friday',
    type: 'retail',
    leadTimeDays: 14,
    urgencyDays: 3,
    isMovable: true,
    movableRule: 'Último viernes de noviembre',
    relatedCategories: ['antiheladas', 'plasticos', 'kits', 'bombeo-solar'],
    suggestedHooks: ['Black Friday', 'Descuentos únicos', 'Solo hoy'],
  },
  {
    date: '12-02', // Monday after Black Friday
    name: 'Cyber Monday',
    type: 'retail',
    leadTimeDays: 3,
    isMovable: true,
    movableRule: 'Lunes posterior a Black Friday',
    relatedCategories: ['antiheladas', 'plasticos'],
    suggestedHooks: ['Cyber Monday', 'Últimas ofertas'],
  },
  {
    date: '12-16',
    name: 'Posadas (inicio)',
    type: 'retail',
    leadTimeDays: 7,
    relatedCategories: [],
    suggestedHooks: ['Posadas', 'Temporada de convivio'],
  },
];

// -----------------------------------------------------------------------------
// Agro-Environmental Dates
// -----------------------------------------------------------------------------

const AGRO_DATES: ImportantDate[] = [
  {
    date: '02-22',
    name: 'Día del Agrónomo',
    type: 'agro',
    leadTimeDays: 7,
    relatedCategories: ['riego', 'mallasombra', 'vivero'],
    suggestedHooks: ['Día del Agrónomo', 'Gracias a los agrónomos de México'],
  },
  {
    date: '05-15',
    name: 'Día del Trabajador Agrícola',
    type: 'agro',
    leadTimeDays: 7,
    relatedCategories: ['riego', 'acolchado', 'mallasombra'],
    suggestedHooks: ['Día del Trabajador Agrícola', 'El campo es trabajo'],
  },
  {
    date: '06-05',
    name: 'Día Mundial del Medio Ambiente',
    type: 'agro',
    leadTimeDays: 10,
    relatedCategories: ['bombeo-solar', 'riego', 'acolchado'],
    suggestedHooks: ['Día del Medio Ambiente', 'Agricultura sustentable', 'Cuida el agua'],
  },
  {
    date: '07-02',
    name: 'Día Nacional de la Agricultura',
    type: 'agro',
    leadTimeDays: 7,
    relatedCategories: ['riego', 'mallasombra', 'bombeo-solar'],
    suggestedHooks: ['Día de la Agricultura', 'Orgullo del campo mexicano'],
  },
];

// -----------------------------------------------------------------------------
// Seasonal/Weather Events (Durango specific)
// -----------------------------------------------------------------------------

const SEASONAL_DATES: ImportantDate[] = [
  {
    date: '01-15', // Mid-January frost alerts
    name: 'Temporada Heladas (pico)',
    type: 'seasonal',
    leadTimeDays: 10,
    urgencyDays: 2,
    relatedCategories: ['antiheladas', 'plasticos'],
    suggestedHooks: ['⚠️ Alerta de heladas', 'Protege tus cultivos', 'Entrega urgente'],
  },
  {
    date: '02-15',
    name: 'Fin Temporada Heladas',
    type: 'seasonal',
    leadTimeDays: 7,
    relatedCategories: ['antiheladas', 'charolas'],
    suggestedHooks: ['Últimas heladas', 'Prepárate para siembra'],
  },
  {
    date: '03-15',
    name: 'Inicio Temporada Siembra',
    type: 'seasonal',
    leadTimeDays: 14,
    relatedCategories: ['charolas', 'vivero', 'mallasombra'],
    suggestedHooks: ['Temporada de siembra', 'Arranca tu ciclo'],
  },
  {
    date: '04-20',
    name: 'Pre-Calor',
    type: 'seasonal',
    leadTimeDays: 14,
    relatedCategories: ['mallasombra', 'riego', 'acolchado'],
    suggestedHooks: ['Se viene el calor', 'Prepara tu sombra'],
  },
  {
    date: '05-15',
    name: 'Pico de Calor',
    type: 'seasonal',
    leadTimeDays: 10,
    urgencyDays: 3,
    relatedCategories: ['riego', 'acolchado', 'mallasombra'],
    suggestedHooks: ['Ahorra agua', 'Protección contra calor', 'Riego eficiente'],
  },
  {
    date: '06-15',
    name: 'Inicio Lluvias',
    type: 'seasonal',
    leadTimeDays: 10,
    relatedCategories: ['plasticos', 'estructuras'],
    suggestedHooks: ['Temporada de lluvias', 'Protege tu invernadero'],
  },
  {
    date: '10-15',
    name: 'Pre-Frío',
    type: 'seasonal',
    leadTimeDays: 14,
    relatedCategories: ['antiheladas', 'plasticos'],
    suggestedHooks: ['Se acerca el frío', 'Anticípate a las heladas'],
  },
  {
    date: '11-01',
    name: 'Inicio Temporada Heladas',
    type: 'seasonal',
    leadTimeDays: 14,
    urgencyDays: 7,
    relatedCategories: ['antiheladas', 'plasticos'],
    suggestedHooks: ['Temporada de heladas', 'Protección urgente'],
  },
];

// -----------------------------------------------------------------------------
// All Important Dates Combined
// -----------------------------------------------------------------------------

export const IMPORTANT_DATES: ImportantDate[] = [
  ...CIVIC_DATES,
  ...CULTURAL_DATES,
  ...RETAIL_DATES,
  ...AGRO_DATES,
  ...SEASONAL_DATES,
];

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Parse a date string (MM-DD or YYYY-MM-DD) to month and day
 */
function parseDateParts(dateStr: string): { month: number; day: number; year?: number } {
  const parts = dateStr.split('-');
  if (parts.length === 2) {
    return { month: parseInt(parts[0], 10), day: parseInt(parts[1], 10) };
  } else if (parts.length === 3) {
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
    };
  }
  throw new Error(`Invalid date format: ${dateStr}`);
}

/**
 * Get the day of year for a date (1-366)
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.round((date2.getTime() - date1.getTime()) / oneDay);
}

/**
 * Convert ImportantDate to actual Date for a given year
 */
export function getActualDate(importantDate: ImportantDate, year: number): Date {
  const parts = parseDateParts(importantDate.date);
  return new Date(parts.year ?? year, parts.month - 1, parts.day);
}

/**
 * Get important dates within a window of days from target date
 */
export function getImportantDatesInWindow(
  targetDate: Date,
  windowDays: number
): Array<ImportantDate & { actualDate: Date; daysUntil: number }> {
  const year = targetDate.getFullYear();
  const results: Array<ImportantDate & { actualDate: Date; daysUntil: number }> = [];

  for (const importantDate of IMPORTANT_DATES) {
    // Check current year and next year for dates
    for (const checkYear of [year, year + 1]) {
      const actualDate = getActualDate(importantDate, checkYear);
      const daysUntil = daysBetween(targetDate, actualDate);

      // Only include dates within the window and in the future (or today)
      if (daysUntil >= 0 && daysUntil <= windowDays) {
        results.push({
          ...importantDate,
          actualDate,
          daysUntil,
        });
      }
    }
  }

  // Sort by days until
  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Get important dates for a specific month
 */
export function getImportantDatesForMonth(month: number): ImportantDate[] {
  return IMPORTANT_DATES.filter(d => {
    const parts = parseDateParts(d.date);
    return parts.month === month;
  });
}

/**
 * Get important dates by type
 */
export function getImportantDatesByType(type: ImportantDateType): ImportantDate[] {
  return IMPORTANT_DATES.filter(d => d.type === type);
}

/**
 * Check if a date is within the lead time window of an important date
 */
export function isWithinLeadTime(targetDate: Date, importantDate: ImportantDate): boolean {
  const actualDate = getActualDate(importantDate, targetDate.getFullYear());
  const daysUntil = daysBetween(targetDate, actualDate);
  return daysUntil >= 0 && daysUntil <= importantDate.leadTimeDays;
}

/**
 * Check if a date is within the urgency window of an important date
 */
export function isWithinUrgency(targetDate: Date, importantDate: ImportantDate): boolean {
  if (!importantDate.urgencyDays) return false;
  const actualDate = getActualDate(importantDate, targetDate.getFullYear());
  const daysUntil = daysBetween(targetDate, actualDate);
  return daysUntil >= 0 && daysUntil <= importantDate.urgencyDays;
}

/**
 * Get categories boosted by important dates in window
 */
export function getBoostedCategories(
  targetDate: Date,
  windowDays: number = 14
): ProductCategory[] {
  const nearbyDates = getImportantDatesInWindow(targetDate, windowDays);
  const categories = new Set<ProductCategory>();

  for (const date of nearbyDates) {
    for (const category of date.relatedCategories) {
      categories.add(category);
    }
  }

  return Array.from(categories);
}
