/**
 * ForgeMind Design System - Input Components
 * Types: Text Input, Text Area, Dropdown, Photo Upload
 * Auto-applies proper case (title case) to all text inputs
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { typography, borderRadius, spacing } from '../../theme';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';
import { toProperCase, isAllLowercase } from '../../utils/textFormatting';

// Text Input: Rounded 8px, border 1px, focus state with primary color border
interface TextInputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);

  const handleTextChange = (text: string) => {
    // Auto-apply proper case unless it's a password, email field, or numeric field
    if (secureTextEntry || keyboardType === 'email-address' || keyboardType === 'numeric' || keyboardType === 'phone-pad') {
      onChangeText(text);
    } else {
      const formatted = isAllLowercase(text) ? toProperCase(text) : text;
      onChangeText(formatted);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={[dynamicStyles.label, styles.label]}>{label}</Text> : null}
      <TextInput
        style={[
          dynamicStyles.textInput,
          styles.textInput,
          isFocused && dynamicStyles.textInputFocused,
          error && dynamicStyles.textInputError,
        ]}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={themeColors.textDisabled}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {error ? <Text style={[dynamicStyles.errorText, styles.errorText]}>{error}</Text> : null}
    </View>
  );
};

// Text Area: Same as text input, min 3 rows
interface TextAreaFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  minRows?: number;
  error?: string;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  minRows = 3,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);

  const handleTextChange = (text: string) => {
    // Auto-apply proper case to text areas only if all lowercase
    const formatted = isAllLowercase(text) ? toProperCase(text) : text;
    onChangeText(formatted);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={[dynamicStyles.label, styles.label]}>{label}</Text> : null}
      <TextInput
        style={[
          dynamicStyles.textArea,
          styles.textArea,
          { minHeight: minRows * 20 },
          isFocused && dynamicStyles.textInputFocused,
          error && dynamicStyles.textInputError,
        ]}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={themeColors.textDisabled}
        multiline
        textAlignVertical="top"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {error ? <Text style={[dynamicStyles.errorText, styles.errorText]}>{error}</Text> : null}
    </View>
  );
};

// Dropdown: Rounded 8px, chevron icon, border 1px
interface DropdownFieldProps {
  label?: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  error?: string;
}

export const DropdownField: React.FC<DropdownFieldProps> = ({
  label,
  value,
  placeholder,
  onPress,
  error,
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  
  return (
    <View style={styles.container}>
      {label ? <Text style={[dynamicStyles.label, styles.label]}>{label}</Text> : null}
      <TouchableOpacity
        style={[dynamicStyles.dropdown, styles.dropdown, error && dynamicStyles.textInputError]}
        onPress={onPress}
      >
        <Text style={[dynamicStyles.dropdownText, styles.dropdownText, !value && dynamicStyles.dropdownPlaceholder]}>
          {value || placeholder}
        </Text>
        <Text style={[dynamicStyles.chevron, styles.chevron]}>▼</Text>
      </TouchableOpacity>
      {error ? <Text style={[dynamicStyles.errorText, styles.errorText]}>{error}</Text> : null}
    </View>
  );
};

// Photo Upload: Dashed border, upload icon, drag-drop zone
interface PhotoUploadFieldProps {
  label?: string;
  onPress: () => void;
  imageCount?: number;
}

export const PhotoUploadField: React.FC<PhotoUploadFieldProps> = ({
  label,
  onPress,
  imageCount = 0,
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  
  return (
    <View style={styles.container}>
      {label ? <Text style={[dynamicStyles.label, styles.label]}>{label}</Text> : null}
      <TouchableOpacity style={[dynamicStyles.photoUpload, styles.photoUpload]} onPress={onPress}>
        <Text style={styles.uploadIcon}>📷</Text>
        <Text style={[dynamicStyles.uploadText, styles.uploadText]}>
          {imageCount > 0 ? `${imageCount} photo(s) selected` : 'Tap to upload photos'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const getDynamicStyles = (colors: ThemeColors) => ({
  label: {
    color: colors.textPrimary,
  },
  textInput: {
    color: colors.textPrimary,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  textInputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  textInputError: {
    borderColor: colors.error,
  },
  textArea: {
    color: colors.textPrimary,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  dropdown: {
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  dropdownText: {
    color: colors.textPrimary,
  },
  dropdownPlaceholder: {
    color: colors.textDisabled,
  },
  chevron: {
    color: colors.textSecondary,
  },
  photoUpload: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  uploadText: {
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
  },
});

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  textInput: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  textArea: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dropdownText: {
    ...typography.body,
    flex: 1,
  },
  chevron: {
    ...typography.caption,
    marginLeft: spacing.sm,
  },
  photoUpload: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  uploadText: {
    ...typography.body,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
