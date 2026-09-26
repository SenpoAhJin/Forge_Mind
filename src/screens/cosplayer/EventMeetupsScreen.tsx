/**
 * FE-7 Step 5: Event Meetups Screen (cosplayer-facing)
 *
 * THE single meetup screen. Mounted in two places with no duplicated logic:
 * - ProjectStackNavigator route `EventMeetups` with an eventId (cosplayer entry
 *   points: Projects "Upcoming Events" card, project Linked Event section)
 * - screens/organizer/MeetupsScreen.tsx, which now renders this component
 *   instead of its old "will be built in FE-7" stub
 *
 * When no eventId is supplied it renders the index of confirmed events the
 * signed-in cosplayer has a project linked to.
 *
 * Design-quality rules applied (see CHANGELOG FE-4.5.3 / marketplace chip fix):
 * - no Alert.alert, ConfirmationModal only
 * - no `cond && <Text/>`, ternary only
 * - chip filter bar uses the proven height:56 + overflow:hidden wrapper with
 *   explicit flexDirection:'row' on BOTH the ScrollView and its
 *   contentContainerStyle (React Native Web does not infer these)
 * - no hooks inside .map() render helpers
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  StandardCard,
  Button,
  Tag,
  ConfirmationModal,
  TextInputField,
  DateInput,
  TimePickerInput,
} from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useEvents } from '../../contexts/EventsContext';
import { useMeetups } from '../../contexts/MeetupsContext';
import {
  Meetup,
  RsvpStatus,
  RSVP_LABELS,
  getOwnRsvp,
  getRsvpHeadcount,
} from '../../types/meetups';
import { formatCountdown, getTodayLocal, daysBetween } from '../../utils/dateHelpers';

type StatusFilter = 'all' | RsvpStatus;

interface EventMeetupsScreenProps {
  /** When omitted the screen renders the linked-events index. */
  eventId?: string;
}

export const EventMeetupsScreen: React.FC<EventMeetupsScreenProps> = ({ eventId }) => {
  const { user } = useUser();
  const { projects, getTasksForProject } = useProjects();
  const { getEventById } = useEvents();
  const {
    isLoading,
    getMeetupsForEvent,
    isLinkedToEvent,
    getLinkedConfirmedEvents,
    proposeMeetup,
    setRsvp,
    withdrawMeetup,
  } = useMeetups();

  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(eventId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showProposeForm, setShowProposeForm] = useState(false);

  // Propose form state
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [proposedLocation, setProposedLocation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // ConfirmationModal state (no Alert.alert anywhere)
  const [pendingProposal, setPendingProposal] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<Meetup | null>(null);

  const activeEventId = eventId ?? selectedEventId;
  const email = user?.email ?? '';
  const today = getTodayLocal();

  const event = activeEventId ? getEventById(activeEventId) : undefined;
  const linked = activeEventId ? isLinkedToEvent(activeEventId, email) : false;

  // Computed inline rather than memoised: the context callbacks are rebuilt on
  // every provider render, so useMemo here would never actually hit.
  const linkedEvents = getLinkedConfirmedEvents(email);
  const eventMeetups = activeEventId ? getMeetupsForEvent(activeEventId) : [];

  // "re-run/re-visible whenever participation changes" - derived every render
  // from the RSVP lists, so an RSVP anywhere immediately updates every count.
  const visibleMeetups =
    statusFilter === 'all'
      ? eventMeetups
      : eventMeetups.filter((meetup) => getOwnRsvp(meetup, email)?.status === statusFilter);

  const goingCount = eventMeetups.filter((m) => getRsvpHeadcount(m).going > 0).length;

  const handlePropose = async () => {
    if (!activeEventId) return;
    setFormError(null);
    const result = await proposeMeetup({
      event_id: activeEventId,
      proposed_by_email: email,
      proposed_by_name: user?.display_name ?? email,
      title,
      purpose,
      proposed_date: proposedDate,
      proposed_time: proposedTime,
      proposed_location: proposedLocation,
    });

    if (result.success) {
      setPendingProposal(false);
      setShowProposeForm(false);
      setTitle('');
      setPurpose('');
      setProposedDate('');
      setProposedTime('');
      setProposedLocation('');
    } else {
      setFormError(result.error ?? 'Could not propose this meetup.');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawTarget) return;
    await withdrawMeetup(withdrawTarget.meetup_id, email);
    setWithdrawTarget(null);
  };

  // ---------------- Linked-events index (no eventId supplied) ----------------
  if (!activeEventId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Your Meetups</Text>
        <Text style={styles.pageSubtitle}>
          Meetups are per event. Pick an event your project is linked to.
        </Text>

        {linkedEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>No linked events yet</Text>
            <Text style={styles.emptyText}>
              Link a project to a confirmed event to propose meetups and RSVP with other cosplayers.
            </Text>
          </View>
        ) : (
          linkedEvents.map((linkedEvent) => {
            const count = getMeetupsForEvent(linkedEvent.id).length;
            return (
              <StandardCard
                key={linkedEvent.id}
                style={styles.indexCard}
                onPress={() => setSelectedEventId(linkedEvent.id)}
              >
                <View style={styles.indexRow}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                  <View style={styles.indexInfo}>
                    <Text style={styles.indexName} numberOfLines={1}>
                      {linkedEvent.name}
                    </Text>
                    <Text style={styles.indexDate}>{linkedEvent.start_date}</Text>
                  </View>
                  <Tag
                    type="category"
                    label={`${count} meetup${count === 1 ? '' : 's'}`}
                  />
                </View>
              </StandardCard>
            );
          })
        )}
      </ScrollView>
    );
  }

  // ---------------- Guarded event view ----------------
  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={styles.emptyTitle}>Event not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Event header */}
      <View style={styles.headerBar}>
        <Ionicons name="people" size={22} color={colors.primary} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {event.name}
          </Text>
          <Text style={styles.headerDate}>
            {event.start_date}
            {event.end_date && event.end_date !== event.start_date ? ` - ${event.end_date}` : ''}
          </Text>
        </View>
        {eventId ? null : (
          <Button title="Change" variant="tertiary" onPress={() => setSelectedEventId(undefined)} />
        )}
      </View>

      {/* Linkage guard */}
      {linked ? null : (
        <View style={styles.guardBanner}>
          <Ionicons name="lock-closed" size={18} color={colors.warning} />
          <Text style={styles.guardText}>
            Link one of your projects to this event to see and join its meetups.
          </Text>
        </View>
      )}

      {/* Chip filter bar - proven fixed-height + overflow:hidden pattern */}
      <View style={styles.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScrollView}
          contentContainerStyle={styles.chipScrollContent}
        >
          <TouchableOpacity
            style={[styles.chip, statusFilter === 'all' && styles.chipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.chipText, statusFilter === 'all' && styles.chipTextActive]}>
              All ({eventMeetups.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, statusFilter === 'going' && styles.chipActive]}
            onPress={() => setStatusFilter('going')}
          >
            <Text style={[styles.chipText, statusFilter === 'going' && styles.chipTextActive]}>
              Going ({goingCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, statusFilter === 'maybe' && styles.chipActive]}
            onPress={() => setStatusFilter('maybe')}
          >
            <Text style={[styles.chipText, statusFilter === 'maybe' && styles.chipTextActive]}>
              Maybe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, statusFilter === 'declined' && styles.chipActive]}
            onPress={() => setStatusFilter('declined')}
          >
            <Text style={[styles.chipText, statusFilter === 'declined' && styles.chipTextActive]}>
              Declined
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Propose */}
        {linked && showProposeForm ? (
          <StandardCard style={styles.formCard}>
            <Text style={styles.formTitle}>Propose a meetup</Text>

            <TextInputField
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Group photo-op"
            />
            <TextInputField
              label="Purpose (optional)"
              value={purpose}
              onChangeText={setPurpose}
              placeholder="Quick group shot before the contest"
            />
            <DateInput
              label="Date"
              value={proposedDate}
              onChange={setProposedDate}
              minDate={today}
              maxDate={event.end_date ?? event.start_date}
            />
            <TimePickerInput label="Time" value={proposedTime} onChange={setProposedTime} />
            <TextInputField
              label="Meeting point"
              value={proposedLocation}
              onChangeText={setProposedLocation}
              placeholder="Main hall entrance"
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <View style={styles.formActions}>
              <Button
                title="Cancel"
                variant="tertiary"
                onPress={() => {
                  setShowProposeForm(false);
                  setFormError(null);
                }}
              />
              <Button title="Propose" variant="primary" onPress={() => setPendingProposal(true)} />
            </View>
          </StandardCard>
        ) : null}

        {linked && !showProposeForm ? (
          <Button
            title="Propose a meetup"
            variant="primary"
            onPress={() => setShowProposeForm(true)}
            fullWidth
          />
        ) : null}

        {/* List */}
        {visibleMeetups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>
              {statusFilter === 'all' ? 'No meetups yet' : `Nothing ${RSVP_LABELS[statusFilter as RsvpStatus].toLowerCase()}`}
            </Text>
            <Text style={styles.emptyText}>
              {linked
                ? 'Be the first to propose a time and spot for this event.'
                : 'Meetups appear once you have a project linked to this event.'}
            </Text>
          </View>
        ) : (
          visibleMeetups.map((meetup) => {
            const headcount = getRsvpHeadcount(meetup);
            const own = getOwnRsvp(meetup, email);
            const isMine = meetup.proposed_by_email === email;
            const daysOut = daysBetween(today, meetup.proposed_date);
            const slotInPast = daysOut < 0;

            return (
              <StandardCard key={meetup.meetup_id} style={styles.meetupCard}>
                <View style={styles.meetupHeader}>
                  <Text style={styles.meetupTitle} numberOfLines={2}>
                    {meetup.title}
                  </Text>
                  {isMine ? <Tag type="status" label="Yours" /> : null}
                </View>

                {meetup.purpose ? (
                  <Text style={styles.meetupPurpose}>{meetup.purpose}</Text>
                ) : null}

                <View style={styles.meetupDetailRow}>
                  <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.meetupDetail}>
                    {meetup.proposed_date} at {meetup.proposed_time}
                    {slotInPast ? ' (past)' : ` (${formatCountdown(meetup.proposed_date, today)})`}
                  </Text>
                </View>

                <View style={styles.meetupDetailRow}>
                  <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.meetupDetail}>{meetup.proposed_location}</Text>
                </View>

                <View style={styles.meetupDetailRow}>
                  <Ionicons name="person-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.meetupDetail} numberOfLines={1}>
                    Proposed by {meetup.proposed_by_name}
                  </Text>
                </View>

                {/* RSVP headcount per status */}
                <View style={styles.headcountRow}>
                  <View style={styles.headcountItem}>
                    <Text style={[styles.headcountNumber, { color: colors.success }]}>
                      {headcount.going}
                    </Text>
                    <Text style={styles.headcountLabel}>Going</Text>
                  </View>
                  <View style={styles.headcountItem}>
                    <Text style={[styles.headcountNumber, { color: colors.warning }]}>
                      {headcount.maybe}
                    </Text>
                    <Text style={styles.headcountLabel}>Maybe</Text>
                  </View>
                  <View style={styles.headcountItem}>
                    <Text style={[styles.headcountNumber, { color: colors.textDisabled }]}>
                      {headcount.declined}
                    </Text>
                    <Text style={styles.headcountLabel}>Declined</Text>
                  </View>
                </View>

                {/* RSVP controls */}
                {linked ? (
                  <View style={styles.rsvpRow}>
                    {(['going', 'maybe', 'declined'] as RsvpStatus[]).map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.rsvpButton, own?.status === status && styles.rsvpButtonActive]}
                        onPress={() => setRsvp(meetup.meetup_id, email, user?.display_name ?? email, status)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rsvpButtonText,
                            own?.status === status && styles.rsvpButtonTextActive,
                          ]}
                        >
                          {RSVP_LABELS[status]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {isMine ? (
                  <Button
                    title="Withdraw meetup"
                    variant="tertiary"
                    onPress={() => setWithdrawTarget(meetup)}
                    fullWidth
                  />
                ) : null}
              </StandardCard>
            );
          })
        )}
      </ScrollView>

      {/* Confirmation modals - replaces Alert.alert */}
      <ConfirmationModal
        visible={pendingProposal}
        title="Propose this meetup?"
        message="Your meetup will be visible to every cosplayer with a project linked to this event, and you will be counted as Going."
        confirmText="Propose"
        cancelText="Keep editing"
        onConfirm={handlePropose}
        onCancel={() => setPendingProposal(false)}
      />

      <ConfirmationModal
        visible={withdrawTarget !== null}
        title="Withdraw meetup?"
        message="This removes the meetup for everyone, including their RSVPs. This cannot be undone."
        confirmText="Withdraw"
        cancelText="Keep it"
        confirmStyle="destructive"
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  pageTitle: { ...typography.h2, color: colors.textPrimary },
  pageSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: { flex: 1 },
  headerName: { ...typography.h3, color: colors.textPrimary },
  headerDate: { ...typography.caption, color: colors.textSecondary },

  guardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  guardText: { ...typography.caption, color: colors.textPrimary, flex: 1, lineHeight: 18 },

  // Proven chip bar: fixed height + overflow hidden wrapper
  chipBar: {
    height: 56,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  chipScrollView: {
    flexDirection: 'row',
  },
  chipScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 36,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: { color: colors.backgroundLight },

  formCard: { padding: spacing.lg, gap: spacing.md },
  formTitle: { ...typography.h3, color: colors.textPrimary },
  formError: { ...typography.caption, color: colors.error },
  formActions: { flexDirection: 'row', gap: spacing.md },

  meetupCard: { padding: spacing.lg, gap: spacing.xs },
  meetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  meetupTitle: { ...typography.h3, color: colors.textPrimary, flex: 1 },
  meetupPurpose: { ...typography.body, color: colors.textSecondary, lineHeight: 20 },
  meetupDetailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meetupDetail: { ...typography.caption, color: colors.textSecondary, flex: 1 },

  headcountRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
  },
  headcountItem: { alignItems: 'center', gap: 2 },
  headcountNumber: { ...typography.h3, fontWeight: '700' },
  headcountLabel: { ...typography.caption, color: colors.textSecondary },

  rsvpRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rsvpButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rsvpButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rsvpButtonText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  rsvpButtonTextActive: { color: colors.backgroundLight },

  indexCard: { padding: spacing.lg, marginBottom: spacing.md },
  indexRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  indexInfo: { flex: 1 },
  indexName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  indexDate: { ...typography.caption, color: colors.textSecondary },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
