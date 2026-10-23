/**
 * ForgeMind Two-Tone Design System
 * BLACK + PINK + WHITE ONLY
 * 
 * No indigo, no gray, no teal, no orange, no fourth color.
 */

// ============================================================================
// BASE COLORS
// ============================================================================

const BLACK = '#000000';
const PINK = '#FF8FB1';
const WHITE = '#FFFFFF';

// ============================================================================
// OPACITY HELPER
// ============================================================================

export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================================
// DARK MODE (default)
// ============================================================================

export const darkColors = {
  // Base
  background: BLACK,
  text: WHITE,
  textSecondary: withAlpha(WHITE, 0.75),
  
  // Surfaces
  card: withAlpha(WHITE, 0.08),
  border: withAlpha(WHITE, 0.20),
  borderStrong: withAlpha(WHITE, 0.30),
  
  // States
  disabled: withAlpha(WHITE, 0.40),
  hover: withAlpha(WHITE, 0.90),
  pressed: WHITE,
  selected: withAlpha(WHITE, 0.10),
  
  // Buttons
  buttonPrimary: WHITE,              // bg
  buttonPrimaryText: BLACK,          // text
  buttonHighlight: PINK,             // bg
  buttonHighlightText: BLACK,        // text
  
  // Highlight
  highlightSoft: withAlpha(PINK, 0.15),
  accent: PINK,
  accentText: BLACK,
  
  // Toggle
  toggleTrackOff: withAlpha(WHITE, 0.40),
  toggleTrackOn: PINK,
  toggleKnobOff: WHITE,
  toggleKnobOn: BLACK,
  
  // Tab Bar
  tabBarBg: BLACK,
  tabBarBorder: withAlpha(WHITE, 0.20),
  tabBarInactive: withAlpha(WHITE, 0.75),
  tabBarActivePill: PINK,
  tabBarActiveIcon: BLACK,
  tabBarActiveLabel: WHITE,
  
  // Overlay
  overlay: withAlpha(BLACK, 0.70),
  popupCard: BLACK,
  popupBorder: withAlpha(WHITE, 0.30),
  shadow: 'transparent',  // No shadow in dark mode, use border
  
  // Text on colors
  textOnPrimary: WHITE,
  textOnAccent: BLACK,
  
  // Legacy aliases - remove after migration
  primary: BLACK as string,
  primaryTint: withAlpha(WHITE, 0.08),
  primaryLight: withAlpha(WHITE, 0.20),
  primaryDark: BLACK as string,
  surface: withAlpha(WHITE, 0.08),
  surfaceDark: withAlpha(WHITE, 0.12),
  borderLight: withAlpha(WHITE, 0.12),
  textPrimary: WHITE as string,
  textDisabled: withAlpha(WHITE, 0.40),
  focus: WHITE as string,
  success: WHITE as string,
  successTint: withAlpha(WHITE, 0.10),
  warning: PINK as string,
  warningTint: withAlpha(PINK, 0.15),
  info: WHITE as string,
  infoTint: withAlpha(WHITE, 0.10),
  backdrop: withAlpha(BLACK, 0.70),
  backgroundLight: WHITE as string,
  backgroundDark: BLACK as string,
  secondary: PINK as string,
  tertiary: PINK as string,
  error: PINK as string,
} as const;

// ============================================================================
// LIGHT MODE
// ============================================================================

export const lightColors = {
  // Base
  background: WHITE,
  text: BLACK,
  textSecondary: withAlpha(BLACK, 0.75),
  
  // Surfaces
  card: withAlpha(BLACK, 0.06),
  border: withAlpha(BLACK, 0.20),
  borderStrong: withAlpha(BLACK, 0.20),
  
  // States
  disabled: withAlpha(BLACK, 0.40),
  hover: withAlpha(BLACK, 0.90),
  pressed: BLACK,
  selected: withAlpha(BLACK, 0.10),
  
  // Buttons
  buttonPrimary: BLACK,              // bg
  buttonPrimaryText: WHITE,          // text
  buttonHighlight: PINK,             // bg
  buttonHighlightText: BLACK,        // text
  
  // Highlight
  highlightSoft: withAlpha(PINK, 0.15),
  accent: PINK,
  accentText: BLACK,
  
  // Toggle
  toggleTrackOff: withAlpha(BLACK, 0.40),
  toggleTrackOn: PINK,
  toggleKnobOff: WHITE,
  toggleKnobOn: BLACK,
  
  // Tab Bar
  tabBarBg: WHITE,
  tabBarBorder: withAlpha(BLACK, 0.20),
  tabBarInactive: withAlpha(BLACK, 0.75),
  tabBarActivePill: PINK,
  tabBarActiveIcon: BLACK,
  tabBarActiveLabel: BLACK,
  
  // Overlay
  overlay: withAlpha(BLACK, 0.60),
  popupCard: WHITE,
  popupBorder: withAlpha(BLACK, 0.20),
  shadow: withAlpha(BLACK, 0.12),
  
  // Text on colors
  textOnPrimary: WHITE,
  textOnAccent: BLACK,
  
  // Legacy aliases - remove after migration
  primary: BLACK as string,
  primaryTint: withAlpha(BLACK, 0.06),
  primaryLight: withAlpha(BLACK, 0.20),
  primaryDark: BLACK as string,
  surface: withAlpha(BLACK, 0.06),
  surfaceDark: withAlpha(BLACK, 0.08),
  borderLight: withAlpha(BLACK, 0.12),
  textPrimary: BLACK as string,
  textDisabled: withAlpha(BLACK, 0.40),
  focus: BLACK as string,
  success: BLACK as string,
  successTint: withAlpha(BLACK, 0.10),
  warning: PINK as string,
  warningTint: withAlpha(PINK, 0.15),
  info: BLACK as string,
  infoTint: withAlpha(BLACK, 0.10),
  backdrop: withAlpha(BLACK, 0.60),
  backgroundLight: WHITE as string,
  backgroundDark: BLACK as string,
  secondary: PINK as string,
  tertiary: PINK as string,
  error: PINK as string,
} as const;

// ============================================================================
// LAYOUT TOKENS
// ============================================================================

export const layout = {
  // Spacing: 4, 8, 12, 16, 24, 32 only
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  
  // Screen
  screenPadding: 16,
  headerHeight: 56,
  
  // Rows
  rowMinHeight: 48,
  tapTargetMin: 44,
  
  // Sizes
  iconSize: 24,
  radiusCard: 12,
  radiusPill: 999,
  radiusToggle: 999,
  
  // Tab Bar
  tabBarHeight: 64,  // + safe area
  tabLabelSize: 12,
  
  // Typography
  textTitle: 24,
  textSection: 18,
  textBody: 16,
  textSmall: 12,
  
  // Gaps
  sectionGap: 24,
  itemGap: 12,
  labelValueGap: 4,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ThemeColors = typeof darkColors;
export type ColorName = keyof ThemeColors;

// Default export
export const colors = lightColors;
