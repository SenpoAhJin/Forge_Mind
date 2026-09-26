/**
 * Create Invite Meetup Screen
 * Create casual meetup with generated invite code + QR
 * Separate from event-based meetups (EventMeetupsScreen)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { StandardCard, Button, TextInputField, TextAreaField } from '../../components';
import { DateInput } from '../../components/inputs/DateInput';
import { TimePickerInput } from '../../components/inputs/TimePickerInput';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useInviteMeetups } from '../../contexts/InviteMeetupsContext';
import { useUser } from '../../contexts/UserContext';
import { getTodayLocal } from '../../utils/dateHelpers';

interface CreateInviteMeetupScreenProps {
  navigation: any;
}

export const CreateInviteMeetupScreen: React.FC<CreateInviteMeetupScreenProps> = ({ navigation }) => {
  const { createMeetup, meetups } = useInviteMeetups();
  const { user } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetupDate, setMeetupDate] = useState(getTodayLocal());
  const [meetupTime, setMeetupTime] = useState('10:00');

  const [titleError, setTitleError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [dateError, setDateError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [createdMeetupId, setCreatedMeetupId] = useState('');

  const handleCreate = async () => {
    // Clear errors
    setTitleError('');
    setLocationError('');
    setDateError('');

    // Validate
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 100) {
      setTitleError('Title must be 3-100 characters');
      return;
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      setLocationError('Location is required');
      return;
    }

    if (!meetupDate || !meetupTime) {
      setDateError('Date and time are required');
      return;
    }

    if (!user) {
      setDateError('You must be signed in');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createMeetup({
        title: trimmedTitle,
        description: description.trim() || null,
        location: trimmedLocation,
        meetup_date: meetupDate,
        meetup_time: meetupTime,
        created_by_email: user.email,
        created_by_name: user.display_name,
      });

      setSubmitting(false);

      if (result.success && result.meetupId && result.meetup) {
        // Use the meetup returned from context directly
        setInviteCode(result.meetup.invite_code);
        setCreatedMeetupId(result.meetup.id);
        setShowSuccessModal(true);
      } else {
        setDateError(result.error || 'Failed to create meetup');
      }
    } catch (error) {
      setSubmitting(false);
      setDateError('An unexpected error occurred');
      console.error('[CreateInviteMeetup] Error:', error);
    }
  };

  const handleViewMeetup = () => {
    setShowSuccessModal(false);
    navigation.navigate('InviteMeetupDetail', { meetupId: createdMeetupId });
  };

  const handleDone = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StandardCard style={styles.formCard}>
        <Text style={styles.sectionTitle}>Meetup Details</Text>

        <TextInputField
          label="Title"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (titleError) setTitleError('');
          }}
          placeholder="E.g., Photoshoot at Main Hall"
          error={titleError}
        />

        <TextAreaField
          label="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Add any details about the meetup..."
          minRows={3}
        />

        <TextInputField
          label="Location"
          value={location}
          onChangeText={(text) => {
            setLocation(text);
            if (locationError) setLocationError('');
          }}
          placeholder="E.g., Food court near Hall B"
          error={locationError}
        />

        <DateInput
          label="Date"
          value={meetupDate}
          onChange={(newDate) => {
            setMeetupDate(newDate);
            if (dateError) setDateError('');
          }}
          minDate={getTodayLocal()}
        />

        <TimePickerInput
          label="Time"
          value={meetupTime}
          onChange={(newTime) => {
            setMeetupTime(newTime);
            if (dateError) setDateError('');
          }}
        />

        {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
      </StandardCard>

      <View style={styles.footer}>
        <Button
          title={submitting ? 'Creating...' : 'Create Meetup'}
          onPress={handleCreate}
          variant="primary"
          fullWidth
          disabled={submitting}
        />
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              <Text style={styles.modalTitle}>Meetup Created!</Text>
            </View>

            <Text style={styles.modalSubtitle}>Share this code or QR with friends to invite them:</Text>

            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCodeLabel}>Invite Code</Text>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
            </View>

            <View style={styles.qrBox}>
              <QRCode value={inviteCode} size={160} backgroundColor="white" />
            </View>

            <Text style={styles.modalNote}>
              Friends can join by entering the code or scanning the QR
            </Text>

            <Button
              title="View Meetup"
              onPress={handleViewMeetup}
              variant="primary"
              fullWidth
            />
            <Button
              title="Done"
              onPress={handleDone}
              variant="secondary"
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inviteCodeBox: {
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '100%',
  },
  inviteCodeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inviteCode: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 4,
  },
  qrBox: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  modalNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
