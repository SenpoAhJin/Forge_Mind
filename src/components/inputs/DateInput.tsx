/**
 * FE-7 Step 2 Part A1: Web-Safe Date Input
 * Native DateTimePicker on mobile, validated text input on web
 * Accepts and returns YYYY-MM-DD strings
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface DateInputProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (dateString: string) => void;
  error?: string;
  minimumDate?: string; // YYYY-MM-DD
  placeholder?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  error,
  minimumDate,
  placeholder = 'YYYY-MM-DD',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [textValue, setTextValue] = useState(value);

  // Convert YYYY-MM-DD string to Date object for native picker
  const stringToDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    return new Date(dateStr + 'T00:00:00');
  };

  // Convert Date object to YYYY-MM-DD string
  const dateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Validate YYYY-MM-DD format
  const isValidFormat = (str: string): boolean => {
    return /^\d{4}-\d{2}-\d{2}$/.test(str);
  };

  // Handle native picker change
  const onPickerChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = dateToString(selectedDate);
      onChange(dateStr);
    }
  };

  // Handle web text input change
  const onTextChange = (text: string) => {
    setTextValue(text);
    // Only call onChange if format is valid
    if (isValidFormat(text)) {
      onChange(text);
    }
  };

  // Handle web text input blur (validate and correct)
  const onTextBlur = () => {
    if (isValidFormat(textValue)) {
      onChange(textValue);
    } else if (textValue.trim() === '') {
      onChange('');
    } else {
      // Invalid format - revert to last valid value
      setTextValue(value);
    }
  };

  if (Platform.OS === 'web') {
    // Web: Text input with format validation
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.webInput, error ? styles.inputError : null]}
          value={textValue}
          onChangeText={onTextChange}
          onBlur={onTextBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          maxLength={10}
        />
        <Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 2026-12-25)</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  // Mobile: Native DateTimePicker
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.dateButton, error ? styles.buttonError : null]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.dateButtonText}>{value || placeholder}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={stringToDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
          minimumDate={minimumDate ? stringToDate(minimumDate) : undefined}
        />
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  buttonError: {
    borderColor: colors.error,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  webInput: {
    ...typography.body,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
