/**
 * Theme Context
 * User-customizable color themes and visual preferences
 * Persisted to AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@forgemind:user_theme';

export type ThemePreset = 'purple' | 'blue' | 'pink' | 'green' | 'orange';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

const themePresets: Record<ThemePreset, ThemeColors> = {
  purple: {
    primary: '#7C3AED',
    secondary: '#EC4899',
    accent: '#F59E0B',
  },
  blue: {
    primary: '#3B82F6',
    secondary: '#06B6D4',
    accent: '#8B5CF6',
  },
  pink: {
    primary: '#EC4899',
    secondary: '#F43F5E',
    accent: '#FCD34D',
  },
  green: {
    primary: '#10B981',
    secondary: '#14B8A6',
    accent: '#F59E0B',
  },
  orange: {
    primary: '#F97316',
    secondary: '#EF4444',
    accent: '#FBBF24',
  },
};

interface ThemeContextType {
  currentTheme: ThemePreset;
  themeColors: ThemeColors;
  setTheme: (theme: ThemePreset) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>('purple');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentTheme(parsed.theme || 'purple');
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (theme: ThemePreset) => {
    try {
      setCurrentTheme(theme);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ theme }));
    } catch (error) {
      console.error('[ThemeContext] Failed to save theme:', error);
    }
  };

  const themeColors = themePresets[currentTheme];

  return (
    <ThemeContext.Provider value={{ currentTheme, themeColors, setTheme, isLoading }}>
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
