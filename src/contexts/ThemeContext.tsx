/**
 * Theme Context - Forge Indigo Design System
 * System / Light / Dark mode support
 * Persisted to AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, _setRuntimeColors, type ThemeColors as BaseThemeColors } from '../theme/colors';

const STORAGE_KEY_MODE = '@forgemind:theme_mode';
const STORAGE_KEY_DARK_LEGACY = '@forgemind:dark_mode';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

// Re-export ThemeColors for components
export type ThemeColors = BaseThemeColors;

// Compatibility type for legacy code using backgroundLight/backgroundDark
export interface LegacyThemeColors extends BaseThemeColors {
  // All fields are already in BaseThemeColors (including raised, secondary, tertiary, error, backgroundLight, backgroundDark)
  // This interface now just serves as a marker type
}

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  themeColors: LegacyThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);
  const systemColorScheme = useColorScheme();

  // Resolve mode to actual theme
  const resolvedTheme: ResolvedTheme = 
    mode === 'system' 
      ? (systemColorScheme === 'dark' ? 'dark' : systemColorScheme === 'light' ? 'light' : 'dark')
      : mode;

  const isDark = resolvedTheme === 'dark';

  // Load theme mode on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      // Try new key first
      const storedMode = await AsyncStorage.getItem(STORAGE_KEY_MODE);
      if (storedMode) {
        const parsed = JSON.parse(storedMode);
        if (parsed.mode === 'system' || parsed.mode === 'light' || parsed.mode === 'dark') {
          setModeState(parsed.mode);
        }
      } else {
        // Migrate from old key
        const storedDark = await AsyncStorage.getItem(STORAGE_KEY_DARK_LEGACY);
        if (storedDark) {
          const parsed = JSON.parse(storedDark);
          const migratedMode: ThemeMode = parsed.dark === true ? 'dark' : 'light';
          setModeState(migratedMode);
          // Save to new key but keep old key for compatibility
          await AsyncStorage.setItem(STORAGE_KEY_MODE, JSON.stringify({ mode: migratedMode }));
        }
        // else: no stored preference, keep default 'system'
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    try {
      setModeState(newMode);
      await AsyncStorage.setItem(STORAGE_KEY_MODE, JSON.stringify({ mode: newMode }));
    } catch (error) {
      console.error('[ThemeContext] Failed to save theme mode:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode: ThemeMode = isDark ? 'light' : 'dark';
      setModeState(newMode);
      await AsyncStorage.setItem(STORAGE_KEY_MODE, JSON.stringify({ mode: newMode }));
    } catch (error) {
      console.error('[ThemeContext] Failed to toggle theme:', error);
    }
  };

  const baseColors = isDark ? darkColors : lightColors;
  
  // Update runtime colors for static imports (backward compatibility)
  useEffect(() => {
    _setRuntimeColors(baseColors);
  }, [isDark]);
  
  // Add legacy compatibility fields - cast to satisfy type checker
  const themeColors = {
    ...baseColors,
    backgroundLight: baseColors.backgroundLight,  // LEGACY ALIAS, remove after migration
    backgroundDark: baseColors.backgroundDark,    // LEGACY ALIAS, remove after migration
    secondary: baseColors.secondary,              // LEGACY ALIAS, remove after migration
    tertiary: baseColors.tertiary,                // LEGACY ALIAS, remove after migration
    error: baseColors.error,                      // LEGACY ALIAS, remove after migration
  } as LegacyThemeColors;

  return (
    <ThemeContext.Provider value={{ mode, isDark, themeColors, setMode, toggleTheme, isLoading }}>
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
