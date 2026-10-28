/**
 * ForgeMind Forge Indigo Design System
 * Light "Forge Indigo" + Dark "Forge Indigo Night"
 *
 * TWO-TONE: Indigo (primary) + Pink (accent), plus neutrals.
 * Red / amber / green / blue are STATUS colors only (always with icon or label).
 * Organizer and cosplayer share the same two tones: secondary = primary.
 */

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
// DARK MODE - "Forge Indigo Night"
// ============================================================================

export const darkColors = {
  // Base
  background: '#14122B',
  text: '#FFFFFF',
  textSecondary: '#B4B0D2',

  // Surfaces
  card: '#1F1C3D',
  border: '#3D3868',
  borderStrong: '#4A4580',
  raised: '#2A2650',

  // States
  disabled: '#6F6B8E',
  hover: withAlpha('#FFFFFF', 0.90),
  pressed: '#FFFFFF',
  selected: withAlpha('#7258EA', 0.10),

  // Buttons
  buttonPrimary: '#7258EA',
  buttonPrimaryText: '#FFFFFF',
  buttonHighlight: '#E0489A',
  buttonHighlightText: '#14122B',

  // Highlight
  highlightSoft: withAlpha('#E0489A', 0.15),
  accent: '#E0489A',
  accentText: '#14122B',

  // Toggle
  toggleTrackOff: '#6F6B8E',
  toggleTrackOn: '#E0489A',
  toggleKnobOff: '#FFFFFF',
  toggleKnobOn: '#14122B',

  // Tab Bar
  tabBarBg: '#1F1C3D',
  tabBarBorder: '#3D3868',
  tabBarInactive: '#B4B0D2',
  tabBarActivePill: '#7258EA',
  tabBarActiveIcon: '#FFFFFF',
  tabBarActiveLabel: '#FFFFFF',

  // Overlay
  overlay: withAlpha('#14122B', 0.70),
  popupCard: '#2A2650',
  popupBorder: '#3D3868',
  shadow: 'transparent',

  // Text on colors
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#14122B',

  // Legacy aliases - remove after migration
  primary: '#7258EA',
  primaryTint: withAlpha('#7258EA', 0.10),
  primaryLight: withAlpha('#7258EA', 0.20),
  primaryDark: '#5B3FD9',
  surface: '#1F1C3D',
  surfaceDark: '#2A2650',
  borderLight: '#3D3868',
  textPrimary: '#FFFFFF',
  textDisabled: '#6F6B8E',
  focus: '#7258EA',
  success: '#3DD68C',
  successTint: withAlpha('#3DD68C', 0.20),
  warning: '#F2A93B',
  warningTint: withAlpha('#F2A93B', 0.20),
  info: '#5AB0F5',
  infoTint: withAlpha('#5AB0F5', 0.20),
  backdrop: withAlpha('#14122B', 0.70),
  backgroundLight: '#14122B',
  backgroundDark: '#0E0C20',
  secondary: '#7258EA',
  tertiary: '#E0489A',
  error: '#FF6B7A',
} as const;

// ============================================================================
// LIGHT MODE - "Forge Indigo"
// ============================================================================

export const lightColors = {
  // Base
  background: '#FBFAFF',
  text: '#1B1836',
  textSecondary: '#5A5675',

  // Surfaces
  card: '#F1EFFA',
  border: '#DCD8EE',
  borderStrong: '#C5BFDC',
  raised: '#FFFFFF',

  // States
  disabled: '#9A97B0',
  hover: withAlpha('#1B1836', 0.90),
  pressed: '#1B1836',
  selected: withAlpha('#5B3FD9', 0.10),

  // Buttons
  buttonPrimary: '#5B3FD9',
  buttonPrimaryText: '#FFFFFF',
  buttonHighlight: '#D12C86',
  buttonHighlightText: '#FFFFFF',

  // Highlight
  highlightSoft: withAlpha('#D12C86', 0.15),
  accent: '#D12C86',
  accentText: '#FFFFFF',

  // Toggle
  toggleTrackOff: '#9A97B0',
  toggleTrackOn: '#D12C86',
  toggleKnobOff: '#FFFFFF',
  toggleKnobOn: '#14122B',

  // Tab Bar
  tabBarBg: '#F1EFFA',
  tabBarBorder: '#DCD8EE',
  tabBarInactive: '#5A5675',
  tabBarActivePill: '#5B3FD9',
  tabBarActiveIcon: '#FFFFFF',
  tabBarActiveLabel: '#1B1836',

  // Overlay
  overlay: withAlpha('#14122B', 0.60),
  popupCard: '#FFFFFF',
  popupBorder: '#DCD8EE',
  shadow: withAlpha('#14122B', 0.12),

  // Text on colors
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // Legacy aliases - remove after migration
  primary: '#5B3FD9',
  primaryTint: withAlpha('#5B3FD9', 0.10),
  primaryLight: withAlpha('#5B3FD9', 0.20),
  primaryDark: '#4A2FB5',
  surface: '#F1EFFA',
  surfaceDark: '#E7E3F6',
  borderLight: '#DCD8EE',
  textPrimary: '#1B1836',
  textDisabled: '#9A97B0',
  focus: '#5B3FD9',
  success: '#17794C',
  successTint: withAlpha('#17794C', 0.10),
  warning: '#A85F00',
  warningTint: withAlpha('#A85F00', 0.10),
  info: '#1F6FB5',
  infoTint: withAlpha('#1F6FB5', 0.10),
  backdrop: withAlpha('#14122B', 0.60),
  backgroundLight: '#FBFAFF',
  backgroundDark: '#14122B',
  secondary: '#5B3FD9',
  tertiary: '#D12C86',
  error: '#C62839',
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

// ============================================================================
// DYNAMIC DEFAULT EXPORT
// ============================================================================

// DEPRECATED: Use useTheme() hook instead for dynamic theme support
// This static export is kept for backward compatibility during migration
// It will be removed in a future version
let _runtimeColors: ThemeColors = lightColors;

export function _setRuntimeColors(newColors: ThemeColors) {
  _runtimeColors = newColors;
  // Trigger re-render by mutating the proxy
  Object.assign(colors, newColors);
}

// Create a proxy that always returns the current runtime colors
export const colors = new Proxy<ThemeColors>({} as ThemeColors, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string' && prop in _runtimeColors) {
      return _runtimeColors[prop as keyof ThemeColors];
    }
    return undefined;
  },
  set(_target, prop: string | symbol, value: any) {
    if (typeof prop === 'string' && prop in _runtimeColors) {
      (_runtimeColors as any)[prop] = value;
      return true;
    }
    return false;
  },
  ownKeys(_target) {
    return Object.keys(_runtimeColors);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (typeof prop === 'string' && prop in _runtimeColors) {
      return {
        enumerable: true,
        configurable: true,
        value: _runtimeColors[prop as keyof ThemeColors],
      };
    }
    return undefined;
  },
});