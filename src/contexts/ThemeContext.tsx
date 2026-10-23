/**
 * Theme Context - Two-Tone Design System
 * Light/Dark mode toggle using Indigo + Amber palette
 * Persisted to AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors } from '../theme/colors';

const STORAGE_KEY = '@forgemind:dark_mode';

export type ThemeMode = 'light' | 'dark';

// Compatibility type for legacy code using backgroundLight/backgroundDark
export interface LegacyThemeColors extends ThemeColors {
  backgroundLight: string;  // Maps to background
  backgroundDark: string;   // Maps to surface or textPrimary depending on context
  secondary: string;        // Maps to accent (no longer a third color)
  error: string;            // NOT IMPLEMENTED - see report
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
  
  // Add legacy compatibility fields
  const themeColors: LegacyThemeColors = {
    ...baseColors,
    backgroundLight: baseColors.background,  // Legacy field maps to background
    backgroundDark: baseColors.surface,      // Legacy field maps to surface
    secondary: baseColors.accent,            // Legacy secondary is now accent (amber)
    error: baseColors.warning,               // ERROR NOT IMPLEMENTED - maps to warning temporarily
  };

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
