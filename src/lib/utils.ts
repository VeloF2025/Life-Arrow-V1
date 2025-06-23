import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isToday, isYesterday, isTomorrow } from 'date-fns';

/**
 * Utility function to merge Tailwind classes with proper overrides
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display in the UI
 */
export function formatDate(date: Date | string, formatStr = 'MMM dd, yyyy') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'h:mm a');
}

/**
 * Format date with relative time (Today, Yesterday, etc.)
 */
export function formatRelativeDate(date: Date | string) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return `Today at ${formatTime(dateObj)}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Yesterday at ${formatTime(dateObj)}`;
  }
  
  if (isTomorrow(dateObj)) {
    return `Tomorrow at ${formatTime(dateObj)}`;
  }
  
  return formatDate(dateObj, 'MMM dd') + ` at ${formatTime(dateObj)}`;
}

/**
 * Generate initials from name
 */
export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Generate random color for avatars
 */
export function getAvatarColor(userId: string) {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  
  const index = userId.length % colors.length;
  return colors[index];
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Convert string to slug format
 */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate unique ID
 */
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string) {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string) {
  const today = new Date();
  const birthDate = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const copy = {} as { [key: string]: unknown };
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as { [key: string]: unknown })[key]);
    });
    return copy as T;
  }
  return obj;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Currency mapping based on country
 */
const COUNTRY_CURRENCY_MAP: Record<string, { symbol: string; code: string; locale: string }> = {
  'South Africa': { symbol: 'R', code: 'ZAR', locale: 'en-ZA' },
  'Botswana': { symbol: 'P', code: 'BWP', locale: 'en-BW' },
  'Namibia': { symbol: 'N$', code: 'NAD', locale: 'en-NA' },
  'Eswatini': { symbol: 'E', code: 'SZL', locale: 'en-SZ' },
  'Lesotho': { symbol: 'L', code: 'LSL', locale: 'en-LS' },
  'Zimbabwe': { symbol: 'Z$', code: 'ZWL', locale: 'en-ZW' },
  'Mozambique': { symbol: 'MT', code: 'MZN', locale: 'pt-MZ' },
  'United Kingdom': { symbol: '£', code: 'GBP', locale: 'en-GB' },
  'United States': { symbol: '$', code: 'USD', locale: 'en-US' },
  'Canada': { symbol: 'C$', code: 'CAD', locale: 'en-CA' },
  'Australia': { symbol: 'A$', code: 'AUD', locale: 'en-AU' },
  'Other': { symbol: '$', code: 'USD', locale: 'en-US' } // Default fallback
};

/**
 * Format price in the appropriate currency based on country
 * @param priceInCents - Price stored in cents for precision
 * @param country - Country to determine currency format
 * @param showSymbol - Whether to show currency symbol (default: true)
 */
export function formatPrice(priceInCents: number, country: string = 'South Africa', showSymbol: boolean = true): string {
  // Convert cents to main currency unit
  const priceInMainUnit = priceInCents / 100;
  
  // Get currency info for the country
  const currencyInfo = COUNTRY_CURRENCY_MAP[country] || COUNTRY_CURRENCY_MAP['South Africa'];
  
  if (!showSymbol) {
    return priceInMainUnit.toFixed(2);
  }
  
  // Format using native Intl.NumberFormat for proper localization
  try {
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currencyInfo.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(priceInMainUnit);
  } catch (error) {
    // Fallback to simple formatting if locale isn't supported
    return `${currencyInfo.symbol}${priceInMainUnit.toFixed(2)}`;
  }
}

/**
 * Get currency symbol for a country
 */
export function getCurrencySymbol(country: string = 'South Africa'): string {
  const currencyInfo = COUNTRY_CURRENCY_MAP[country] || COUNTRY_CURRENCY_MAP['South Africa'];
  return currencyInfo.symbol;
}

/**
 * Get currency code for a country
 */
export function getCurrencyCode(country: string = 'South Africa'): string {
  const currencyInfo = COUNTRY_CURRENCY_MAP[country] || COUNTRY_CURRENCY_MAP['South Africa'];
  return currencyInfo.code;
}

/**
 * Convert price from main currency unit to cents for storage
 * @param priceInMainUnit - Price in main currency (e.g., Rands, Dollars)
 * @returns Price in cents
 */
export function convertToCents(priceInMainUnit: number): number {
  return Math.round(priceInMainUnit * 100);
}

/**
 * Convert price from cents to main currency unit
 * @param priceInCents - Price in cents
 * @returns Price in main currency unit
 */
export function convertFromCents(priceInCents: number): number {
  return priceInCents / 100;
}

/**
 * Generate a consistent hash for given string
 */
export function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
} 