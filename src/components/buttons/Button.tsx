/**
 * ForgeMind Design System - Button Component
 * Variants: primary, secondary, tertiary, destructive
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { typography, borderRadius, spacing } from '../../theme';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const { themeColors } = useTheme();

  const dynamicStyles = getDynamicStyles(themeColors);

  const containerStyle = [
    styles.base,
    dynamicStyles[variant],
    disabled && styles.disabled,
    fullWidth && styles.fullWidth,
    style,
  ];

  const textStyle = [
    styles.text,
    dynamicStyles[`${variant}Text` as keyof ReturnType<typeof getDynamicStyles>] as TextStyle,
    disabled && dynamicStyles.disabledText,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? themeColors.buttonPrimaryText : themeColors.text}
        />
      ) : (
        <Text style={textStyle}>{variant === 'primary' ? title.toUpperCase() : title}</Text>
      )}
    </TouchableOpacity>
  );
};

const getDynamicStyles = (colors: ThemeColors) => ({
  // Primary: Filled button with theme-aware colors
  primary: {
    backgroundColor: colors.buttonPrimary,
  },
  primaryText: {
    color: colors.buttonPrimaryText,
    ...typography.buttonText,
  },
  // Secondary: Outlined with border, text matches theme
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    ...typography.buttonText,
  },
  // Tertiary: Text-only, theme text color
  tertiary: {
    backgroundColor: 'transparent',
  },
  tertiaryText: {
    color: colors.text,
    ...typography.buttonText,
  },
  // Destructive: Uses accent (PINK) with proper contrast
  destructive: {
    backgroundColor: colors.accent,
  },
  destructiveText: {
    color: colors.accentText,
    ...typography.buttonText,
  },
  disabledText: {
    color: colors.disabled,
  },
});

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.buttonText,
  },
});
