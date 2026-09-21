/**
 * FE-7 Step 2 Correction Pass C5: Event Logistics Screen
 * Chip filters (All/Needs info/Complete/Withdrawn) + sortByCriticality
 * Add Entry button (Head only, confirmed events), read-only notice (cancelled)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { StandardCard, Tag, Button } from '../../components';
import { useUser } from '../../contexts/UserContext';
import { useLogistics } from '../../contexts/LogisticsContext';
import { useEvents } from '../../contexts/EventsContext';
import { sortByCriticality, checkCompletion, getUrgency, formatParticipantKind } from '../../utils/logisticsRules';
import { getTodayLocal } from '../../utils/dateHelpers';

type LogisticsStackParamList = {
  LogisticsHome: undefined;
  EventLogistics: { eventId: string };
  AddLogisticsEntry: { eventId?: string };
  LogisticsEntryDetail: { entryId: string };
};

type NavigationProp = NativeStackNavigationProp<LogisticsStackParamList, 'EventLogistics'>;
type RouteProps = RouteProp<LogisticsStackParamList, 'EventLogistics'>;

type FilterChip = 'all' | 'needs_info' | 'complete' | 'withdrawn';

export const EventLogisticsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;

  const { user } = useUser();
  const { entries } = useLogistics();
  const { events } = useEvents();

  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');

  const isHeadOrganizer = user?.organizer_role === 'head';
  const today = getTodayLocal();

  const event = events.find(e => e.id === eventId);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const eventEntries = entries.filter(e => e.event_id === eventId);

  // Filter entries based on active chip
  const filteredEntries = eventEntries.filter(entry => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'withdrawn') return entry.status === 'withdrawn';
    if (activeFilter === 'complete') {
      const completion = checkCompletion(entry);
      return entry.status === 'active' && completion.isComplete;
    }
    if (activeFilter === 'needs_info') {
      const completion = checkCompletion(entry);
      return entry.status === 'active' && !completion.isComplete;
    }
    return true;
  });

  // Sort active entries by criticality, withdrawn at end
  const activeFiltered = filteredEntries.filter(e => e.status === 'active');
  const withdrawnFiltered = filteredEntries.filter(e => e.status === 'withdrawn');
  const sortedActive = sortByCriticality(activeFiltered, events, today);
  const sortedEntries = [...sortedActive, ...withdrawnFiltered];

  const isCancelled = event.status === 'cancelled';
  const isConfirmed = event.status === 'confirmed';

  return (
    <View style={styles.container}>
      {/* Chip Filter Bar */}
      <View style={styles.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
          style={styles.chipScrollView}
        >
          <TouchableOpacity
            style={[styles.chip, activeFilter === 'all' && styles.chipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.chipText, activeFilter === 'all' && styles.chipTextActive]}>
              All ({eventEntries.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeFilter === 'needs_info' && styles.chipActive]}
            onPress={() => setActiveFilter('needs_info')}
          >
            <Text style={[styles.chipText, activeFilter === 'needs_info' && styles.chipTextActive]}>
              Needs Info ({eventEntries.filter(e => e.status === 'active' && !checkCompletion(e).isComplete).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeFilter === 'complete' && styles.chipActive]}
            onPress={() => setActiveFilter('complete')}
          >
            <Text style={[styles.chipText, activeFilter === 'complete' && styles.chipTextActive]}>
              Complete ({eventEntries.filter(e => e.status === 'active' && checkCompletion(e).isComplete).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeFilter === 'withdrawn' && styles.chipActive]}
            onPress={() => setActiveFilter('withdrawn')}
          >
            <Text style={[styles.chipText, activeFilter === 'withdrawn' && styles.chipTextActive]}>
              Withdrawn ({eventEntries.filter(e => e.status === 'withdrawn').length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cancelled Event Notice */}
        {isCancelled && (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.noticeText}>
              This event is cancelled. Entries are read-only.
            </Text>
          </View>
        )}

        {/* Entry List */}
        {sortedEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color={colors.textDisabled} />
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'No entries yet'
                : activeFilter === 'needs_info'
                ? 'No incomplete entries'
                : activeFilter === 'complete'
                ? 'No completed entries'
                : 'No withdrawn entries'}
            </Text>
          </View>
        ) : (
          sortedEntries.map(entry => {
            const completion = checkCompletion(entry);
            const urgency = getUrgency(entry, today);

            const urgencyColor =
              urgency.level === 'critical'
                ? colors.error
                : urgency.level === 'urgent'
                ? colors.warning
                : urgency.level === 'reminder'
                ? colors.textDisabled
                : colors.success;

            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => navigation.navigate('LogisticsEntryDetail', { entryId: entry.id })}
                activeOpacity={0.7}
              >
                <StandardCard style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.participantName} numberOfLines={1}>
                      {entry.participant_name}
                    </Text>
                    {entry.status === 'withdrawn' ? (
                      <View style={[styles.statusBadge, { backgroundColor: colors.textDisabled }]}>
                        <Text style={styles.statusBadgeText}>WITHDRAWN</Text>
                      </View>
                    ) : !completion.isComplete ? (
                      <View style={[styles.statusBadge, { backgroundColor: urgencyColor }]}>
                        <Text style={styles.statusBadgeText}>
                          {urgency.level === 'critical'
                            ? 'CRITICAL'
                            : urgency.level === 'urgent'
                            ? 'URGENT'
                            : urgency.level === 'reminder'
                            ? 'REMINDER'
                            : 'ON TRACK'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.entryDetails}>
                    <Tag type="status" label={formatParticipantKind(entry.participant_kind)} />
                    <Text style={styles.detailText}>
                      {entry.status === 'withdrawn'
                        ? 'Withdrawn'
                        : completion.isComplete
                        ? '✓ Complete'
                        : `${completion.missingFields.length} missing`}
                    </Text>
                  </View>
                </StandardCard>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Entry Button (Head only, confirmed events) */}
      {isHeadOrganizer && isConfirmed && (
        <View style={styles.floatingButtonContainer}>
          <Button
            title="Add Entry"
            onPress={() => navigation.navigate('AddLogisticsEntry', { eventId })}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  chipBar: {
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  chipScrollView: {
    flexDirection: 'row',
  },
  chipScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.backgroundLight,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textDisabled,
    marginTop: spacing.md,
  },
  entryCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  participantName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.backgroundLight,
  },
  entryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
});
