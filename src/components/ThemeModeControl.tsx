/**
 * ThemeModeControl
 * Three icon buttons (System / Light / Dark) for screens that cannot reach
 * the Appearance screen, such as Login and Register.
 * Each button is 44x44 with an accessibility label.
 */
import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { spacing, borderRadius } from '../theme';

const OPTIONS: { value: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { value: 'system', icon: 'phone-portrait-outline', label: 'System theme' },
  { value: 'light', icon: 'sunny-outline', label: 'Light theme' },
  { value: 'dark', icon: 'moon-outline', label: 'Dark theme' },
];

export const ThemeModeControl: React.FC = () => {
  const { themeColors: colors, mode, setMode } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          position: 'absolute',
          top: Platform.OS === 'ios' ? 56 : 36,
          right: spacing.lg,
          flexDirection: 'row',
          gap: spacing.xs,
          zIndex: 10,
        },
        button: {
          width: 44,
          height: 44,
          borderRadius: borderRadius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          justifyContent: 'center',
          alignItems: 'center',
        },
        buttonSelected: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const selected = mode === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.button, selected ? styles.buttonSelected : null]}
            onPress={() => setMode(option.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
          >
            <Ionicons
              name={option.icon}
              size={20}
              color={selected ? colors.textOnPrimary : colors.textSecondary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
