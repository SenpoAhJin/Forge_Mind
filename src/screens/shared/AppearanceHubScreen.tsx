/**
 * Appearance Hub Screen
 * BLACK + PINK + WHITE only
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard } from '../../components';
import { typography } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { layout } from '../../theme/colors';

export const AppearanceHubScreen: React.FC = () => {
  const { isDark, themeColors, toggleTheme } = useTheme();
  const colors = themeColors;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingHorizontal: layout.screenPadding }]}
    >
      {/* Header */}
      <View style={[styles.header, { marginBottom: layout.spacing.xl }]}>
        <Text style={[styles.title, { color: colors.text, fontSize: layout.textTitle }]}>
          Appearance
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: layout.textBody, marginTop: layout.spacing.xs }]}>
          Switch between light and dark mode
        </Text>
      </View>

      {/* Dark Mode Toggle */}
      <StandardCard style={styles.cardWithSpacing}>
        <View style={[styles.row, { minHeight: layout.rowMinHeight }]}>
          <View style={[styles.iconContainer, { marginRight: layout.spacing.lg }]}>
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={layout.iconSize}
              color={colors.text}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.optionTitle, { color: colors.text, fontSize: layout.textSection, marginBottom: layout.spacing.xs }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Text style={[styles.optionDescription, { color: colors.textSecondary, fontSize: layout.textSmall }]}>
              {isDark ? 'BLACK background with WHITE text' : 'WHITE background with BLACK text'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.toggleTrackOff, true: colors.toggleTrackOn }}
            thumbColor={isDark ? colors.toggleKnobOn : colors.toggleKnobOff}
            ios_backgroundColor={colors.toggleTrackOff}
          />
        </View>
      </StandardCard>

      {/* Color Palette Info */}
      <StandardCard style={styles.cardWithSpacing}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: layout.textSection, marginBottom: layout.spacing.md }]}>
          Two-Tone Palette
        </Text>
        <View style={styles.paletteRow}>
          <View style={styles.colorSwatch}>
            <View 
              style={[
                styles.swatchBox, 
                { 
                  backgroundColor: '#000000', 
                  borderWidth: 2, 
                  borderColor: isDark ? colors.border : colors.borderStrong,
                  borderRadius: layout.radiusCard,
                }
              ]} 
            />
            <Text style={[styles.colorName, { color: colors.text, fontSize: layout.textBody, marginTop: layout.spacing.sm, marginBottom: layout.spacing.xs }]}>
              BLACK
            </Text>
            <Text style={[styles.colorHex, { color: colors.textSecondary, fontSize: layout.textSmall }]}>
              #000000
            </Text>
          </View>
          <View style={styles.colorSwatch}>
            <View 
              style={[
                styles.swatchBox, 
                { 
                  backgroundColor: '#FF8FB1',
                  borderWidth: 2,
                  borderColor: isDark ? colors.border : colors.borderStrong,
                  borderRadius: layout.radiusCard,
                }
              ]} 
            />
            <Text style={[styles.colorName, { color: colors.text, fontSize: layout.textBody, marginTop: layout.spacing.sm, marginBottom: layout.spacing.xs }]}>
              PINK
            </Text>
            <Text style={[styles.colorHex, { color: colors.textSecondary, fontSize: layout.textSmall }]}>
              #FF8FB1
            </Text>
          </View>
          <View style={styles.colorSwatch}>
            <View 
              style={[
                styles.swatchBox, 
                { 
                  backgroundColor: '#FFFFFF', 
                  borderWidth: 2, 
                  borderColor: isDark ? colors.border : colors.borderStrong,
                  borderRadius: layout.radiusCard,
                }
              ]} 
            />
            <Text style={[styles.colorName, { color: colors.text, fontSize: layout.textBody, marginTop: layout.spacing.sm, marginBottom: layout.spacing.xs }]}>
              WHITE
            </Text>
            <Text style={[styles.colorHex, { color: colors.textSecondary, fontSize: layout.textSmall }]}>
              #FFFFFF
            </Text>
          </View>
        </View>
      </StandardCard>

      {/* Design Guidelines */}
      <StandardCard style={styles.cardWithSpacing}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: layout.textSection, marginBottom: layout.spacing.md }]}>
          Design Guidelines
        </Text>
        <View style={[styles.guidelineRow, { marginBottom: layout.spacing.md }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.text} />
          <Text style={[styles.guidelineText, { color: colors.textSecondary, fontSize: layout.textBody, marginLeft: layout.spacing.md }]}>
            BLACK for primary UI elements
          </Text>
        </View>
        <View style={[styles.guidelineRow, { marginBottom: layout.spacing.md }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.text} />
          <Text style={[styles.guidelineText, { color: colors.textSecondary, fontSize: layout.textBody, marginLeft: layout.spacing.md }]}>
            PINK for ONE highlight per screen
          </Text>
        </View>
        <View style={styles.guidelineRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.text} />
          <Text style={[styles.guidelineText, { color: colors.textSecondary, fontSize: layout.textBody, marginLeft: layout.spacing.md }]}>
            Opacity variants for depth
          </Text>
        </View>
      </StandardCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  content: {
    paddingTop: layout.spacing.lg,
    paddingBottom: layout.spacing.xxl,
    width: '100%',
  },
  header: {
    width: '100%',
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
  },
  card: {
    width: '100%',
  },
  cardWithSpacing: {
    width: '100%',
    marginBottom: 12,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    ...typography.h3,
  },
  optionDescription: {
    ...typography.caption,
  },
  sectionTitle: {
    ...typography.h3,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  colorSwatch: {
    alignItems: 'center',
    flex: 1,
  },
  swatchBox: {
    width: 64,
    height: 64,
  },
  colorName: {
    ...typography.buttonText,
    fontWeight: '600',
  },
  colorHex: {
    ...typography.caption,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  guidelineText: {
    ...typography.body,
    flex: 1,
  },
});
