/**
 * Public Event Calendar - Cosplayer Browse Screen
 * Read-only view of community event listings
 * Visible to all cosplayer users
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard } from '../../components';
import { typography, spacing, borderRadius } from '../../theme';
import { useCalendar } from '../../contexts/CalendarContext';
import { getTodayLocal } from '../../utils/dateHelpers';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

const getDynamicStyles = (themeColors: ThemeColors) => ({
  container: { backgroundColor: themeColors.surface },
  loadingText: { color: themeColors.textSecondary },
  emptyTitle: { color: themeColors.textPrimary },
  emptyBody: { color: themeColors.textSecondary },
  entryTitle: { color: themeColors.textPrimary },
  entryOrganizer: { color: themeColors.textSecondary },
  entryDetailText: { color: themeColors.textSecondary },
  entryDescription: { color: themeColors.textSecondary },
  linkText: { color: themeColors.primary },
  disclaimer: { backgroundColor: themeColors.backgroundLight },
  disclaimerText: { color: themeColors.textDisabled },
});

export const CalendarBrowseScreen: React.FC = () => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const { entries, isLoading } = useCalendar();
  const today = getTodayLocal();

  // Filter: show approved upcoming events only
  const upcomingEntries = useMemo(() => {
    return entries
      .filter((e) => {
        // Only show approved listings
        if (e.status !== 'approved') return false;
        
        const compareDate = e.end_date || e.start_date;
        return compareDate >= today;
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [entries, today]);

  const handleExternalLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('[CalendarBrowseScreen] Failed to open URL:', err)
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading community calendar...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={styles.content}>
      {upcomingEntries.length === 0 ? (
        <StandardCard style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={40} color={themeColors.textDisabled} />
          <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>No upcoming events</Text>
          <Text style={[styles.emptyBody, dynamicStyles.emptyBody]}>
            Check back later for community-submitted event listings.
          </Text>
        </StandardCard>
      ) : (
        upcomingEntries.map((entry) => (
          <StandardCard key={entry.id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={[styles.entryTitle, dynamicStyles.entryTitle]} numberOfLines={1}>{entry.title}</Text>
              <Text style={[styles.entryOrganizer, dynamicStyles.entryOrganizer]} numberOfLines={1}>{entry.organizer_name}</Text>
            </View>
            <View style={styles.entryDetails}>
              <View style={styles.entryRow}>
                <Ionicons name="location-outline" size={16} color={themeColors.textSecondary} />
                <Text style={[styles.entryDetailText, dynamicStyles.entryDetailText]} numberOfLines={1}>
                  {entry.venue_name}, {entry.city}
                </Text>
              </View>
              <View style={styles.entryRow}>
                <Ionicons name="calendar-outline" size={16} color={themeColors.textSecondary} />
                <Text style={[styles.entryDetailText, dynamicStyles.entryDetailText]}>
                  {entry.start_date}{entry.end_date ? ` - ${entry.end_date}` : ''}
                </Text>
              </View>
              {entry.description ? (
                <Text style={[styles.entryDescription, dynamicStyles.entryDescription]} numberOfLines={2}>{entry.description}</Text>
              ) : null}
              {entry.external_link ? (
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => handleExternalLink(entry.external_link!)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="link-outline" size={16} color={themeColors.primary} />
                  <Text style={[styles.linkText, dynamicStyles.linkText]} numberOfLines={1}>Visit event website</Text>
                  <Ionicons name="open-outline" size={14} color={themeColors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </StandardCard>
        ))
      )}

      <View style={[styles.disclaimer, dynamicStyles.disclaimer]}>
        <Ionicons name="information-circle-outline" size={20} color={themeColors.textDisabled} />
        <Text style={[styles.disclaimerText, dynamicStyles.disclaimerText]}>
          Community listings are staff-submitted. ForgeMind does not verify organizers or endorse events. Visit official event websites for accurate details.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptyBody: {
    ...typography.body,
    textAlign: 'center',
  },
  entryCard: {
    padding: spacing.md,
    height: 140,
  },
  entryHeader: {
    marginBottom: spacing.sm,
  },
  entryTitle: {
    ...typography.h3,
  },
  entryOrganizer: {
    ...typography.body,
    marginTop: 2,
  },
  entryDetails: {
    gap: spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  entryDetailText: {
    ...typography.caption,
    flex: 1,
  },
  entryDescription: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  linkText: {
    ...typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  disclaimerText: {
    ...typography.caption,
    flex: 1,
  },
});
