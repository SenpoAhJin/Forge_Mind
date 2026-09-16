/**
 * ForgeMind - Character Browse Screen (FE-3)
 * Searchable/browsable list of characters, each showing its available variants.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StandardCard, Tag, TextInputField } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Character, MediaType } from '../../types/catalog';
import { searchCharacters, getVariantsByCharacterId, characters } from '../../data';

interface CharacterBrowseScreenProps {
  onSelectCharacter: (characterId: string) => void;
}

const AVATAR_COLORS = [colors.primary, colors.secondary, '#2E7D32', '#E65100'];

export const CharacterBrowseScreen: React.FC<CharacterBrowseScreenProps> = ({
  onSelectCharacter,
}) => {
  const [query, setQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | MediaType>('all');

  const availableMediaTypes = Array.from(new Set(characters.map((c) => c.media_type)));
  const filtered = searchCharacters(query).filter(
    (c) => mediaFilter === 'all' || c.media_type === mediaFilter
  );

  const renderCharacter = ({ item, index }: { item: Character; index: number }) => {
    const variantCount = getVariantsByCharacterId(item.character_id).length;
    const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return (
      <StandardCard style={styles.card} onPress={() => onSelectCharacter(item.character_id)}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{item.character_name.charAt(0)}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.characterName} numberOfLines={1}>
              {item.character_name}
            </Text>
            <Text style={styles.mediaName} numberOfLines={1}>
              {item.source_media}
            </Text>
            <View style={styles.tagsRow}>
              <Tag type="category" label={item.media_type} />
              <Text style={styles.variantCountText}>
                {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
              </Text>
            </View>
          </View>
        </View>
      </StandardCard>
    );
  };

  return (
    <View style={styles.container}>
      <TextInputField
        label="Search characters"
        value={query}
        onChangeText={setQuery}
        placeholder="Try 'Gojo' or 'Jujutsu Kaisen'"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, mediaFilter === 'all' && styles.filterChipActive]}
          onPress={() => setMediaFilter('all')}
        >
          <Text style={[styles.filterChipText, mediaFilter === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {availableMediaTypes.map((mt) => (
          <TouchableOpacity
            key={mt}
            style={[styles.filterChip, mediaFilter === mt && styles.filterChipActive]}
            onPress={() => setMediaFilter(mt)}
          >
            <Text
              style={[styles.filterChipText, mediaFilter === mt && styles.filterChipTextActive]}
            >
              {mt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.character_id}
        renderItem={renderCharacter}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No characters found</Text>
            <Text style={styles.emptyBody}>
              No character matches your search or media filter. Try a different keyword.
            </Text>
          </View>
        }
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
  card: {
    marginBottom: spacing.md,
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
  mediaName: {
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
  variantCountText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filterRow: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.lg, // Extend to screen edges
  },
  filterContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg, // Proper padding inside scroll
    paddingRight: spacing.xl, // Extra padding on right so last chip is fully visible
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: colors.backgroundLight,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});