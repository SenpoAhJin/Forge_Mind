/**
 * FE-7 Step 4: Contests List Screen (Cosplayer)
 * Flat list of confirmed events with has_contest, opt-in button
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { StandardCard, Button, Tag, ConfirmationModal } from '../../components';
import { useUser } from '../../contexts/UserContext';
import { useEvents } from '../../contexts/EventsContext';
import { useContest } from '../../contexts/ContestContext';
import { formatEventDateRange } from '../../utils/logisticsRules';

export const ContestsListScreen: React.FC = () => {
  const { user } = useUser();
  const { events } = useEvents();
  const { optIn, getMyOptIns, getCriteriaForEvent } = useContest();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const myEmail = user?.email || '';
  const myOptIns = getMyOptIns(myEmail);

  // Filter confirmed events with has_contest
  const contestEvents = events.filter(e => e.status === 'confirmed' && e.has_contest);

  const handleOptIn = async (eventId: string, eventName: string) => {
    if (!user) return;

    const result = await optIn(eventId, {
      email: user.email,
      display_name: user.display_name || user.email,
    });

    if (result.success) {
      setSuccessMessage(`Successfully opted into ${eventName}`);
      setShowSuccessModal(true);
    } else {
      setSuccessMessage(result.error || 'Failed to opt in');
      setShowSuccessModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contest Events</Text>
          <Text style={styles.headerSubtitle}>
            Opt into contest events to be considered for tier placement
          </Text>
        </View>

        {contestEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={colors.textDisabled} />
            <Text style={styles.emptyText}>No contest events available</Text>
          </View>
        ) : (
          contestEvents.map(event => {
            const myOptIn = myOptIns.find(o => o.event_id === event.id);
            const criteria = getCriteriaForEvent(event.id);
            const assignedTier = myOptIn?.assigned_tier_id
              ? criteria.find(c => c.id === myOptIn.assigned_tier_id)
              : null;

            return (
              <StandardCard key={event.id} style={styles.eventCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.eventName} numberOfLines={1}>
                    {event.name}
                  </Text>
                  {myOptIn ? (
                    <Tag
                      type="status"
                      label={myOptIn.status === 'pending' ? 'Pending' : myOptIn.status === 'confirmed' ? 'Confirmed' : 'Declined'}
                      style={
                        myOptIn.status === 'confirmed'
                          ? styles.tagConfirmed
                          : myOptIn.status === 'declined'
                          ? styles.tagDeclined
                          : undefined
                      }
                    />
                  ) : null}
                </View>
                <Text style={styles.eventDates} numberOfLines={1}>
                  {formatEventDateRange(event.start_date, event.end_date || event.start_date)}
                </Text>
                {myOptIn && assignedTier ? (
                  <Text style={styles.tierText} numberOfLines={1}>
                    Tier: {assignedTier.label}
                  </Text>
                ) : null}
                {!myOptIn ? (
                  <Button
                    title="Opt In"
                    variant="primary"
                    onPress={() => handleOptIn(event.id, event.name)}
                    style={styles.optInButton}
                  />
                ) : null}
              </StandardCard>
            );
          })
        )}
      </ScrollView>

      <ConfirmationModal
        visible={showSuccessModal}
        title={successMessage.startsWith('Successfully') ? 'Success' : 'Notice'}
        message={successMessage}
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
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
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
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
  eventCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    minHeight: 120,
  },
  cardHeader: {
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
  eventDates: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tierText: {
    ...typography.caption,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  optInButton: {
    marginTop: spacing.xs,
  },
  tagConfirmed: {
    backgroundColor: colors.success,
  },
  tagDeclined: {
    backgroundColor: colors.error,
  },
});
