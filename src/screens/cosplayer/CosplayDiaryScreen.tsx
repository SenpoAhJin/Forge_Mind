/**
 * Cosplay Diary Screen
 * Personal photo journal for completed cosplay projects
 * Separate from AI-facing build history
 * Features: Photos, star ratings, personal notes
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StandardCard, Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useDiary } from '../../contexts/DiaryContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { getCharacterById, getVariantById } from '../../data';

export const CosplayDiaryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { entries } = useDiary();
  const { projects } = useProjects();

  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Get completed projects without diary entries (can create entry)
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const projectsWithoutEntry = completedProjects.filter(
    (p) => !entries.some((e) => e.project_id === p.project_id)
  );

  const renderStars = (rating: number) => {
    return (
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={20}
            color={star <= rating ? colors.warning : colors.textDisabled}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cosplay Diary</Text>
        <Text style={styles.subtitle}>
          Your personal journal for completed looks. Photos, ratings, and memories.
        </Text>
      </View>

      {/* Create Entry CTA */}
      {projectsWithoutEntry.length > 0 && (
        <StandardCard style={styles.ctaCard}>
          <View style={styles.ctaHeader}>
            <Ionicons name="add-circle" size={32} color={colors.primary} />
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>Document Your Cosplays</Text>
              <Text style={styles.ctaSubtitle}>
                {projectsWithoutEntry.length} completed project{projectsWithoutEntry.length > 1 ? 's' : ''} waiting to be journaled
              </Text>
            </View>
          </View>
          <Button
            title="Add Diary Entry"
            variant="primary"
            onPress={() => {
              // Navigate to create entry screen (placeholder)
              // In full implementation, this would navigate to DiaryEntryForm
            }}
            fullWidth
          />
        </StandardCard>
      )}

      {/* Diary Entries */}
      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>No Diary Entries Yet</Text>
          <Text style={styles.emptySub}>
            Complete a project and document your cosplay journey with photos and notes
          </Text>
        </View>
      ) : (
        <View style={styles.entriesSection}>
          <Text style={styles.sectionTitle}>Your Entries ({entries.length})</Text>
          {entries.map((entry) => {
            const isExpanded = expandedEntry === entry.id;
            
            return (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => setExpandedEntry(isExpanded ? null : entry.id)}
                activeOpacity={0.7}
              >
                {/* Entry Header */}
                <View style={styles.entryHeader}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryProject}>{entry.project_name}</Text>
                    <Text style={styles.entryCharacter}>
                      {entry.character_name} - {entry.variant_name}
                    </Text>
                    <Text style={styles.entryDate}>{entry.completion_date}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>

                {/* Rating */}
                <View style={styles.entryRating}>
                  {renderStars(entry.rating)}
                  <Text style={styles.ratingText}>{entry.rating}/5</Text>
                </View>

                {/* Photos Grid (collapsed: show first 3) */}
                {entry.photos.length > 0 && (
                  <View style={styles.photosGrid}>
                    {entry.photos.slice(0, isExpanded ? entry.photos.length : 3).map((photo, index) => (
                      <View key={index} style={styles.photoPlaceholder}>
                        <Ionicons name="image" size={32} color={colors.textDisabled} />
                        <Text style={styles.photoLabel}>Photo {index + 1}</Text>
                      </View>
                    ))}
                    {!isExpanded && entry.photos.length > 3 && (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.morePhotos}>+{entry.photos.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Notes (expanded only) */}
                {isExpanded && entry.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{entry.notes}</Text>
                  </View>
                )}

                {/* Actions (expanded only) */}
                {isExpanded && (
                  <View style={styles.entryActions}>
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                      <Ionicons name="create-outline" size={20} color={colors.primary} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                      <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Info Notice */}
      <View style={styles.infoNotice}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          Your diary is personal and private. It's separate from the AI matching system and only visible to you.
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
  ctaCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    ...typography.h3,
    color: colors.primary,
  },
  ctaSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  entriesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  entryCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  entryInfo: {
    flex: 1,
  },
  entryProject: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  entryCharacter: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  entryDate: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.xs / 2,
  },
  entryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.xs / 2,
  },
  ratingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoLabel: {
    ...typography.caption,
    color: colors.textDisabled,
    fontSize: 10,
    marginTop: spacing.xs / 2,
  },
  morePhotos: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  notesSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  notesLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  entryActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  actionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
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
