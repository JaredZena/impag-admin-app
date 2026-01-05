import {
  Suggestion,
  PostType,
  ProductRef,
  ProductCategory,
  Channel,
  AgriculturalPhase,
  ImportantDate,
} from '../types/socialCalendar';
import { getPostTemplate } from '../data/social/postTemplates';
import { generateId } from './socialCalendarHelpers';

export interface GenerationContext {
  monthPhase: AgriculturalPhase;
  nearbyDates: ImportantDate[];
  selectedCategories: ProductCategory[];
  product?: ProductRef;
}

export class FallbackGenerator {
  generateFromTemplate(
    postType: PostType,
    product: ProductRef | undefined,
    context: GenerationContext
  ): Suggestion {
    const template = getPostTemplate(postType);
    const id = generateId();
    
    // Select appropriate channel based on template
    const channels: Channel[] = template.applicableChannels.slice(0, 2) as Channel[];
    
    // Generate caption from template
    const caption = this.fillTemplate(template.captionTemplate || '', {
      product: product?.name || 'nuestros productos',
      producto: product?.name || 'productos IMPAG',
      PRODUCTO: product?.name?.toUpperCase() || 'PRODUCTOS IMPAG',
      categoria: this.getCategoryLabel(context.selectedCategories[0] || 'vivero'),
      CATEGORIA: this.getCategoryLabel(context.selectedCategories[0] || 'vivero').toUpperCase(),
      fecha: context.nearbyDates[0]?.name || 'esta temporada',
      FECHA: context.nearbyDates[0]?.name?.toUpperCase() || 'ESTA TEMPORADA',
    });
    
    // Generate image prompt based on post type
    const imagePrompt = this.generateImagePrompt(postType, product, context);
    
    // Generate hook based on context
    const hook = this.generateHook(context);
    
    return {
      id,
      postType,
      channels,
      status: 'planned',
      products: product ? [product] : [],
      hook,
      hookType: context.nearbyDates.length > 0 ? 'important-date' : 'seasonality',
      tags: [],
      caption,
      imagePrompt,
      instructions: `Plantilla: ${template.purpose}\n\n${template.ctaExamples[0] || 'Contacta para más información'}`,
      postingTime: '10:00 AM',
      generationSource: 'template',
      userFeedback: null,
    };
  }
  
  private fillTemplate(template: string, variables: Record<string, string>): string {
    let filled = template;
    for (const [key, value] of Object.entries(variables)) {
      filled = filled.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
    }
    return filled;
  }
  
  private generateImagePrompt(
    postType: PostType,
    product: ProductRef | undefined,
    context: GenerationContext
  ): string {
    const productName = product?.name || 'producto agrícola';
    const category = this.getCategoryLabel(context.selectedCategories[0] || 'vivero');
    
    switch (postType) {
      case 'infographic':
        return `Infografía técnica cuadrada 1080×1080 px sobre ${productName}. Estilo IMPAG: fondo blanco-gris, acentos verde-azul, tipografía clara. Incluir especificaciones técnicas y beneficios clave.`;
      
      case 'promo':
        return `Flyer promocional 1080×1080 px para ${productName}. Diseño moderno IMPAG con precio destacado, beneficios visibles y CTA claro. Colores corporativos verde-azul.`;
      
      case 'case-study':
        return `Fotografía real de instalación de ${productName} en campo. Mostrar resultado final, calidad profesional, composición limpia con logo IMPAG discreto.`;
      
      case 'before-after':
        return `Comparativa antes/después: dos imágenes lado a lado mostrando el impacto de ${productName}. Estilo profesional, alta calidad, resultados visibles.`;
      
      case 'checklist':
        return `Checklist visual 1080×1080 px para ${category}. Lista numerada clara, diseño limpio IMPAG, fácil de leer y compartir.`;
      
      case 'tutorial':
        return `Video tutorial vertical 9:16 mostrando instalación de ${productName}. Pasos claros, buena iluminación, audio claro.`;
      
      case 'new-arrivals':
        return `Foto de producto ${productName} recién llegado. Fondo neutro, producto centrado, alta calidad, estilo catálogo profesional.`;
      
      default:
        return `Imagen profesional 1080×1080 px de ${productName}. Estilo IMPAG: limpio, moderno, técnico.`;
    }
  }
  
  private generateHook(context: GenerationContext): string {
    if (context.nearbyDates.length > 0) {
      const date = context.nearbyDates[0];
      return `Aprovecha ${date.name}`;
    }
    
    const phaseLabels: Record<AgriculturalPhase, string> = {
      'germinacion': 'Temporada de germinación',
      'trasplante': 'Temporada de trasplante',
      'crecimiento': 'Temporada de crecimiento',
      'proteccion-frio': 'Protección contra frío',
      'mantenimiento': 'Mantenimiento de cultivos',
    };
    
    return phaseLabels[context.monthPhase] || 'Temporada agrícola';
  }
  
  private getCategoryLabel(category: ProductCategory): string {
    const labels: Record<ProductCategory, string> = {
      'mallasombra': 'mallasombra',
      'plasticos': 'plásticos agrícolas',
      'antiheladas': 'protección antiheladas',
      'riego': 'sistemas de riego',
      'acolchado': 'acolchado',
      'bombeo-solar': 'bombeo solar',
      'vivero': 'material de vivero',
      'charolas': 'charolas y almácigos',
      'valvuleria': 'válvulas y filtros',
      'cercas': 'cercas y postes',
      'control-plagas': 'control de plagas',
      'estructuras': 'estructuras',
      'kits': 'kits completos',
    };
    return labels[category] || category;
  }
}




