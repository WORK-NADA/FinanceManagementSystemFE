/**
 * Enterprise-grade, RFC 4180-compliant CSV Export Utility
 * Ensures seamless opening and readability across Microsoft Excel, Google Sheets,
 * LibreOffice, and Apple Numbers with UTF-8 BOM, executive metadata blocks,
 * clean numeric formatting for formulas, and proper escaping.
 */

export interface CsvMetadataItem {
  label: string;
  value: string | number | null | undefined;
}

export interface CsvTableSection {
  sectionTitle?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  summaryRow?: (string | number | null | undefined)[];
}

export interface ProfessionalCsvOptions {
  filename: string;
  documentTitle: string;
  subtitle?: string;
  metadata?: CsvMetadataItem[];
  sections: CsvTableSection[];
}

/**
 * Escapes an individual CSV cell value according to RFC 4180.
 * If value is a clean finite number, outputs without quotes so spreadsheet
 * applications recognize it as a formula-ready number.
 * If value contains commas, quotes, or newlines, encloses in double quotes and escapes internal quotes.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  // Preserve raw numeric values for spreadsheet formulas (=SUM, etc.)
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) return '0.00';
    return String(value);
  }

  const str = String(value).trim();
  if (str === '') {
    return '""';
  }

  // If string contains comma, quote, or newline, escape with double-quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  // Also quote strings that could look like formula injection (=, +, -, @)
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('@')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return `"${str}"`;
}

/**
 * Formats a numeric value to a fixed-decimal string suitable for CSV numbers.
 */
export function formatCsvNumber(val: number | string | null | undefined, decimals = 2): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return 0;
  return Number(num.toFixed(decimals));
}

/**
 * Formats an enum string like 'PARTIALLY_PAID' or 'BANK_TRANSFER' to 'Partially Paid' or 'Bank Transfer'.
 */
export function formatCsvEnum(val: string | null | undefined, fallback = '—'): string {
  if (!val) return fallback;
  return val
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Formats a date string cleanly as 'YYYY-MM-DD'.
 */
export function formatCsvDate(dateStr: string | null | undefined, fallback = '—'): string {
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(dateStr);
  }
}

/**
 * Formats timestamp as 'YYYY-MM-DD HH:mm:ss'.
 */
export function formatCsvTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

/**
 * Sanitizes a filename to prevent invalid filesystem characters.
 */
export function sanitizeCsvFilename(filename: string): string {
  const clean = filename.replace(/[^a-zA-Z0-9_\-.]/g, '_').replace(/_+/g, '_');
  return clean.endsWith('.csv') ? clean : `${clean}.csv`;
}

/**
 * Generates and downloads a standardized, professional CSV file.
 */
export function exportProfessionalCsv(options: ProfessionalCsvOptions): void {
  const { filename, documentTitle, subtitle, metadata = [], sections } = options;
  const lines: string[] = [];

  // 1. Enterprise Branding & Document Title Header
  lines.push(escapeCsvCell('व्यापार ERP — Financial & Business Management System'));
  lines.push(escapeCsvCell(documentTitle.toUpperCase()));
  if (subtitle) {
    lines.push(escapeCsvCell(subtitle));
  }

  // 2. Metadata Block
  if (metadata.length > 0) {
    lines.push(''); // Blank spacer
    metadata.forEach(item => {
      const labelCell = escapeCsvCell(`${item.label}:`);
      const valCell = typeof item.value === 'number' ? escapeCsvCell(item.value) : escapeCsvCell(String(item.value ?? '—'));
      lines.push(`${labelCell},${valCell}`);
    });
  }

  lines.push(''); // Blank spacer before sections

  // 3. Sections
  sections.forEach((section, idx) => {
    if (idx > 0) {
      lines.push(''); // Blank line separating sections
    }

    if (section.sectionTitle) {
      lines.push(escapeCsvCell(`--- ${section.sectionTitle.toUpperCase()} ---`));
    }

    // Column Headers
    lines.push(section.headers.map(h => escapeCsvCell(h)).join(','));

    // Data Rows
    section.rows.forEach(row => {
      lines.push(row.map(cell => escapeCsvCell(cell)).join(','));
    });

    // Summary / Total Row
    if (section.summaryRow && section.summaryRow.length > 0) {
      lines.push(section.summaryRow.map(cell => escapeCsvCell(cell)).join(','));
    }
  });

  // 4. Prepend UTF-8 Byte Order Mark (\uFEFF) for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeCsvFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
