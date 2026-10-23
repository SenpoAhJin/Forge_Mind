/**
 * ForgeMind Two-Tone Design System - STRICT PALETTE
 * 
 * BLACK: #000000 - primary color for everything except highlight (works in both light and dark mode)
 * PINK: #FF8FB1 - accent/highlight color (ONE per screen)
 * WHITE: #FFFFFF - background
 * 
 * Opacity variants made via withAlpha() helper only.
 * No grays, no third hue.
 */

// ============================================================================
// CORE COLORS
// ============================================================================

const BLACK = '#000000';
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
  // PRIMARY (BLACK #000000)
  primary: BLACK,                            // Main black - buttons, headers, links, text
  primaryTint: withAlpha(BLACK, 0.06),       // Card backgrounds on white
  primaryLight: withAlpha(BLACK, 0.20),      // Borders and dividers
  primaryDark: BLACK,                        // Same as primary (no separate dark)
  
  // ACCENT (PINK #FF8FB1) - ONE highlight per screen
  accent: PINK,                              // PINK fill for attention
  accentTint: withAlpha(PINK, 0.15),         // Soft PINK highlight backgrounds
  accentLight: PINK,                         // Same as accent
  accentDark: PINK,                          // Same as accent
  
  // BACKGROUNDS
  background: WHITE,                         // Screen background
  surface: withAlpha(BLACK, 0.06),           // Cards on white
  surfaceDark: withAlpha(BLACK, 0.08),       // Elevated surfaces
  border: withAlpha(BLACK, 0.20),            // Borders and dividers
  borderLight: withAlpha(BLACK, 0.12),       // Lighter borders
  
  // TEXT
  textPrimary: BLACK,                        // Primary text (BLACK on WHITE)
  textSecondary: withAlpha(BLACK, 0.75),     // Secondary text (BLACK 75%)
  textDisabled: withAlpha(BLACK, 0.40),      // Disabled text (contrast exempt)
  textOnPrimary: WHITE,                      // WHITE text on BLACK
  textOnAccent: BLACK,                       // BLACK text on PINK
  
  // STATES
  disabled: withAlpha(BLACK, 0.40),          // Disabled (contrast exempt)
  hover: withAlpha(BLACK, 0.90),             // Hover state
  pressed: BLACK,                            // Pressed state
  selected: withAlpha(BLACK, 0.10),          // Selected background
  focus: BLACK,                              // Focus border
  
  // SEMANTIC (using two-tone only)
  success: BLACK,                            // Positive states use BLACK
  successTint: withAlpha(BLACK, 0.10),       // Success background
  warning: PINK,                             // Attention uses PINK fill
  warningTint: withAlpha(PINK, 0.15),        // Warning background
  info: BLACK,                               // Info uses BLACK
  infoTint: withAlpha(BLACK, 0.10),          // Info background
  
  // OVERLAYS
  backdrop: withAlpha(BLACK, 0.60),          // Modal backdrop
  shadow: withAlpha(BLACK, 0.10),            // Shadow color
  
  // LEGACY ALIASES - remove after migration
  backgroundLight: WHITE as string,          // LEGACY ALIAS, remove after migration
  backgroundDark: BLACK as string,           // LEGACY ALIAS, remove after migration
  secondary: PINK as string,                 // LEGACY ALIAS, remove after migration (was third color, now PINK)
  tertiary: PINK as string,                  // LEGACY ALIAS, remove after migration (was third color, now PINK)
  error: PINK as string,                     // LEGACY ALIAS, remove after migration (ERROR NOT IMPLEMENTED - use PINK temporarily)
} as const;

// ============================================================================
// DARK MODE PALETTE
// ============================================================================

export const darkColors = {
  // PRIMARY (BLACK becomes WHITE in dark mode for visibility)
  primary: BLACK,                            // Main BLACK
  primaryTint: withAlpha(WHITE, 0.08),       // Cards on BLACK background
  primaryLight: withAlpha(WHITE, 0.20),      // Borders in dark mode
  primaryDark: BLACK,                        // Same as primary
  
  // ACCENT (PINK)
  accent: PINK,                              // PINK highlight
  accentTint: withAlpha(PINK, 0.15),         // Soft PINK background
  accentLight: PINK,                         // Same as accent
  accentDark: PINK,                          // Same as accent
  
  // BACKGROUNDS
  background: BLACK,                         // Screen background (BLACK in dark mode)
  surface: withAlpha(WHITE, 0.08),           // Cards on BLACK
  surfaceDark: withAlpha(WHITE, 0.12),       // Elevated surfaces
  border: withAlpha(WHITE, 0.20),            // Borders
  borderLight: withAlpha(WHITE, 0.12),       // Lighter borders
  
  // TEXT
  textPrimary: WHITE,                        // Main text (WHITE on BLACK)
  textSecondary: withAlpha(WHITE, 0.75),     // Secondary text
  textDisabled: withAlpha(WHITE, 0.40),      // Disabled text
  textOnPrimary: WHITE,                      // WHITE on BLACK
  textOnAccent: BLACK,                       // BLACK on PINK
  
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
  backdrop: withAlpha(BLACK, 0.80),          // Darker backdrop in dark mode
  shadow: withAlpha(BLACK, 0.40),            // Darker shadow in dark mode
  
  // LEGACY ALIASES - remove after migration
  backgroundLight: WHITE as string,          // LEGACY ALIAS, remove after migration
  backgroundDark: BLACK as string,           // LEGACY ALIAS, remove after migration
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
