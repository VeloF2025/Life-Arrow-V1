import { format, parseISO, isValid } from 'date-fns';

/**
 * Formats a date string or Date object to a readable format
 * @param date Date string in ISO format or Date object
 * @param formatString Optional format string (defaults to 'MMM d, yyyy')
 * @returns Formatted date string or 'Invalid date' if the input is invalid
 */
export function formatDate(date: string | Date | null | undefined, formatString: string = 'MMM d, yyyy'): string {
  if (!date) return 'Not specified';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Formats a date-time string or Date object to a readable format with time
 * @param date Date string in ISO format or Date object
 * @param formatString Optional format string (defaults to 'MMM d, yyyy h:mm a')
 * @returns Formatted date-time string or 'Invalid date' if the input is invalid
 */
export function formatDateTime(date: string | Date | null | undefined, formatString: string = 'MMM d, yyyy h:mm a'): string {
  return formatDate(date, formatString);
}

/**
 * Gets the relative time (e.g., "2 days ago", "in 3 hours") for a date
 * @param date Date string in ISO format or Date object
 * @returns String representing the relative time
 */
export function getRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return 'Not specified';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    if (diffDay > 0) {
      return `in ${diffDay} ${diffDay === 1 ? 'day' : 'days'}`;
    } else if (diffDay < 0) {
      return `${Math.abs(diffDay)} ${Math.abs(diffDay) === 1 ? 'day' : 'days'} ago`;
    } else if (diffHour > 0) {
      return `in ${diffHour} ${diffHour === 1 ? 'hour' : 'hours'}`;
    } else if (diffHour < 0) {
      return `${Math.abs(diffHour)} ${Math.abs(diffHour) === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffMin > 0) {
      return `in ${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'}`;
    } else if (diffMin < 0) {
      return `${Math.abs(diffMin)} ${Math.abs(diffMin) === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return 'just now';
    }
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Invalid date';
  }
}
