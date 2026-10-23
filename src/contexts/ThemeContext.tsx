/**
 * Theme Context - Two-Tone Design System
 * Light/Dark mode toggle using INDIGO + PINK palette
 * Persisted to AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors as BaseThemeColors } from '../theme/colors';

const STORAGE_KEY = '@forgemind:dark_mode';

export type ThemeMode = 'light' | 'dark';

// Re-export ThemeColors for components
export type ThemeColors = BaseThemeColors;

// Compatibility type for legacy code using backgroundLight/backgroundDark
export interface LegacyThemeColors extends BaseThemeColors {
  backgroundLight: string;  // Maps to background
  backgroundDark: string;   // Maps to surface or textPrimary depending on context
  secondary: string;        // Maps to accent (PINK, was third color)
  tertiary: string;         // Maps to accent (PINK, was third color)
  error: string;            // NOT IMPLEMENTED - maps to PINK temporarily
}

interface ThemeContextType {
  isDark: boolean;
  themeColors: LegacyThemeColors;
  toggleTheme: () => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load dark mode preference on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setIsDark(parsed.dark === true);
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newDark = !isDark;
      setIsDark(newDark);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dark: newDark }));
    } catch (error) {
      console.error('[ThemeContext] Failed to save theme:', error);
    }
  };

  const baseColors = isDark ? darkColors : lightColors;
  
  // Add legacy compatibility fields - cast to satisfy type checker
  const themeColors = {
    ...baseColors,
    backgroundLight: baseColors.background,  // LEGACY ALIAS, remove after migration
    backgroundDark: baseColors.surface,      // LEGACY ALIAS, remove after migration
    secondary: baseColors.accent,            // LEGACY ALIAS, remove after migration (was third color, now PINK)
    tertiary: baseColors.accent,             // LEGACY ALIAS, remove after migration (was third color, now PINK)
    error: baseColors.warning,               // LEGACY ALIAS, remove after migration (ERROR NOT IMPLEMENTED)
  } as LegacyThemeColors;

  return (
    <ThemeContext.Provider value={{ isDark, themeColors, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
