/**
 * FE-7 Step 2: Logistics Entry Detail Screen
 * View and edit single logistics entry
 * 
 * Access:
 * - Head: full access (view, edit, delete)
 * - Staff: read-only
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../theme';
import { Button, ConfirmationModal, StandardCard } from '../../components';
import { useUser } from '../../contexts/UserContext';
import { useLogistics } from '../../contexts/LogisticsContext';
import { useEvents } from '../../contexts/EventsContext';
import { checkCompletion, checkUrgency, formatParticipantKind, formatParkingNeeds } from '../../utils/logisticsRules';
import { getTodayLocal } from '../../utils/dateHelpers';

type LogisticsStackParamList = {
  LogisticsHome: undefined;
  EventLogistics: { eventId: string };
  AddLogisticsEntry: { eventId?: string };
  LogisticsEntryDetail: { entryId: string };
};

type NavigationProp = NativeStackNavigationProp<LogisticsStackParamList, 'LogisticsEntryDetail'>;
type ScreenRouteProp = RouteProp<LogisticsStackParamList, 'LogisticsEntryDetail'>;

export const LogisticsEntryDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { user } = useUser();
  const { entries, deleteEntry } = useLogistics();
  const { events } = useEvents();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isHeadOrganizer = user?.organizer_role === 'head';
  const entry = entries.find(e => e.id === route.params.entryId);
  const event = events.find(e => e.id === entry?.event_id);

  if (!entry || !event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Entry not found</Text>
      </View>
    );
  }

  const today = getTodayLocal();
  const completion = checkCompletion(entry);
  const urgency = checkUrgency(entry, event, today);

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const result = await deleteEntry(entry.id);
    if (result.success) {
      navigation.goBack();
    }
  };

  const renderField = (label: string, value: string | null | undefined, missing: boolean = false) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, missing && styles.fieldMissing]}>
        {value || (missing ? 'Missing' : '—')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StandardCard>
          <Text style={styles.sectionTitle}>Participant</Text>
          {renderField('Name', entry.participant_name)}
          {renderField('Email', entry.participant_email)}
          {renderField('Type', formatParticipantKind(entry.participant_kind))}
        </StandardCard>

        <StandardCard>
          <Text style={styles.sectionTitle}>Event</Text>
          {renderField('Event Name', event.name)}
          {renderField('Event Date', event.start_date)}
        </StandardCard>

        <StandardCard>
          <Text style={styles.sectionTitle}>Arrival</Text>
          {renderField('Arrival Date', entry.arrival_date, completion.missingFields.includes('arrival_date'))}
          {renderField('Arrival Time', entry.arrival_time, completion.missingFields.includes('arrival_time'))}
        </StandardCard>

        <StandardCard>
          <Text style={styles.sectionTitle}>Parking</Text>
          {renderField('Parking Needs', formatParkingNeeds(entry.parking_needs))}
          {entry.parking_needs !== 'none' &&
            renderField('Plate Number', entry.plate_number, completion.missingFields.includes('plate_number'))}
        </StandardCard>

        <StandardCard>
          <Text style={styles.sectionTitle}>Other</Text>
          {renderField(
            'Entourage Size',
            entry.entourage_size !== null ? entry.entourage_size.toString() : null,
            completion.missingFields.includes('entourage_size')
          )}
          {entry.participant_kind === 'performer' && renderField('Stage Time Preference', entry.stage_time_preference)}
        </StandardCard>

        <StandardCard>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Completion:</Text>
            <Text style={completion.isComplete ? styles.statusComplete : styles.statusIncomplete}>
              {completion.isComplete ? '✓ Complete' : `${completion.missingFields.length} missing`}
            </Text>
          </View>
          {!completion.isComplete && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Urgency:</Text>
              <Text
                style={[
                  styles.urgencyLevel,
                  urgency.level === 'critical' && styles.urgencyCritical,
                  urgency.level === 'urgent' && styles.urgencyUrgent,
                ]}
              >
                {urgency.level.toUpperCase()} ({urgency.reason})
              </Text>
            </View>
          )}
        </StandardCard>

        {isHeadOrganizer && (
          <View style={styles.actions}>
            <Button title="Delete Entry" variant="destructive" onPress={handleDelete} fullWidth />
          </View>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Entry"
        message="Are you sure you want to delete this logistics entry? This cannot be undone."
        confirmText="Delete"
        confirmStyle="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
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
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  fieldMissing: {
    color: colors.error,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusLabel: {
    ...typography.h3,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  statusComplete: {
    ...typography.body,
    color: colors.success,
  },
  statusIncomplete: {
    ...typography.body,
    color: colors.error,
  },
  urgencyLevel: {
    ...typography.h3,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urgencyCritical: {
    color: colors.error,
  },
  urgencyUrgent: {
    color: colors.warning,
  },
  actions: {
    marginTop: spacing.lg,
  },
});
