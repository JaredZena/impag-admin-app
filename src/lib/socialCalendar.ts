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
  MonthPattern,
  ImportantDate,
  AgriculturalPhase
} from '../types/socialCalendar';

import dayjs from 'dayjs';
// All business logic moved to backend - frontend is now just UI orchestration
import { apiRequest } from '../utils/api';
import { parseDate } from './socialCalendarHelpers';
import { HttpProductService } from './socialCalendarProducts';
import { validateDaySuggestions } from './socialCalendarValidation';

// -----------------------------------------------------------------------------
// Database Sync Functions (Shared across users)
// -----------------------------------------------------------------------------

/**
 * Save day suggestions to database (shared across all users)
 * NOTE: Posts are now automatically saved by /generate endpoint, so this function
 * is only used to update existing posts (status, user_feedback, etc.)
 */
export async function saveDaySuggestionsToDatabase(daySuggestions: DaySuggestions): Promise<void> {
  try {
    // Validate before saving
    const validation = validateDaySuggestions(daySuggestions);
    if (!validation.isValid) {
      console.error('Validation failed before saving:', validation.errors);
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('Validation warnings:', validation.warnings);
    }
    
    // Posts are automatically saved by /generate, so we only need to update if there are changes
    // For now, we'll skip the save call since /generate already saved everything
    // If we need to update status/user_feedback later, we can add a separate update endpoint
    console.log('Posts are automatically saved by /generate endpoint. No additional save needed.');
    
    // TODO: If we need to update status or user_feedback, use a separate /update endpoint
    // For now, all posts are saved with status="planned" by /generate
  } catch (error) {
    console.error('Failed to process suggestions:', error);
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
        // Fetch products in parallel for all posts that need them
        const productService = new HttpProductService();
        const productPromises = posts.map(async (post: any) => {
          const formattedContent = post.formatted_content || {};
          let products = formattedContent.products || [];
          
          // Fetch real product if we have ID but no product data
          if (post.selected_product_id && products.length === 0) {
            const realProduct = await productService.fetchProductById(post.selected_product_id);
            if (realProduct) {
              products = [realProduct];
            }
          }
          
          return { post, products };
        });
        
        const postsWithProducts = await Promise.all(productPromises);
        
        const suggestions: Suggestion[] = postsWithProducts.map(({ post, products }) => {
          const formattedContent = post.formatted_content || {};
          // Use post.channel directly if available, otherwise fallback to formatted_content.channels
          const channels = post.channel 
            ? [post.channel as Channel] 
            : (formattedContent.channels || ['fb-post']);
          
          // Use explicit fields - no parsing needed
          const imagePrompt = post.image_prompt || '';
          
          // Use explicit needsMusic field - no parsing from instructions
          const instructions = formattedContent.instructions || '';
          
          // Get user_feedback from top-level field (preferred) or fallback to formatted_content
          const userFeedback = post.user_feedback || formattedContent.userFeedback || null;
          
          return {
            id: formattedContent.id ? String(formattedContent.id) : String(post.id),
            postType: formattedContent.postType || post.post_type || 'promo',
            channels: channels,
            hook: formattedContent.hook || '',
            hookType: formattedContent.hookType || 'seasonality',
            products: products,
            caption: post.caption,
            imagePrompt: imagePrompt,
            carouselSlides: post.carousel_slides || formattedContent.carouselSlides || undefined,
            needsMusic: post.needs_music ?? formattedContent.needsMusic ?? false,
            tags: formattedContent.tags || [],
            status: (post.status as SuggestionStatus) || 'planned',
            instructions: instructions,
            strategyNotes: formattedContent.strategyNotes || null,
            postingTime: formattedContent.postingTime || post.posting_time,
            generationSource: formattedContent.generationSource || 'template',
            generatedContext: formattedContent.generatedContext || null,
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
      
      // Fetch products in parallel for all posts that need them
      const productService = new HttpProductService();
      const productPromises = posts.map(async (post: any) => {
        const fc = post.formatted_content || {};
        let products = fc.products || [];
        
        // Fetch real product if we have ID but no product data
        if (post.selected_product_id && products.length === 0) {
          const realProduct = await productService.fetchProductById(post.selected_product_id);
          if (realProduct) {
            products = [realProduct];
          }
        }
        
        return { post, products };
      });
      
      const postsWithProducts = await Promise.all(productPromises);
      
      const suggestions: Suggestion[] = postsWithProducts.map(({ post, products }) => {
        const fc = post.formatted_content || {};
        // Use post.channel directly if available, otherwise fallback to formatted_content.channels
        const channels = post.channel 
          ? [post.channel as Channel] 
          : (fc.channels || ['fb-post']);
        
        // Use explicit fields - no parsing needed
        const imagePrompt = post.image_prompt || '';
        
        // Use explicit needsMusic field - no parsing from instructions
        const instructions = fc.instructions || '';
        
        // Get user_feedback from top-level field (preferred) or fallback to formatted_content
        const userFeedback = post.user_feedback || fc.userFeedback || null;
        
        return {
          id: fc.id ? String(fc.id) : String(post.id),
          postType: fc.postType || post.post_type || 'promo',
          channels: channels,
          hook: fc.hook || '',
          hookType: fc.hookType || 'seasonality',
          products: products,
          caption: post.caption,
          imagePrompt: imagePrompt,
          carouselSlides: post.carousel_slides || fc.carouselSlides || undefined,
          needsMusic: post.needs_music ?? fc.needsMusic ?? false,
          tags: fc.tags || [],
          status: (post.status as SuggestionStatus) || 'planned',
          instructions: instructions,
          strategyNotes: fc.strategyNotes || null,
          postingTime: fc.postingTime || post.posting_time,
          generationSource: fc.generationSource || 'template',
          generatedContext: fc.generatedContext || null,
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
    // Generate single post (not batch) to reduce costs
    try {
      const postResponse: any = await apiRequest('/social/generate', {
        method: 'POST',
        body: JSON.stringify({
          date: dateStr,
          category: categoryOverride || undefined,
          suggested_topic: suggestedTopic || undefined
        })
      });

      // Map single post response to frontend format
      const post = postResponse;
      
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

      // Map channel string to array
      const channels: Channel[] = post.channel ? [post.channel as Channel] : ['fb-post'];
      // Add cross-posted channels (FB → IG)
      if (channels[0] === 'fb-post') {
        channels.push('ig-post');
      } else if (channels[0] === 'fb-reel') {
        channels.push('ig-reel');
      }

      const suggestions: Suggestion[] = [{
        id: String(post.saved_post_id), // Use DB ID from backend
        postType: this.mapPostType(post.post_type),
        channels,
        hook: 'Tendencias agrícolas',
        hookType: 'seasonality',
        products: post.selected_product_details ? [{
          id: String(post.selected_product_details.id),
          name: post.selected_product_details.name,
          category: this.normalizeCategory(post.selected_product_details.category || post.selected_category || 'vivero'),
          sku: post.selected_product_details.sku,
          inStock: post.selected_product_details.inStock,
          price: post.selected_product_details.price
        }] : [],
        caption: cleanText(post.caption),
        imagePrompt: cleanText(post.image_prompt || ''),
        carouselSlides: post.carousel_slides,
        needsMusic: post.needs_music || false,
        tags: [],
        status: 'planned',
        instructions: post.notes || '',
        strategyNotes: post.notes || '',
        postingTime: post.posting_time || '10:00 AM',
        generationSource: 'llm',
        generatedContext: {
          monthPhase: 'germinacion' as AgriculturalPhase, // Default, could be enhanced
          nearbyDates: [],
          selectedCategories: post.selected_category ? [post.selected_category as ProductCategory] : []
        },
        userFeedback: null,
        topic: post.topic,
        problem_identified: post.problem_identified
      }];

      const daySuggestions: DaySuggestions = {
        date: dateStr,
        generatedAt: new Date().toISOString(),
        suggestions,
        metadata: {
          monthPhase: 'germinacion' as AgriculturalPhase,
          relevantDates: [],
          priorityCategories: post.selected_category ? [post.selected_category as ProductCategory] : []
        }
      };

      // Posts are already saved by backend, just reload to ensure sync
      const persisted = await loadPostsForDate(dateStr);
      return persisted || daySuggestions;

    } catch (error) {
      console.error('Batch generation failed:', error);
      // Return empty result - UI will show error
      return {
        date: dateStr,
        generatedAt: new Date().toISOString(),
        suggestions: [],
        metadata: {
          monthPhase: 'germinacion',
          relevantDates: [],
          priorityCategories: []
        }
      };
    }
  }

  private mapPostType(backendType: string | undefined): PostType {
    if (!backendType) return 'promo';
    const typeMap: Record<string, PostType> = {
      'infografías': 'infographic',
      'infografia': 'infographic',
      'checklist operativo': 'checklist',
      'checklist': 'checklist',
      'tutorial corto': 'tutorial',
      'tutorial': 'tutorial',
      'promoción puntual': 'promo',
      'promocion': 'promo',
      'kits': 'kit',
      'kit': 'kit',
      'caso de éxito': 'case-study',
      'memes/tips rápidos': 'meme-tip',
      'meme-tip': 'meme-tip',
      'antes / después': 'before-after',
      'lo que llegó hoy': 'new-arrivals',
      'novedades': 'new-arrivals',
      'faq': 'faq',
      'seguridad': 'safety',
      'roi': 'roi',
      'fechas importantes': 'important-date',
      'ugc': 'ugc-request',
      'recordatorio de servicio': 'service-reminder',
      'cómo pedir': 'how-to-order',
      'logística': 'how-to-order'
    };
    const lower = backendType.toLowerCase();
    return typeMap[lower] || typeMap[Object.keys(typeMap).find(k => lower.includes(k)) || ''] || 'promo';
  }

  private normalizeCategory(categoryName: string): ProductCategory {
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
    return 'vivero';
  }

  // Removed calculateCategoryScores - category selection now handled by backend
  // Removed createAutonomousSuggestion - batch generation now handled by backend
  // All business logic moved to backend - frontend is now just UI orchestration

}

// Export singleton
export const socialCalendarGenerator = SocialCalendarGenerator.getInstance();
