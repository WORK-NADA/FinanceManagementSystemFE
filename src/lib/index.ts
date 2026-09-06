/**
 * Central export barrel for lib utilities.
 * Import from '@/lib' to avoid deep path imports.
 */
export { cn } from './cn';
export { formatCurrency, signedAmount } from './currency';
export { formatDate, toApiDate, todayStr, firstOfMonthStr, DATE_FORMAT, DATE_FORMAT_INPUT } from './dates';
export { setupFieldAutoSelect, selectInputText, isSelectableField } from './fieldAutoSelect';
