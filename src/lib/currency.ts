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
