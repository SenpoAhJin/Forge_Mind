/**
 * ForgeMind Design System - Slider Components
 * Types: Body Size (continuous 0.0-1.0), Condition (discrete 1-5)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, typography, spacing } from '../../theme';

// Body Size Slider: Continuous, 0.0–1.0, thumb with label, track shows gradient
interface BodySizeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
}

export const BodySizeSlider: React.FC<BodySizeSliderProps> = ({
  value,
  onValueChange,
  label = 'Body Size',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={0}
        maximumValue={1}
        step={0.01}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
      <View style={styles.valueContainer}>
        <Text style={styles.valueLabel}>Smaller</Text>
        <Text style={styles.valueText}>{value.toFixed(2)}</Text>
        <Text style={styles.valueLabel}>Larger</Text>
      </View>
    </View>
  );
};

// Condition Slider: 1–5 discrete steps, each step labeled with icon (poor → new)
interface ConditionSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
}

export const ConditionSlider: React.FC<ConditionSliderProps> = ({
  value,
  onValueChange,
  label = 'Condition',
}) => {
  const getConditionLabel = (val: number) => {
    switch (val) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'New';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={1}
        maximumValue={5}
        step={1}
        minimumTrackTintColor={colors.success}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.success}
      />
      <View style={styles.conditionLabels}>
        {[1, 2, 3, 4, 5].map((step) => (
          <Text
            key={step}
            style={[
              styles.conditionLabel,
              value === step && styles.conditionLabelActive,
            ]}
          >
            {step}
          </Text>
        ))}
      </View>
      <Text style={styles.conditionText}>{getConditionLabel(value)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  valueLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  valueText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  conditionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  conditionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 30,
    textAlign: 'center',
  },
  conditionLabelActive: {
    color: colors.success,
    fontWeight: '700',
  },
  conditionText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
