/**
 * Appearance Hub Screen
 * Forge Indigo Design System
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard } from '../../components';
import { typography } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { layout } from '../../theme/colors';
import type { ThemeMode } from '../../contexts/ThemeContext';

export const AppearanceHubScreen: React.FC = () => {
  const { mode, setMode, isDark, themeColors } = useTheme();
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

      {/* Theme Mode Selector */}
      <StandardCard style={styles.cardWithSpacing}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: layout.textSection, marginBottom: layout.spacing.md }]}>
          Theme Mode
        </Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeOption,
              {
                backgroundColor: mode === 'system' ? colors.primary : colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setMode('system')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={mode === 'system' ? colors.textOnPrimary : colors.text}
            />
            <Text
              style={[
                styles.modeText,
                {
                  color: mode === 'system' ? colors.textOnPrimary : colors.text,
                  fontSize: layout.textBody,
                  marginTop: layout.spacing.xs,
                }
              ]}
              numberOfLines={1}
            >
              System
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeOption,
              {
                backgroundColor: mode === 'light' ? colors.primary : colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setMode('light')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="sunny"
              size={20}
              color={mode === 'light' ? colors.textOnPrimary : colors.text}
            />
            <Text
              style={[
                styles.modeText,
                {
                  color: mode === 'light' ? colors.textOnPrimary : colors.text,
                  fontSize: layout.textBody,
                  marginTop: layout.spacing.xs,
                }
              ]}
              numberOfLines={1}
            >
              Light
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeOption,
              {
                backgroundColor: mode === 'dark' ? colors.primary : colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setMode('dark')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="moon"
              size={20}
              color={mode === 'dark' ? colors.textOnPrimary : colors.text}
            />
            <Text
              style={[
                styles.modeText,
                {
                  color: mode === 'dark' ? colors.textOnPrimary : colors.text,
                  fontSize: layout.textBody,
                  marginTop: layout.spacing.xs,
                }
              ]}
              numberOfLines={1}
            >
              Dark
            </Text>
          </TouchableOpacity>
        </View>
        
        {mode === 'system' ? (
          <Text style={[styles.helperText, { color: colors.textSecondary, fontSize: layout.textSmall, marginTop: layout.spacing.md }]}>
            Follows your phone's setting.
          </Text>
        ) : mode === 'light' ? (
          <Text style={[styles.helperText, { color: colors.textSecondary, fontSize: layout.textSmall, marginTop: layout.spacing.md }]}>
            Always light.
          </Text>
        ) : (
          <Text style={[styles.helperText, { color: colors.textSecondary, fontSize: layout.textSmall, marginTop: layout.spacing.md }]}>
            Always dark.
          </Text>
        )}
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
  modeRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  modeOption: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: layout.radiusCard,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: {
    ...typography.buttonText,
    fontWeight: '600',
    textAlign: 'center',
  },
  helperText: {
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
