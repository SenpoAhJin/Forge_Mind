/**
 * ForgeMind Design System - Card Components
 * Variants: standard, item (marketplace), match (character)
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { Tag } from '../tags';

// Standard Card: White background, 12px rounded corners, 2px elevation shadow
interface StandardCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const StandardCard: React.FC<StandardCardProps> = ({ children, style, onPress }) => {
  const content = <View style={[styles.standardCard, style]}>{children}</View>;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Item Card (Marketplace): Photo, title, price, condition badge, CTA button
interface ItemCardProps {
  photoUrl: string;
  title: string;
  price: number;
  condition: number; // 1-5 scale
  onPress: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  photoUrl,
  title,
  price,
  condition,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.itemCard} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: photoUrl }} style={styles.itemImage} />
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.itemFooter}>
          <Text style={styles.itemPrice}>₱{price.toFixed(2)}</Text>
          <Tag type="status" label={`Condition: ${condition}/5`} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Match Card (Character): Character thumbnail, variant name, match rating badge, component list
interface MatchCardProps {
  thumbnailUrl: string;
  characterName: string;
  variantName: string;
  matchRating: 'exact' | 'close' | 'loose';
  componentCount: number;
  onPress: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  thumbnailUrl,
  characterName,
  variantName,
  matchRating,
  componentCount,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.matchCard} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: thumbnailUrl }} style={styles.matchThumbnail} />
      <View style={styles.matchContent}>
        <View style={styles.matchHeader}>
          <Text style={styles.characterName} numberOfLines={1}>
            {characterName}
          </Text>
          <Tag type="match" rating={matchRating} />
        </View>
        <Text style={styles.variantName} numberOfLines={1}>
          {variantName}
        </Text>
        <Text style={styles.componentCount}>{componentCount} components</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Standard Card
  standardCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Item Card (Marketplace)
  itemCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.md,
  },
  itemImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.surface,
  },
  itemContent: {
    padding: spacing.md,
  },
  itemTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.primary,
  },

  // Match Card (Character)
  matchCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.md,
  },
  matchThumbnail: {
    width: 100,
    height: 100,
    backgroundColor: colors.surface,
  },
  matchContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  characterName: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  variantName: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  componentCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
