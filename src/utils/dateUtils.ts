import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configure dayjs
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

/**
 * Formats a date string or Date object into a readable Spanish format.
 * Handles null/undefined values gracefully.
 * 
 * @param date - Date string, Date object, or null/undefined
 * @param format - Optional custom format (default: 'DD MMM YYYY')
 * @returns Formatted date string or 'N/A' if date is null/undefined
 */
export const formatDate = (date: string | Date | null | undefined, format: string = 'DD MMM YYYY'): string => {
  if (!date) {
    return 'N/A';
  }

  try {
    const parsedDate = dayjs(date);
    
    // Check if the date is valid
    if (!parsedDate.isValid()) {
      return 'N/A';
    }

    // Check if the date is the Unix epoch (1970-01-01) which indicates null/unset
    if (parsedDate.year() === 1970 && parsedDate.month() === 0 && parsedDate.date() === 1) {
      return 'N/A';
    }

    return parsedDate.format(format);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Formats a date with time included
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  return formatDate(date, 'DD MMM YYYY HH:mm');
};

/**
 * Formats a date in a more readable format
 */
export const formatReadableDate = (date: string | Date | null | undefined): string => {
  return formatDate(date, 'DD [de] MMMM [de] YYYY');
};

/**
 * Gets relative time (e.g., "hace 2 días")
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) {
    return 'N/A';
  }

  try {
    const parsedDate = dayjs(date);
    
    if (!parsedDate.isValid()) {
      return 'N/A';
    }

    // Check if the date is the Unix epoch which indicates null/unset
    if (parsedDate.year() === 1970 && parsedDate.month() === 0 && parsedDate.date() === 1) {
      return 'N/A';
    }

    return parsedDate.fromNow();
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return 'N/A';
  }
};

/**
 * Formats creation and update dates for display
 */
export const formatDatePair = (createdAt: string | Date | null | undefined, updatedAt: string | Date | null | undefined) => {
  const created = formatDate(createdAt);
  const updated = formatDate(updatedAt);
  
  // If updated date is the same as created date or invalid, only show created
  if (updated === 'N/A' || updated === created) {
    return {
      created,
      updated: 'N/A',
      display: `Creado ${created}`
    };
  }
  
  return {
    created,
    updated,
    display: `Creado ${created}, actualizado ${updated}`
  };
};
