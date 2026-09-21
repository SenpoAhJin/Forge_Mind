/**
 * FE-7 Step 2: Logistics Home Screen
 * Lists all logistics entries sorted by urgency (critical → urgent → reminder → complete)
 * 
 * Access:
 * - Head Organizer: full access (view, create, edit, delete)
 * - Staff: read-only (view only)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Button, StandardCard, Tag } from '../../components';
import { useUser } from '../../contexts/UserContext';
import { useLogistics } from '../../contexts/LogisticsContext';
import { useEvents } from '../../contexts/EventsContext';
import { sortByUrgency, checkCompletion, checkUrgency, formatParticipantKind } from '../../utils/logisticsRules';
import { getTodayLocal } from '../../utils/dateHelpers';

type LogisticsStackParamList = {
  LogisticsHome: undefined;
  EventLogistics: { eventId: string };
  AddLogisticsEntry: { eventId?: string };
  LogisticsEntryDetail: { entryId: string };
};

type NavigationProp = NativeStackNavigationProp<LogisticsStackParamList, 'LogisticsHome'>;

export const LogisticsHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useUser();
  const { entries, loading } = useLogistics();
  const { events } = useEvents();

  const isHeadOrganizer = user?.organizer_role === 'head';
  const today = getTodayLocal();

  // Sort entries by urgency
  const sortedEntries = sortByUrgency(entries, events, today);

  // Get event map for quick lookup
  const eventMap = new Map(events.map(e => [e.id, e]));

  const renderEntry = (entry: typeof entries[0]) => {
    const event = eventMap.get(entry.event_id);
    if (!event) return null;

    const completion = checkCompletion(entry);
    const urgency = checkUrgency(entry, event, today);

    // Urgency badge color
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
          <View style={styles.cardHeader}>
            <Text style={styles.participantName} numberOfLines={1}>
              {entry.participant_name}
            </Text>
            {!completion.isComplete && (
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
                <Text style={styles.urgencyText}>
                  {urgency.level === 'critical' ? 'CRITICAL' : urgency.level === 'urgent' ? 'URGENT' : 'REMINDER'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.eventName} numberOfLines={1}>
            {event.name}
          </Text>
          <View style={styles.cardDetails}>
            <Tag type="status" label={formatParticipantKind(entry.participant_kind)} style={styles.kindTag} />
            <Text style={styles.detailText}>
              {completion.isComplete ? '✓ Complete' : `${completion.missingFields.length} field${completion.missingFields.length > 1 ? 's' : ''} missing`}
            </Text>
          </View>
        </StandardCard>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header actions */}
        {isHeadOrganizer && (
          <View style={styles.actions}>
            <Button
              title="Add Entry"
              onPress={() => navigation.navigate('AddLogisticsEntry', {})}
              fullWidth
            />
          </View>
        )}

        {/* Entries list */}
        {sortedEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="car-outline" size={48} color={colors.textDisabled} />
            </View>
            <Text style={styles.emptyTitle}>No logistics entries yet</Text>
            <Text style={styles.emptyMessage}>
              {isHeadOrganizer
                ? 'Add participant logistics to track arrivals, parking, and stage times'
                : 'Logistics entries will appear here once added'}
            </Text>
          </View>
        ) : (
          sortedEntries.map(renderEntry)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  entryCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  participantName: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  urgencyText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.backgroundLight,
  },
  eventName: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kindTag: {
    backgroundColor: colors.tertiary,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});
