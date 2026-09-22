/**
 * FE-7 Step 1: Create Event Screen
 * Create or edit draft events (Head Organizer only)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EventsStackParamList } from '../../navigation/EventsStackNavigator';
import { useUser } from '../../contexts/UserContext';
import { useEvents } from '../../contexts/EventsContext';
import { Button, TextInputField, Tag, ConfirmationModal, DateInput } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getTodayLocal } from '../../utils/dateHelpers';

type Props = NativeStackScreenProps<EventsStackParamList, 'CreateEvent'>;

export const CreateEventScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useUser();
  const { getEventById, createEvent, updateEvent, updateConfirmedEvent } = useEvents();
  
  const eventId = route.params?.eventId;
  const isEdit = !!eventId;
  const existingEvent = isEdit ? getEventById(eventId) : null;

  // Route-level guard: Head Organizer only, and edit allowed for draft OR confirmed (cancelled still blocked)
  const isHeadOrganizer = user?.organizer_role === 'head';
  const canAccess = isHeadOrganizer && (!isEdit || (existingEvent?.status === 'draft' || existingEvent?.status === 'confirmed'));

  // Form state
  const [name, setName] = useState(existingEvent?.name || '');
  const [description, setDescription] = useState(existingEvent?.description || '');
  const [venueName, setVenueName] = useState(existingEvent?.venue_name || '');
  const [city, setCity] = useState(existingEvent?.city || '');
  const [startDate, setStartDate] = useState<string>(existingEvent?.start_date || '');
  const [endDate, setEndDate] = useState<string>(existingEvent?.end_date || '');
  const [hasContest, setHasContest] = useState(existingEvent?.has_contest || false);

  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Inline validation
  const nameError = name.trim().length > 0 && (name.trim().length < 3 || name.trim().length > 80)
    ? 'Name must be 3-80 characters'
    : null;
  const venueError = venueName.trim().length > 0 && (venueName.trim().length < 2 || venueName.trim().length > 80)
    ? 'Venue name must be 2-80 characters'
    : null;
  const descriptionError = description.trim().length > 500
    ? 'Description must be at most 500 characters'
    : null;

  const handleSave = async () => {
    setError(null);

    if (isEdit && existingEvent) {
      // Determine which update path to use
      const isConfirmedEdit = existingEvent.status === 'confirmed';
      
      const result = isConfirmedEdit
        ? await updateConfirmedEvent(
            eventId,
            {
              name: name.trim(),
              description: description.trim() || null,
              venue_name: venueName.trim(),
              city: city.trim() || null,
              start_date: startDate,
              end_date: endDate || null,
              has_contest: hasContest,
            },
            user?.email || '',
            user?.display_name || user?.email || 'Unknown',
            user?.organizer_role || null
          )
        : await updateEvent(
            eventId,
            {
              name: name.trim(),
              description: description.trim() || null,
              venue_name: venueName.trim(),
              city: city.trim() || null,
              start_date: startDate,
              end_date: endDate || null,
              has_contest: hasContest,
            },
            user?.email || '',
            user?.organizer_role || null
          );

      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setError(result.error || 'Failed to update event');
      }
    } else {
      // Create new event
      const result = await createEvent(
        {
          name: name.trim(),
          description: description.trim() || null,
          venue_name: venueName.trim(),
          city: city.trim() || null,
          start_date: startDate,
          end_date: endDate || null,
          has_contest: hasContest,
          created_by_email: user?.email || '',
        },
        user?.email || '',
        user?.organizer_role || null
      );

      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setError(result.error || 'Failed to create event');
      }
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  // Blocked state
  if (!canAccess) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.blockedBanner}>
          <Ionicons name="lock-closed" size={24} color={colors.error} />
          <Text style={styles.blockedText}>
            {!isHeadOrganizer
              ? 'Only Head Organizers can create or edit events.'
              : existingEvent?.status !== 'draft'
              ? 'Only draft events can be edited.'
              : 'This event cannot be edited.'}
          </Text>
          <Button title="Go Back" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Name */}
        <TextInputField
          label="Event name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Manila CosCon 2026"
          error={nameError || undefined}
        />

        {/* Venue */}
        <TextInputField
          label="Venue name"
          value={venueName}
          onChangeText={setVenueName}
          placeholder="e.g. SMX Convention Center"
          error={venueError || undefined}
        />

        {/* City */}
        <TextInputField
          label="City (optional)"
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Manila"
        />

        {/* Description */}
        <Text style={styles.fieldLabel}>Description (optional)</Text>
        <TextInputField
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of the event"
          error={descriptionError || undefined}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>

        {/* Start Date */}
        <DateInput
          label="Start date"
          value={startDate}
          onChange={(newDate) => {
            setStartDate(newDate);
            // If end date is before new start date, clear it
            if (endDate && newDate && endDate < newDate) {
              setEndDate('');
            }
          }}
          minDate={getTodayLocal()}
          placeholder="YYYY-MM-DD"
        />

        {/* End Date */}
        <DateInput
          label="End date (optional)"
          value={endDate}
          onChange={setEndDate}
          minDate={startDate || getTodayLocal()}
          optional
          placeholder="YYYY-MM-DD (optional)"
        />

        {/* Has Contest */}
        <Text style={styles.fieldLabel}>Has a cosplay contest?</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            onPress={() => setHasContest(true)}
            style={styles.chipWrapper}
            activeOpacity={0.7}
          >
            <Tag type="category" label="Yes" style={hasContest ? styles.chipSelected : undefined} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHasContest(false)}
            style={styles.chipWrapper}
            activeOpacity={0.7}
          >
            <Tag type="category" label="No" style={!hasContest ? styles.chipSelected : undefined} />
          </TouchableOpacity>
        </View>

        {/* Error display */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Save button */}
        <Button
          title={isEdit ? 'Save Changes' : 'Save as Draft'}
          variant="primary"
          onPress={handleSave}
          disabled={
            !name.trim() ||
            !venueName.trim() ||
            !!nameError ||
            !!venueError ||
            !!descriptionError
          }
        />
      </ScrollView>

      {/* Success modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        title="Event Saved"
        message={
          isEdit
            ? 'Your changes have been saved.'
            : 'Event created as draft. You can confirm it when ready.'
        }
        confirmText="OK"
        onConfirm={handleSuccessClose}
        onCancel={handleSuccessClose}
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
  fieldContainer: { marginBottom: spacing.lg },
  fieldLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  charCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chipWrapper: {
    alignSelf: 'flex-start',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
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
});
