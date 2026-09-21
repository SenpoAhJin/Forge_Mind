/**
 * FE-7 Step 2: Add/Edit Logistics Entry Screen
 * Form for creating or editing logistics entries
 * 
 * Access: Head Organizer only
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Button, TextInputField, ConfirmationModal } from '../../components';
import { DateInput } from '../../components/inputs/DateInput';
import { TimePickerInput } from '../../components/inputs/TimePickerInput';
import { useUser } from '../../contexts/UserContext';
import { useLogistics } from '../../contexts/LogisticsContext';
import { useEvents } from '../../contexts/EventsContext';
import { ParticipantKind, ParkingNeeds } from '../../types/logistics';
import { getTodayLocal } from '../../utils/dateHelpers';

type LogisticsStackParamList = {
  LogisticsHome: undefined;
  EventLogistics: { eventId: string };
  AddLogisticsEntry: { eventId?: string };
  LogisticsEntryDetail: { entryId: string };
};

type NavigationProp = NativeStackNavigationProp<LogisticsStackParamList, 'AddLogisticsEntry'>;
type ScreenRouteProp = RouteProp<LogisticsStackParamList, 'AddLogisticsEntry'>;

export const AddLogisticsEntryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { user } = useUser();
  const { createEntry } = useLogistics();
  const { events } = useEvents();

  const [eventId, setEventId] = useState(route.params?.eventId || '');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantKind, setParticipantKind] = useState<ParticipantKind>('confirmed_guest');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [parkingNeeds, setParkingNeeds] = useState<ParkingNeeds>('none');
  const [plateNumber, setPlateNumber] = useState('');
  const [entourageSize, setEntourageSize] = useState('');
  const [stageTimePreference, setStageTimePreference] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');

  // Guard: Head Organizer only
  if (user?.organizer_role !== 'head') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Head Organizer access required</Text>
      </View>
    );
  }

  const confirmedEvents = events.filter(e => e.status === 'confirmed');
  const selectedEvent = events.find(e => e.id === eventId);

  const handleSave = async () => {
    setError('');

    if (!eventId) {
      setError('Please select an event');
      return;
    }
    if (!participantName || !submissionDeadline) {
      setError('Participant name and submission deadline are required');
      return;
    }

    const result = await createEntry({
      event_id: eventId,
      participant_email: participantEmail || null,
      participant_name: participantName,
      participant_kind: participantKind,
      submission_deadline: submissionDeadline,
      arrival_date: arrivalDate || null,
      arrival_time: arrivalTime || null,
      parking_needs: parkingNeeds,
      plate_number: plateNumber || null,
      entourage_size: entourageSize ? parseInt(entourageSize, 10) : null,
      stage_time_preference: stageTimePreference || null,
    });

    if (result.success) {
      setShowSuccessModal(true);
    } else {
      setError(result.error || 'Failed to create entry');
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Event Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Event *</Text>
          <View style={styles.chipRow}>
            {confirmedEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={[styles.chip, eventId === event.id && styles.chipSelected]}
                onPress={() => setEventId(event.id)}
              >
                <Text style={[styles.chipText, eventId === event.id && styles.chipTextSelected]}>
                  {event.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Participant Info */}
        <TextInputField
          label="Participant Email (optional)"
          value={participantEmail}
          onChangeText={setParticipantEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInputField
          label="Participant Name *"
          value={participantName}
          onChangeText={setParticipantName}
          placeholder="Full name"
        />

        {/* Participant Kind */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Participant Type *</Text>
          <View style={styles.chipRow}>
            {(['confirmed_guest', 'sponsor', 'performer'] as ParticipantKind[]).map(kind => (
              <TouchableOpacity
                key={kind}
                style={[styles.chip, participantKind === kind && styles.chipSelected]}
                onPress={() => setParticipantKind(kind)}
              >
                <Text style={[styles.chipText, participantKind === kind && styles.chipTextSelected]}>
                  {kind === 'confirmed_guest' ? 'Guest' : kind === 'sponsor' ? 'Sponsor' : 'Performer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submission Deadline */}
        <DateInput 
          label="Submission Deadline *" 
          value={submissionDeadline} 
          onChange={setSubmissionDeadline}
          minDate={getTodayLocal()}
          maxDate={selectedEvent?.start_date || undefined}
        />
        <Text style={styles.helperText}>
          Core details (name, type, deadline) lock after creation.
        </Text>

        {/* Arrival */}
        <DateInput 
          label="Arrival Date" 
          value={arrivalDate} 
          onChange={setArrivalDate}
          maxDate={selectedEvent?.end_date || selectedEvent?.start_date || undefined}
        />
        <TimePickerInput
          label="Arrival Time"
          value={arrivalTime}
          onChange={setArrivalTime}
        />

        {/* Parking */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Parking Needs</Text>
          <View style={styles.chipRow}>
            {(['none', 'standard', 'accessible'] as ParkingNeeds[]).map(needs => (
              <TouchableOpacity
                key={needs}
                style={[styles.chip, parkingNeeds === needs && styles.chipSelected]}
                onPress={() => setParkingNeeds(needs)}
              >
                <Text style={[styles.chipText, parkingNeeds === needs && styles.chipTextSelected]}>
                  {needs === 'none' ? 'None' : needs === 'standard' ? 'Standard' : 'Accessible'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {parkingNeeds !== 'none' && (
          <TextInputField
            label="Plate Number"
            value={plateNumber}
            onChangeText={setPlateNumber}
            placeholder="ABC123"
            autoCapitalize="characters"
          />
        )}

        {/* Entourage */}
        <TextInputField
          label="Entourage Size"
          value={entourageSize}
          onChangeText={setEntourageSize}
          placeholder="0"
          keyboardType="numeric"
        />

        {/* Stage Time (performers only) */}
        {participantKind === 'performer' && (
          <TextInputField
            label="Stage Time Preference (optional)"
            value={stageTimePreference}
            onChangeText={setStageTimePreference}
            placeholder="Afternoon preferred"
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button title="Save Entry" onPress={handleSave} fullWidth />
      </ScrollView>

      <ConfirmationModal
        visible={showSuccessModal}
        title="Entry Created"
        message="Logistics entry created successfully."
        confirmText="OK"
        onConfirm={handleSuccessConfirm}
        onCancel={handleSuccessConfirm}
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
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.backgroundLight,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
});
