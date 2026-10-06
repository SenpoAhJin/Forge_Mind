/**
 * Numeric input sanitizers for marketplace number fields.
 *
 * These ensure only valid numeric input can be typed, preventing letters,
 * symbols (except decimal point), and invalid formats from appearing in the field.
 */

interface DecimalOptions {
  maxDecimals: number;
  maxDigits: number;
}

interface IntegerOptions {
  maxDigits: number;
}

/**
 * Sanitize decimal input (prices, rates, budgets).
 *
 * Removes everything except digits and a single decimal point.
 * Drops commas, spaces, peso sign, non-ASCII digits, and other symbols.
 * Strips leading zeros except for "0." forms.
 * Returns empty string for empty input.
 *
 * @param text - Raw input text
 * @param options - maxDecimals (e.g., 2), maxDigits (e.g., 7)
 * @returns Sanitized numeric string or empty string
 */
export function sanitizeDecimalInput(text: string, options: DecimalOptions): string {
  if (!text) return '';

  // Remove all non-digit and non-decimal-point characters
  // This drops: commas, spaces, ₱, currency symbols, letters, etc.
  let sanitized = text.replace(/[^0-9.]/g, '');

  // Keep only the first decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }

  // Limit decimal places
  if (parts.length === 2 && parts[1].length > options.maxDecimals) {
    sanitized = parts[0] + '.' + parts[1].substring(0, options.maxDecimals);
  }

  // Strip leading zeros, but keep "0" and "0." forms
  if (sanitized.length > 1 && sanitized[0] === '0' && sanitized[1] !== '.') {
    sanitized = sanitized.replace(/^0+/, '');
  }

  // If we stripped everything, return empty
  if (sanitized === '.') return '';

  // Limit total digits (before decimal point)
  const [integerPart, decimalPart] = sanitized.split('.');
  if (integerPart && integerPart.length > options.maxDigits) {
    return integerPart.substring(0, options.maxDigits) + (decimalPart !== undefined ? '.' + decimalPart : '');
  }

  return sanitized;
}

/**
 * Sanitize integer input (timeline days, quantities).
 *
 * Removes everything except digits.
 * Strips leading zeros.
 * Returns empty string for empty input.
 *
 * @param text - Raw input text
 * @param options - maxDigits (e.g., 3 for days)
 * @returns Sanitized numeric string or empty string
 */
export function sanitizeIntegerInput(text: string, options: IntegerOptions): string {
  if (!text) return '';

  // Remove all non-digit characters
  let sanitized = text.replace(/[^0-9]/g, '');

  // Strip leading zeros
  if (sanitized.length > 1) {
    sanitized = sanitized.replace(/^0+/, '');
  }

  // Limit digits
  if (sanitized.length > options.maxDigits) {
    sanitized = sanitized.substring(0, options.maxDigits);
  }

  return sanitized;
}
