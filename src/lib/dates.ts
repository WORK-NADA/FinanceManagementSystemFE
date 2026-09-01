import { format, parseISO, isValid } from 'date-fns';

export const DATE_FORMAT = 'dd MMM yyyy';
export const DATE_FORMAT_SHORT = 'dd/MM/yy';
export const DATE_FORMAT_INPUT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'dd MMM yyyy, HH:mm';

/**
 * Formats a date string or Date object for display.
 * Returns '—' for null/undefined/invalid dates.
 */
export function formatDate(
  date: string | Date | null | undefined,
  fmt: string = DATE_FORMAT
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, fmt);
}

/** Formats as ISO string for API calls (yyyy-MM-dd) */
export function toApiDate(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return '';
  return format(date, DATE_FORMAT_INPUT);
}

/** Returns today's date as yyyy-MM-dd string (for <input type="date"> default) */
export function todayStr(): string {
  return format(new Date(), DATE_FORMAT_INPUT);
}

/** Returns first day of current month as yyyy-MM-dd string */
export function firstOfMonthStr(): string {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth(), 1), DATE_FORMAT_INPUT);
}
