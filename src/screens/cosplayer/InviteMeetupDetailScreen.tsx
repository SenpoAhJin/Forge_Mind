/**
 * Invite Meetup Detail Screen
 * Shows meetup details, QR code, participant list
 * Creator and participant views
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { StandardCard, Button, ConfirmationModal } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useInviteMeetups } from '../../contexts/InviteMeetupsContext';
import { useUser } from '../../contexts/UserContext';

interface InviteMeetupDetailScreenProps {
  navigation: any;
  route: {
    params: {
      meetupId: string;
    };
  };
}

export const InviteMeetupDetailScreen: React.FC<InviteMeetupDetailScreenProps> = ({ navigation, route }) => {
  const { meetupId } = route.params;
  const { meetups, leaveMeetup } = useInviteMeetups();
  const { user } = useUser();

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const meetup = meetups.find(m => m.id === meetupId);

  if (!meetup) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Meetup not found</Text>
      </View>
    );
  }

  const isCreator = meetup.created_by_email === user?.email;

  const handleCopyCode = async () => {
    // For web, use navigator.clipboard; for native, use Clipboard from react-native
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(meetup.invite_code);
    }
    // TODO: Show toast/feedback
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my meetup "${meetup.title}"! Use code: ${meetup.invite_code}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleLeave = async () => {
    if (!user) return;

    setLeaving(true);
    const result = await leaveMeetup(meetup.id, user.email);
    setLeaving(false);

    if (result.success) {
      setShowLeaveConfirm(false);
      navigation.goBack();
    } else {
      // Show error (could use modal or inline message)
      console.error('Leave failed:', result.error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Meetup info */}
      <StandardCard style={styles.infoCard}>
        <Text style={styles.title}>{meetup.title}</Text>
        
        {meetup.description ? (
          <Text style={styles.description}>{meetup.description}</Text>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            {meetup.meetup_date} at {meetup.meetup_time}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>{meetup.location}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Created by {isCreator ? 'you' : meetup.created_by_name}
          </Text>
        </View>
      </StandardCard>

      {/* Invite code + QR */}
      <StandardCard style={styles.inviteCard}>
        <Text style={styles.sectionTitle}>Invite Code</Text>
        
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Share this code to invite friends:</Text>
          <Text style={styles.code}>{meetup.invite_code}</Text>
        </View>

        <View style={styles.qrContainer}>
          <QRCode value={meetup.invite_code} size={160} backgroundColor="white" />
        </View>

        <View style={styles.codeActions}>
          <Button
            title="Copy Code"
            onPress={handleCopyCode}
            variant="secondary"
            fullWidth
          />
          <Button
            title="Share"
            onPress={handleShare}
            variant="secondary"
            fullWidth
          />
        </View>
      </StandardCard>

      {/* Participants */}
      <StandardCard style={styles.participantsCard}>
        <Text style={styles.sectionTitle}>
          Participants ({meetup.participants.length})
        </Text>

        {meetup.participants.map((participant, index) => (
          <View key={index} style={styles.participantRow}>
            <View style={styles.participantAvatar}>
              <Text style={styles.participantInitial}>
                {participant.participant_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>
                {participant.participant_name}
                {participant.participant_email === meetup.created_by_email ? ' (Creator)' : ''}
              </Text>
              <Text style={styles.participantJoined}>
                Joined {new Date(participant.joined_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
      </StandardCard>

      {/* Leave action (only for non-creator participants) */}
      {!isCreator ? (
        <View style={styles.footer}>
          <Button
            title="Leave Meetup"
            onPress={() => setShowLeaveConfirm(true)}
            variant="tertiary"
            fullWidth
          />
        </View>
      ) : null}

      {/* Leave confirmation */}
      <ConfirmationModal
        visible={showLeaveConfirm}
        title="Leave Meetup?"
        message="You can rejoin anytime using the invite code."
        confirmText={leaving ? 'Leaving...' : 'Leave'}
        onConfirm={handleLeave}
        onCancel={() => setShowLeaveConfirm(false)}
      />
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
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  inviteCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  codeBox: {
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  code: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 4,
  },
  qrContainer: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  participantsCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: {
    ...typography.body,
    color: colors.backgroundLight,
    fontWeight: '700',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  participantJoined: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
