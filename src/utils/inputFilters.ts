/**
 * Shared Input Filters
 * Applied in onChangeText so typing, pasting and autofill are all cleaned.
 * Stripping in onChangeText (not only via keyboardType) is what makes this
 * work on web, where keyboardType is a no-op.
 */

/** Keeps digits only. Drops letters, spaces, dashes, plus signs and emoji. */
export const digitsOnly = (text: string): string => text.replace(/\D/g, '');
