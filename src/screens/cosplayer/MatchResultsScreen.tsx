/**
 * ForgeMind - Match Results Screen (FE-3)
 * Placeholder "match against owned items" preview.
 * Static/mock only — real AI matching arrives with the FE-4 backend.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, StandardCard, Tag } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useSelection } from '../../contexts/SelectionContext';

interface MatchResultsScreenProps {
  onBackToBrowse: () => void;
}

type MatchRating = 'exact' | 'close' | 'loose';

interface MockMatchResult {
  component_label: string;
  match_rating: MatchRating;
  note: string;
}

const MOCK_MATCH_RESULTS: MockMatchResult[] = [
  {
    component_label: 'Wig — white/silver',
    match_rating: 'exact',
    note: 'Defining hair feature identified in variant reference.',
  },
  {
    component_label: 'Blindfold / eye cover — black',
    match_rating: 'close',
    note: 'Color matches; material or prop detailing may need adjusting.',
  },
  {
    component_label: 'Shoes — black',
    match_rating: 'loose',
    note: 'Generic coverage only; no exact reference in your catalog yet.',
  },
];

export const MatchResultsScreen: React.FC<MatchResultsScreenProps> = ({ onBackToBrowse }) => {
  const { selection } = useSelection();

  if (!selection) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyTitle}>No variant selected</Text>
        <Text style={styles.emptyBody}>
          Select a character and variant first, then return here to preview the match.
        </Text>
        <Button title="Browse Characters" onPress={onBackToBrowse} fullWidth />
      </View>
    );
  }

  const { character, variant } = selection;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StandardCard style={styles.selectionCard}>
        <Text style={styles.selectionLabel}>SELECTED VARIANT</Text>
        <Text style={styles.characterName}>{character.character_name}</Text>
        <Text style={styles.variantName}>{variant.variant_name}</Text>
        <View style={styles.tagsRow}>
          <Tag type="category" label={variant.origin_tag} />
          {variant.build_difficulty_rating !== undefined && (
            <Text style={styles.difficultyText}>
              Difficulty: {variant.build_difficulty_rating}/5
            </Text>
          )}
        </View>
      </StandardCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Match against your owned items</Text>
        <Text style={styles.sectionSubtitle}>Preview — real AI matching is a later phase.</Text>
      </View>

      {MOCK_MATCH_RESULTS.map((result) => (
        <StandardCard key={result.component_label} style={styles.resultCard}>
          <View style={styles.resultRow}>
            <Text style={styles.componentLabel} numberOfLines={1}>
              {result.component_label}
            </Text>
            <Tag type="match" rating={result.match_rating} />
          </View>
          <Text style={styles.noteText}>{result.note}</Text>
        </StandardCard>
      ))}

      <View style={styles.previewBanner}>
        <Text style={styles.previewBannerText}>
          MOCK DATA — PREVIEW ONLY. Once the AI/ML matching backend (FE-4) exists, this screen
          will run a real match against your owned items and the 3D dress-up viewer (Phase 2).
        </Text>
      </View>

      <Button title="Back to Variants" variant="secondary" onPress={onBackToBrowse} fullWidth />
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
    paddingBottom: spacing.xl,
  },
  selectionCard: {
    marginBottom: spacing.lg,
  },
  selectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  characterName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  variantName: {
    ...typography.bodyLarge,
    color: colors.primary,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  difficultyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultCard: {
    marginBottom: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  componentLabel: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  noteText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  previewBanner: {
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  previewBannerText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});