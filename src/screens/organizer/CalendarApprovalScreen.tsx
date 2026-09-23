/**
 * Calendar Approval Queue - Head Organizer only
 * Review pending calendar submissions from own department
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard, Button, TextInputField, ConfirmationModal } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useCalendar } from '../../contexts/CalendarContext';
import { CalendarEntry } from '../../types/calendarEntries';

export const CalendarApprovalScreen: React.FC = () => {
  const { user } = useUser();
  const { entries, approveEntry, rejectEntry } = useCalendar();

  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState('');

  // Filter pending entries from own department
  const pendingEntries = useMemo(() => {
    return entries.filter(
      (e) => e.status === 'pending' && e.submitted_by_department === user?.head_organizer_department
    );
  }, [entries, user?.head_organizer_department]);

  const handleApprove = async (entry: CalendarEntry) => {
    if (!user) return;
    const result = await approveEntry(entry.id, user.email, user.organizer_role, user.head_organizer_department || null);
    if (!result.success) {
      setActionError(result.error || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!user || !selectedEntry) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      setActionError('Rejection reason is required');
      return;
    }
    
    const result = await rejectEntry(selectedEntry.id, reason, user.email, user.organizer_role, user.head_organizer_department || null);
    if (!result.success) {
      setActionError(result.error || 'Failed to reject');
    } else {
      setShowRejectModal(false);
      setSelectedEntry(null);
      setRejectionReason('');
    }
  };

  if (user?.organizer_role !== 'head') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Head Organizer access only</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Pending Submissions ({pendingEntries.length})</Text>

      {pendingEntries.length === 0 ? (
        <StandardCard style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
          <Text style={styles.emptyText}>No pending submissions</Text>
        </StandardCard>
      ) : (
        pendingEntries.map((entry) => (
          <StandardCard key={entry.id} style={styles.entryCard}>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            <Text style={styles.entryOrganizer}>{entry.organizer_name}</Text>
            <Text style={styles.entryDetail}>{entry.venue_name}, {entry.city}</Text>
            <Text style={styles.entryDetail}>{entry.start_date}{entry.end_date ? ` - ${entry.end_date}` : ''}</Text>
            <Text style={styles.submitter}>Submitted by {entry.submitted_by_name}</Text>
            
            <View style={styles.actions}>
              <Button
                title="Approve"
                variant="primary"
                onPress={() => handleApprove(entry)}
              />
              <Button
                title="Reject"
                variant="tertiary"
                onPress={() => { setSelectedEntry(entry); setShowRejectModal(true); }}
              />
            </View>
          </StandardCard>
        ))
      )}

      {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

      {showRejectModal ? (
        <ConfirmationModal
          visible={true}
          title="Reject Submission"
          message="Provide a reason for rejection:"
          confirmText="Reject"
          cancelText="Cancel"
          onConfirm={handleReject}
          onCancel={() => { setShowRejectModal(false); setSelectedEntry(null); setRejectionReason(''); }}
        >
          <TextInputField
            label="Reason"
            value={rejectionReason}
            onChangeText={setRejectionReason}
            placeholder="e.g. Incomplete information, duplicate event..."
          />
        </ConfirmationModal>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  entryCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  entryTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  entryOrganizer: {
    ...typography.body,
    color: colors.textSecondary,
  },
  entryDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  submitter: {
    ...typography.caption,
    color: colors.textDisabled,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
});
