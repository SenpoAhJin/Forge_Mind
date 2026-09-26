/**
 * ForgeMind - Projects List (Home) Screen (FE-4)
 * Lists the user's projects (character + variant from FE-3), readiness score and status.
 * "Start New Project" flows from the FE-3-selected variant or by browsing characters.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard, Button, StatusBadge } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useSelection } from '../../contexts/SelectionContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useEvents } from '../../contexts/EventsContext';
import { useMeetups } from '../../contexts/MeetupsContext';
import { getCharacterById, getVariantById } from '../../data';
import { computeReadiness } from '../../utils/readiness';
import { Project, ProjectStatus } from '../../types/projects';
import { daysBetween, formatCountdown, getTodayLocal } from '../../utils/dateHelpers';

interface ProjectsScreenProps {
  onStartProject: () => void;
  onBrowseCharacters: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenContests: () => void;
  onOpenCalendar: () => void;
  onOpenMeetups: (eventId: string) => void;
  onOpenInviteMeetups?: () => void;
}

const badgeStatusFor = (status: ProjectStatus): 'pending' | 'active' | 'completed' | 'cancelled' => {
  switch (status) {
    case 'planning':
      return 'pending';
    case 'in-progress':
      return 'active';
    case 'completed':
      return 'completed';
    case 'abandoned':
      return 'cancelled';
    default:
      return 'pending';
  }
};

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  onStartProject,
  onBrowseCharacters,
  onOpenProject,
  onOpenContests,
  onOpenCalendar,
  onOpenMeetups,
  onOpenInviteMeetups,
}) => {
  const { user } = useUser();
  const { selection } = useSelection();
  const { projects, getTasksForProject, getBudgetForProject } = useProjects();
  const { events } = useEvents();
  const { meetups } = useMeetups();
  const today = getTodayLocal();
  const currentUserProjects = user
    ? projects.filter(project => project.user_id === user.email)
    : [];

  const upcomingProjectEvents = currentUserProjects
    .flatMap(project => {
      const event = project.linked_event_id
        ? events.find(candidate => candidate.id === project.linked_event_id)
        : undefined;

      return event ? [{ project, event }] : [];
    })
    .filter(({ event }) =>
      event.status === 'confirmed' && (event.end_date || event.start_date) >= today
    )
    .sort((a, b) => a.event.start_date.localeCompare(b.event.start_date))
    .slice(0, 3);

  const readinessFor = (project: Project) =>
    computeReadiness({
      project,
      projectTasks: getTasksForProject(project.project_id),
      projectBudget: getBudgetForProject(project.project_id),
    });

  // Meetup headcount per event, derived from the shared MeetupsContext so this
  // card and the meetup screen can never disagree.
  const meetupCountFor = (eventId: string) =>
    meetups.filter((meetup) => meetup.event_id === eventId).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.display_name ?? 'Cosplayer'}</Text>
      </View>

      {upcomingProjectEvents.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </View>

          {upcomingProjectEvents.map(({ project, event }) => {
            const daysUntil = daysBetween(today, event.start_date);
            const isPast = daysUntil < 0;
            const isToday = daysUntil === 0;
            const isSoon = daysUntil <= 7 && daysUntil > 0;

            return (
              <StandardCard
                key={`${project.project_id}-${event.id}`}
                style={styles.eventCard}
                onPress={() => onOpenProject(project.project_id)}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventIconWrap}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.communityEventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.name}
                    </Text>
                    <Text style={styles.eventOrganizer} numberOfLines={1}>
                      Project: {project.project_name}
                    </Text>
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      {event.venue_name}{event.city ? `, ${event.city}` : ''}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.eventDateRow}>
                  <Text style={styles.eventDate}>
                    {event.start_date}
                    {event.end_date && ` - ${event.end_date}`}
                  </Text>
                  {!isPast && (
                    <Text style={[
                      styles.eventCountdownBadge,
                      isToday && styles.eventCountdownToday,
                      isSoon && styles.eventCountdownSoon,
                    ]}>
                      {formatCountdown(event.start_date, today)}
                    </Text>
                  )}
                </View>

                {/* FE-7 Step 5: entry point into the event's meetups */}
                <TouchableOpacity
                  style={styles.meetupButton}
                  onPress={() => onOpenMeetups(event.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="people-outline" size={15} color={colors.primary} />
                  <Text style={styles.meetupButtonText}>
                    {meetupCountFor(event.id) === 0
                      ? 'Propose a meetup'
                      : `${meetupCountFor(event.id)} meetup${meetupCountFor(event.id) === 1 ? '' : 's'}`}
                  </Text>
                </TouchableOpacity>
              </StandardCard>
            );
          })}
        </>
      ) : null}

      {/* Contests Entry Point Card */}
      <TouchableOpacity onPress={onOpenContests} activeOpacity={0.7}>
        <StandardCard style={styles.contestsCard}>
          <View style={styles.contestsRow}>
            <Ionicons name="trophy" size={24} color={colors.primary} />
            <View style={styles.contestsText}>
              <Text style={styles.contestsTitle}>Contest Events</Text>
              <Text style={styles.contestsSubtitle}>View and opt into contest competitions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </StandardCard>
      </TouchableOpacity>

      {/* Community Calendar Entry Point Card */}
      <TouchableOpacity onPress={onOpenCalendar} activeOpacity={0.7}>
        <StandardCard style={styles.contestsCard}>
          <View style={styles.contestsRow}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <View style={styles.contestsText}>
              <Text style={styles.contestsTitle}>Community Events</Text>
              <Text style={styles.contestsSubtitle}>Discover upcoming cons and cosplay events</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </StandardCard>
      </TouchableOpacity>

      {/* Invite Meetups Entry Point Card */}
      {onOpenInviteMeetups && (
        <TouchableOpacity onPress={onOpenInviteMeetups} activeOpacity={0.7}>
          <StandardCard style={styles.contestsCard}>
            <View style={styles.contestsRow}>
              <Ionicons name="qr-code" size={24} color={colors.primary} />
              <View style={styles.contestsText}>
                <Text style={styles.contestsTitle}>Invite Meetups</Text>
                <Text style={styles.contestsSubtitle}>Create or join casual meetups with QR codes</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </StandardCard>
        </TouchableOpacity>
      )}

      {selection ? (
        <StandardCard style={styles.startCard}>
          <View style={styles.startHeader}>
            <View style={styles.startIconWrap}>
              <Ionicons name="sparkles" size={22} color={colors.primary} />
            </View>
            <View style={styles.startTextWrap}>
              <Text style={styles.startLabel}>START FROM SELECTED VARIANT</Text>
              <Text style={styles.startCharacter}>{selection.character.character_name}</Text>
              <Text style={styles.startVariant}>{selection.variant.variant_name}</Text>
            </View>
          </View>
          <Button title="Create Project" variant="primary" fullWidth onPress={onStartProject} />
        </StandardCard>
      ) : (
        <StandardCard style={styles.startCard}>
          <View style={styles.startEmptyWrap}>
            <Ionicons name="add-circle-outline" size={32} color={colors.primary} />
            <Text style={styles.startEmptyTitle}>Start a new project</Text>
            <Text style={styles.startEmptySub}>
              Pick a character and variant first — it becomes your project.
            </Text>
          </View>
          <Button title="Browse Characters" variant="secondary" fullWidth onPress={onBrowseCharacters} />
        </StandardCard>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Projects</Text>
        <Text style={styles.sectionCount}>{currentUserProjects.length}</Text>
      </View>

      {currentUserProjects.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={36} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptySub}>
            Your projects will appear here after you start one.
          </Text>
        </View>
      )}

      {currentUserProjects.map((project) => {
        const character = getCharacterById(project.character_id);
        const variant = getVariantById(project.variant_id);
        const readiness = readinessFor(project).readiness_score;
        const pct = Math.round(readiness * 100);
        
        // Get linked event info
        const linkedEvent = project.linked_event_id ? events.find(e => e.id === project.linked_event_id) : null;
        const daysUntilEvent = linkedEvent ? daysBetween(today, linkedEvent.start_date) : null;

        return (
          <StandardCard key={project.project_id} style={styles.projectCard} onPress={() => onOpenProject(project.project_id)}>
            <View style={styles.projectHeader}>
              <View style={styles.projectMeta}>
                <Text style={styles.projectName} numberOfLines={1}>
                  {project.project_name}
                </Text>
                <Text style={styles.projectSub} numberOfLines={1}>
                  {character?.character_name ?? 'Unknown character'}
                  {variant ? ` · ${variant.variant_name}` : ''}
                </Text>
                {linkedEvent && (
                  <View style={styles.eventInfo}>
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={styles.eventText} numberOfLines={1}>
                      {linkedEvent.name} · {linkedEvent.start_date}
                      {daysUntilEvent !== null && daysUntilEvent >= 0 && (
                        <Text style={[styles.eventCountdown, daysUntilEvent <= 7 && { color: colors.error }]}>
                          {' '}· {formatCountdown(linkedEvent.start_date, today)}{daysUntilEvent > 0 ? ' away' : ''}
                        </Text>
                      )}
                    </Text>
                  </View>
                )}
              </View>
              <StatusBadge status={badgeStatusFor(project.status)} label={project.status} />
            </View>

            <View style={styles.readinessRow}>
              <Text style={styles.readinessLabel}>Readiness</Text>
              <Text style={styles.readinessValue}>{pct}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: readiness >= 0.6 ? colors.success : readiness >= 0.3 ? colors.warning : colors.error }]} />
            </View>

            <View style={styles.projectFooter}>
              <Text style={styles.viewHint}>Open dashboard</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </View>
          </StandardCard>
        );
      })}
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
  greeting: {
    marginBottom: spacing.xl,
  },
  greetingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  nameText: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  contestsCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  contestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contestsText: {
    flex: 1,
  },
  contestsTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  contestsSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  startCard: {
    marginBottom: spacing.xl,
  },
  startHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  startIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTextWrap: {
    flex: 1,
  },
  startLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  startCharacter: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  startVariant: {
    ...typography.body,
    color: colors.primary,
    marginTop: 2,
  },
  startEmptyWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  startEmptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  startEmptySub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionCount: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  eventCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  eventIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityEventInfo: {
    flex: 1,
  },
  eventTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  eventOrganizer: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eventLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eventDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  eventDate: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  eventCountdownBadge: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  eventCountdownToday: {
    backgroundColor: colors.success,
    color: colors.backgroundLight,
  },
  eventCountdownSoon: {
    backgroundColor: colors.warning,
    color: colors.backgroundLight,
  },
  meetupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
  },
  meetupButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  projectCard: {
    marginBottom: spacing.md,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  projectMeta: {
    flex: 1,
  },
  projectName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  projectSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eventText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
  },
  eventCountdown: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  readinessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  readinessLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  readinessValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  projectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  viewHint: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});