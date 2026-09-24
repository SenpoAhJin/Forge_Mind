/**
 * ForgeMind Design System - Tag Components
 * Types: match-rating (exact/close/loose), status, category
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { typography, borderRadius, spacing } from '../../theme';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

type MatchRating = 'exact' | 'close' | 'loose';
type TagType = 'match' | 'status' | 'category';

interface TagProps {
  type: TagType;
  label?: string;
  rating?: MatchRating;
  style?: ViewStyle;
}

export const Tag: React.FC<TagProps> = ({ type, label, rating, style }) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  
  const getMatchRatingColor = (rating: MatchRating) => {
    switch (rating) {
      case 'exact':
        return themeColors.success; // exactMatch -> success
      case 'close':
        return themeColors.warning; // closeMatch -> warning
      case 'loose':
        return '#FF9800'; // looseMatch (not in ThemeColors, hardcoded)
      default:
        return themeColors.textSecondary;
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
        <Text style={[dynamicStyles.matchTagText, styles.matchTagText]}>{getMatchRatingLabel(rating)}</Text>
      </View>
    );
  }

  if (type === 'status') {
    return (
      <View style={[dynamicStyles.statusTag, styles.statusTag, style]}>
        <Text style={[dynamicStyles.statusTagText, styles.statusTagText]}>{label}</Text>
      </View>
    );
  }

  if (type === 'category') {
    return (
      <View style={[dynamicStyles.categoryTag, styles.categoryTag, style]}>
        <Text style={[dynamicStyles.categoryTagText, styles.categoryTagText]}>{label}</Text>
      </View>
    );
  }

  return null;
};

const getDynamicStyles = (colors: ThemeColors) => ({
  matchTagText: {
    color: colors.backgroundLight,
  },
  statusTag: {
    backgroundColor: colors.info,
  },
  statusTagText: {
    color: colors.backgroundLight,
  },
  categoryTag: {
    backgroundColor: colors.surface,
  },
  categoryTagText: {
    color: colors.textPrimary,
  },
});

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
    fontWeight: '600',
  },

  // Status Tags: Pill-shaped, 20px height, semantic color background, white text
  statusTag: {
    height: 24,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTagText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Category Tags: Pill-shaped, gray background, dark text
  categoryTag: {
    height: 24,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTagText: {
    ...typography.caption,
    fontWeight: '500',
  },
});
