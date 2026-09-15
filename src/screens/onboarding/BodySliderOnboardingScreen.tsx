/**
 * ForgeMind Onboarding - Body Slider Onboarding Screen
 * Base body toggle (male/female) → User.base_body_selection
 * Continuous slider (0.0–1.0) → User.body_size_slider
 * Uses BodySizeSlider component from FE-1 (first real usage)
 * Explicit copy: "This is for 3D preview only — not a scan, not a measurement."
 * Note: Editable later in settings
 * Transitions to: Character Browse Tutorial (cosplayer) or Organizer Dashboard (organizer-only)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, BodySizeSlider } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface BodySliderOnboardingScreenProps {
  onComplete: (baseBody: 'male' | 'female', bodySize: number) => void;
  onBack: () => void;
}

export const BodySliderOnboardingScreen: React.FC<BodySliderOnboardingScreenProps> = ({
  onComplete,
  onBack,
}) => {
  const [baseBodySelection, setBaseBodySelection] = useState<'male' | 'female'>('male');
  const [bodySizeSlider, setBodySizeSlider] = useState(0.5);

  const handleComplete = () => {
    onComplete(baseBodySelection, bodySizeSlider);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Body Approximation</Text>
        <Text style={styles.subtitle}>
          This helps us show you a 3D preview of how items might look on you.
        </Text>
        
        {/* Explicit copy per spec */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>📏 Important Note</Text>
          <Text style={styles.noticeText}>
            This is for 3D preview only — not a scan, not a measurement.
          </Text>
          <Text style={styles.noticeSubtext}>
            You can change this anytime in your profile settings.
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {/* Base Body Selection Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select a Base Body</Text>
          <Text style={styles.sectionDescription}>
            Choose the base body shape that best approximates your build
          </Text>
          
          <View style={styles.toggleContainer}>
            <Button
              title="Male"
              onPress={() => setBaseBodySelection('male')}
              variant={baseBodySelection === 'male' ? 'primary' : 'secondary'}
              style={styles.toggleButton}
            />
            <Button
              title="Female"
              onPress={() => setBaseBodySelection('female')}
              variant={baseBodySelection === 'female' ? 'primary' : 'secondary'}
              style={styles.toggleButton}
            />
          </View>
        </View>

        {/* Body Size Slider - using FE-1 component */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Adjust Body Size</Text>
          <Text style={styles.sectionDescription}>
            Slide to approximate your body size on a continuous scale
          </Text>
          
          <BodySizeSlider
            value={bodySizeSlider}
            onValueChange={setBodySizeSlider}
            label=""
          />
          
          <View style={styles.sliderInfo}>
            <Text style={styles.sliderInfoText}>
              Current value: <Text style={styles.sliderValue}>{bodySizeSlider.toFixed(2)}</Text>
            </Text>
            <Text style={styles.sliderInfoSubtext}>
              This is a self-approximation, not a precise measurement
            </Text>
          </View>
        </View>

        {/* Preview placeholder */}
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Preview</Text>
          <View style={styles.previewPlaceholder}>
            <Text style={styles.previewText}>
              👤
            </Text>
            <Text style={styles.previewSubtext}>
              {baseBodySelection === 'male' ? 'Male' : 'Female'} body
            </Text>
            <Text style={styles.previewSubtext}>
              Size: {bodySizeSlider.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.previewNote}>
            Full 3D preview will be available in your project dashboard
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Complete Setup"
          onPress={handleComplete}
          variant="primary"
          fullWidth
        />
        <Button title="Back" onPress={onBack} variant="tertiary" fullWidth />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  noticeCard: {
    backgroundColor: colors.info + '15', // 15% opacity
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  noticeTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.info,
    marginBottom: spacing.xs,
  },
  noticeText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  noticeSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  toggleButton: {
    flex: 1,
  },
  sliderInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  sliderInfoText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sliderValue: {
    fontWeight: '700',
    color: colors.primary,
  },
  sliderInfoSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  previewSection: {
    marginTop: spacing.lg,
  },
  previewLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  previewPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  previewText: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  previewSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
