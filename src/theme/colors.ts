/**
 * ForgeMind Two-Tone Design System - STRICT PALETTE
 * 
 * INDIGO: #3730A3 - primary color for everything except highlight
 * PINK: #FF8FB1 - accent/highlight color (ONE per screen)
 * WHITE: #FFFFFF - background
 * 
 * Opacity variants made via withAlpha() helper only.
 * No grays, no black, no third hue.
 */

// ============================================================================
// CORE COLORS
// ============================================================================

const INDIGO = '#3730A3';
const PINK = '#FF8FB1';
const WHITE = '#FFFFFF';

// ============================================================================
// OPACITY HELPER
// ============================================================================

/**
 * Apply alpha opacity to a color.
 * Converts hex to rgba with specified alpha (0-1).
 */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================================
// LIGHT MODE PALETTE
// ============================================================================

export const lightColors = {
  // PRIMARY (INDIGO #3730A3)
  primary: INDIGO,                           // Main indigo - buttons, headers, links, text
  primaryTint: withAlpha(INDIGO, 0.06),      // Card backgrounds on white
  primaryLight: withAlpha(INDIGO, 0.20),     // Borders and dividers
  primaryDark: INDIGO,                       // Same as primary (no separate dark)
  
  // ACCENT (PINK #FF8FB1) - ONE highlight per screen
  accent: PINK,                              // PINK fill for attention
  accentTint: withAlpha(PINK, 0.15),         // Soft PINK highlight backgrounds
  accentLight: PINK,                         // Same as accent
  accentDark: PINK,                          // Same as accent
  
  // BACKGROUNDS
  background: WHITE,                         // Screen background
  surface: withAlpha(INDIGO, 0.06),          // Cards on white
  surfaceDark: withAlpha(INDIGO, 0.08),      // Elevated surfaces
  border: withAlpha(INDIGO, 0.20),           // Borders and dividers
  borderLight: withAlpha(INDIGO, 0.12),      // Lighter borders
  
  // TEXT
  textPrimary: INDIGO,                       // Primary text (INDIGO on WHITE)
  textSecondary: withAlpha(INDIGO, 0.75),    // Secondary text (INDIGO 75%)
  textDisabled: withAlpha(INDIGO, 0.40),     // Disabled text (contrast exempt)
  textOnPrimary: WHITE,                      // WHITE text on INDIGO
  textOnAccent: INDIGO,                      // INDIGO text on PINK
  
  // STATES
  disabled: withAlpha(INDIGO, 0.40),         // Disabled (contrast exempt)
  hover: withAlpha(INDIGO, 0.90),            // Hover state
  pressed: INDIGO,                           // Pressed state
  selected: withAlpha(INDIGO, 0.10),         // Selected background
  focus: INDIGO,                             // Focus border
  
  // SEMANTIC (using two-tone only)
  success: INDIGO,                           // Positive states use INDIGO
  successTint: withAlpha(INDIGO, 0.10),      // Success background
  warning: PINK,                             // Attention uses PINK fill
  warningTint: withAlpha(PINK, 0.15),        // Warning background
  info: INDIGO,                              // Info uses INDIGO
  infoTint: withAlpha(INDIGO, 0.10),         // Info background
  
  // OVERLAYS
  backdrop: withAlpha(INDIGO, 0.60),         // Modal backdrop (never black)
  shadow: withAlpha(INDIGO, 0.10),           // Shadow color (never black)
  
  // LEGACY ALIASES - remove after migration
  backgroundLight: WHITE as string,          // LEGACY ALIAS, remove after migration
  backgroundDark: INDIGO as string,          // LEGACY ALIAS, remove after migration
  secondary: PINK as string,                 // LEGACY ALIAS, remove after migration (was third color, now PINK)
  tertiary: PINK as string,                  // LEGACY ALIAS, remove after migration (was third color, now PINK)
  error: PINK as string,                     // LEGACY ALIAS, remove after migration (ERROR NOT IMPLEMENTED - use PINK temporarily)
} as const;

// ============================================================================
// DARK MODE PALETTE
// ============================================================================

export const darkColors = {
  // PRIMARY (INDIGO background, WHITE text)
  primary: INDIGO,                           // Main INDIGO
  primaryTint: withAlpha(WHITE, 0.08),       // Cards on INDIGO background
  primaryLight: withAlpha(WHITE, 0.20),      // Borders in dark mode
  primaryDark: INDIGO,                       // Same as primary
  
  // ACCENT (PINK)
  accent: PINK,                              // PINK highlight
  accentTint: withAlpha(PINK, 0.15),         // Soft PINK background
  accentLight: PINK,                         // Same as accent
  accentDark: PINK,                          // Same as accent
  
  // BACKGROUNDS
  background: INDIGO,                        // Screen background (INDIGO in dark mode)
  surface: withAlpha(WHITE, 0.08),           // Cards on INDIGO
  surfaceDark: withAlpha(WHITE, 0.12),       // Elevated surfaces
  border: withAlpha(WHITE, 0.20),            // Borders
  borderLight: withAlpha(WHITE, 0.12),       // Lighter borders
  
  // TEXT
  textPrimary: WHITE,                        // Main text (WHITE on INDIGO)
  textSecondary: withAlpha(WHITE, 0.75),     // Secondary text
  textDisabled: withAlpha(WHITE, 0.40),      // Disabled text
  textOnPrimary: WHITE,                      // WHITE on INDIGO
  textOnAccent: INDIGO,                      // INDIGO on PINK
  
  // STATES
  disabled: withAlpha(WHITE, 0.40),          // Disabled
  hover: withAlpha(WHITE, 0.90),             // Hover
  pressed: WHITE,                            // Pressed
  selected: withAlpha(WHITE, 0.10),          // Selected
  focus: WHITE,                              // Focus
  
  // SEMANTIC
  success: WHITE,                            // Success uses WHITE in dark mode
  successTint: withAlpha(WHITE, 0.10),       // Success background
  warning: PINK,                             // Warning uses PINK
  warningTint: withAlpha(PINK, 0.15),        // Warning background
  info: WHITE,                               // Info uses WHITE
  infoTint: withAlpha(WHITE, 0.10),          // Info background
  
  // OVERLAYS
  backdrop: withAlpha(INDIGO, 0.80),         // Darker backdrop in dark mode
  shadow: withAlpha(INDIGO, 0.40),           // Darker shadow in dark mode
  
  // LEGACY ALIASES - remove after migration
  backgroundLight: WHITE as string,          // LEGACY ALIAS, remove after migration
  backgroundDark: INDIGO as string,          // LEGACY ALIAS, remove after migration
  secondary: PINK as string,                 // LEGACY ALIAS, remove after migration
  tertiary: PINK as string,                  // LEGACY ALIAS, remove after migration
  error: PINK as string,                     // LEGACY ALIAS, remove after migration
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ThemeColors = typeof lightColors;
export type ColorName = keyof ThemeColors;

// Default export for compatibility
export const colors = lightColors;
