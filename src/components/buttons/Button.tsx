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
import { colors, typography, borderRadius, spacing } from '../../theme';

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
  const containerStyle = [
    styles.base,
    styles[variant],
    disabled && styles.disabled,
    fullWidth && styles.fullWidth,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text` as keyof typeof styles] as TextStyle,
    disabled && styles.disabledText,
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
          color={variant === 'primary' || variant === 'destructive' ? colors.backgroundLight : colors.primary}
        />
      ) : (
        <Text style={textStyle}>{variant === 'primary' ? title.toUpperCase() : title}</Text>
      )}
    </TouchableOpacity>
  );
};

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
  // Primary: Filled with primary color, white text, rounded 8px
  primary: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.backgroundLight,
    ...typography.buttonText,
  },
  // Secondary: Outlined with primary color, primary text, rounded 8px
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryText: {
    color: colors.primary,
    ...typography.buttonText,
  },
  // Tertiary: Text-only, primary text, no border
  tertiary: {
    backgroundColor: 'transparent',
  },
  tertiaryText: {
    color: colors.primary,
    ...typography.buttonText,
  },
  // Destructive: Filled with error color, white text, rounded 8px
  destructive: {
    backgroundColor: colors.error,
  },
  destructiveText: {
    color: colors.backgroundLight,
    ...typography.buttonText,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.buttonText,
  },
  disabledText: {
    color: colors.textDisabled,
  },
});
