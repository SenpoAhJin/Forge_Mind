/**
 * Appearance Hub Screen
 * Toggle between light and dark mode
 * Two-tone design: INDIGO + PINK only
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard } from '../../components';
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

export const AppearanceHubScreen: React.FC = () => {
  const { isDark, themeColors, toggleTheme } = useTheme();

  // Use theme colors from context
  const colors = themeColors;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Appearance</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Switch between light and dark mode
        </Text>
      </View>

      {/* Dark Mode Toggle */}
      <StandardCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              {isDark ? 'BLACK background with WHITE text' : 'WHITE background with BLACK text'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.background}
          />
        </View>
      </StandardCard>

      {/* Color Palette Info */}
      <StandardCard style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Two-Tone Palette</Text>
        <View style={styles.paletteRow}>
          <View style={styles.colorSwatch}>
            <View style={[styles.swatchBox, { backgroundColor: '#000000', borderWidth: 1, borderColor: colors.border }]} />
            <Text style={[styles.colorName, { color: colors.textPrimary }]}>BLACK</Text>
            <Text style={[styles.colorHex, { color: colors.textSecondary }]}>#000000</Text>
          </View>
          <View style={styles.colorSwatch}>
            <View style={[styles.swatchBox, { backgroundColor: '#FF8FB1' }]} />
            <Text style={[styles.colorName, { color: colors.textPrimary }]}>PINK</Text>
            <Text style={[styles.colorHex, { color: colors.textSecondary }]}>#FF8FB1</Text>
          </View>
          <View style={styles.colorSwatch}>
            <View style={[styles.swatchBox, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border }]} />
            <Text style={[styles.colorName, { color: colors.textPrimary }]}>WHITE</Text>
            <Text style={[styles.colorHex, { color: colors.textSecondary }]}>#FFFFFF</Text>
          </View>
        </View>
      </StandardCard>

      {/* Design Guidelines */}
      <StandardCard style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Design Guidelines</Text>
        <View style={styles.guidelineRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>
            BLACK for primary UI elements
          </Text>
        </View>
        <View style={styles.guidelineRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>
            PINK for ONE highlight per screen
          </Text>
        </View>
        <View style={styles.guidelineRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>
            Opacity variants for depth and hierarchy
          </Text>
        </View>
      </StandardCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    ...typography.caption,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorSwatch: {
    alignItems: 'center',
  },
  swatchBox: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  colorName: {
    ...typography.buttonText,
    marginBottom: spacing.xs,
  },
  colorHex: {
    ...typography.caption,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  guidelineText: {
    ...typography.body,
    marginLeft: spacing.sm,
    flex: 1,
  },
});
