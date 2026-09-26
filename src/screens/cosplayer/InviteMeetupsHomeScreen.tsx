/**
 * Invite Meetups Home Screen
 * Shows user's joined/created invite meetups + actions to create or join
 * Separate from event-based meetups (EventMeetupsScreen)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard, Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useInviteMeetups } from '../../contexts/InviteMeetupsContext';
import { useUser } from '../../contexts/UserContext';

interface InviteMeetupsHomeScreenProps {
  navigation: any;
}

export const InviteMeetupsHomeScreen: React.FC<InviteMeetupsHomeScreenProps> = ({ navigation }) => {
  const { getMeetupsForUser, isLoading } = useInviteMeetups();
  const { user } = useUser();

  const myMeetups = user ? getMeetupsForUser(user.email) : [];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header actions */}
      <View style={styles.actions}>
        <Button
          title="Create Meetup"
          onPress={() => navigation.navigate('CreateInviteMeetup')}
          variant="primary"
          fullWidth
        />
        <Button
          title="Join with Code"
          onPress={() => navigation.navigate('JoinInviteMeetup')}
          variant="secondary"
          fullWidth
        />
      </View>

      {/* Meetups list */}
      {myMeetups.length === 0 ? (
        <StandardCard style={styles.emptyCard}>
          <Ionicons name="people-outline" size={64} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>No Meetups Yet</Text>
          <Text style={styles.emptyBody}>
            Create a meetup and share the invite code, or join one with a friend's code
          </Text>
        </StandardCard>
      ) : (
        <View style={styles.meetupsList}>
          <Text style={styles.sectionTitle}>My Meetups ({myMeetups.length})</Text>
          {myMeetups.map((meetup) => {
            const isCreator = meetup.created_by_email === user?.email;
            const participantCount = meetup.participants.length;

            return (
              <TouchableOpacity
                key={meetup.id}
                style={styles.meetupCard}
                onPress={() => navigation.navigate('InviteMeetupDetail', { meetupId: meetup.id })}
                activeOpacity={0.7}
              >
                <View style={styles.meetupHeader}>
                  <View style={styles.meetupIcon}>
                    <Ionicons name="calendar" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.meetupInfo}>
                    <Text style={styles.meetupTitle} numberOfLines={1}>
                      {meetup.title}
                    </Text>
                    <Text style={styles.meetupMeta}>
                      {meetup.meetup_date} at {meetup.meetup_time}
                    </Text>
                    <Text style={styles.meetupLocation} numberOfLines={1}>
                      📍 {meetup.location}
                    </Text>
                  </View>
                  {isCreator ? (
                    <View style={styles.creatorBadge}>
                      <Text style={styles.creatorBadgeText}>Creator</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.meetupFooter}>
                  <Text style={styles.participantCount}>
                    <Ionicons name="people" size={14} color={colors.textSecondary} /> {participantCount} {participantCount === 1 ? 'person' : 'people'}
                  </Text>
                  <Text style={styles.inviteCode}>Code: {meetup.invite_code}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  actions: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  meetupsList: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  meetupCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meetupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  meetupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetupInfo: {
    flex: 1,
  },
  meetupTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  meetupMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  meetupLocation: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  creatorBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  creatorBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 10,
  },
  meetupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  participantCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inviteCode: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
