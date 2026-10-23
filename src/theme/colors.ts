/**
 * ForgeMind Two-Tone Design System
 * 
 * PRIMARY: Indigo (#3730A3) - headers, nav, buttons, links, selected states
 * ACCENT: Amber (#F59E0B) - ONE highlight per screen for attention
 * NEUTRALS: White, light gray, mid gray - not counted as colors
 * 
 * All tints and shades derived from the two base hues only.
 */

// ============================================================================
// LIGHT MODE PALETTE
// ============================================================================

export const lightColors = {
  // PRIMARY (Indigo) - from hue #3730A3
  primary: '#3730A3',           // Main indigo - buttons, headers, links
  primaryTint: '#EEF0FF',       // Very light indigo - card backgrounds, chips
  primaryLight: '#6366F1',      // Lighter indigo - hover states (from primary hue)
  primaryDark: '#1E1B4B',       // Dark indigo - emphasized text, dark elements (from primary hue)
  
  // ACCENT (Amber) - from hue #F59E0B
  accent: '#F59E0B',            // Amber - ONE attention element per screen
  accentTint: '#FEF3C7',        // Light amber - soft highlight backgrounds
  accentLight: '#FBBF24',       // Lighter amber - hover on accent (from accent hue)
  accentDark: '#D97706',        // Dark amber - pressed accent (from accent hue)
  
  // NEUTRALS (not counted as colors)
  background: '#FFFFFF',        // Pure white
  surface: '#F5F5FA',           // Very light gray
  surfaceDark: '#E8E8F0',       // Light gray for elevated surfaces (neutral)
  border: '#D1D1DB',            // Mid gray for borders (neutral)
  borderLight: '#E5E5EA',       // Lighter border (neutral)
  
  // TEXT
  textPrimary: '#1E1B4B',       // Dark indigo - body text (from primary hue)
  textSecondary: '#6B6B80',     // Mid gray - secondary text (neutral)
  textDisabled: '#A0A0B0',      // Light gray - disabled text (neutral)
  textOnPrimary: '#FFFFFF',     // White text on indigo
  textOnAccent: '#1E1B4B',      // Dark indigo text on amber (contrast)
  
  // STATES (derived from two hues)
  disabled: '#D1D1DB',          // Gray (neutral)
  hover: '#6366F1',             // Light indigo (from primary hue)
  pressed: '#2C2584',           // Darker indigo (from primary hue)
  selected: '#EEF0FF',          // Indigo tint (from primary hue)
  focus: '#3730A3',             // Primary indigo
  
  // SEMANTIC (must use two-tone palette only)
  // Success/positive: use primary indigo
  success: '#3730A3',           // Indigo for positive states
  successTint: '#EEF0FF',       // Light indigo background
  // Warning/attention: use accent amber
  warning: '#F59E0B',           // Amber for attention
  warningTint: '#FEF3C7',       // Light amber background
  // Error/destructive: NOT IMPLEMENTED - see report section 7
  // Info/neutral: use primary indigo
  info: '#3730A3',              // Indigo for informational
  infoTint: '#EEF0FF',          // Light indigo background
} as const;

// ============================================================================
// DARK MODE PALETTE
// ============================================================================

export const darkColors = {
  // PRIMARY (Indigo) - adjusted for dark mode
  primary: '#6366F1',           // Lighter indigo for visibility on dark
  primaryTint: '#2C2584',       // Dark indigo for subtle backgrounds
  primaryLight: '#8B8FF1',      // Even lighter for hovers (from primary hue)
  primaryDark: '#1E1B4B',       // Dark indigo for very dark elements
  
  // ACCENT (Amber) - adjusted for dark mode
  accent: '#FBBF24',            // Lighter amber for visibility
  accentTint: '#D97706',        // Darker amber for subtle backgrounds
  accentLight: '#FCD34D',       // Lightest amber for hovers (from accent hue)
  accentDark: '#B45309',        // Darkest amber for pressed (from accent hue)
  
  // NEUTRALS
  background: '#1E1B4B',        // Dark indigo background (from primary hue)
  surface: '#2C2584',           // Slightly lighter indigo surface (from primary hue)
  surfaceDark: '#1A1748',       // Even darker indigo (from primary hue)
  border: '#4B4B6B',            // Mid gray border (neutral with indigo tint)
  borderLight: '#3B3B5B',       // Darker border (neutral with indigo tint)
  
  // TEXT
  textPrimary: '#F5F5FA',       // Very light gray - main text
  textSecondary: '#A0A0B0',     // Mid gray - secondary text
  textDisabled: '#6B6B80',      // Darker gray - disabled
  textOnPrimary: '#F5F5FA',     // Light text on indigo
  textOnAccent: '#1E1B4B',      // Dark indigo on amber
  
  // STATES
  disabled: '#4B4B6B',          // Dark gray
  hover: '#8B8FF1',             // Light indigo (from primary hue)
  pressed: '#3730A3',           // Darker indigo (from primary hue)
  selected: '#2C2584',          // Dark indigo tint (from primary hue)
  focus: '#6366F1',             // Primary indigo (adjusted)
  
  // SEMANTIC
  success: '#6366F1',           // Lighter indigo
  successTint: '#2C2584',       // Dark indigo background
  warning: '#FBBF24',           // Lighter amber
  warningTint: '#D97706',       // Dark amber background
  info: '#6366F1',              // Lighter indigo
  infoTint: '#2C2584',          // Dark indigo background
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ThemeColors = typeof lightColors;
export type ColorName = keyof ThemeColors;

// Default export for compatibility
export const colors = lightColors;
