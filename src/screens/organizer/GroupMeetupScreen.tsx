/**
 * Group Meetup Screen
 * Schedule conflict detection, meetup time suggestions, live location placeholder
 * Phase 1: Schedule analysis and suggestions (mock data)
 * Phase 3: Live location relay and real-time positions
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard, Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useEvents } from '../../contexts/EventsContext';
import { computeReadiness } from '../../utils/readiness';
import { daysBetween } from '../../utils/dateHelpers';

// Mock participant data (will come from backend in Phase 3)
const mockParticipants = [
  {
    email: 'cosplayer1@example.com',
    name: 'Alex Chen',
    projectName: 'Gojo Satoru',
    readiness: 0.85,
    hasConflict: false,
  },
  {
    email: 'cosplayer2@example.com',
    name: 'Maria Santos',
    projectName: 'Makima',
    readiness: 0.45,
    hasConflict: true,
  },
  {
    email: 'cosplayer3@example.com',
    name: 'John Park',
    projectName: 'Tanjiro Kamado',
    readiness: 0.92,
    hasConflict: false,
  },
  {
    email: 'cosplayer4@example.com',
    name: 'Sarah Kim',
    projectName: 'Nezuko Kamado',
    readiness: 0.38,
    hasConflict: true,
  },
  {
    email: 'cosplayer5@example.com',
    name: 'David Lee',
    projectName: 'Luffy',
    readiness: 0.78,
    hasConflict: false,
  },
];

// Mock suggested time slots
const mockTimeSlots = [
  { time: '10:00 AM', available: 5, total: 5, date: 'Day 1' },
  { time: '2:00 PM', available: 4, total: 5, date: 'Day 1' },
  { time: '6:00 PM', available: 3, total: 5, date: 'Day 1' },
  { time: '11:00 AM', available: 5, total: 5, date: 'Day 2' },
  { time: '3:00 PM', available: 4, total: 5, date: 'Day 2' },
];

export const GroupMeetupScreen: React.FC<any> = ({ route, navigation }) => {
  const { eventId } = route.params;
  const { user } = useUser();
  const { events } = useEvents();
  const { projects } = useProjects();

  const [showLiveMap, setShowLiveMap] = useState(false);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);

  const event = events.find((e) => e.id === eventId);

  // Calculate conflicts
  const participantsWithConflicts = useMemo(() => {
    return mockParticipants.map((p) => ({
      ...p,
      conflictSeverity: p.hasConflict
        ? p.readiness < 0.5
          ? 'high'
          : 'medium'
        : 'none',
    }));
  }, []);

  const highConflictCount = participantsWithConflicts.filter(
    (p) => p.conflictSeverity === 'high'
  ).length;
  const mediumConflictCount = participantsWithConflicts.filter(
    (p) => p.conflictSeverity === 'medium'
  ).length;

  // Find best time slot
  const bestTimeSlot = useMemo(() => {
    return mockTimeSlots.reduce((best, slot) =>
      slot.available > best.available ? slot : best
    );
  }, []);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  // Check if user is Head Organizer
  if (user?.organizer_role !== 'head') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Head Organizer access only</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Event Header */}
      <StandardCard style={styles.headerCard}>
        <View style={styles.eventHeader}>
          <Ionicons name="people" size={32} color={colors.primary} />
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.eventDate}>
              {event.start_date}
              {event.end_date ? ` - ${event.end_date}` : ''}
            </Text>
          </View>
        </View>
      </StandardCard>

      {/* Conflict Summary */}
      <StandardCard style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Schedule Conflicts</Text>
        <View style={styles.conflictSummary}>
          <View style={styles.conflictItem}>
            <View style={[styles.conflictDot, { backgroundColor: colors.success }]} />
            <Text style={styles.conflictCount}>
              {mockParticipants.length - highConflictCount - mediumConflictCount}
            </Text>
            <Text style={styles.conflictLabel}>On Track</Text>
          </View>
          <View style={styles.conflictItem}>
            <View style={[styles.conflictDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.conflictCount}>{mediumConflictCount}</Text>
            <Text style={styles.conflictLabel}>At Risk</Text>
          </View>
          <View style={styles.conflictItem}>
            <View style={[styles.conflictDot, { backgroundColor: colors.error }]} />
            <Text style={styles.conflictCount}>{highConflictCount}</Text>
            <Text style={styles.conflictLabel}>Critical</Text>
          </View>
        </View>
      </StandardCard>

      {/* Best Meetup Time */}
      <StandardCard style={styles.timeCard}>
        <View style={styles.timeBadge}>
          <Ionicons name="time" size={24} color={colors.primary} />
          <Text style={styles.timeLabel}>Best Meetup Time</Text>
        </View>
        <Text style={styles.bestTime}>
          {bestTimeSlot.date} at {bestTimeSlot.time}
        </Text>
        <Text style={styles.timeSubtitle}>
          {bestTimeSlot.available} of {bestTimeSlot.total} participants available
        </Text>

        <Text style={styles.allSlotsLabel}>All Suggested Times:</Text>
        <View style={styles.timeSlotsList}>
          {mockTimeSlots.map((slot, index) => (
            <View
              key={index}
              style={[
                styles.timeSlot,
                slot === bestTimeSlot && styles.timeSlotBest,
              ]}
            >
              <Text
                style={[
                  styles.timeSlotText,
                  slot === bestTimeSlot && styles.timeSlotTextBest,
                ]}
              >
                {slot.date} • {slot.time}
              </Text>
              <Text
                style={[
                  styles.timeSlotAvailability,
                  slot === bestTimeSlot && styles.timeSlotTextBest,
                ]}
              >
                {slot.available}/{slot.total}
              </Text>
            </View>
          ))}
        </View>
      </StandardCard>

      {/* Participants List */}
      <StandardCard style={styles.participantsCard}>
        <Text style={styles.sectionTitle}>
          Participants ({mockParticipants.length})
        </Text>

        {participantsWithConflicts.map((participant, index) => (
          <View key={index} style={styles.participantItem}>
            <View style={styles.participantAvatar}>
              <Text style={styles.participantInitial}>
                {participant.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{participant.name}</Text>
              <Text style={styles.participantProject}>
                {participant.projectName}
              </Text>
            </View>
            <View style={styles.participantStatus}>
              <View style={styles.readinessBar}>
                <View
                  style={[
                    styles.readinessBarFill,
                    {
                      width: `${participant.readiness * 100}%`,
                      backgroundColor:
                        participant.readiness >= 0.7
                          ? colors.success
                          : participant.readiness >= 0.5
                          ? colors.warning
                          : colors.error,
                    },
                  ]}
                />
              </View>
              <Text style={styles.readinessText}>
                {Math.round(participant.readiness * 100)}%
              </Text>
              {participant.conflictSeverity !== 'none' && (
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={
                    participant.conflictSeverity === 'high'
                      ? colors.error
                      : colors.warning
                  }
                />
              )}
            </View>
          </View>
        ))}
      </StandardCard>

      {/* Live Location Feature (Placeholder for Phase 3) */}
      <StandardCard style={styles.liveMapCard}>
        <View style={styles.liveMapHeader}>
          <View style={styles.liveMapTitle}>
            <Ionicons name="navigate" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Live Location</Text>
            <View style={styles.phase3Badge}>
              <Text style={styles.phase3Text}>Phase 3</Text>
            </View>
          </View>
          <Switch
            value={locationSharingEnabled}
            onValueChange={setLocationSharingEnabled}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={locationSharingEnabled ? colors.primary : colors.surface}
          />
        </View>

        <Text style={styles.liveMapDescription}>
          {locationSharingEnabled
            ? 'Your location will be shared with event participants'
            : 'Enable to share your location during the event'}
        </Text>

        {locationSharingEnabled ? (
          <TouchableOpacity
            style={styles.showMapButton}
            onPress={() => setShowLiveMap(!showLiveMap)}
            activeOpacity={0.7}
          >
            <Text style={styles.showMapButtonText}>
              {showLiveMap ? 'Hide Map' : 'Show Live Map'}
            </Text>
            <Ionicons
              name={showLiveMap ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : null}

        {showLiveMap && locationSharingEnabled && (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color={colors.textDisabled} />
            <Text style={styles.mapPlaceholderText}>
              Live map with participant locations
            </Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Real-time tracking available in Phase 3
            </Text>

            {/* Mock participant pins */}
            <View style={styles.mockPinsList}>
              {mockParticipants.slice(0, 3).map((p, i) => (
                <View key={i} style={styles.mockPin}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                  <Text style={styles.mockPinText}>{p.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.phase3Notice}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.phase3NoticeText}>
            Live location relay will be implemented in Phase 3 with real-time position
            tracking and navigation features.
          </Text>
        </View>
      </StandardCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
  headerCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  eventDate: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  summaryCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  conflictSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
  },
  conflictItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  conflictDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  conflictCount: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  conflictLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timeCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timeLabel: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  bestTime: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  timeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  allSlotsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  timeSlotsList: {
    gap: spacing.xs,
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeSlotBest: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  timeSlotTextBest: {
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  timeSlotAvailability: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  participantsCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  participantItem: {
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
  participantProject: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  participantStatus: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  readinessBar: {
    width: 60,
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  readinessBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  readinessText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  liveMapCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  liveMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  liveMapTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phase3Badge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  phase3Text: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
    fontSize: 10,
  },
  liveMapDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  showMapButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  showMapButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  mapPlaceholder: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  mapPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  mapPlaceholderSubtext: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  mockPinsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  mockPin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
  },
  mockPinText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  phase3Notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  phase3NoticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
