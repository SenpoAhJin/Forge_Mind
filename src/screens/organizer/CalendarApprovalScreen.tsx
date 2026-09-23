/**
 * Calendar Approval Queue - Head Organizer only
 * Review pending calendar submissions from own department
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
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

      {/* Custom Rejection Modal with Text Input */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowRejectModal(false); setSelectedEntry(null); setRejectionReason(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modal}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Ionicons name="close-circle-outline" size={32} color={colors.error} />
                <Text style={styles.modalTitle}>Reject Submission</Text>
                <Text style={styles.modalMessage}>Provide a reason for rejection:</Text>
              </View>

              {/* Input Field */}
              <View style={styles.modalContent}>
                <TextInputField
                  label="Reason"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="e.g. Incomplete information, duplicate event..."
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => { setShowRejectModal(false); setSelectedEntry(null); setRejectionReason(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectButton]}
                  onPress={handleReject}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modal: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  rejectButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.backgroundLight,
  },
});
