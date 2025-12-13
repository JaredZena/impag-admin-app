import {
  Suggestion, 
  DaySuggestions, 
  SuggestionStatus, 
  Channel, 
  PostType, 
  ProductCategory, 
  ProductRef, 
  GeneratorConfig, 
  DEFAULT_GENERATOR_CONFIG, 
  HookType, 
  MonthPattern
} from '../types/socialCalendar';

import { getMonthPattern } from '../data/social/salesPatterns';
import { getImportantDatesInWindow } from '../data/social/importantDates';
import { saveDaySuggestions } from './socialCalendarStorage';
import { generateId, parseDate, randomInt } from './socialCalendarHelpers';
import { apiRequest } from '../utils/api';

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
      // Extract channel (primary channel, first one)
      const primaryChannel = suggestion.channels[0] || 'fb-post';
      
      // Extract carousel slides from imagePrompt if it contains "━━━━ SLIDE"
      let carouselSlides: string[] | null = null;
      if (suggestion.imagePrompt && suggestion.imagePrompt.includes('━━━━ SLIDE')) {
        const slides = suggestion.imagePrompt.split('━━━━ SLIDE').slice(1);
        carouselSlides = slides.map(slide => slide.split('━━━━')[0].trim());
      }
      
      // Extract needs_music from instructions
      const needsMusic = suggestion.instructions?.includes('🎵') || false;
      
      const response = await apiRequest('/social/save', {
        method: 'POST',
        body: JSON.stringify({
          date_for: daySuggestions.date,
          caption: suggestion.caption,
          image_prompt: carouselSlides ? null : suggestion.imagePrompt, // Only send if not carousel
          post_type: suggestion.postType,
          status: suggestion.status,
          selected_product_id: suggestion.products[0]?.id || null,
          channel: primaryChannel, // Send as string, not array
          carousel_slides: carouselSlides, // Send array if carousel
          needs_music: needsMusic, // Send boolean
          user_feedback: suggestion.userFeedback || null, // Send as top-level field
          formatted_content: {
            id: suggestion.id, // This should be "db-{id}" if loaded from DB, or original ID if new
            postType: suggestion.postType,
            channels: suggestion.channels,
            hook: suggestion.hook,
            hookType: suggestion.hookType,
            products: suggestion.products,
            tags: suggestion.tags,
            instructions: suggestion.instructions,
            postingTime: suggestion.postingTime,
            generationSource: suggestion.generationSource,
            userFeedback: suggestion.userFeedback || null, // Keep for backwards compatibility
            // Extract strategy notes from instructions if present
            strategyNotes: suggestion.instructions?.includes('🧠 Estrategia IA:') 
              ? suggestion.instructions.split('🧠 Estrategia IA:')[1]?.split('\n\n')[0]?.trim() || null
              : null
          }
        })
      });
      
      // If this was a new post (not updated), update the suggestion ID to include DB ID
      // This ensures future updates can find the post
      if (response && response.id) {
        const dbId = `db-${response.id}`;
        // Update the suggestion ID to be db-{postId} format for future reference
        if (suggestion.id !== dbId) {
          suggestion.id = dbId; // Update the suggestion ID directly
          // Also update formatted_content.id for consistency
          if (suggestion.formatted_content) {
            suggestion.formatted_content.id = dbId;
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to save suggestions to database:', error);
    // Don't throw - allow localStorage to work as fallback
  }
}

/**
 * Update user feedback for a specific post
 */
export async function updatePostFeedback(
  postId: number,
  feedback: 'like' | 'dislike' | null
): Promise<void> {
  try {
    await apiRequest(`/social/posts/${postId}/feedback`, {
      method: 'PUT',
      body: JSON.stringify({ feedback })
    });
  } catch (error) {
    console.error(`Failed to update feedback for post ${postId}:`, error);
    throw error;
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
          // Use post.channel directly if available, otherwise fallback to formatted_content.channels
          const channels = post.channel 
            ? [post.channel as Channel] 
            : (formattedContent.channels || ['fb-post']);
          
          // Reconstruct imagePrompt from carousel_slides if present
          let imagePrompt = post.image_prompt || '';
          if (post.carousel_slides && Array.isArray(post.carousel_slides) && post.carousel_slides.length > 0) {
            imagePrompt = post.carousel_slides.map((slide: string, i: number) => 
              `━━━━ SLIDE ${i + 1} ━━━━\n${slide}`
            ).join('\n\n');
          }
          
          // Add music note to instructions if needs_music is true
          let instructions = formattedContent.instructions || '';
          if (post.needs_music && !instructions.includes('🎵')) {
            instructions = `🎵 Este contenido necesita música de fondo (corridos mexicanos, regional popular)\n${instructions}`;
          }
          
          // Use products from formatted_content if available, otherwise create placeholder
          let products = formattedContent.products || [];
          if (post.selected_product_id && products.length === 0) {
            // If we have a product ID but no product name, create a placeholder
            // The name will be fetched later if needed, but for now we'll show the ID
            products = [{
              id: post.selected_product_id,
              name: `Producto ${post.selected_product_id}`, // Placeholder, could be enhanced with API call
              category: 'vivero' as ProductCategory
            }];
          }
          
          // Get user_feedback from top-level field (preferred) or fallback to formatted_content
          const userFeedback = post.user_feedback || formattedContent.userFeedback || null;
          
          return {
            id: formattedContent.id || `db-${post.id}`,
            postType: formattedContent.postType || post.post_type || 'promo',
            channels: channels,
            hook: formattedContent.hook || '',
            hookType: formattedContent.hookType || 'seasonality',
            products: products,
            caption: post.caption,
            imagePrompt: imagePrompt,
            tags: formattedContent.tags || [],
            status: (post.status as SuggestionStatus) || 'planned',
            instructions: instructions,
            postingTime: formattedContent.postingTime || post.posting_time,
            generationSource: formattedContent.generationSource || 'template',
            userFeedback: userFeedback
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
        // Use post.channel directly if available, otherwise fallback to formatted_content.channels
        const channels = post.channel 
          ? [post.channel as Channel] 
          : (fc.channels || ['fb-post']);
        
        // Reconstruct imagePrompt from carousel_slides if present
        let imagePrompt = post.image_prompt || '';
        if (post.carousel_slides && Array.isArray(post.carousel_slides) && post.carousel_slides.length > 0) {
          imagePrompt = post.carousel_slides.map((slide: string, i: number) => 
            `━━━━ SLIDE ${i + 1} ━━━━\n${slide}`
          ).join('\n\n');
        }
        
        // Add music note to instructions if needs_music is true
        let instructions = fc.instructions || '';
        if (post.needs_music && !instructions.includes('🎵')) {
          instructions = `🎵 Este contenido necesita música de fondo (corridos mexicanos, regional popular)\n${instructions}`;
        }
        
        // Use products from formatted_content if available, otherwise create placeholder
        let products = fc.products || [];
        if (post.selected_product_id && products.length === 0) {
          // If we have a product ID but no product name, create a placeholder
          products = [{
            id: post.selected_product_id,
            name: `Producto ${post.selected_product_id}`, // Placeholder, could be enhanced with API call
            category: 'vivero' as ProductCategory
          }];
        }
        
          // Get user_feedback from top-level field (preferred) or fallback to formatted_content
          const userFeedback = post.user_feedback || fc.userFeedback || null;
          
          return {
            id: fc.id || `db-${post.id}`,
            postType: fc.postType || post.post_type || 'promo',
            channels: channels,
            hook: fc.hook || '',
            hookType: fc.hookType || 'seasonality',
            products: products,
            caption: post.caption,
            imagePrompt: imagePrompt,
            tags: fc.tags || [],
            status: (post.status as SuggestionStatus) || 'planned',
            instructions: instructions,
            postingTime: fc.postingTime || post.posting_time,
            generationSource: fc.generationSource || 'template',
            userFeedback: userFeedback
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

const pick = (list: string[] | undefined, fallback: string) => (list && list.length > 0 ? list[0] : fallback);

function normalizeCategory(categoryName: string): ProductCategory {
  // Simple normalization based on keywords
  const lower = categoryName.toLowerCase();
  if (lower.includes('malla')) return 'mallasombra';
  if (lower.includes('riego')) return 'riego';
  if (lower.includes('bombeo') || lower.includes('solar')) return 'bombeo-solar';
  if (lower.includes('anti')) return 'antiheladas';
  if (lower.includes('acolchado')) return 'acolchado';
  if (lower.includes('charola')) return 'charolas';
  if (lower.includes('valvula')) return 'valvuleria';
  if (lower.includes('cerca')) return 'cercas';
  if (lower.includes('plaga')) return 'control-plagas';
  if (lower.includes('estruct')) return 'estructuras';
  if (lower.includes('kit')) return 'kits';
  if (lower.includes('plastic')) return 'plasticos';
  
  return 'vivero'; // Default fallback
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

  public async generate(
    dateStr: string,
    categoryOverride?: ProductCategory,
    usedInBatchOverride?: {
      productIds: Set<string>;
      categories: Set<string>;
    },
    batchGeneratedHistoryOverride: string[] = [],
    suggestedTopic?: string
  ): Promise<DaySuggestions> {
    const targetDate = parseDate(dateStr);
    const month = targetDate.getMonth() + 1; // 1-12
    const monthPattern = getMonthPattern(month);
    
    // 0. Get Context
    const nearbyDates = getImportantDatesInWindow(targetDate, this.config.dateWindowDays);
    const dateBoostedCategories = nearbyDates.flatMap(d => d.relatedCategories);
    
    // Track products/categories used in this generation batch to avoid duplicates
    // (This is the only context we need to track locally because it's not in DB yet)
    const usedInBatch = usedInBatchOverride || {
      productIds: new Set<string>(),
      categories: new Set<string>()
    };
    
    // Track posts generated in this batch for context awareness
    const batchGeneratedHistory = batchGeneratedHistoryOverride;
    
    // 2. Autonomous Generation Loop
    const count = randomInt(this.config.minSuggestions, this.config.maxSuggestions);
    const suggestions: Suggestion[] = [];

    for (let i = 0; i < count; i++) {
       const suggestion = await this.createAutonomousSuggestion(
         targetDate,
         nearbyDates,
         monthPattern,
         usedInBatch,
         batchGeneratedHistory,
         suggestedTopic
       );
       if (suggestion) {
         suggestions.push(suggestion);
         // Track what we just used
         suggestion.products.forEach(p => {
           if (p.id) usedInBatch.productIds.add(p.id);
           if (p.category) usedInBatch.categories.add(p.category);
         });
         // Add to batch history for next iteration's context
         batchGeneratedHistory.push(`${suggestion.caption.substring(0, 50)}... [${suggestion.postType}]`);
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
    usedInBatch?: {
      productIds: Set<string>;
      categories: Set<string>;
    },
    batchGeneratedHistory: string[] = [],
    suggestedTopic?: string
  ): Promise<Suggestion | null> {
    const id = generateId();
    // Default fallback values
    let mainProduct: ProductRef | undefined = undefined; // No local pool to pick from
    let category: string = 'vivero'; // Default general category if no product
    
    const hookType: HookType = 'seasonality';
    const hookText = 'Tendencias agrícolas';
    let postType: PostType = 'promo'; // Default, will be updated from backend
    let channels: Channel[] = ['fb-post']; // Default, will be updated from backend
    
    let caption = 'Contenido generado automáticamente.';
    let imagePrompt = 'Imagen agrícola profesional.';
    let postingTime = '10:00 AM';
    let instructions = 'Revisar antes de publicar.';
    let generationSource: 'llm' | 'template' = 'template';
    
    // Channel-specific data from backend
    let carouselSlides: string[] | undefined;
    let needsMusic = false;

    try {
      // Send comprehensive context to backend for better deduplication
      const llmResponse: any = await apiRequest('/social/generate', {
        method: 'POST',
        body: JSON.stringify({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD
          category: undefined,
          // Removed redundant history/dedupContext (backend handles DB checks)
          used_in_batch: usedInBatch ? {
            product_ids: Array.from(usedInBatch.productIds),
            categories: Array.from(usedInBatch.categories)
          } : undefined,
          batch_generated_history: batchGeneratedHistory, // Pass accumulated batch history
          suggested_topic: suggestedTopic // Pass user-suggested topic if provided
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
           } catch { 
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
         
         // 2. Resolve Post Type from Backend (map Spanish names to PostType enum)
         if (llmResponse.post_type) {
            const backendPostType = llmResponse.post_type.toLowerCase();
            // Map Spanish post type names from backend to frontend PostType
            const postTypeMap: Record<string, PostType> = {
               'infografías': 'infographic',
               'infografia': 'infographic',
               'infographic': 'infographic',
               'fechas importantes': 'important-date',
               'fecha importante': 'important-date',
               'important-date': 'important-date',
               'memes/tips rápidos': 'meme-tip',
               'meme/tip rápido': 'meme-tip',
               'meme-tip': 'meme-tip',
               'promoción puntual': 'promo',
               'promocion': 'promo',
               'promo': 'promo',
               'kits': 'kit',
               'kit': 'kit',
               'caso de éxito': 'case-study',
               'caso de exito': 'case-study',
               'ugc': 'ugc-request',
               'case-study': 'case-study',
               'antes / después': 'before-after',
               'antes/despues': 'before-after',
               'before-after': 'before-after',
               'checklist operativo': 'checklist',
               'checklist': 'checklist',
               'tutorial corto': 'tutorial',
               'tutorial': 'tutorial',
               'lo que llegó hoy': 'new-arrivals',
               'novedades': 'new-arrivals',
               'new-arrivals': 'new-arrivals',
               'faq': 'faq',
               'mitos': 'faq',
               'seguridad': 'safety',
               'safety': 'safety',
               'roi': 'roi',
               'números rápidos': 'roi',
               'convocatoria a ugc': 'ugc-request',
               'ugc-request': 'ugc-request',
               'recordatorio de servicio': 'service-reminder',
               'service-reminder': 'service-reminder',
               'cómo pedir': 'how-to-order',
               'logística': 'how-to-order',
               'how-to-order': 'how-to-order'
            };
            
            // Try to find a match (exact or partial)
            let matchedType: PostType | undefined = postTypeMap[backendPostType];
            if (!matchedType) {
               // Try partial match
               for (const [key, value] of Object.entries(postTypeMap)) {
                  if (backendPostType.includes(key) || key.includes(backendPostType)) {
                     matchedType = value;
                     break;
                  }
               }
            }
            
            if (matchedType) {
               postType = matchedType;
            } else {
               console.warn(`Unknown post_type from backend: ${llmResponse.post_type}, using default 'promo'`);
            }
         }
         
         // 3. Resolve Product from Backend Response
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

         // 4. Resolve Channel from Backend
         if (llmResponse.channel) {
            const selectedChannel = llmResponse.channel as Channel;
            channels = [selectedChannel];
            
            // Add cross-posted channels (FB → IG)
            if (selectedChannel === 'fb-post') {
              channels.push('ig-post');
            } else if (selectedChannel === 'fb-reel') {
              channels.push('ig-reel');
            }
         }
         
         // 5. Capture channel-specific data (carousel slides work for TikTok AND FB/IG)
         if (llmResponse.carousel_slides && Array.isArray(llmResponse.carousel_slides)) {
            carouselSlides = llmResponse.carousel_slides;
         }
         if (llmResponse.needs_music !== undefined) {
            needsMusic = llmResponse.needs_music;
         }

         caption = cleanText(llmResponse.caption) || caption;
         
         const rawPrompt = llmResponse.image_prompt || llmResponse.imagePrompt;
         if (rawPrompt) imagePrompt = cleanText(rawPrompt);

         postingTime = llmResponse.posting_time || llmResponse.postingTime || postingTime;
         
         // Build instructions with channel-specific notes
         let channelNotes = '';
         if (needsMusic) {
            channelNotes += '🎵 Este contenido necesita música de fondo (corridos mexicanos, regional popular)\n';
         }
         if (carouselSlides && carouselSlides.length > 0) {
            const channelLabel = channels[0] === 'tiktok' ? 'TikTok' : 'FB/IG';
            channelNotes += `📱 ${channelLabel} Carrusel (${carouselSlides.length} slides):\n`;
            carouselSlides.forEach((slide, i) => {
               channelNotes += `  Slide ${i + 1}: ${slide.substring(0, 100)}...\n`;
            });
            
            // Also format carousel slides as the imagePrompt for easy copy
            imagePrompt = carouselSlides.map((slide, i) => 
               `━━━━ SLIDE ${i + 1} ━━━━\n${slide}`
            ).join('\n\n');
         }
         
         if (llmResponse.notes) {
           instructions = `🧠 Estrategia IA:\n${llmResponse.notes}\n\n${channelNotes}${instructions}`;
         } else if (channelNotes) {
           instructions = `${channelNotes}\n${instructions}`;
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
      generationSource,
      userFeedback: null
    };
  }

}

// Export singleton
export const socialCalendarGenerator = SocialCalendarGenerator.getInstance();
