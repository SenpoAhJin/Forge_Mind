/**
 * ForgeMind - Match Results Screen (FE-3)
 * Real AI matching against owned attire via Flask AI service.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Button, StandardCard, Tag } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useSelection } from '../../contexts/SelectionContext';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import { useUser } from '../../contexts/UserContext';
import { matchAttire, type MatchResult, type MatchedItem } from '../../services/AiMatcherService';
import { getMatcherSlug } from '../../data/matcherSlugs';
import { buildWornGarments } from '../../utils/wearing';
import Preview3D from '../../components/Preview3D';

interface MatchResultsScreenProps {
  onBackToBrowse: () => void;
  onStartProject: () => void;
}

export const MatchResultsScreen: React.FC<MatchResultsScreenProps> = ({ onBackToBrowse, onStartProject }) => {
  const { selection } = useSelection();
  const { items: ownedAttire, isLoaded: attireLoaded } = useOwnedAttire();
  const { user } = useUser();
  
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show3DPreview, setShow3DPreview] = useState(false);

  // Trigger match when screen loads with valid selection
  useEffect(() => {
    if (selection && attireLoaded && !loading && !matchResult && !error) {
      performMatch();
    }
  }, [selection, attireLoaded]);

  const performMatch = async () => {
    if (!selection) return;

    // Check if this variant has Flask matcher data
    const flaskSlug = getMatcherSlug(selection.variant.variant_id);
    if (!flaskSlug) {
      setError('no_data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await matchAttire({
        character_variant_id: flaskSlug,
        owned_attire: ownedAttire,
      });

      if (response.success && response.data) {
        setMatchResult(response.data);
      } else {
        setError(response.message || 'Failed to match attire');
      }
    } catch (err) {
      setError('Unexpected error occurred');
      console.error('[MatchResultsScreen] match error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  // Helper to map Flask confidence to Tag rating
  const confidenceToRating = (confidence: string): 'exact' | 'close' | 'loose' => {
    if (confidence === 'excellent' || confidence === 'good') return 'exact';
    if (confidence === 'fair') return 'close';
    return 'loose';
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Matching your attire...</Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (error) {
    const isNoData = error === 'no_data';
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <StandardCard style={styles.selectionCard}>
          <Text style={styles.selectionLabel}>SELECTED VARIANT</Text>
          <Text style={styles.characterName}>{character.character_name}</Text>
          <Text style={styles.variantName}>{variant.variant_name}</Text>
        </StandardCard>

        {isNoData ? (
          <StandardCard style={styles.neutralCard}>
            <Text style={styles.neutralTitle}>No match data for this character yet</Text>
            <Text style={styles.neutralText}>
              AI matching data is not available for this variant. You can still create a project and track your progress.
            </Text>
          </StandardCard>
        ) : (
          <StandardCard style={styles.errorCard}>
            <Text style={styles.errorTitle}>Match Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
          </StandardCard>
        )}

        <View style={styles.footer}>
          {!isNoData && <Button title="Try Again" onPress={performMatch} fullWidth />}
          <Button title="Start Project with This Variant" onPress={onStartProject} fullWidth />
          <Button title="Back to Variants" variant="secondary" onPress={onBackToBrowse} fullWidth />
        </View>
      </ScrollView>
    );
  }

  // Render match results
  if (matchResult) {
    const suggestedItems = Object.entries(matchResult.suggested_outfit);
    const hasMissingItems = matchResult.missing_items.length > 0;
    
    // Build worn garments for 3D preview
    const bodyType = user?.base_body_selection || 'male';
    const wornGarments = buildWornGarments(matchResult, ownedAttire, bodyType);
    const filledSlots = wornGarments.filter(g => g.itemId !== null).length;
    const totalSlots = wornGarments.length;

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
          <Text style={styles.sectionTitle}>Match Results</Text>
          <Text style={styles.sectionSubtitle}>
            Overall: {matchResult.match_quality.quality_label} ({Math.round(matchResult.match_quality.overall_score * 100)}%)
          </Text>
          <Text style={styles.matcherModeLabel}>
            {(matchResult as any).matcher_mode === 'model' 
              ? '🤖 Learned model v1' 
              : '📏 Rule baseline'}
          </Text>
        </View>

        {/* 3D Preview Toggle */}
        <StandardCard style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.previewTitle}>3D Body Preview</Text>
              <Text style={styles.previewSubtitle}>
                {filledSlots}/{totalSlots} slots filled
              </Text>
            </View>
            <Button
              title={show3DPreview ? "Hide Preview" : "View on Body"}
              onPress={() => setShow3DPreview(!show3DPreview)}
              variant="secondary"
            />
          </View>
          
          {show3DPreview && (
            <View style={styles.previewContainer}>
              <Preview3D
                bodyType={bodyType}
                wornGarments={wornGarments}
              />
              
              <Text style={styles.previewNote}>
                ℹ️ Only items with a 3D garment are shown (right now: white wig)
              </Text>
              
              {/* Slot indicators */}
              <View style={styles.slotIndicators}>
                {wornGarments.map((garment) => (
                  <View key={garment.slot} style={styles.slotRow}>
                    <Text style={styles.slotLabel}>
                      {garment.slot.charAt(0).toUpperCase() + garment.slot.slice(1)}:
                    </Text>
                    {garment.itemId ? (
                      <Text style={styles.slotFilled}>✓ Matched</Text>
                    ) : (
                      <Text style={styles.slotMissing}>○ Missing</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </StandardCard>

        {suggestedItems.length > 0 ? (
          suggestedItems.map(([category, item]) => (
            <StandardCard key={category} style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.componentLabel} numberOfLines={1}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}: {item.name}
                </Text>
                <Tag type="match" rating={confidenceToRating(item.confidence)} />
              </View>
              <Text style={styles.noteText}>
                Score: {Math.round(item.score * 100)}% (color: {Math.round(item.breakdown.color * 100)}%, 
                keywords: {Math.round(item.breakdown.keywords * 100)}%, 
                category: {Math.round(item.breakdown.category * 100)}%)
              </Text>
            </StandardCard>
          ))
        ) : (
          <StandardCard style={styles.resultCard}>
            <Text style={styles.noteText}>No matching items found in your collection.</Text>
          </StandardCard>
        )}

        {hasMissingItems && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Missing Items</Text>
              <Text style={styles.sectionSubtitle}>Items needed to complete this cosplay</Text>
            </View>

            {matchResult.missing_items.map((missing, idx) => (
              <StandardCard key={idx} style={styles.missingCard}>
                <Text style={styles.missingCategory}>{missing.category}</Text>
                <Text style={styles.missingKeywords}>
                  Needed: {missing.keywords.join(', ')}
                </Text>
              </StandardCard>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Button title="Start Project with This Variant" onPress={onStartProject} fullWidth />
          <Button title="Back to Variants" variant="secondary" onPress={onBackToBrowse} fullWidth />
        </View>
      </ScrollView>
    );
  }

  // Fallback: waiting for data
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Preparing match...</Text>
      </View>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
  missingCard: {
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  missingCategory: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  missingKeywords: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  neutralCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  neutralTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  neutralText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
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
  previewCard: {
    marginBottom: spacing.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  previewTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  previewSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewContainer: {
    marginTop: spacing.md,
  },
  previewNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  slotIndicators: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  slotLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  slotFilled: {
    ...typography.body,
    color: colors.success,
  },
  slotMissing: {
    ...typography.body,
    color: colors.textSecondary,
  },
  matcherModeLabel: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});