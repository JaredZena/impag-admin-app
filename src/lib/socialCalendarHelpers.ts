import { CategoryWeight, ProductCategory } from '../types/socialCalendar';

/**
 * Generate a unique ID (simple implementation)
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Weighted random selection
 * @param items Items with a 'weight' property or passed simple objects
 * @param weightSelector Function to extract weight from an item
 */
export function weightedRandomSelect<T>(
  items: T[],
  weightSelector: (item: T) => number
): T | null {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + weightSelector(item), 0);
  if (totalWeight <= 0) return items[Math.floor(Math.random() * items.length)];

  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= weightSelector(item);
    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1]; // Fallback
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD string to local Date object (midnight start)
 */
export function parseDate(dateStr: string): Date {
  // Use constructor with parts to avoid timezone issues with standard ISO parsing
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if the list contains duplicates (strings)
 */
export function hasDuplicate(list: string[], item: string): boolean {
  return list.includes(item);
}

/**
 * Filter duplicates from an array
 */
export function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}

/**
 * Helper to replace variables in text
 * e.g., "Hello [NAME]" -> "Hello World"
 */
export function replaceVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    // Regex to replace all occurrences, case insensitive could be an option but strict for now
    // Escape brackets for regex
    const escapedKey = key.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    const regex = new RegExp(escapedKey, 'g');
    result = result.replace(regex, value);
  });
  return result;
}

/**
 * Calculate the agricultural phase match score
 * Returns 1.0 (match) or 0.1 (mismatch)
 */
export function getPhaseScore(
  currentPhase: string,
  itemPhase: string
): number {
  return currentPhase === itemPhase ? 1.0 : 0.1;
}

/**
 * Get random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffles an array (Fisher-Yates)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
