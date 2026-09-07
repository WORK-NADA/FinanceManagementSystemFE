/**
 * Formats a number as Indian Rupee currency (₹).
 * Uses tabular nums for alignment in tables.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options?: { compact?: boolean }
): string {
  if (amount === null || amount === undefined || amount === '') return '₹0.00';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  if (options?.compact && Math.abs(num) >= 1_00_000) {
    const lakhs = num / 1_00_000;
    return `₹${lakhs.toFixed(2)}L`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Returns a class-safe string with a + or – prefix for signed values */
export function signedAmount(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Formats a plain numeric value using the Indian numbering system (en-IN).
 * Examples:
 *   1000 -> 1,000
 *   10000 -> 10,000
 *   100000 -> 1,00,000
 *   1000000 -> 10,00,000
 */
export function formatNumber(
  value: number | string | null | undefined,
  options?: {
    decimals?: number;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
  }
): string {
  if (value === null || value === undefined || value === '') {
    return options?.fallback ?? '0';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return options?.fallback ?? '0';

  const minDec = options?.minimumFractionDigits ?? (options?.decimals !== undefined ? options.decimals : 0);
  const maxDec = options?.maximumFractionDigits ?? (options?.decimals !== undefined ? options.decimals : (Number.isInteger(num) ? 0 : 3));

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  }).format(num);
}

