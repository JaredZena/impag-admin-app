import {
  Suggestion,
  DaySuggestions,
  SuggestionStatus,
  PostType,
  Channel,
  ProductCategory,
  POST_TYPE_LABELS,
} from '../types/socialCalendar';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a single suggestion
 */
export function validateSuggestion(suggestion: Suggestion): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!suggestion.id) {
    errors.push('Suggestion must have an ID');
  }
  
  if (!suggestion.postType) {
    errors.push('Suggestion must have a postType');
  } else if (!Object.keys(POST_TYPE_LABELS).includes(suggestion.postType)) {
    errors.push(`Invalid postType: ${suggestion.postType}`);
  }
  
  if (!suggestion.channels || suggestion.channels.length === 0) {
    errors.push('Suggestion must have at least one channel');
  } else {
    suggestion.channels.forEach(channel => {
      const validChannels: Channel[] = [
        'wa-status', 'wa-broadcast', 'wa-message',
        'fb-post', 'fb-reel', 'ig-post', 'ig-reel', 'tiktok'
      ];
      if (!validChannels.includes(channel)) {
        errors.push(`Invalid channel: ${channel}`);
      }
    });
  }
  
  if (!suggestion.caption || suggestion.caption.trim().length === 0) {
    errors.push('Suggestion must have a caption');
  } else if (suggestion.caption.length < 10) {
    warnings.push('Caption is very short (less than 10 characters)');
  }
  
  if (!suggestion.imagePrompt || suggestion.imagePrompt.trim().length === 0) {
    warnings.push('Suggestion has no image prompt');
  }
  
  // Validate products
  if (suggestion.products && suggestion.products.length > 0) {
    suggestion.products.forEach((product, index) => {
      if (!product.id) {
        errors.push(`Product at index ${index} has no ID`);
      }
      if (!product.name || product.name.trim().length === 0) {
        warnings.push(`Product at index ${index} has no name`);
      }
      if (!product.category) {
        warnings.push(`Product at index ${index} has no category`);
      } else {
        const validCategories: ProductCategory[] = [
          'mallasombra', 'plasticos', 'antiheladas', 'riego', 'acolchado',
          'bombeo-solar', 'vivero', 'charolas', 'valvuleria', 'cercas',
          'control-plagas', 'estructuras', 'kits'
        ];
        if (!validCategories.includes(product.category)) {
          warnings.push(`Product at index ${index} has invalid category: ${product.category}`);
        }
      }
    });
  }
  
  // Validate status
  const validStatuses: SuggestionStatus[] = ['planned', 'scheduled', 'done'];
  if (!validStatuses.includes(suggestion.status)) {
    errors.push(`Invalid status: ${suggestion.status}`);
  }
  
  // Validate carousel slides
  if (suggestion.carouselSlides) {
    if (suggestion.carouselSlides.length < 2) {
      warnings.push('Carousel should have at least 2 slides');
    }
    if (suggestion.carouselSlides.length > 10) {
      warnings.push('Carousel has more than 10 slides (may be too many)');
    }
    suggestion.carouselSlides.forEach((slide, index) => {
      if (!slide || slide.trim().length === 0) {
        errors.push(`Carousel slide at index ${index} is empty`);
      }
    });
  }
  
  // Validate date format if postingTime exists
  if (suggestion.postingTime) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*(AM|PM)?$/i;
    if (!timeRegex.test(suggestion.postingTime)) {
      warnings.push(`Posting time format may be invalid: ${suggestion.postingTime}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate day suggestions
 */
export function validateDaySuggestions(daySuggestions: DaySuggestions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(daySuggestions.date)) {
    errors.push(`Invalid date format: ${daySuggestions.date} (expected YYYY-MM-DD)`);
  }
  
  // Validate generatedAt timestamp
  if (!daySuggestions.generatedAt) {
    warnings.push('Missing generatedAt timestamp');
  } else {
    try {
      new Date(daySuggestions.generatedAt);
    } catch {
      errors.push(`Invalid generatedAt timestamp: ${daySuggestions.generatedAt}`);
    }
  }
  
  // Validate suggestions array
  if (!Array.isArray(daySuggestions.suggestions)) {
    errors.push('Suggestions must be an array');
  } else {
    if (daySuggestions.suggestions.length === 0) {
      warnings.push('Day has no suggestions');
    }
    
    // Validate each suggestion
    daySuggestions.suggestions.forEach((suggestion, index) => {
      const result = validateSuggestion(suggestion);
      if (!result.isValid) {
        errors.push(`Suggestion ${index}: ${result.errors.join(', ')}`);
      }
      if (result.warnings.length > 0) {
        warnings.push(`Suggestion ${index}: ${result.warnings.join(', ')}`);
      }
    });
  }
  
  // Validate metadata
  if (!daySuggestions.metadata) {
    warnings.push('Missing metadata');
  } else {
    if (!daySuggestions.metadata.monthPhase) {
      warnings.push('Missing monthPhase in metadata');
    }
    if (!Array.isArray(daySuggestions.metadata.relevantDates)) {
      warnings.push('relevantDates should be an array');
    }
    if (!Array.isArray(daySuggestions.metadata.priorityCategories)) {
      warnings.push('priorityCategories should be an array');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate multiple day suggestions (for batch operations)
 */
export function validateDaySuggestionsBatch(
  daySuggestions: DaySuggestions[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(daySuggestions)) {
    errors.push('Input must be an array of DaySuggestions');
    return { isValid: false, errors, warnings };
  }
  
  daySuggestions.forEach((day, index) => {
    const result = validateDaySuggestions(day);
    if (!result.isValid) {
      errors.push(`Day ${index} (${day.date}): ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      warnings.push(`Day ${index} (${day.date}): ${result.warnings.join(', ')}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}




