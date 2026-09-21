/**
 * FE-7 Step 2 Correction Pass C5: Logistics Home Screen
 * "Needs attention" panel + confirmed event cards
 * 
 * Access: Both Head and Staff can view
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { StandardCard, Tag } from '../../components';
import { useUser } from '../../contexts/UserContext';
import { useLogistics } from '../../contexts/LogisticsContext';
import { useEvents } from '../../contexts/EventsContext';
import { sortByCriticality, checkCompletion, getUrgency, formatParticipantKind, formatEventDateRange } from '../../utils/logisticsRules';
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

  // Filter active entries for confirmed events
  const confirmedEvents = events.filter(e => e.status === 'confirmed');
  const activeEntries = entries.filter(e => e.status === 'active');
  const confirmedEventEntries = activeEntries.filter(e =>
    confirmedEvents.some(ev => ev.id === e.event_id)
  );

  // Get top 3 most critical incomplete entries
  const sortedIncomplete = sortByCriticality(confirmedEventEntries, events, today).filter(entry => {
    const completion = checkCompletion(entry);
    return !completion.isComplete;
  });
  const needsAttention = sortedIncomplete.slice(0, 3);

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
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={styles.bannerText}>
            Reminders are in-app. Scheduled push notifications need the backend.
          </Text>
        </View>

        {/* Needs Attention Panel */}
        {needsAttention.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
            {needsAttention.map(entry => {
              const event = events.find(e => e.id === entry.event_id);
              if (!event) return null;

              const urgency = getUrgency(entry, today);
              const completion = checkCompletion(entry);

              const urgencyColor =
                urgency.level === 'critical'
                  ? colors.error
                  : urgency.level === 'urgent'
                  ? colors.warning
                  : colors.textSecondary;

              return (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.attentionCard}
                  onPress={() => navigation.navigate('LogisticsEntryDetail', { entryId: entry.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.attentionHeader}>
                    <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
                    <Text style={styles.attentionName} numberOfLines={1}>
                      {entry.participant_name}
                    </Text>
                  </View>
                  <Text style={styles.attentionEvent} numberOfLines={1}>
                    {event.name}
                  </Text>
                  <View style={styles.attentionFooter}>
                    <Text style={[styles.attentionDeadline, urgency.level === 'critical' && styles.attentionDeadlineCritical]}>
                      {urgency.daysUntilDeadline < 0 ? 'Past deadline' : urgency.reason}
                    </Text>
                    <Text style={styles.attentionMissing}>
                      {completion.missingFields.length} missing
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Confirmed Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirmed Events</Text>
          {confirmedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={48} color={colors.textDisabled} />
              </View>
              <Text style={styles.emptyTitle}>No confirmed events yet</Text>
              <Text style={styles.emptyMessage}>
                Logistics entries are created for confirmed events only
              </Text>
            </View>
          ) : (
            confirmedEvents.map(event => {
              const eventEntries = activeEntries.filter(e => e.event_id === event.id);
              const completeCount = eventEntries.filter(e => checkCompletion(e).isComplete).length;
              const totalCount = eventEntries.length;

              // Get worst urgency for this event
              const urgencies = eventEntries
                .filter(e => !checkCompletion(e).isComplete)
                .map(e => getUrgency(e, today));
              const worstUrgency = urgencies.find(u => u.level === 'critical') ||
                urgencies.find(u => u.level === 'urgent') ||
                urgencies.find(u => u.level === 'reminder') ||
                null;

              return (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => navigation.navigate('EventLogistics', { eventId: event.id })}
                  activeOpacity={0.7}
                >
                  <StandardCard style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventName} numberOfLines={1}>
                        {event.name}
                      </Text>
                      {worstUrgency && (
                        <View
                          style={[
                            styles.eventBadge,
                            { backgroundColor: worstUrgency.level === 'critical' ? colors.error : colors.warning },
                          ]}
                        >
                          <Text style={styles.eventBadgeText}>
                            {worstUrgency.level === 'critical' ? 'CRITICAL' : 'URGENT'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventDates} numberOfLines={1}>
                      {formatEventDateRange(event.start_date, event.end_date || event.start_date)}
                    </Text>
                    <Text style={styles.eventCompletion}>
                      {completeCount} of {totalCount} complete
                    </Text>
                  </StandardCard>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  bannerText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  attentionCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    marginBottom: spacing.sm,
  },
  attentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  attentionName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  attentionEvent: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  attentionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attentionDeadline: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  attentionDeadlineCritical: {
    color: colors.error,
    fontWeight: '600',
  },
  attentionMissing: {
    ...typography.caption,
    color: colors.error,
  },
  eventCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    height: 100,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  eventBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  eventBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.backgroundLight,
  },
  eventDates: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  eventCompletion: {
    ...typography.body,
    color: colors.textPrimary,
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
