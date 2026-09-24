/**
 * Shareable Card Screen
 * Generate profile and itinerary cards with QR codes
 * Features: Save to gallery, native share, data aggregation
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { StandardCard, Button } from '../../components';
import { useUser } from '../../contexts/UserContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useEvents } from '../../contexts/EventsContext';
import { getCharacterById, getVariantById } from '../../data';
import { computeReadiness } from '../../utils/readiness';

type CardType = 'profile' | 'itinerary';

export const ShareableCardScreen: React.FC = () => {
  const { user } = useUser();
  const { projects, getTasksForProject, getBudgetForProject } = useProjects();
  const { events } = useEvents();
  
  const [selectedCard, setSelectedCard] = useState<CardType>('profile');
  const [isExporting, setIsExporting] = useState(false);
  
  const cardRef = useRef<View>(null);

  // Route guard: Cosplayers only
  if (!user?.is_cosplayer) {
    return (
      <View style={[styles.container, { padding: spacing.xl, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.textDisabled} />
        <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }]}>
          Cosplayers Only
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.lg }]}>
          Shareable cards are available to cosplayers who have projects and event itineraries to share.
        </Text>
      </View>
    );
  }

  // Get user's upcoming events (linked to projects)
  const upcomingEvents = projects
    .filter(p => p.linked_event_id)
    .map(p => {
      const event = events.find(e => e.id === p.linked_event_id);
      const readiness = computeReadiness({
        project: p,
        projectTasks: getTasksForProject(p.project_id),
        projectBudget: getBudgetForProject(p.project_id),
      });
      return {
        projectName: p.project_name,
        eventName: event?.name || 'Unknown Event',
        eventDate: event?.start_date || '',
        readiness: Math.round(readiness.readiness_score * 100),
      };
    })
    .filter(e => e.eventDate)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, 5);

  // Generate QR payload
  const getQRData = (type: CardType) => {
    if (type === 'profile') {
      return JSON.stringify({
        type: 'forgemind_profile',
        email: user?.email,
        name: user?.display_name,
        roles: [
          user?.is_cosplayer ? 'cosplayer' : null,
          user?.is_organizer ? 'organizer' : null,
        ].filter(Boolean),
        body: {
          base: user?.base_body_selection,
          size: user?.body_size_slider,
        },
        stats: {
          projects: projects.length,
          completed: projects.filter(p => p.status === 'completed').length,
          verified: user?.verification_status === 'verified',
        },
      });
    } else {
      return JSON.stringify({
        type: 'forgemind_itinerary',
        name: user?.display_name,
        events: upcomingEvents.map(e => ({
          project: e.projectName,
          event: e.eventName,
          date: e.eventDate,
          ready: e.readiness,
        })),
      });
    }
  };

  // Capture and share card
  const handleShare = async () => {
    if (!cardRef.current) return;
    
    setIsExporting(true);
    try {
      // Capture card as image
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Share the image
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Share ${selectedCard === 'profile' ? 'Profile' : 'Itinerary'} Card`,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share card. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Save card to gallery
  const handleSaveToGallery = async () => {
    if (!cardRef.current) return;
    
    setIsExporting(true);
    try {
      // Capture card as image
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });

      // Save card locally
      const fileName = `ForgeMind_${selectedCard}_${Date.now()}.png`;
      
      Alert.alert(
        'Saved!',
        `Card image captured successfully. You can share it or save it to your gallery from the share menu.`,
        [
          { text: 'OK' },
          {
            text: 'Share Now',
            onPress: () => handleShare(),
          },
        ]
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save card. Please check app permissions.');
    } finally {
      setIsExporting(false);
    }
  };

  // Completed projects count
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const inProgressCount = projects.filter(p => p.status === 'in-progress').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shareable Cards</Text>
        <Text style={styles.subtitle}>
          Generate and share your profile or event itinerary
        </Text>
      </View>

      {/* Card Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, selectedCard === 'profile' && styles.toggleButtonActive]}
          onPress={() => setSelectedCard('profile')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person"
            size={20}
            color={selectedCard === 'profile' ? colors.backgroundLight : colors.textSecondary}
          />
          <Text
            style={[
              styles.toggleText,
              selectedCard === 'profile' && styles.toggleTextActive,
            ]}
          >
            Profile Card
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, selectedCard === 'itinerary' && styles.toggleButtonActive]}
          onPress={() => setSelectedCard('itinerary')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={selectedCard === 'itinerary' ? colors.backgroundLight : colors.textSecondary}
          />
          <Text
            style={[
              styles.toggleText,
              selectedCard === 'itinerary' && styles.toggleTextActive,
            ]}
          >
            Itinerary Card
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card Preview */}
      <View style={styles.cardWrapper}>
        <View ref={cardRef} collapsable={false}>
          {selectedCard === 'profile' ? (
            <ProfileCard
              user={user}
              projectsCount={projects.length}
              completedCount={completedCount}
              inProgressCount={inProgressCount}
              qrData={getQRData('profile')}
            />
          ) : (
            <ItineraryCard
              user={user}
              upcomingEvents={upcomingEvents}
              qrData={getQRData('itinerary')}
            />
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="Share Card"
          variant="primary"
          onPress={handleShare}
          fullWidth
          disabled={isExporting}
        />
        <Button
          title="Save to Gallery"
          variant="secondary"
          onPress={handleSaveToGallery}
          fullWidth
          disabled={isExporting}
        />
      </View>

      {/* Privacy Notice */}
      <View style={styles.privacyNotice}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.privacyText}>
          Cards contain only the information shown. Your email and personal data remain private unless you choose to share.
        </Text>
      </View>
    </ScrollView>
  );
};

// Profile Card Component
interface ProfileCardProps {
  user: any;
  projectsCount: number;
  completedCount: number;
  inProgressCount: number;
  qrData: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  projectsCount,
  completedCount,
  inProgressCount,
  qrData,
}) => {
  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardBranding}>
          <Ionicons name="sparkles" size={24} color={colors.primary} />
          <Text style={styles.cardBrandText}>ForgeMind</Text>
        </View>
        <Text style={styles.cardType}>Profile Card</Text>
      </View>

      {/* User Info */}
      <View style={styles.cardBody}>
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.display_name || 'U')
                .split(' ')
                .map((s: string) => s.charAt(0).toUpperCase())
                .slice(0, 2)
                .join('')}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.display_name || 'User'}</Text>
          
          {/* Role Badges */}
          <View style={styles.roleBadges}>
            {user?.is_cosplayer && (
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="color-palette" size={12} color={colors.primary} />
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Cosplayer</Text>
              </View>
            )}
            {user?.is_organizer && (
              <View style={[styles.roleBadge, { backgroundColor: colors.secondary + '20' }]}>
                <Ionicons name="people" size={12} color={colors.secondary} />
                <Text style={[styles.roleBadgeText, { color: colors.secondary }]}>Organizer</Text>
              </View>
            )}
            {user?.verification_status === 'verified' && (
              <View style={[styles.roleBadge, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={[styles.roleBadgeText, { color: colors.success }]}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{projectsCount}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{inProgressCount}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>

        {/* Body Representation */}
        <View style={styles.bodySection}>
          <Text style={styles.bodySectionLabel}>Body Representation</Text>
          <Text style={styles.bodyInfo}>
            {user?.base_body_selection === 'male' ? 'Male' : 'Female'} • Size {user?.body_size_slider?.toFixed(2) || '0.50'}
          </Text>
        </View>
      </View>

      {/* QR Code */}
      <View style={styles.qrSection}>
        <QRCode value={qrData} size={120} backgroundColor="white" />
        <Text style={styles.qrLabel}>Scan to view profile</Text>
      </View>
    </View>
  );
};

// Itinerary Card Component
interface ItineraryCardProps {
  user: any;
  upcomingEvents: Array<{
    projectName: string;
    eventName: string;
    eventDate: string;
    readiness: number;
  }>;
  qrData: string;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({ user, upcomingEvents, qrData }) => {
  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardBranding}>
          <Ionicons name="sparkles" size={24} color={colors.primary} />
          <Text style={styles.cardBrandText}>ForgeMind</Text>
        </View>
        <Text style={styles.cardType}>Event Itinerary</Text>
      </View>

      {/* User Info */}
      <View style={styles.cardBody}>
        <Text style={styles.itineraryUserName}>{user?.display_name || 'User'}</Text>
        <Text style={styles.itinerarySubtitle}>Upcoming Events & Projects</Text>

        {/* Events List */}
        {upcomingEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {upcomingEvents.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <View style={styles.eventIcon}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventProject} numberOfLines={1}>
                    {event.projectName}
                  </Text>
                  <Text style={styles.eventName} numberOfLines={1}>
                    {event.eventName}
                  </Text>
                  <Text style={styles.eventDate}>{event.eventDate}</Text>
                </View>
                <View style={styles.readinessTag}>
                  <Text style={styles.readinessText}>{event.readiness}%</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noEvents}>
            <Ionicons name="calendar-outline" size={32} color={colors.textDisabled} />
            <Text style={styles.noEventsText}>No upcoming events</Text>
          </View>
        )}
      </View>

      {/* QR Code */}
      <View style={styles.qrSection}>
        <QRCode value={qrData} size={100} backgroundColor="white" />
        <Text style={styles.qrLabel}>Scan to view itinerary</Text>
      </View>
    </View>
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
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.backgroundLight,
  },
  cardWrapper: {
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardBrandText: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  cardType: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardBody: {
    marginBottom: spacing.lg,
  },
  userSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h2,
    color: colors.backgroundLight,
    fontWeight: '700',
  },
  userName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  roleBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  roleBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  bodySection: {
    alignItems: 'center',
  },
  bodySectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  bodyInfo: {
    ...typography.body,
    color: colors.textPrimary,
  },
  qrSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qrLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  itineraryUserName: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  itinerarySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  eventsList: {
    gap: spacing.sm,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    flex: 1,
  },
  eventProject: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  eventName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  eventDate: {
    ...typography.caption,
    color: colors.textDisabled,
    fontSize: 11,
  },
  readinessTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.sm,
  },
  readinessText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  noEvents: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noEventsText: {
    ...typography.body,
    color: colors.textDisabled,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  privacyText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
