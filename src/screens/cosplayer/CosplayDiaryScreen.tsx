/**
 * Cosplay Diary Screen
 * Personal photo journal for completed cosplay projects
 * Separate from AI-facing build history
 * Features: Photos, star ratings, personal notes
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Button, TextAreaField, ConfirmationModal } from '../../components';
import { typography, spacing, borderRadius } from '../../theme';
import { useDiary } from '../../contexts/DiaryContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { getCharacterById, getVariantById } from '../../data';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

// ============================================================================
// TEMP MOCK DATA - DELETE IN CODING PASS
// ============================================================================
const MOCK_DIARY_ENTRIES = [
  {
    id: 'diary-mock-1',
    project_id: 'project-1',
    project_name: 'Gojo Satoru - JJK',
    character_name: 'Gojo Satoru',
    variant_name: 'Uniform Ver.',
    rating: 5,
    completion_date: '2026-09-10',
    photos: ['https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=Gojo+Satoru'],
    notes: 'Amazing experience! The white wig was challenging to style but the final look was worth it. Got so many compliments at the con.',
    created_at: '2026-09-10T15:30:00Z',
  },
  {
    id: 'diary-mock-2',
    project_id: 'project-2',
    project_name: 'Hatsune Miku - Classic',
    character_name: 'Hatsune Miku',
    variant_name: 'Original',
    rating: 4,
    completion_date: '2026-08-25',
    photos: [
      'https://via.placeholder.com/400x400/EC4899/FFFFFF?text=Miku+1',
      'https://via.placeholder.com/400x400/F472B6/FFFFFF?text=Miku+2',
    ],
    notes: 'The twin tails were a workout! Next time I need better wig clips. Photoshoot turned out great though.',
    created_at: '2026-08-25T10:00:00Z',
  },
  {
    id: 'diary-mock-3',
    project_id: 'project-3',
    project_name: 'Chainsaw Man - Power',
    character_name: 'Power',
    variant_name: 'Default',
    rating: 5,
    completion_date: '2026-08-15',
    photos: [
      'https://via.placeholder.com/400x400/EF4444/FFFFFF?text=Power+1',
      'https://via.placeholder.com/400x400/F87171/FFFFFF?text=Power+2',
      'https://via.placeholder.com/400x400/FCA5A5/FFFFFF?text=Power+3',
    ],
    notes: 'Absolutely loved this build! The horns were made from EVA foam and painted perfectly. Blood effects came out exactly as I imagined.',
    created_at: '2026-08-15T14:20:00Z',
  },
  {
    id: 'diary-mock-4',
    project_id: 'project-4',
    project_name: 'Link - TOTK',
    character_name: 'Link',
    variant_name: 'Tears of the Kingdom',
    rating: 3,
    completion_date: '2026-07-30',
    photos: ['https://via.placeholder.com/400x400/10B981/FFFFFF?text=Link'],
    notes: 'Good first attempt but the arm details need work. Will revisit this costume next year with better materials.',
    created_at: '2026-07-30T09:45:00Z',
  },
];
// ============================================================================

const getDynamicStyles = (themeColors: ThemeColors) => ({
  container: { backgroundColor: themeColors.surface },
  title: { color: themeColors.textPrimary },
  subtitle: { color: themeColors.textSecondary },
  ctaCard: { backgroundColor: themeColors.primary + '10', borderColor: themeColors.primary + '30' },
  ctaTitle: { color: themeColors.primary },
  ctaSubtitle: { color: themeColors.textSecondary },
  emptyTitle: { color: themeColors.textPrimary },
  emptySub: { color: themeColors.textSecondary },
  sectionTitle: { color: themeColors.textPrimary },
  entryCard: { backgroundColor: themeColors.backgroundLight },
  entryProject: { color: themeColors.textPrimary },
  entryCharacter: { color: themeColors.textSecondary },
  entryDate: { color: themeColors.textDisabled },
  notePreview: { color: themeColors.textSecondary },
  ratingText: { color: themeColors.textSecondary },
  photoPlaceholder: { backgroundColor: themeColors.surface, borderColor: themeColors.border },
  photoLabel: { color: themeColors.textDisabled },
  morePhotos: { color: themeColors.textSecondary },
  notesSection: { borderTopColor: themeColors.border },
  notesLabel: { color: themeColors.textSecondary },
  notesText: { color: themeColors.textPrimary },
  entryActions: { borderTopColor: themeColors.border },
  actionButton: { backgroundColor: themeColors.surface },
  actionText: { color: themeColors.primary },
  actionTextDelete: { color: themeColors.error },
  infoNotice: { backgroundColor: themeColors.backgroundLight, borderLeftColor: themeColors.primary },
  infoText: { color: themeColors.textSecondary },
  modalContainer: { backgroundColor: themeColors.surface },
  modalTitle: { color: themeColors.textPrimary },
  formLabel: { color: themeColors.textPrimary },
  projectChip: { backgroundColor: themeColors.backgroundLight, borderColor: themeColors.border },
  projectChipSelected: { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary },
  projectChipText: { color: themeColors.textSecondary },
  projectChipTextSelected: { color: themeColors.primary },
  addPhotoButton: { backgroundColor: themeColors.backgroundLight, borderColor: themeColors.border },
  addPhotoText: { color: themeColors.primary },
  removePhotoButton: { backgroundColor: themeColors.backgroundLight },
});

export const CosplayDiaryScreen: React.FC = () => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const navigation = useNavigation<any>();
  const { entries, createEntry } = useDiary();
  const { projects } = useProjects();

  // TEMP: Use mock data for visual preview
  const displayEntries = MOCK_DIARY_ENTRIES;

  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation modals
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showNoProjectsModal, setShowNoProjectsModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Get completed projects without diary entries (can create entry)
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const projectsWithoutEntry = completedProjects.filter(
    (p) => !entries.some((e) => e.project_id === p.project_id)
  );

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setShowPermissionModal(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((asset) => asset.uri);
      setPhotoUris((prev) => [...prev, ...newUris]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenCreateModal = () => {
    if (projectsWithoutEntry.length === 0) {
      setShowNoProjectsModal(true);
      return;
    }
    setSelectedProject(projectsWithoutEntry[0].project_id);
    setPhotoUris([]);
    setRating(5);
    setNotes('');
    setShowCreateModal(true);
  };

  const handleCreateEntry = async () => {
    if (!selectedProject) {
      setErrorMessage('Please select a project.');
      setShowErrorModal(true);
      return;
    }

    const project = projects.find((p) => p.project_id === selectedProject);
    if (!project) return;

    const character = getCharacterById(project.character_id);
    const variant = getVariantById(project.variant_id);

    setIsSubmitting(true);
    try {
      await createEntry({
        project_id: project.project_id,
        project_name: project.project_name,
        character_name: character?.character_name || 'Unknown',
        variant_name: variant?.variant_name || 'Default',
        photos: photoUris,
        rating,
        notes,
        completion_date: new Date().toISOString().split('T')[0],
      });

      setShowCreateModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage('Failed to create diary entry. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={20}
            color={star <= rating ? themeColors.warning : themeColors.textDisabled}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.title]}>Cosplay Diary</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          Your personal journal for completed looks. Photos, ratings, and memories.
        </Text>
      </View>

      {/* Create Entry CTA */}
      {projectsWithoutEntry.length > 0 && (
        <View style={[styles.ctaCard, dynamicStyles.ctaCard]}>
          <View style={styles.ctaHeader}>
            <Ionicons name="add-circle" size={32} color={themeColors.primary} />
            <View style={styles.ctaText}>
              <Text style={[styles.ctaTitle, dynamicStyles.ctaTitle]}>Document Your Cosplays</Text>
              <Text style={[styles.ctaSubtitle, dynamicStyles.ctaSubtitle]}>
                {projectsWithoutEntry.length} completed project{projectsWithoutEntry.length > 1 ? 's' : ''} waiting to be journaled
              </Text>
            </View>
          </View>
          <Button
            title="Add Diary Entry"
            variant="primary"
            onPress={handleOpenCreateModal}
            fullWidth
          />
        </View>
      )}

      {/* Diary Entries */}
      {displayEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color={themeColors.textDisabled} />
          <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>No Diary Entries Yet</Text>
          <Text style={[styles.emptySub, dynamicStyles.emptySub]}>
            Complete a project and document your cosplay journey with photos and notes
          </Text>
        </View>
      ) : (
        <View style={styles.entriesSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Your Entries ({displayEntries.length})</Text>
          {displayEntries.map((entry) => {
            const isExpanded = expandedEntry === entry.id;
            
            return (
              <TouchableOpacity
                key={entry.id}
                style={[styles.entryCard, dynamicStyles.entryCard]}
                onPress={() => {
                  // No-op or placeholder for detail view
                }}
                activeOpacity={0.7}
              >
                {/* Cover Photo */}
                {entry.photos.length > 0 ? (
                  <Image source={{ uri: entry.photos[0] }} style={styles.entryCover} />
                ) : null}

                {/* Entry Content */}
                <View style={styles.entryContent}>
                  {/* Title & Rating Row */}
                  <View style={styles.entryTitleRow}>
                    <View style={styles.entryInfo}>
                      <Text style={[styles.entryProject, dynamicStyles.entryProject]} numberOfLines={1}>
                        {entry.project_name}
                      </Text>
                      <Text style={[styles.entryCharacter, dynamicStyles.entryCharacter]} numberOfLines={1}>
                        {entry.character_name} - {entry.variant_name}
                      </Text>
                    </View>
                    {renderStars(entry.rating)}
                  </View>

                  {/* Date */}
                  <Text style={[styles.entryDate, dynamicStyles.entryDate]}>
                    Completed: {entry.completion_date}
                  </Text>

                  {/* Note Preview */}
                  {entry.notes ? (
                    <Text style={[styles.notePreview, dynamicStyles.notesText]} numberOfLines={2}>
                      {entry.notes}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Info Notice */}
      <View style={[styles.infoNotice, dynamicStyles.infoNotice]}>
        <Ionicons name="information-circle-outline" size={16} color={themeColors.textSecondary} />
        <Text style={[styles.infoText, dynamicStyles.infoText]}>
          Your diary is personal and private. It's separate from the AI matching system and only visible to you.
        </Text>
      </View>

      {/* Create Entry Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <ScrollView style={[styles.modalContainer, dynamicStyles.modalContainer]} contentContainerStyle={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>New Diary Entry</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Project Picker */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, dynamicStyles.formLabel]}>Select Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectPicker}>
              {projectsWithoutEntry.map((project) => {
                const isSelected = selectedProject === project.project_id;
                return (
                  <TouchableOpacity
                    key={project.project_id}
                    style={[
                      styles.projectChip,
                      dynamicStyles.projectChip,
                      isSelected && dynamicStyles.projectChipSelected
                    ]}
                    onPress={() => setSelectedProject(project.project_id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.projectChipText,
                      dynamicStyles.projectChipText,
                      isSelected && dynamicStyles.projectChipTextSelected
                    ]}>
                      {project.project_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Photo Upload */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, dynamicStyles.formLabel]}>Photos ({photoUris.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosList}>
              <TouchableOpacity style={[styles.addPhotoButton, dynamicStyles.addPhotoButton]} onPress={handlePickImage} activeOpacity={0.7}>
                <Ionicons name="camera" size={32} color={themeColors.primary} />
                <Text style={[styles.addPhotoText, dynamicStyles.addPhotoText]}>Add Photo</Text>
              </TouchableOpacity>
              {photoUris.map((uri, index) => (
                <View key={index} style={styles.photoPreview}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={[styles.removePhotoButton, dynamicStyles.removePhotoButton]}
                    onPress={() => handleRemovePhoto(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color={themeColors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Rating */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, dynamicStyles.formLabel]}>Rating</Text>
            <View style={styles.ratingPicker}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? themeColors.warning : themeColors.textDisabled}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, dynamicStyles.formLabel]}>Notes (Optional)</Text>
            <TextAreaField
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go? Any challenges or highlights?"
            />
          </View>

          {/* Submit Button */}
          <Button
            title={isSubmitting ? 'Creating...' : 'Create Entry'}
            variant="primary"
            onPress={handleCreateEntry}
            fullWidth
            disabled={isSubmitting || !selectedProject}
          />
        </ScrollView>
      </Modal>

      {/* Confirmation Modals */}
      <ConfirmationModal
        visible={showPermissionModal}
        title="Permission Required"
        message="We need access to your photo library to add photos to your diary entries."
        confirmText="OK"
        onConfirm={() => setShowPermissionModal(false)}
        onCancel={() => setShowPermissionModal(false)}
      />

      <ConfirmationModal
        visible={showNoProjectsModal}
        title="No Projects Available"
        message="You don't have any completed projects without diary entries yet. Complete a project first!"
        confirmText="OK"
        onConfirm={() => setShowNoProjectsModal(false)}
        onCancel={() => setShowNoProjectsModal(false)}
      />

      <ConfirmationModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        onConfirm={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
      />

      <ConfirmationModal
        visible={showSuccessModal}
        title="Success!"
        message="Your diary entry has been created successfully."
        confirmText="Great!"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  ctaCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    ...typography.h3,
  },
  ctaSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.md,
  },
  emptySub: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  entriesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  entryCard: {
    flexDirection: 'row',
    height: 160,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryCover: {
    width: 140,
    height: '100%',
  },
  entryContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  entryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  entryInfo: {
    flex: 1,
  },
  entryProject: {
    ...typography.h3,
    fontSize: 16,
  },
  entryCharacter: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  entryDate: {
    ...typography.caption,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  notePreview: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  entryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.xs / 2,
  },
  ratingText: {
    ...typography.caption,
    fontWeight: '600',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  photoLabel: {
    ...typography.caption,
    fontSize: 10,
    marginTop: spacing.xs / 2,
  },
  morePhotos: {
    ...typography.h3,
  },
  notesSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginBottom: spacing.md,
  },
  notesLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.body,
    lineHeight: 22,
  },
  entryActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '600',
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  formLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  projectPicker: {
    flexDirection: 'row',
  },
  projectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    marginRight: spacing.sm,
  },
  projectChipSelected: {
    // Dynamic styles applied via getDynamicStyles
  },
  projectChipText: {
    ...typography.body,
    fontWeight: '600',
  },
  projectChipTextSelected: {
    // Dynamic styles applied via getDynamicStyles
  },
  photosList: {
    flexDirection: 'row',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  addPhotoText: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  photoPreview: {
    width: 100,
    height: 100,
    marginRight: spacing.sm,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  ratingPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
});
