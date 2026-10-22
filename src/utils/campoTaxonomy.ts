// Slugs shared with impag-quot services/campo_taxonomy.py and the storefront
// (src/lib/apoyos.ts, src/lib/agro.ts). Change them in all three repos together.

export type Option = { value: string; label: string };

const toOptions = (labels: Record<string, string>): Option[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const STATE_LABELS: Record<string, string> = {
  nacional: 'Nacional',
  aguascalientes: 'Aguascalientes',
  'baja-california': 'Baja California',
  'baja-california-sur': 'Baja California Sur',
  campeche: 'Campeche',
  chiapas: 'Chiapas',
  chihuahua: 'Chihuahua',
  'ciudad-de-mexico': 'Ciudad de México',
  coahuila: 'Coahuila',
  colima: 'Colima',
  durango: 'Durango',
  'estado-de-mexico': 'Estado de México',
  guanajuato: 'Guanajuato',
  guerrero: 'Guerrero',
  hidalgo: 'Hidalgo',
  jalisco: 'Jalisco',
  michoacan: 'Michoacán',
  morelos: 'Morelos',
  nayarit: 'Nayarit',
  'nuevo-leon': 'Nuevo León',
  oaxaca: 'Oaxaca',
  puebla: 'Puebla',
  queretaro: 'Querétaro',
  'quintana-roo': 'Quintana Roo',
  'san-luis-potosi': 'San Luis Potosí',
  sinaloa: 'Sinaloa',
  sonora: 'Sonora',
  tabasco: 'Tabasco',
  tamaulipas: 'Tamaulipas',
  tlaxcala: 'Tlaxcala',
  veracruz: 'Veracruz',
  yucatan: 'Yucatán',
  zacatecas: 'Zacatecas',
};

export const SECTOR_LABELS: Record<string, string> = {
  agricultura: 'Agricultura',
  ganaderia: 'Ganadería',
  forestal: 'Forestal',
  'pesca-acuacultura': 'Pesca y acuacultura',
  apicultura: 'Apicultura',
  agroindustria: 'Agroindustria',
  'desarrollo-rural': 'Desarrollo rural',
};

export const SUPPORT_TYPE_LABELS: Record<string, string> = {
  subsidio: 'Subsidio',
  credito: 'Crédito',
  garantia: 'Garantía',
  seguro: 'Seguro',
  capacitacion: 'Capacitación',
  'asistencia-tecnica': 'Asistencia técnica',
  insumos: 'Insumos',
  'transferencia-directa': 'Transferencia directa',
  infraestructura: 'Infraestructura',
};

export const LEVEL_LABELS: Record<string, string> = {
  federal: 'Federal',
  estatal: 'Estatal',
  municipal: 'Municipal',
  financiera: 'Banca de desarrollo / financiera',
  otro: 'Otro',
};

export const STORE_CATEGORY_LABELS: Record<string, string> = {
  'drones-agricolas': 'Drones Agrícolas',
  'climatizacion-agricola': 'Climatización Agrícola',
  geotanques: 'Geotanques y Geoestanques',
  'bombeo-solar-agricola': 'Bombeo Solar Agrícola',
  'nutricion-proteccion': 'Nutrición y Protección Para Cultivos',
  'sistemas-de-riego': 'Sistemas de Riego',
  'energia-solar': 'Energía Solar para Agricultura',
  'invernaderos-cubiertas': 'Invernaderos y Cubiertas Agrícolas',
  'accesorios-equipos': 'Accesorios y Equipos Agrícolas',
  'germinacion-cultivos': 'Germinación de Cultivos',
  'ganaderia-y-procesamiento': 'Ganadería y Procesamiento',
  'ferreteria-y-refacciones': 'Ferretería y Refacciones',
};

export const STATE_OPTIONS = toOptions(STATE_LABELS);
export const SECTOR_OPTIONS = toOptions(SECTOR_LABELS);
export const SUPPORT_TYPE_OPTIONS = toOptions(SUPPORT_TYPE_LABELS);
export const LEVEL_OPTIONS = toOptions(LEVEL_LABELS);
export const STORE_CATEGORY_OPTIONS = toOptions(STORE_CATEGORY_LABELS);

/** Storefront base URL for "ver en la tienda" links. */
export const STOREFRONT_URL = 'https://www.todoparaelcampo.com.mx';

export const formatUsd = (value: number | null | undefined, digits = 2): string =>
  value == null || Number.isNaN(value)
    ? '—'
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) }).format(value);
