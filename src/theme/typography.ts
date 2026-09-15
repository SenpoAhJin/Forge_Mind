/**
 * ForgeMind Design System - Typography Scale
 * From Phase 0 Design System Spec v0.2.1
 * Font Family: Inter (with system fallback)
 */

import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as TextStyle['fontWeight'], // Bold
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as TextStyle['fontWeight'], // Semibold
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'], // Semibold
    lineHeight: 28,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'], // Regular
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'], // Regular
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'], // Regular
    lineHeight: 16,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'], // Semibold
    lineHeight: 20,
  },
} as const;

export type TypographyVariant = keyof typeof typography;
