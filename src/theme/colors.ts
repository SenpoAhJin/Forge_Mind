/**
 * ForgeMind Design System - Color Tokens
 * From Phase 0 Design System Spec v0.2.1
 */

export const colors = {
  // Primary Colors
  primary: '#6B4CE6',      // Purple — main brand, CTA buttons
  secondary: '#FF6B9D',    // Pink — accents, highlights
  tertiary: '#4ECDC4',     // Teal — success states, marketplace

  // Neutral Colors
  backgroundLight: '#FFFFFF',
  backgroundDark: '#1A1A2E',
  surface: '#F5F5F7',
  border: '#E0E0E0',
  textPrimary: '#2C2C2C',
  textSecondary: '#6B6B6B',
  textDisabled: '#B0B0B0',

  // Semantic Colors
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',

  // Match Rating Colors
  exactMatch: '#4CAF50',   // Green
  closeMatch: '#FFC107',   // Amber
  looseMatch: '#FF9800',   // Orange
} as const;

export type ColorName = keyof typeof colors;
