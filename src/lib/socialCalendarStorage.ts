import { DaySuggestions, SuggestionStatus, SocialCalendarIndex } from '../types/socialCalendar';

// Prefix for all localStorage keys
const STORAGE_PREFIX = 'social-calendar:';
const INDEX_KEY = `${STORAGE_PREFIX}index`;

// Helper to format date consistent (YYYY-MM-DD)
// Note: We rely on the date string passed in being correct, 
// but we could add validation here if needed.

/**
 * Save suggestions for a specific day
 */
export function saveDaySuggestions(data: DaySuggestions): void {
  try {
    const key = `${STORAGE_PREFIX}${data.date}`;
    localStorage.setItem(key, JSON.stringify(data));
    updateIndex(data.date);
  } catch (error) {
    console.error('Failed to save day suggestions:', error);
    // Potential fallback: clean up old entries if storage is full?
  }
}

/**
 * Retrieve suggestions for a specific day
 */
export function getDaySuggestions(date: string): DaySuggestions | null {
  try {
    const key = `${STORAGE_PREFIX}${date}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DaySuggestions;
  } catch (error) {
    console.error(`Failed to load suggestions for ${date}:`, error);
    return null;
  }
}

/**
 * Update the status of a single suggestion
 */
export function updateSuggestionStatus(
  date: string,
  suggestionId: string,
  status: SuggestionStatus
): void {
  const dayData = getDaySuggestions(date);
  if (!dayData) return;

  const suggestion = dayData.suggestions.find(s => s.id === suggestionId);
  if (suggestion) {
    suggestion.status = status;
    saveDaySuggestions(dayData);
  }
}

/**
 * Delete suggestions for a day
 */
export function deleteDaySuggestions(date: string): void {
  const key = `${STORAGE_PREFIX}${date}`;
  localStorage.removeItem(key);
  removeFromIndex(date);
}

/**
 * Get the next empty date starting from a given date (default: tomorrow)
 */
export function getNextEmptyDate(fromDate?: string): string {
  const start = fromDate ? new Date(fromDate) : new Date();
  // Ensure we start from at least "tomorrow" if no specific date given, 
  // or use the given date as the starting search point.
  // Implementation choice: if fromDate is today, start checking from today? 
  // The requirement was "tomorrow" usually. Let's strictly strictly search forward.
  
  // If no date provided, start tomorrow.
  if (!fromDate) {
    start.setDate(start.getDate() + 1);
  }

  const index = getIndex();
  let candidate = new Date(start);
  
  // Look ahead 365 days max
  for (let i = 0; i < 365; i++) {
    const dateStr = candidate.toISOString().split('T')[0];
    if (!index.dates.includes(dateStr)) {
      return dateStr;
    }
    candidate.setDate(candidate.getDate() + 1);
  }
  
  // Fallback if full year is filled (unlikely)
  return candidate.toISOString().split('T')[0];
}

/**
 * Get all dates that have suggestions
 */
export function getAllDatesWithSuggestions(): string[] {
  return getIndex().dates;
}

/**
 * Get history of generated days within a range
 */
export function getHistory(startDate: string, endDate: string): DaySuggestions[] {
  const index = getIndex();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const result: DaySuggestions[] = [];
  
  for (const dateStr of index.dates) {
    const date = new Date(dateStr);
    if (date >= start && date <= end) {
      const data = getDaySuggestions(dateStr);
      if (data) result.push(data);
    }
  }
  
  // Sort by date ascending
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// -----------------------------------------------------------------------------
// Private Helpers
// -----------------------------------------------------------------------------

function getIndex(): SocialCalendarIndex {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return { dates: [], lastUpdated: new Date().toISOString() };
    return JSON.parse(raw);
  } catch {
    return { dates: [], lastUpdated: new Date().toISOString() };
  }
}

function updateIndex(date: string) {
  const index = getIndex();
  if (!index.dates.includes(date)) {
    index.dates.push(date);
    index.dates.sort(); // Keep sorted
    index.lastUpdated = new Date().toISOString();
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }
}

function removeFromIndex(date: string) {
  const index = getIndex();
  index.dates = index.dates.filter(d => d !== date);
  index.lastUpdated = new Date().toISOString();
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

/**
 * Cleanup old entries to save space (older than X days)
 */
export function cleanupOldEntries(keepDays: number = 90): void {
  const index = getIndex();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  
  const toRemove = index.dates.filter(d => new Date(d) < cutoff);
  
  toRemove.forEach(date => {
    localStorage.removeItem(`${STORAGE_PREFIX}${date}`);
  });
  
  // Update index
  index.dates = index.dates.filter(d => new Date(d) >= cutoff);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}
