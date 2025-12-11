// =============================================================================
// AI Image Prompts
// Reference: docs/calendar/social-calendar-prompts.md
// =============================================================================

import type { ImagePromptTemplate, PostType, ProductCategory } from '../../types/socialCalendar';

// -----------------------------------------------------------------------------
// Core Prompt Templates
// -----------------------------------------------------------------------------

export const IMAGE_PROMPTS: ImagePromptTemplate[] = [
  // ---------------------------------------------------------------------------
  // 1. Flyer Técnico (Classic)
  // ---------------------------------------------------------------------------
  {
    id: 'flyer-technical',
    name: 'Flyer Técnico IMPAG',
    description: 'Diseño limpio con especificaciones y producto aislado.',
    applicablePostTypes: ['promo', 'new-arrivals', 'kit', 'infographic'],
    applicableCategories: ['mallasombra', 'plasticos', 'riego', 'bombeo-solar', 'valvuleria'],
    variables: ['[PRODUCTO]', '[TITULO]', '[SUBTITULO]', '[ESPECIFICACIONES]'],
    promptTemplate: `Genera una imagen cuadrada 1080x1080 px, estilo flyer técnico IMPAG.
Fondo: Agrícola difuminado suave (verde/gris), muy limpio.
Elemento central: [PRODUCTO] en alta resolución, fotorealista, iluminación de estudio suave.
Esquina superior derecha: Espacio para logo (no poner texto).
Lateral o inferior: Bloque de texto simulado con viñetas técnicas.
Estética: Profesional, ingenieril, tonos blanco, gris y verde tecnológico.
Sin personas, solo el producto destacado.`
  },

  // ---------------------------------------------------------------------------
  // 2. Paisaje Agrícola Durango
  // ---------------------------------------------------------------------------
  {
    id: 'landscape-durango',
    name: 'Paisaje Agrícola Norte',
    description: 'Cultivos realistas en entorno de Durango/Norte.',
    applicablePostTypes: ['important-date', 'safety', 'service-reminder', 'seasonality' as PostType],
    applicableCategories: ['mallasombra', 'antiheladas', 'riego', 'acolchado'],
    variables: ['[CULTIVO]', '[CLIMA]'],
    promptTemplate: `Genera una imagen cuadrada 1080x1080 px de un paisaje agrícola realista en el norte de México (Durango).
Cultivo: [CULTIVO] (ej. maíz, avena, nogal) en hileras perfectas.
Clima: [CLIMA] (ej. amanecer soleado, nevado ligero, atardecer dorado).
En primer plano: Detalle de tecnología agrícola ([PRODUCTO] si aplica, o sistema de riego).
Estilo: Fotografía National Geographic, alta definición, colores vibrantes pero naturales.
Sin texto superpuesto.`
  },

  // ---------------------------------------------------------------------------
  // 3. Kit Assembly (Knolling)
  // ---------------------------------------------------------------------------
  {
    id: 'kit-knolling',
    name: 'Kit Desglosado (Knolling)',
    description: 'Componentes del kit ordenados en el suelo o mesa.',
    applicablePostTypes: ['kit', 'promo', 'tutorial'],
    applicableCategories: ['kits', 'bombeo-solar', 'riego', 'valvuleria'],
    variables: ['[KIT_NAME]', '[COMPONENTES]'],
    promptTemplate: `Genera una imagen cuadrada 1080x1080 px con técnica "knolling" (fotografía cenital de objetos ordenados).
Fondo: Superficie gris clara o blanca limpia.
Objetos: Componentes de un [KIT_NAME]: [COMPONENTES].
Organización: Geométrica, limpia, cables enrollados perfectamente, piezas alineadas.
Iluminación: Luz suave, sin sombras duras.
Estilo: Catálogo premium, minimalista.`
  },

  // ---------------------------------------------------------------------------
  // 4. Macro Detail
  // ---------------------------------------------------------------------------
  {
    id: 'macro-detail',
    name: 'Detalle Macro Producto',
    description: 'Close-up extremo de la textura o calidad.',
    applicablePostTypes: ['infographic', 'new-arrivals', 'quality-proof' as PostType],
    applicableCategories: ['mallasombra', 'cercas', 'acolchado', 'plasticos'],
    variables: ['[PRODUCTO]', '[TEXTURA]'],
    promptTemplate: `Genera una imagen cuadrada 1080x1080 px de fotografía macro (close-up extremo).
Sujeto: Textura de [PRODUCTO] ([TEXTURA]).
Detalle: Mostrar el tejido, grosor o material con máxima nitidez.
Iluminación: Lateral para resaltar relieve y calidad.
Profundidad de campo: Muy poca (fondo desenfocado).
Estilo: Artístico, industrial, calidad premium.`
  },

  // ---------------------------------------------------------------------------
  // 5. Action Shot (Installation)
  // ---------------------------------------------------------------------------
  {
    id: 'action-install',
    name: 'Instalación en Campo',
    description: 'Manos o trabajadores instalando el producto (teatral).',
    applicablePostTypes: ['tutorial', 'case-study', 'service-reminder'],
    applicableCategories: ['riego', 'estructuras', 'bombeo-solar', 'plasticos'],
    variables: ['[ACCION]', '[HERRAMIENTA]'],
    promptTemplate: `Genera una imagen cuadrada 1080x1080 px de acción en campo agrícola.
Sujeto: Manos de un agricultor con ropa de trabajo (camisa manga larga) realizando [ACCION].
Enfoque: En la acción y el producto, fondo de campo desenfocado.
Iluminación: Luz natural de mañana "golden hour".
Estilo: Cinematográfico, documental, honesto, trabajador.`
  },

  // ---------------------------------------------------------------------------
  // 6. Minimalist Icon/3D
  // ---------------------------------------------------------------------------
  {
    id: 'minimal-3d',
    name: 'Iconografía 3D Minimalista',
    description: 'Representación abstracta o 3D clean para tips/memes.',
    applicablePostTypes: ['meme-tip', 'faq', 'safety', 'roi'],
    applicableCategories: ['valvuleria', 'control-plagas', 'charolas'],
    variables: ['[OBJETO]', '[COLOR]'],
    promptTemplate: `Genera una imagen cuadrada 1080x1080 px de arte 3D minimalista.
Objeto central: Un [OBJETO] estilizado flotando en el centro.
Fondo: Color sólido mate ([COLOR]) con iluminación de estudio suave.
Estilo: Render 3D tipo "Clay" o plástico suave, colores pastel o corporativos IMPAG (verde/blanco).
Sin texto.`
  }
];

/**
 * Get prompt template by ID
 */
export function getPromptTemplate(id: string): ImagePromptTemplate | undefined {
  return IMAGE_PROMPTS.find(p => p.id === id);
}

/**
 * Get prompts suitable for a specific category and post type
 */
export function getPromptsForContext(
  category: ProductCategory,
  postType: PostType
): ImagePromptTemplate[] {
  return IMAGE_PROMPTS.filter(p => 
    (p.applicableCategories.includes(category) || p.applicableCategories.length === 0) &&
    (p.applicablePostTypes.includes(postType) || p.applicablePostTypes.length === 0)
  );
}

/**
 * Hydrate a prompt template with actual values
 */
export function hydratePrompt(
  template: ImagePromptTemplate,
  variables: Record<string, string>
): string {
  let prompt = template.promptTemplate;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(key, value);
  }
  return prompt;
}
