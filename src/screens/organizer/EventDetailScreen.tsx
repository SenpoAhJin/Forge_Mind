/**
 * FE-7 Step 1: Event Detail Screen
 * View event details with Head Organizer actions (Edit/Confirm/Cancel)
 * Staff: read-only view (confirmed events only)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EventsStackParamList } from '../../navigation/EventsStackNavigator';
import { useUser } from '../../contexts/UserContext';
import { useEvents } from '../../contexts/EventsContext';
import { useCommitmentLog } from '../../contexts/CommitmentLogContext';
import { Button, Tag, ConfirmationModal } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { formatEventStatus } from '../../utils/formatStatus';
import { isDateInPast } from '../../utils/dateHelpers';

type Props = NativeStackScreenProps<EventsStackParamList, 'EventDetail'>;

export const EventDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useUser();
  const { getEventById, confirmEvent, cancelEvent } = useEvents();
  const { getLogForEntity } = useCommitmentLog();
  
  const eventId = route.params.eventId;
  const event = getEventById(eventId);

  // Role checks
  const isHeadOrganizer = user?.organizer_role === 'head';
  const isVerifiedStaff = user?.organizer_role === 'staff' && user?.department_verification_status === 'approved';

  // Route-level guard: Staff cannot open draft/cancelled events
  const canView = isHeadOrganizer || (isVerifiedStaff && event?.status === 'confirmed');

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Helper: Check if event is in the past
  const isPastEvent = (): boolean => {
    if (!event) return false;
    const checkDate = event.end_date || event.start_date;
    return isDateInPast(checkDate);
  };

  // Helper: Format date range
  const formatDateRange = (): string => {
    if (!event) return '';
    if (event.end_date && event.end_date !== event.start_date) {
      return `${event.start_date} to ${event.end_date}`;
    }
    return event.start_date;
  };

  // Helper: Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Confirm event
  const handleConfirm = async () => {
    setShowConfirmModal(false);
    setError(null);

    const result = await confirmEvent(
      eventId,
      user?.email || '',
      user?.organizer_role || null
    );

    if (result.success) {
      setSuccessMessage('Event confirmed successfully');
      setShowSuccessModal(true);
    } else {
      setError(result.error || 'Failed to confirm event');
    }
  };

  // Cancel event
  const handleCancel = async () => {
    setShowCancelModal(false);
    setError(null);

    const result = await cancelEvent(
      eventId,
      user?.email || '',
      user?.organizer_role || null
    );

    if (result.success) {
      setSuccessMessage('Event cancelled successfully');
      setShowSuccessModal(true);
    } else {
      setError(result.error || 'Failed to cancel event');
    }
  };

  // Blocked state
  if (!canView || !event) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.blockedBanner}>
          <Ionicons name="lock-closed" size={24} color={colors.error} />
          <Text style={styles.blockedText}>
            {!event
              ? 'Event not found.'
              : 'Staff can only view confirmed events.'}
          </Text>
          <Button title="Go Back" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status badges */}
        <View style={styles.badges}>
          <Tag
            type="status"
            label={formatEventStatus(event.status)}
            style={
              event.status === 'confirmed'
                ? styles.badgeConfirmed
                : event.status === 'cancelled'
                ? styles.badgeCancelled
                : styles.badgeDraft
            }
          />
          {isPastEvent() && <Tag type="status" label="Past" style={styles.badgeNeutral} />}
        </View>

        {/* Name */}
        <Text style={styles.eventName}>{event.name}</Text>

        {/* Description */}
        {event.description ? (
          <Text style={styles.description}>{event.description}</Text>
        ) : null}

        {/* Details */}
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDateRange()}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Venue</Text>
              <Text style={styles.detailValue}>
                {event.venue_name}{event.city ? `, ${event.city}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="trophy-outline" size={20} color={colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Cosplay Contest</Text>
              <Text style={styles.detailValue}>{event.has_contest ? 'Yes' : 'No'}</Text>
            </View>
          </View>
        </View>

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event History</Text>
          
          <View style={styles.timestampRow}>
            <Text style={styles.timestampLabel}>Created</Text>
            <Text style={styles.timestampValue}>
              {formatTimestamp(event.created_at)} by {event.created_by_email}
            </Text>
          </View>

          {event.confirmed_at && event.confirmed_by_email ? (
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Confirmed</Text>
              <Text style={styles.timestampValue}>
                {formatTimestamp(event.confirmed_at)} by {event.confirmed_by_email}
              </Text>
            </View>
          ) : null}

          {event.cancelled_at && event.cancelled_by_email ? (
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Cancelled</Text>
              <Text style={styles.timestampValue}>
                {formatTimestamp(event.cancelled_at)} by {event.cancelled_by_email}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Change History */}
        {(() => {
          const changeLog = getLogForEntity('event', eventId);
          return changeLog.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change History</Text>
              {changeLog.map(entry => (
                <View key={entry.id} style={styles.changeRow}>
                  <Text style={styles.changeText} numberOfLines={1}>
                    {entry.field_name} changed from {entry.old_value} to {entry.new_value} — by {entry.changed_by_name}, {new Date(entry.changed_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          ) : null;
        })()}

        {/* Locked confirmed notice - REMOVED, editing now allowed */}

        {/* Error display */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Head Organizer actions */}
        {isHeadOrganizer && (
          <View style={styles.actions}>
            {event.status === 'draft' && (
              <>
                <Button
                  title="Edit"
                  variant="primary"
                  onPress={() => navigation.navigate('CreateEvent', { eventId: event.id })}
                />
                <Button
                  title="Confirm Event"
                  variant="secondary"
                  onPress={() => setShowConfirmModal(true)}
                />
                <Button
                  title="Cancel Event"
                  variant="destructive"
                  onPress={() => setShowCancelModal(true)}
                />
              </>
            )}

            {event.status === 'confirmed' && (
              <>
                <Button
                  title="Edit"
                  variant="primary"
                  onPress={() => navigation.navigate('CreateEvent', { eventId: event.id })}
                />
                {event.has_contest ? (
                  <Button
                    title="Manage Contest"
                    variant="secondary"
                    onPress={() => navigation.navigate('ContestManage', { eventId: event.id })}
                  />
                ) : null}
                <Button
                  title="Group Meetup Coordinator"
                  variant="secondary"
                  onPress={() => navigation.navigate('GroupMeetup', { eventId: event.id })}
                />
                <Button
                  title="Cancel Event"
                  variant="destructive"
                  onPress={() => setShowCancelModal(true)}
                />
              </>
            )}

            {event.status === 'cancelled' && (
              <Text style={styles.readOnlyNote}>This event has been cancelled.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Confirm modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Event"
        message="Confirming this event will lock its details and make it visible to staff. Are you sure?"
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Cancel modal */}
      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Event"
        message="Are you sure you want to cancel this event? This action cannot be undone."
        confirmText="Cancel Event"
        cancelText="Keep Event"
        confirmStyle="destructive"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* Success modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage}
        confirmText="OK"
        onConfirm={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        onCancel={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  blockedBanner: {
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  blockedText: { ...typography.body, color: colors.textPrimary, textAlign: 'center' },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badgeConfirmed: {
    backgroundColor: colors.success,
  },
  badgeCancelled: {
    backgroundColor: colors.error,
  },
  badgeDraft: {
    backgroundColor: colors.textSecondary,
  },
  badgeNeutral: {
    backgroundColor: colors.textSecondary,
  },
  eventName: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  section: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  timestampRow: {
    marginBottom: spacing.sm,
  },
  timestampLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timestampValue: {
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  changeRow: {
    height: 40,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  changeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF5FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  lockedText: { ...typography.body, color: colors.info, flex: 1, lineHeight: 20 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  errorText: { ...typography.body, color: colors.error, flex: 1 },
  actions: {
    gap: spacing.md,
  },
  readOnlyNote: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
