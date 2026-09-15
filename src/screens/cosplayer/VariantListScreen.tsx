/**
 * ForgeMind - Variant List Screen (FE-3)
 * Shows every variant of a chosen character with origin tag and reference detail.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { StandardCard, Tag } from '../../components';
import { colors, typography, spacing } from '../../theme';
import { Character, Variant } from '../../types/catalog';
import { getCharacterById, getVariantsByCharacterId } from '../../data';

interface VariantListScreenProps {
  characterId: string;
  onSelectVariant: (character: Character, variant: Variant) => void;
}

export const VariantListScreen: React.FC<VariantListScreenProps> = ({
  characterId,
  onSelectVariant,
}) => {
  const character = getCharacterById(characterId);

  if (!character) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyTitle}>Character not found</Text>
        <Text style={styles.emptyBody}>
          This character is missing from the local dataset. It may have been removed.
        </Text>
      </View>
    );
  }

  const variants = getVariantsByCharacterId(characterId).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'confirmed' ? -1 : 1;
    return a.variant_name.localeCompare(b.variant_name);
  });

  const renderVariant = ({ item }: { item: Variant }) => {
    const isCandidate = item.status === 'candidate';
    return (
      <StandardCard style={styles.card} onPress={() => onSelectVariant(character, item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.variantName} numberOfLines={2}>
            {item.variant_name}
          </Text>
          <Tag type="category" label={item.origin_tag} />
        </View>

        {isCandidate && (
          <View style={styles.candidateRow}>
            <Tag
              type="status"
              label={
                item.candidate_source === 'ai-flagged'
                  ? 'Candidate (AI flagged)'
                  : 'Candidate (user submitted)'
              }
            />
          </View>
        )}

        {item.build_difficulty_rating !== undefined && (
          <Text style={styles.difficultyText}>
            Difficulty: {item.build_difficulty_rating}/5
          </Text>
        )}

        {!!item.origin_description && (
          <Text style={styles.description} numberOfLines={3}>
            {item.origin_description}
          </Text>
        )}

        <Text style={styles.selectHint}>Tap to select this variant</Text>
      </StandardCard>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.characterSummary}>
        <Text style={styles.summaryName}>{character.character_name}</Text>
        <Text style={styles.summaryMedia}>{character.source_media}</Text>
        {!!character.description && (
          <Text style={styles.summaryDescription} numberOfLines={3}>
            {character.description}
          </Text>
        )}
      </View>

      <FlatList
        data={variants}
        keyExtractor={(item) => item.variant_id}
        renderItem={renderVariant}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
  },
  characterSummary: {
    marginBottom: spacing.md,
  },
  summaryName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  summaryMedia: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  variantName: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  candidateRow: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  selectHint: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});