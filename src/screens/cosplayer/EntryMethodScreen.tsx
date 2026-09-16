/**
 * ForgeMind - Owned Item Entry Method Selection (FE-5)
 * Three ways to log an owned item: Take Photo / Type Description / Voice Input.
 * The chosen method maps to OwnedAttire.entry_method.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { EntryMethod } from '../../types/owned-attire';

interface EntryMethodScreenProps {
  onChooseMethod: (method: EntryMethod) => void;
}

interface MethodCard {
  key: EntryMethod;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const METHODS: MethodCard[] = [
  {
    key: 'photo',
    title: 'Take Photo',
    subtitle: 'Snap or pick a picture — we\'ll guess type, color and style',
    icon: 'camera',
    color: colors.primary,
  },
  {
    key: 'text',
    title: 'Type Description',
    subtitle: 'Describe the item in English or Taglish',
    icon: 'create-outline',
    color: colors.secondary,
  },
  {
    key: 'voice',
    title: 'Voice Input',
    subtitle: 'Record yourself describing the item',
    icon: 'mic',
    color: colors.tertiary,
  },
];

export const EntryMethodScreen: React.FC<EntryMethodScreenProps> = ({ onChooseMethod }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Log an Owned Item</Text>
        <Text style={styles.subtitle}>
          Add a piece of attire to your inventory so it can be matched to projects later.
        </Text>
      </View>

      {METHODS.map((method) => (
        <TouchableOpacity
          key={method.key}
          activeOpacity={0.7}
          style={styles.card}
          onPress={() => onChooseMethod(method.key)}
        >
          <View style={[styles.iconWrap, { backgroundColor: method.color + '1A' }]}>
            <Ionicons name={method.icon} size={26} color={method.color} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{method.title}</Text>
            <Text style={styles.cardSubtitle}>{method.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
        </TouchableOpacity>
      ))}

      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={18} color={colors.info} />
        <Text style={styles.noticeText}>
          AI categorization and transcription are mocked for this phase. Real image
          classification and speech-to-text are backend features (BE-1).
        </Text>
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
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});