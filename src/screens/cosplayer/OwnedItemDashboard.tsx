/**
 * ForgeMind - Owned-Item Dashboard (FE-5)
 * Grid/list of logged attire, filterable by availability_status / type / color.
 * Tapping an item opens Owned-Attire Detail.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import { OwnedAttire, AttireCategory, AvailabilityStatus } from '../../types/owned-attire';

interface OwnedItemDashboardProps {
  onAddItem: () => void;
  onOpenItem: (attireId: string) => void;
}

type StatusFilter = 'all' | AvailabilityStatus;
type ColorFilter = 'all' | string;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'committed', label: 'Committed' },
];

const entryIcon = (method: OwnedAttire['entry_method']): keyof typeof Ionicons.glyphMap =>
  method === 'photo' ? 'camera' : method === 'text' ? 'create-outline' : 'mic';

const entryLabel = (method: OwnedAttire['entry_method']): string =>
  method === 'photo' ? 'Photo' : method === 'text' ? 'Text' : 'Voice';

export const OwnedItemDashboard: React.FC<OwnedItemDashboardProps> = ({ onAddItem, onOpenItem }) => {
  const { items, isLoaded } = useOwnedAttire();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AttireCategory>('all');
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');

  const availableTypes = useMemo(() => {
    const set = new Set<AttireCategory>();
    items.forEach((i) => set.add(i.auto_categorized_type));
    return Array.from(set).sort();
  }, [items]);

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const c = i.auto_categorized_color.trim().toLowerCase();
      if (c && c !== 'unclear') set.add(c);
    });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (statusFilter !== 'all' && item.availability_status !== statusFilter) return false;
        if (typeFilter !== 'all' && item.auto_categorized_type !== typeFilter) return false;
        if (
          colorFilter !== 'all' &&
          item.auto_categorized_color.trim().toLowerCase() !== colorFilter
        ) {
          return false;
        }
        return true;
      }),
    [items, statusFilter, typeFilter, colorFilter]
  );

  const counts = useMemo(
    () => ({
      free: items.filter((i) => i.availability_status === 'free').length,
      committed: items.filter((i) => i.availability_status === 'committed').length,
    }),
    [items]
  );

  const clearFilters =
    statusFilter !== 'all' || typeFilter !== 'all' || colorFilter !== 'all';

  const renderItem = ({ item }: { item: OwnedAttire }) => (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.7} onPress={() => onOpenItem(item.attire_id)}>
      <View style={styles.thumbWrap}>
        <Ionicons name="shirt-outline" size={28} color={colors.primary} />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.auto_categorized_color} {item.auto_categorized_type}
          </Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.availability_status === 'free' ? colors.success : colors.secondary },
            ]}
          />
        </View>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {item.auto_categorized_style}
        </Text>
        <View style={styles.itemFooter}>
          <View style={styles.entryTag}>
            <Ionicons name={entryIcon(item.entry_method)} size={11} color={colors.textSecondary} />
            <Text style={styles.entryTagText}>{entryLabel(item.entry_method)}</Text>
          </View>
          <Text style={styles.conditionText}>Condition {item.condition_rating}/5</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {!isLoaded ? null : (
        <ScrollView style={styles.filtersWrap} horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersRow}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, statusFilter === f.key && styles.chipActive]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, statusFilter === f.key && styles.chipTextActive]}>
                  {f.label}
                  {f.key === 'free' ? ` ${counts.free}` : f.key === 'committed' ? ` ${counts.committed}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
            {availableTypes.map((t) => (
              <TouchableOpacity
                key={`t-${t}`}
                style={[styles.chip, typeFilter === t && styles.chipActive]}
                onPress={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, typeFilter === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
            {availableColors.map((c) => (
              <TouchableOpacity
                key={`c-${c}`}
                style={[styles.chip, colorFilter === c && styles.chipActive]}
                onPress={() => setColorFilter(colorFilter === c ? 'all' : c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, colorFilter === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Inventory</Text>
        <Text style={styles.headerCount}>{filtered.length} item(s)</Text>
      </View>

      {clearFilters && (
        <TouchableOpacity style={styles.clearRow} onPress={() => {
          setStatusFilter('all');
          setTypeFilter('all');
          setColorFilter('all');
        }}>
          <Ionicons name="close-circle" size={16} color={colors.primary} />
          <Text style={styles.clearText}>Clear filters</Text>
        </TouchableOpacity>
      )}

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name={clearFilters ? 'funnel-outline' : 'shirt-outline'}
            size={40}
            color={colors.textDisabled}
          />
          <Text style={styles.emptyTitle}>
            {clearFilters ? 'No items match the filters' : 'No owned items yet'}
          </Text>
          <Text style={styles.emptySub}>
            {clearFilters
              ? 'Try clearing filters or log a new item.'
              : 'Log your first piece of attire to start building your inventory.'}
          </Text>
          {!clearFilters && (
            <View style={styles.emptyButton}>
              <Button title="Log an Owned Item" variant="primary" onPress={onAddItem} />
            </View>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.attire_id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
          <View style={styles.addButtonWrap}>
            <Button title="Log an Owned Item" variant="primary" fullWidth onPress={onAddItem} />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  filtersWrap: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.backgroundLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  clearText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  thumbWrap: {
    width: 56,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    textTransform: 'capitalize',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemMeta: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  entryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTagText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  conditionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
  },
  emptyButton: {
    marginTop: spacing.lg,
    width: '100%',
  },
  addButtonWrap: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
});