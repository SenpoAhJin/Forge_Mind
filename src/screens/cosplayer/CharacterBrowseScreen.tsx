/**
 * ForgeMind - Character Browse Screen
 * 
 * Shows user's characters they want to cosplay.
 * Users add their own characters instead of browsing a database.
 * 
 * P1 UPDATE: User-driven character management
 * - Shows UserCharacters (not hardcoded catalog)
 * - FAB button to add new character
 * - Tap character → navigate to outfit planning
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserCharacters } from '../../contexts/UserCharactersContext';
import type { UserCharacter } from '../../types/user-character';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface CharacterBrowseScreenProps {
  onSelectCharacter: (characterId: string) => void;
  navigation?: any;
}

const AVATAR_COLORS = [colors.primary, colors.secondary, '#2E7D32', '#E65100', '#9C27B0', '#FF6F00'];

export const CharacterBrowseScreen: React.FC<CharacterBrowseScreenProps> = ({
  onSelectCharacter,
  navigation,
}) => {
  const { characters, isLoaded } = useUserCharacters();
  
  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading characters...</Text>
      </View>
    );
  }
  
  const renderCharacter = ({ item, index }: { item: UserCharacter; index: number }) => {
    const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const displayName = item.variant ? `${item.name} (${item.variant})` : item.name;
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectCharacter(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.characterName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.seriesName} numberOfLines={1}>
              {item.series}
            </Text>
            <View style={styles.tagsRow}>
              {item.difficulty && (
                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>{item.difficulty}</Text>
                </View>
              )}
              {item.targetColors.length > 0 && (
                <View style={styles.colorDots}>
                  {item.targetColors.slice(0, 3).map((color, i) => (
                    <View
                      key={i}
                      style={[styles.colorDot, { backgroundColor: color }]}
                    />
                  ))}
                  {item.targetColors.length > 3 && (
                    <Text style={styles.moreColors}>+{item.targetColors.length - 3}</Text>
                  )}
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <FlatList
        data={characters}
        keyExtractor={(item) => item.id}
        renderItem={renderCharacter}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="person-add-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Characters Yet</Text>
            <Text style={styles.emptyBody}>
              Add characters you want to cosplay using the + button below.
            </Text>
          </View>
        }
      />
      
      {/* Add Character FAB */}
      {navigation && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateCharacter')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color={colors.backgroundLight} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h2,
    color: colors.backgroundLight,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
  },
  characterName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  seriesName: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '20',
  },
  difficultyText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  colorDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  moreColors: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});