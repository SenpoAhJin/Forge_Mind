import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useEvents } from '../../contexts/EventsContext';
import { EventsStackParamList } from '../../navigation/EventsStackNavigator';
import { Button, StandardCard, Tag } from '../../components';
import { formatEventStatus } from '../../utils/formatStatus';
import { Event, EventStatus } from '../../types/events';
import { isDateInPast } from '../../utils/dateHelpers';

type EventsScreenNavigationProp = NativeStackNavigationProp<EventsStackParamList, 'EventsHome'>;

export const EventsScreen: React.FC = () => {
  const { user } = useUser();
  const { events, isLoading } = useEvents();
  const navigation = useNavigation<EventsScreenNavigationProp>();
  
  const [selectedStatus, setSelectedStatus] = useState<'all' | EventStatus>('all');

  // Role checks
  const isHeadOrganizer = user?.organizer_role === 'head';
  const isVerifiedStaff = user?.organizer_role === 'staff' && user?.department_verification_status === 'approved';
  const hasAccess = isHeadOrganizer || isVerifiedStaff;

  // Filter logic
  const getFilteredEvents = (): Event[] => {
    let filtered = events;

    // Staff see confirmed events only
    if (isVerifiedStaff && !isHeadOrganizer) {
      filtered = filtered.filter(e => e.status === 'confirmed');
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(e => e.status === selectedStatus);
    }

    // Sort by start_date ascending
    return filtered.sort((a, b) => a.start_date.localeCompare(b.start_date));
  };

  // Helper: Check if event is in the past
  const isPastEvent = (event: Event): boolean => {
    const checkDate = event.end_date || event.start_date;
    return isDateInPast(checkDate);
  };

  // Helper: Format date range
  const formatDateRange = (event: Event): string => {
    if (event.end_date && event.end_date !== event.start_date) {
      return `${event.start_date} to ${event.end_date}`;
    }
    return event.start_date;
  };

  // Staff/unverified user UI
  if (!hasAccess) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.permissionBanner}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={styles.permissionText}>
            {user?.organizer_role === 'staff'
              ? 'Your department access is pending approval. Once approved, you can view confirmed events.'
              : 'Events access requires Head Organizer or approved Staff status. Please request organizer access from your profile.'}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const filteredEvents = getFilteredEvents();

  // Status chips (staff only see chips that make sense for their filtered view)
  const statusChips: Array<{ key: 'all' | EventStatus; label: string }> = isHeadOrganizer
    ? [
        { key: 'all', label: 'All' },
        { key: 'draft' as const, label: 'Draft' },
        { key: 'confirmed' as const, label: 'Confirmed' },
        { key: 'cancelled' as const, label: 'Cancelled' },
      ]
    : [
        // Staff only see confirmed events, so only show All/Confirmed chips
        { key: 'all', label: 'All' },
        { key: 'confirmed' as const, label: 'Confirmed' },
      ];

  // If only one chip remains after filtering, hide the chip bar entirely
  const showChipBar = statusChips.length > 1;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status chip bar (only show if multiple chips) */}
        {showChipBar && (
          <View style={styles.chipBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipBar}
            >
              {statusChips.map(chip => (
                <TouchableOpacity
                  key={chip.key}
                  onPress={() => setSelectedStatus(chip.key)}
                  style={styles.chipWrapper}
                  activeOpacity={0.7}
                >
                  <Tag
                    type="category"
                    label={chip.label}
                    style={selectedStatus === chip.key ? styles.chipSelected : undefined}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Create button (Head Organizer only) */}
        {isHeadOrganizer && (
          <View style={styles.createButtonContainer}>
            <Button
              title="Create Event"
              variant="primary"
              onPress={() => navigation.navigate('CreateEvent')}
            />
          </View>
        )}

        {/* Event cards */}
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={48} color={colors.textDisabled} />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedStatus === 'all' ? 'No events yet' : `No ${selectedStatus} events`}
            </Text>
            <Text style={styles.emptyMessage}>
              {isHeadOrganizer && selectedStatus === 'all'
                ? 'Create your first event to get started'
                : isVerifiedStaff
                ? 'Check back later for confirmed events'
                : 'Events will appear here once created'}
            </Text>
          </View>
        ) : (
          filteredEvents.map(event => (
            <TouchableOpacity
              key={event.id}
              onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
              activeOpacity={0.7}
            >
              <StandardCard style={styles.eventCard}>
                <View style={styles.cardContent}>
                  <Text style={styles.eventName} numberOfLines={2}>
                    {event.name}
                  </Text>
                  <Text style={styles.eventDate} numberOfLines={1}>
                    {formatDateRange(event)}
                  </Text>
                  <Text style={styles.eventVenue} numberOfLines={1}>
                    {event.venue_name}{event.city ? `, ${event.city}` : ''}
                  </Text>
                  <View style={styles.badges}>
                    <Tag
                      type="status"
                      label={formatEventStatus(event.status)}
                      style={
                        event.status === 'confirmed'
                          ? styles.badgeConfirmed
                          : event.status === 'cancelled'
                          ? styles.badgeCancelled
                          : styles.badgeDraft
                      }
                    />
                    {isPastEvent(event) && (
                      <Tag type="status" label="Past" style={styles.badgeNeutral} />
                    )}
                  </View>
                </View>
              </StandardCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    gap: spacing.sm,
  },
  permissionText: { ...typography.body, color: colors.textPrimary, flex: 1, lineHeight: 20 },
  chipBarContainer: {
    height: 56,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  chipBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  chipWrapper: {
    alignSelf: 'flex-start',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  createButtonContainer: {
    marginBottom: spacing.lg,
  },
  eventCard: {
    marginBottom: spacing.md,
    height: 150,
  },
  cardContent: {
    flex: 1,
  },
  eventName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  eventDate: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  eventVenue: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 'auto',
  },
  badgeConfirmed: {
    backgroundColor: colors.success,
  },
  badgeCancelled: {
    backgroundColor: colors.error,
  },
  badgeDraft: {
    backgroundColor: colors.textSecondary,
  },
  badgeNeutral: {
    backgroundColor: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

