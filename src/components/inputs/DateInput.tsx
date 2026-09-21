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
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  placeholder?: string;
  optional?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  error,
  minDate,
  maxDate,
  placeholder = 'YYYY-MM-DD',
  optional = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // Convert YYYY-MM-DD string to Date object for native picker (LOCAL date, no UTC shift)
  const stringToDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  // Convert Date object to YYYY-MM-DD string
  const dateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle native picker value change (date is required, not optional)
  const onValueChange = (event: any, selectedDate: Date) => {
    const dateStr = dateToString(selectedDate);
    onChange(dateStr);
    // iOS: keep picker open until dismissed. Android: auto-closes, so close state here
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
  };

  // Handle picker dismiss (user cancelled without picking)
  const onDismiss = () => {
    setShowPicker(false);
  };

  // Handle web date input change
  const onWebDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value); // Empty string if cleared
  };

  if (Platform.OS === 'web') {
    // Web: Native HTML date input with calendar popup
    const InputElement = 'input' as any;
    
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <InputElement
          type="date"
          value={value}
          onChange={onWebDateChange}
          min={minDate || undefined}
          max={maxDate || undefined}
          style={{
            fontSize: typography.body.fontSize,
            backgroundColor: colors.backgroundLight,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: error ? colors.error : colors.border,
            borderRadius: borderRadius.md,
            paddingLeft: spacing.md,
            paddingRight: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
            color: colors.textPrimary,
            outlineColor: colors.primary,
            outlineWidth: 2,
            width: '100%',
          }}
        />
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
          onValueChange={onValueChange}
          onDismiss={onDismiss}
          minimumDate={minDate ? stringToDate(minDate) : undefined}
          maximumDate={maxDate ? stringToDate(maxDate) : undefined}
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
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
