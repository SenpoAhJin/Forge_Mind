/**
 * Public Event Calendar - Staff Management Screen
 * List/create/edit/delete community event listings
 * Accessible to: approved staff (any department) OR Head Organizer
 * Edit/delete: original submitter OR any Head Organizer
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard, Button, TextInputField, ConfirmationModal } from '../../components';
import { DateInput } from '../../components/inputs/DateInput';
import { typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useCalendar } from '../../contexts/CalendarContext';
import { getTodayLocal } from '../../utils/dateHelpers';
import { CalendarEntry } from '../../types/calendarEntries';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

const getDynamicStyles = (themeColors: ThemeColors) => ({
  container: { backgroundColor: themeColors.surface },
  loadingText: { color: themeColors.textSecondary },
  noAccessTitle: { color: themeColors.textPrimary },
  noAccessBody: { color: themeColors.textSecondary },
  formTitle: { color: themeColors.textPrimary },
  errorText: { color: themeColors.error },
  emptyTitle: { color: themeColors.textPrimary },
  emptyBody: { color: themeColors.textSecondary },
  entryTitle: { color: themeColors.textPrimary },
  entryOrganizer: { color: themeColors.textSecondary },
  entryDetailText: { color: themeColors.textSecondary },
  submitterText: { color: themeColors.textDisabled },
});

export const CalendarManageScreen: React.FC = () => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const { user } = useUser();
  const { entries, isLoading, createEntry, updateEntry, deleteEntry } = useCalendar();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState(getTodayLocal());
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<CalendarEntry | null>(null);

  // Check permissions
  const canSubmit = user?.is_organizer && (
    user.organizer_role === 'head' ||
    (user.organizer_role === 'staff' && user.department_verification_status === 'approved')
  );

  const canEdit = (entry: CalendarEntry) => {
    if (!user?.is_organizer) return false;
    if (user.organizer_role === 'head') return true; // Head can edit any
    return entry.submitted_by_email === user.email; // Staff can edit own only
  };

  const canDelete = canEdit; // Same rules

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [entries]
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setOrganizerName('');
    setVenueName('');
    setCity('');
    setStartDate(getTodayLocal());
    setEndDate('');
    setDescription('');
    setExternalLink('');
    setFormError('');
    setShowForm(false);
  };

  const loadEntryForEdit = (entry: CalendarEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setOrganizerName(entry.organizer_name);
    setVenueName(entry.venue_name);
    setCity(entry.city);
    setStartDate(entry.start_date);
    setEndDate(entry.end_date || '');
    setDescription(entry.description || '');
    setExternalLink(entry.external_link || '');
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setFormError('');

    if (editingId) {
      // Update existing
      const result = await updateEntry(
        editingId,
        {
          title,
          organizer_name: organizerName,
          venue_name: venueName,
          city,
          start_date: startDate,
          end_date: endDate || null,
          description: description || null,
          external_link: externalLink || null,
        },
        user.email,
        user.organizer_role
      );
      if (!result.success) {
        setFormError(result.error || 'Failed to update listing');
      } else {
        resetForm();
      }
    } else {
      // Create new
      const result = await createEntry(
        {
          title,
          organizer_name: organizerName,
          venue_name: venueName,
          city,
          start_date: startDate,
          end_date: endDate || null,
          description: description || null,
          external_link: externalLink || null,
        },
        user.email,
        user.display_name,
        user.organizer_role,
        user.department_verification_status || null,
        user.department || null  // Pass department for routing approval
      );
      if (!result.success) {
        setFormError(result.error || 'Failed to create listing');
      } else {
        resetForm();
        // Show success message based on role
        if (user.organizer_role === 'staff') {
          setFormError('✓ Submission sent to your Head Organizer for approval');
        }
      }
    }
  };

  const handleDelete = async (entry: CalendarEntry) => {
    if (!user) return;
    const result = await deleteEntry(entry.id, user.email, user.organizer_role);
    if (result.success) {
      setDeleteConfirm(null);
    } else {
      setFormError(result.error || 'Failed to delete listing');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading calendar...</Text>
      </View>
    );
  }

  if (!canSubmit) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StandardCard style={styles.noAccessCard}>
          <Ionicons name="lock-closed" size={40} color={themeColors.textDisabled} />
          <Text style={[styles.noAccessTitle, dynamicStyles.noAccessTitle]}>Access Restricted</Text>
          <Text style={[styles.noAccessBody, dynamicStyles.noAccessBody]}>
            Only approved staff or Head Organizers can submit community event listings.
          </Text>
        </StandardCard>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={styles.content}>
      {showForm ? (
        <StandardCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, dynamicStyles.formTitle]}>{editingId ? 'Edit Listing' : 'New Listing'}</Text>
            <TouchableOpacity onPress={resetForm} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInputField
            label="Event Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. AnimeCon 2026"
          />
          <TextInputField
            label="Organizer Name"
            value={organizerName}
            onChangeText={setOrganizerName}
            placeholder="e.g. Cosplay.ph"
          />
          <TextInputField
            label="Venue Name"
            value={venueName}
            onChangeText={setVenueName}
            placeholder="e.g. SMX Convention Center"
          />
          <TextInputField
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Manila"
          />
          <DateInput
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />
          <DateInput
            label="End Date (optional, single-day if omitted)"
            value={endDate}
            onChange={setEndDate}
            optional
          />
          <TextInputField
            label="Description (optional, max 500 chars)"
            value={description}
            onChangeText={setDescription}
            placeholder="Brief event description"
          />
          <TextInputField
            label="External Link (optional)"
            value={externalLink}
            onChangeText={setExternalLink}
            placeholder="https://event-website.com"
          />

          {formError ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{formError}</Text> : null}

          <View style={styles.formActions}>
            <Button
              title="Cancel"
              variant="tertiary"
              onPress={resetForm}
            />
            <Button
              title={editingId ? 'Update' : 'Submit'}
              variant="primary"
              onPress={handleSubmit}
            />
          </View>
        </StandardCard>
      ) : (
        <>
          <Button
            title="Add New Listing"
            variant="primary"
            onPress={() => setShowForm(true)}
            fullWidth
          />

          {sortedEntries.length === 0 ? (
            <StandardCard style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={40} color={themeColors.textDisabled} />
              <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>No listings yet</Text>
              <Text style={[styles.emptyBody, dynamicStyles.emptyBody]}>
                Submit the first community event listing for cosplayers to discover.
              </Text>
            </StandardCard>
          ) : (
            sortedEntries.map((entry) => (
              <StandardCard key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryMeta}>
                    <Text style={[styles.entryTitle, dynamicStyles.entryTitle]} numberOfLines={1}>{entry.title}</Text>
                    <Text style={[styles.entryOrganizer, dynamicStyles.entryOrganizer]} numberOfLines={1}>{entry.organizer_name}</Text>
                  </View>
                  {canEdit(entry) ? (
                    <View style={styles.entryActions}>
                      <TouchableOpacity onPress={() => loadEntryForEdit(entry)} activeOpacity={0.7}>
                        <Ionicons name="pencil" size={20} color={themeColors.primary} />
                      </TouchableOpacity>
                      {canDelete(entry) ? (
                        <TouchableOpacity onPress={() => setDeleteConfirm(entry)} activeOpacity={0.7}>
                          <Ionicons name="trash-outline" size={20} color={themeColors.error} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
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
                  {entry.external_link ? (
                    <View style={styles.entryRow}>
                      <Ionicons name="link-outline" size={16} color={themeColors.textSecondary} />
                      <Text style={[styles.entryDetailText, dynamicStyles.entryDetailText]} numberOfLines={1}>{entry.external_link}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.submitterText, dynamicStyles.submitterText]}>
                    Submitted by {entry.submitted_by_name}
                  </Text>
                </View>
              </StandardCard>
            ))
          )}
        </>
      )}

      {deleteConfirm ? (
        <ConfirmationModal
          visible={true}
          title="Delete Listing"
          message={`Remove "${deleteConfirm.title}" from the community calendar?`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      ) : null}
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
  noAccessCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
  },
  noAccessTitle: {
    ...typography.h2,
  },
  noAccessBody: {
    ...typography.body,
    textAlign: 'center',
  },
  formCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  formTitle: {
    ...typography.h2,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
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
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  entryMeta: {
    flex: 1,
  },
  entryTitle: {
    ...typography.h3,
  },
  entryOrganizer: {
    ...typography.body,
    marginTop: 2,
  },
  entryActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginLeft: spacing.sm,
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
  submitterText: {
    ...typography.caption,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
