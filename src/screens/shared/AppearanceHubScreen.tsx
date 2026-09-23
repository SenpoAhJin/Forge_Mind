/**
 * Appearance Hub Screen
 * Customize app theme, colors, and visual preferences
 * Changes apply to current user's interface only
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard, Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useTheme, ThemePreset } from '../../contexts/ThemeContext';

const themeInfo: Record<ThemePreset, { name: string; description: string; icon: string }> = {
  purple: {
    name: 'Purple Dream',
    description: 'Default vibrant purple with pink accents',
    icon: 'color-palette',
  },
  blue: {
    name: 'Ocean Blue',
    description: 'Cool blue tones with cyan highlights',
    icon: 'water',
  },
  pink: {
    name: 'Sakura Pink',
    description: 'Soft pink with warm yellow accents',
    icon: 'flower',
  },
  green: {
    name: 'Forest Green',
    description: 'Natural green with teal undertones',
    icon: 'leaf',
  },
  orange: {
    name: 'Sunset Orange',
    description: 'Warm orange with red and yellow',
    icon: 'sunny',
  },
};

export const AppearanceHubScreen: React.FC = () => {
  const { currentTheme, themeColors, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(currentTheme);

  const handleApplyTheme = async () => {
    await setTheme(selectedTheme);
  };

  const hasChanges = selectedTheme !== currentTheme;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Appearance Hub</Text>
        <Text style={styles.subtitle}>
          Customize your app's visual theme. Changes apply only to your interface.
        </Text>
      </View>

      {/* Current Theme Preview */}
      <StandardCard style={styles.previewCard}>
        <Text style={styles.sectionTitle}>Current Theme</Text>
        <View style={styles.currentTheme}>
          <Ionicons
            name={themeInfo[currentTheme].icon as any}
            size={32}
            color={themeColors.primary}
          />
          <View style={styles.currentThemeInfo}>
            <Text style={styles.currentThemeName}>{themeInfo[currentTheme].name}</Text>
            <Text style={styles.currentThemeDesc}>
              {themeInfo[currentTheme].description}
            </Text>
          </View>
        </View>

        {/* Color Swatches */}
        <View style={styles.colorSwatches}>
          <View style={styles.swatch}>
            <View style={[styles.swatchColor, { backgroundColor: themeColors.primary }]} />
            <Text style={styles.swatchLabel}>Primary</Text>
          </View>
          <View style={styles.swatch}>
            <View style={[styles.swatchColor, { backgroundColor: themeColors.secondary }]} />
            <Text style={styles.swatchLabel}>Secondary</Text>
          </View>
          <View style={styles.swatch}>
            <View style={[styles.swatchColor, { backgroundColor: themeColors.accent }]} />
            <Text style={styles.swatchLabel}>Accent</Text>
          </View>
        </View>
      </StandardCard>

      {/* Theme Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Theme</Text>
        <View style={styles.themeGrid}>
          {(Object.keys(themeInfo) as ThemePreset[]).map((theme) => {
            const info = themeInfo[theme];
            const isSelected = selectedTheme === theme;
            const isCurrent = currentTheme === theme;

            return (
              <TouchableOpacity
                key={theme}
                style={[styles.themeCard, isSelected && styles.themeCardSelected]}
                onPress={() => setSelectedTheme(theme)}
                activeOpacity={0.7}
              >
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
                <Ionicons
                  name={info.icon as any}
                  size={40}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.themeName, isSelected && styles.themeNameSelected]}>
                  {info.name}
                </Text>
                <Text style={styles.themeDesc}>{info.description}</Text>
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Apply Button */}
      {hasChanges && (
        <View style={styles.applySection}>
          <Button
            title="Apply Theme"
            variant="primary"
            onPress={handleApplyTheme}
            fullWidth
          />
          <Text style={styles.applyNote}>
            Note: Theme changes are currently visual only. Full theme integration in progress.
          </Text>
        </View>
      )}

      {/* Info Notice */}
      <View style={styles.infoNotice}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          Your theme preference is personal and won't affect other users' experience. More customization options coming soon!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  currentTheme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  currentThemeInfo: {
    flex: 1,
  },
  currentThemeName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  currentThemeDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  colorSwatches: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  swatch: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatchColor: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  swatchLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  themeGrid: {
    gap: spacing.md,
  },
  themeCard: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  themeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  currentBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  currentBadgeText: {
    ...typography.caption,
    color: colors.backgroundLight,
    fontWeight: '700',
    fontSize: 10,
  },
  themeName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  themeNameSelected: {
    color: colors.primary,
  },
  themeDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  applySection: {
    marginBottom: spacing.xl,
  },
  applyNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
