/**
 * ForgeMind - Text Entry (FE-5)
 * Describe the item (color, type, style, condition) in English or Taglish.
 * Mock-categorizes keywords into type/color. Maps to OwnedAttire
 * original_input_text / entry_language / entry_method='text'.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, TextAreaField, ConditionSlider } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { EntryLanguage } from '../../types/owned-attire';
import { mockCategorizationFromText } from '../../utils/mockCatalog';

interface TextEntryScreenProps {
  onContinue: (input: {
    entry_method: 'text';
    entry_language: EntryLanguage;
    original_input_text: string;
    auto_categorized_type: string;
    auto_categorized_color: string;
    auto_categorized_style: string;
    condition_rating: number;
  }) => void;
}

type LanguageOption = { key: EntryLanguage; label: string };

const LANGUAGES: LanguageOption[] = [
  { key: 'english', label: 'English' },
  { key: 'taglish', label: 'Taglish' },
];

export const TextEntryScreen: React.FC<TextEntryScreenProps> = ({ onContinue }) => {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<EntryLanguage>('english');
  const [conditionRating, setConditionRating] = useState(3);
  const [submittedOnce, setSubmittedOnce] = useState(false);

  const trimmed = text.trim();
  const canContinue = trimmed.length >= 5;

  const handleContinue = () => {
    setSubmittedOnce(true);
    if (!canContinue) return;
    onContinue({
      entry_method: 'text',
      entry_language: language,
      original_input_text: trimmed,
      ...mockCategorizationFromText(trimmed),
      condition_rating: conditionRating,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Text Entry</Text>
      <Text style={styles.subtitle}>Describe the item — color, type, style, condition.</Text>

      <View style={styles.langRow}>
        <Text style={styles.langLabel}>Language</Text>
        <View style={styles.segmented}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.key}
              style={[styles.segment, language === lang.key && styles.segmentActive]}
              activeOpacity={0.7}
              onPress={() => setLanguage(lang.key)}
            >
              <Text style={[styles.segmentText, language === lang.key && styles.segmentTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TextAreaField
        label="Describe the item (color, type, style, condition)"
        value={text}
        onChangeText={setText}
        placeholder={
          language === 'taglish'
            ? 'e.g. itim na wig, spiky style, galing sa nakaraang cosplay'
            : 'e.g. black wig, spiky style, from an old cosplay'
        }
        minRows={4}
        error={submittedOnce && !canContinue ? 'Please describe the item first (5+ characters).' : undefined}
      />

      <ConditionSlider value={conditionRating} onValueChange={setConditionRating} label="Condition" />

      <View style={styles.notice}>
        <Ionicons name="sparkles-outline" size={16} color={colors.info} />
        <Text style={styles.noticeText}>
          Type and color keywords are auto-extracted as a mock — you can fix anything on the
          confirmation screen.
        </Text>
      </View>

      <Button title="Continue to Confirmation" variant="primary" fullWidth onPress={handleContinue} />
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
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  langLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.backgroundLight,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});