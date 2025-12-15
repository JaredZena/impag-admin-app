import { DaySuggestions, SuggestionStatus } from '../types/socialCalendar';
import { loadPostsForDate, loadPostsFromDatabase, saveDaySuggestionsToDatabase } from './socialCalendar';

/**
 * Retrieve suggestions for a specific day from the database
 */
export async function getDaySuggestions(date: string): Promise<DaySuggestions | null> {
  return loadPostsForDate(date);
}

/**
 * Get all dates that have suggestions in the database
 */
export async function getAllDatesWithSuggestions(startDate?: string, endDate?: string): Promise<string[]> {
  const days = await loadPostsFromDatabase(startDate, endDate);
  return days.map(d => d.date);
}

/**
 * Get the next empty date starting from a given date (default: tomorrow)
 */
export async function getNextEmptyDate(fromDate?: string): Promise<string> {
  const start = fromDate ? new Date(fromDate) : new Date();
  if (!fromDate) {
    start.setDate(start.getDate() + 1);
  }

  const windowEnd = new Date(start);
  windowEnd.setDate(windowEnd.getDate() + 365);

  const existingDates = new Set(
    await getAllDatesWithSuggestions(
      start.toISOString().split('T')[0],
      windowEnd.toISOString().split('T')[0]
    )
  );

  const candidate = new Date(start);
  for (let i = 0; i < 365; i++) {
    const dateStr = candidate.toISOString().split('T')[0];
    if (!existingDates.has(dateStr)) {
      return dateStr;
    }
    candidate.setDate(candidate.getDate() + 1);
  }

  return windowEnd.toISOString().split('T')[0];
}

/**
 * Update the status of a single suggestion and persist to database
 */
export async function updateSuggestionStatus(
  date: string,
  suggestionId: string,
  status: SuggestionStatus
): Promise<void> {
  const dayData = await loadPostsForDate(date);
  if (!dayData) return;

  const updated: DaySuggestions = {
    ...dayData,
    suggestions: dayData.suggestions.map(s =>
      s.id === suggestionId ? { ...s, status } : s
    ),
  };

  await saveDaySuggestionsToDatabase(updated);
}
