/**
 * ForgeMind Design System - Tag Components
 * Types: match-rating (exact/close/loose), status, category
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';

type MatchRating = 'exact' | 'close' | 'loose';
type TagType = 'match' | 'status' | 'category';

interface TagProps {
  type: TagType;
  label?: string;
  rating?: MatchRating;
  style?: ViewStyle;
}

export const Tag: React.FC<TagProps> = ({ type, label, rating, style }) => {
  const getMatchRatingColor = (rating: MatchRating) => {
    switch (rating) {
      case 'exact':
        return colors.exactMatch;
      case 'close':
        return colors.closeMatch;
      case 'loose':
        return colors.looseMatch;
      default:
        return colors.textSecondary;
    }
  };

  const getMatchRatingLabel = (rating: MatchRating) => {
    switch (rating) {
      case 'exact':
        return 'Exact Match';
      case 'close':
        return 'Close Match';
      case 'loose':
        return 'Loose Match';
      default:
        return '';
    }
  };

  if (type === 'match' && rating) {
    const bgColor = getMatchRatingColor(rating);
    return (
      <View style={[styles.matchTag, { backgroundColor: bgColor }, style]}>
        <Text style={styles.matchTagText}>{getMatchRatingLabel(rating)}</Text>
      </View>
    );
  }

  if (type === 'status') {
    return (
      <View style={[styles.statusTag, style]}>
        <Text style={styles.statusTagText}>{label}</Text>
      </View>
    );
  }

  if (type === 'category') {
    return (
      <View style={[styles.categoryTag, style]}>
        <Text style={styles.categoryTagText}>{label}</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  // Match Rating Tags: Pill-shaped, 16px height, match-color background, white text
  matchTag: {
    height: 20,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchTagText: {
    ...typography.caption,
    color: colors.backgroundLight,
    fontWeight: '600',
  },

  // Status Tags: Pill-shaped, 20px height, semantic color background, white text
  statusTag: {
    height: 24,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTagText: {
    ...typography.caption,
    color: colors.backgroundLight,
    fontWeight: '600',
  },

  // Category Tags: Pill-shaped, gray background, dark text
  categoryTag: {
    height: 24,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTagText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
