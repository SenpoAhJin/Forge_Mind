/**
 * FE-7 Step 2 Correction Pass C3: Logistics Entry Detail Screen
 * View and edit tracked fields, withdraw entry
 * 
 * Access:
 * - Head: edit mode for tracked fields, withdraw button
 * - Staff: read-only
 * - CORE fields (name, kind, deadline) are read-only for everyone
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Button, ConfirmationModal, StandardCard, TextInputField, StaffPickerModal } from '../../components';
import { DateInput } from '../../components/inputs/DateInput';
import { TimePickerInput } from '../../components/inputs/TimePickerInput';
import { useUser } from '../../contexts/UserContext';
import { useLogistics } from '../../contexts/LogisticsContext';
import { useEvents } from '../../contexts/EventsContext';
import { checkCompletion, getUrgency, formatParticipantKind, formatParkingNeeds, formatTime12h, getMissingFields } from '../../utils/logisticsRules';
import { getTodayLocal } from '../../utils/dateHelpers';
import { ParkingNeeds } from '../../types/logistics';
import { AuthService } from '../../services/AuthService';

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
  const { entries, updateLogisticsFields, withdrawEntry, assignEntry, getEligibleStaff } = useLogistics();
  const { events } = useEvents();

  const [isEditing, setIsEditing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [error, setError] = useState('');

  // Staff assignment state
  const [eligibleStaff, setEligibleStaff] = useState<Array<{ name: string; email: string; department: string }>>([]);
  const [selectedStaffEmail, setSelectedStaffEmail] = useState<string | null>(null);
  const [assignedToName, setAssignedToName] = useState('');
  const [saving, setSaving] = useState(false);

  const isHeadOrganizer = user?.organizer_role === 'head';
  const entry = entries.find(e => e.id === route.params.entryId);
  const event = events.find(e => e.id === entry?.event_id);

  // Edit state
  const [arrivalDate, setArrivalDate] = useState(entry?.arrival_date || '');
  const [arrivalTime, setArrivalTime] = useState(entry?.arrival_time || '');
  const [parkingNeeds, setParkingNeeds] = useState<ParkingNeeds>(entry?.parking_needs || 'none');
  const [plateNumber, setPlateNumber] = useState(entry?.plate_number || '');
  const [entourageSize, setEntourageSize] = useState(
    entry && entry.entourage_size !== null ? entry.entourage_size.toString() : ''
  );
  const [stageTimePreference, setStageTimePreference] = useState(entry?.stage_time_preference || '');

  if (!entry || !event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Entry not found</Text>
      </View>
    );
  }

  const today = getTodayLocal();
  const completion = checkCompletion(entry);
  const urgency = getUrgency(entry, today);
  const missingFields = getMissingFields(entry);

  // Check if entry/event is read-only
  const isWithdrawn = entry.status === 'withdrawn';
  const isEventCancelled = event.status === 'cancelled';
  const isReadOnly = !isHeadOrganizer || isWithdrawn || isEventCancelled;

  const handleSave = async () => {
    setError('');

    const result = await updateLogisticsFields(entry.id, {
      arrival_date: arrivalDate || null,
      arrival_time: arrivalTime || null,
      parking_needs: parkingNeeds,
      plate_number: plateNumber || null,
      entourage_size: entourageSize ? parseInt(entourageSize, 10) : null,
      stage_time_preference: stageTimePreference || null,
    });

    if (result.success) {
      setIsEditing(false);
    } else {
      setError(result.error || 'Failed to update');
    }
  };

  const handleWithdraw = () => {
    setShowWithdrawModal(true);
  };

  const confirmWithdraw = async () => {
    const result = await withdrawEntry(entry.id);
    if (result.success) {
      navigation.goBack();
    }
  };

  // Load staff and determine assigned name
  useEffect(() => {
    const loadStaffData = async () => {
      const staff = await getEligibleStaff();
      setEligibleStaff(staff);

      // Determine display name for assigned staff
      if (!entry.assigned_to_email) {
        setAssignedToName('Unassigned');
      } else if (entry.assigned_to_email === user?.email) {
        setAssignedToName('You');
      } else {
        // Look up name from eligible staff first
        const staffMember = staff.find(s => s.email === entry.assigned_to_email);
        if (staffMember) {
          setAssignedToName(staffMember.name);
        } else {
          // Not found in eligible = may be deleted or no longer approved
          const accounts = await AuthService.getAccounts();
          const account = accounts.find(a => a.email === entry.assigned_to_email);
          setAssignedToName(account ? `${account.display_name} (no longer verified)` : `${entry.assigned_to_email} (no longer verified)`);
        }
      }
    };

    loadStaffData();
  }, [entry.assigned_to_email, user?.email]);

  const handleOpenAssignModal = () => {
    setSelectedStaffEmail(entry.assigned_to_email || null);
    setShowAssignModal(true);
  };

  const handleAssignSave = async () => {
    setSaving(true);
    const result = await assignEntry(entry.id, selectedStaffEmail);
    setSaving(false);

    setShowAssignModal(false);

    if (result.success) {
      // Determine success message
      if (!selectedStaffEmail) {
        setSuccessMessage('Unassigned');
      } else {
        const staffMember = eligibleStaff.find(s => s.email === selectedStaffEmail);
        setSuccessMessage(`Assigned to ${staffMember ? staffMember.name : selectedStaffEmail}`);
      }
      setShowSuccessModal(true);

      // Reload to refresh assigned_to/assigned_at
      const updatedEntry = entries.find(e => e.id === entry.id);
      if (updatedEntry) {
        // Trigger re-render by updating state
        setError(''); // Small state change to force re-render
      }
    } else {
      setErrorMessage(result.error || 'Failed to assign');
      setShowErrorModal(true);
    }
  };

  const completionPercent = missingFields.length === 0 ? 100 : Math.round(((5 - missingFields.length) / 5) * 100);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Completion Bar */}
        {entry.status === 'active' && (
          <StandardCard>
            <Text style={styles.sectionTitle}>Completion Status</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>{completionPercent}% complete</Text>
            {missingFields.length > 0 && (
              <Text style={styles.missingText}>
                Missing: {missingFields.join(', ')}
              </Text>
            )}
          </StandardCard>
        )}

        {/* CORE Fields (Read-Only) */}
        <StandardCard>
          <Text style={styles.sectionTitle}>Core Details (locked)</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Participant Name</Text>
            <Text style={styles.fieldValue}>{entry.participant_name}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Type</Text>
            <Text style={styles.fieldValue}>{formatParticipantKind(entry.participant_kind)}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Submission Deadline</Text>
            <Text style={styles.fieldValue}>{entry.submission_deadline}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Event</Text>
            <Text style={styles.fieldValue}>{event.name}</Text>
          </View>
          {entry.participant_email ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{entry.participant_email}</Text>
            </View>
          ) : null}
        </StandardCard>

        {/* Assignment Section */}
        <StandardCard>
          <Text style={styles.sectionTitle}>Assignment</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Assigned to</Text>
            <Text style={styles.fieldValue}>{assignedToName}</Text>
          </View>
          {entry.assigned_at ? (
            <Text style={styles.captionText}>
              Assigned {entry.assigned_at.split('T')[0]}
            </Text>
          ) : null}
          {isHeadOrganizer && !isWithdrawn && !isEventCancelled ? (
            <Button
              title={entry.assigned_to_email ? 'Change' : 'Assign Staff'}
              onPress={handleOpenAssignModal}
              variant="secondary"
              style={styles.assignButton}
            />
          ) : null}
        </StandardCard>

        {/* Tracked Fields (Editable for Head) */}
        <StandardCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Logistics Details</Text>
            {!isReadOnly && !isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <DateInput 
                label="Arrival Date" 
                value={arrivalDate} 
                onChange={setArrivalDate}
                maxDate={event.end_date || event.start_date}
              />
              <TimePickerInput label="Arrival Time" value={arrivalTime} onChange={setArrivalTime} />
              
              <Text style={styles.label}>Parking Needs</Text>
              <View style={styles.chipRow}>
                {(['none', 'standard', 'accessible'] as ParkingNeeds[]).map(needs => (
                  <TouchableOpacity
                    key={needs}
                    style={[styles.chip, parkingNeeds === needs && styles.chipSelected]}
                    onPress={() => setParkingNeeds(needs)}
                  >
                    <Text style={[styles.chipText, parkingNeeds === needs && styles.chipTextSelected]}>
                      {formatParkingNeeds(needs)}
                    </Text>
                  </TouchableOpacity>
                ))}
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

              <TextInputField
                label="Entourage Size"
                value={entourageSize}
                onChangeText={setEntourageSize}
                placeholder="0"
                keyboardType="numeric"
              />

              {entry.participant_kind === 'performer' && (
                <TextInputField
                  label="Stage Time Preference"
                  value={stageTimePreference}
                  onChangeText={setStageTimePreference}
                  placeholder="Afternoon preferred"
                />
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.editActions}>
                <Button 
                  title="Cancel" 
                  variant="secondary" 
                  onPress={() => {
                    setIsEditing(false);
                    setError('');
                  }}
                />
                <Button title="Save" onPress={handleSave} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Arrival Date</Text>
                <Text style={[styles.fieldValue, !entry.arrival_date && styles.fieldMissing]}>
                  {entry.arrival_date || 'Missing'}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Arrival Time</Text>
                <Text style={[styles.fieldValue, !entry.arrival_time && styles.fieldMissing]}>
                  {entry.arrival_time ? formatTime12h(entry.arrival_time) : 'Missing'}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Parking Needs</Text>
                <Text style={styles.fieldValue}>{formatParkingNeeds(entry.parking_needs)}</Text>
              </View>
              {entry.parking_needs !== 'none' && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Plate Number</Text>
                  <Text style={[styles.fieldValue, !entry.plate_number && styles.fieldMissing]}>
                    {entry.plate_number || 'Missing'}
                  </Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Entourage Size</Text>
                <Text style={[styles.fieldValue, entry.entourage_size === null && styles.fieldMissing]}>
                  {entry.entourage_size !== null ? entry.entourage_size.toString() : 'Missing'}
                </Text>
              </View>
              {entry.participant_kind === 'performer' && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Stage Time Preference</Text>
                  <Text style={[styles.fieldValue, !entry.stage_time_preference && styles.fieldMissing]}>
                    {entry.stage_time_preference || 'Missing'}
                  </Text>
                </View>
              )}
            </>
          )}
        </StandardCard>

        {/* Urgency Status */}
        {entry.status === 'active' && (
          <StandardCard>
            <Text style={styles.sectionTitle}>Urgency</Text>
            <Text style={[
              styles.urgencyLevel,
              urgency.level === 'critical' && styles.urgencyCritical,
              urgency.level === 'urgent' && styles.urgencyUrgent,
            ]}>
              {urgency.level.toUpperCase()}: {urgency.reason}
            </Text>
          </StandardCard>
        )}

        {/* Read-Only Notices */}
        {isWithdrawn && (
          <StandardCard style={styles.noticeCard}>
            <Text style={styles.noticeText}>This entry has been withdrawn</Text>
          </StandardCard>
        )}
        {isEventCancelled && (
          <StandardCard style={styles.noticeCard}>
            <Text style={styles.noticeText}>This event has been cancelled - entries are read-only</Text>
          </StandardCard>
        )}

        {/* Withdraw Button */}
        {isHeadOrganizer && entry.status === 'active' && !isEventCancelled && !isEditing && (
          <View style={styles.actions}>
            <Button title="Withdraw Entry" variant="destructive" onPress={handleWithdraw} fullWidth />
          </View>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={showWithdrawModal}
        title="Withdraw Entry"
        message="Are you sure you want to withdraw this logistics entry? It will be kept for history but moved to the Withdrawn filter."
        confirmText="Withdraw"
        confirmStyle="destructive"
        onConfirm={confirmWithdraw}
        onCancel={() => setShowWithdrawModal(false)}
      />

      <StaffPickerModal
        visible={showAssignModal}
        staff={eligibleStaff}
        selectedEmail={selectedStaffEmail}
        onSelect={setSelectedStaffEmail}
        onSave={handleAssignSave}
        onCancel={() => setShowAssignModal(false)}
        saving={saving}
      />

      <ConfirmationModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage}
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />

      <ConfirmationModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        onConfirm={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
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
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    ...typography.h3,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  missingText: {
    ...typography.caption,
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
  noticeCard: {
    backgroundColor: colors.warning + '15',
  },
  noticeText: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing.lg,
  },
  label: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  captionText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  assignButton: {
    marginTop: spacing.md,
  },
});
