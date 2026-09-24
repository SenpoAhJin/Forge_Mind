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
  // Backgrounds
  surface: string;
  backgroundLight: string;
  backgroundDark: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  // UI Elements
  border: string;
  // Semantic (non-themed)
  success: string;
  warning: string;
  error: string;
  info: string;
}

const themePresets: Record<ThemePreset, ThemeColors> = {
  purple: {
    primary: '#7C3AED',
    secondary: '#EC4899',
    accent: '#F59E0B',
    surface: '#F5F5F7',
    backgroundLight: '#FFFFFF',
    backgroundDark: '#1A1A2E',
    textPrimary: '#2C2C2C',
    textSecondary: '#6B6B6B',
    textDisabled: '#B0B0B0',
    border: '#E0E0E0',
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
  },
  blue: {
    primary: '#3B82F6',
    secondary: '#06B6D4',
    accent: '#8B5CF6',
    surface: '#EFF6FF',
    backgroundLight: '#FFFFFF',
    backgroundDark: '#1E3A8A',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textDisabled: '#CBD5E1',
    border: '#E2E8F0',
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
  },
  pink: {
    primary: '#EC4899',
    secondary: '#F43F5E',
    accent: '#FCD34D',
    surface: '#FDF2F8',
    backgroundLight: '#FFFFFF',
    backgroundDark: '#831843',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textDisabled: '#D1D5DB',
    border: '#F3F4F6',
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
  },
  green: {
    primary: '#10B981',
    secondary: '#14B8A6',
    accent: '#F59E0B',
    surface: '#F0FDF4',
    backgroundLight: '#FFFFFF',
    backgroundDark: '#064E3B',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textDisabled: '#9CA3AF',
    border: '#E5E7EB',
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
  },
  orange: {
    primary: '#F97316',
    secondary: '#EF4444',
    accent: '#FBBF24',
    surface: '#FFF7ED',
    backgroundLight: '#FFFFFF',
    backgroundDark: '#7C2D12',
    textPrimary: '#1C1917',
    textSecondary: '#78716C',
    textDisabled: '#D6D3D1',
    border: '#F5F5F4',
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
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
