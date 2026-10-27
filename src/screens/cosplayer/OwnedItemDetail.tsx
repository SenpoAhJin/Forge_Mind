/**
 * ForgeMind - Owned-Attire Detail (FE-5)
 * Full item fields, condition history, edit/delete, and "Commit to Project"
 * (available only when the item is free).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, TextInputField, TextAreaField, ConditionSlider, DropdownField, ConfirmationModal } from '../../components';
import { CrossPlatformImage } from '../../components/CrossPlatformImage';
import { DateInput } from '../../components/inputs/DateInput';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getTodayLocal } from '../../utils/dateHelpers';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import { useProjects } from '../../contexts/ProjectsContext';
import {
  AttireCategory,
  FlexibilityTag,
  OwnedAttire,
} from '../../types/owned-attire';
import { getOwnedItemPhotoUri, hasUsablePhoto } from '../../utils/photoUtils';
import OwnedItemPhotoService from '../../services/OwnedItemPhotoService';

interface OwnedItemDetailProps {
  attireId: string;
  onBack: () => void;
  onEdited: () => void;
}

const TYPES: AttireCategory[] = [
  'wig',
  'top',
  'bottom',
  'footwear',
  'accessory',
  'fabric',
  'material',
  'other',
];

const FLEX_TAGS: FlexibilityTag[] = ['restyle-willing', 'dye-willing', 'as-is-only'];

const formatDisplayDate = (isoDate: string): string => {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const entryLabel: Record<OwnedAttire['entry_method'], string> = {
  photo: 'Photo',
  text: 'Description',
  voice: 'Voice',
};

export const OwnedItemDetail: React.FC<OwnedItemDetailProps> = ({
  attireId,
  onBack,
  onEdited,
}) => {
  const { getItemById, updateItem, deleteItem, setCommitment } = useOwnedAttire();
  const { projects } = useProjects();

  const item = getItemById(attireId);

  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNoProjectsModal, setShowNoProjectsModal] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [type, setType] = useState<AttireCategory>(item?.auto_categorized_type ?? 'other');
  const [color, setColor] = useState(item?.auto_categorized_color ?? '');
  const [style, setStyle] = useState(item?.auto_categorized_style ?? '');
  const [flexibility, setFlexibility] = useState<FlexibilityTag>(item?.flexibility_tag ?? 'as-is-only');
  const [conditionRating, setConditionRating] = useState(item?.condition_rating ?? 3);
  const [acquiredDate, setAcquiredDate] = useState(item?.acquired_date ?? getTodayLocal());
  const [acquisitionCost, setAcquisitionCost] = useState(item?.acquisition_cost ? String(item.acquisition_cost) : '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [commitTarget, setCommitTarget] = useState<string | null>(
    item?.committed_to_project_id ?? null
  );
  const [showCommitPicker, setShowCommitPicker] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>Item not found</Text>
          <Button title="Go Back" variant="primary" onPress={onBack} fullWidth />
        </View>
      </View>
    );
  }

  const committedProject = projects.find((p) => p.project_id === item.committed_to_project_id);

  const handleSaveEdit = () => {
    const parsedCost = acquisitionCost.trim() ? parseFloat(acquisitionCost) : 0;
    updateItem(item.attire_id, {
      auto_categorized_type: type,
      auto_categorized_color: color.trim() || 'unclear',
      auto_categorized_style: style.trim() || 'unclear',
      flexibility_tag: flexibility,
      condition_rating: conditionRating,
      acquired_date: acquiredDate,
      acquisition_cost: parsedCost,
      notes: notes.trim(),
    });
    setEditing(false);
    onEdited();
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteItem(item.attire_id);
    setShowDeleteModal(false);
    onBack();
  };

  const handleCommit = async (projectId: string | null) => {
    setIsCommitting(true);
    try {
      await setCommitment(item.attire_id, projectId);
      setCommitTarget(projectId);
      setShowCommitPicker(false);
    } catch (error: any) {
      Alert.alert(
        'Commitment Failed',
        error.message || 'Unable to change item status',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCommitting(false);
    }
  };

  const handleAddPhoto = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permission to pick a photo.');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingPhoto(true);

    try {
      const uploadResult = await OwnedItemPhotoService.uploadPhoto(
        asset.uri,
        asset.fileName,
        asset.mimeType
      );

      if (!uploadResult.success) {
        Alert.alert('Upload Failed', uploadResult.error || 'Could not upload photo.');
        return;
      }

      // Update item with new photo URL (server path)
      await updateItem(item.attire_id, {
        photo_urls: uploadResult.url ? [uploadResult.url] : [],
      });

      onEdited();
      Alert.alert('Success', 'Photo added successfully!');
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {item.auto_categorized_color} {item.auto_categorized_type}
          </Text>
          <View style={styles.badgesRow}>
            <View style={[styles.statusBadge, { backgroundColor: item.availability_status === 'free' ? colors.success + '1A' : colors.secondary + '1A' }]}>
              <View style={[styles.statusDot, { backgroundColor: item.availability_status === 'free' ? colors.success : colors.secondary }]} />
              <Text style={[styles.statusText, { color: item.availability_status === 'free' ? colors.success : colors.secondary }]}>
                {item.availability_status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.entryText}>
              <Ionicons name={item.entry_method === 'photo' ? 'camera' : item.entry_method === 'text' ? 'create-outline' : 'mic'} size={12} color={colors.textSecondary} />{' '}
              via {entryLabel[item.entry_method]}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setEditing(!editing)}
          activeOpacity={0.7}
        >
          <Ionicons name={editing ? 'close' : 'pencil'} size={18} color={editing ? colors.error : colors.primary} />
          <Text style={[styles.editButtonText, { color: editing ? colors.error : colors.primary }]}>
            {editing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.photosSection}>
        {hasUsablePhoto(item.photo_urls) ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosScroll}
          >
            {item.photo_urls
              ?.map((url, index) => ({ url, index }))
              .filter(({ url }) => getOwnedItemPhotoUri(url) !== null)
              .map(({ url, index }) => {
                const photoUri = getOwnedItemPhotoUri(url);
                if (!photoUri) return null;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setEnlargedPhoto(photoUri)}
                    activeOpacity={0.8}
                  >
                    <CrossPlatformImage
                      uri={photoUri}
                      style={styles.photoItem}
                      resizeMode="cover"
                      fallbackIcon={
                        <View style={[styles.photoItem, styles.photoPlaceholder]}>
                          <Ionicons name="shirt-outline" size={48} color={colors.textDisabled} />
                        </View>
                      }
                    />
                  </TouchableOpacity>
                );
              }).filter(Boolean)}
          </ScrollView>
        ) : (
          <View style={styles.noPhotoBox}>
            <Ionicons name="image-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.noPhotoText}>No photo available</Text>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />
            ) : (
              <TouchableOpacity onPress={handleAddPhoto} style={styles.addPhotoButton}>
                <Ionicons name="camera-outline" size={16} color={colors.primary} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {item.original_input_text ? (
        <View style={styles.sourceCard}>
          <Text style={styles.sourceLabel}>Original input ({item.entry_language})</Text>
          <Text style={styles.sourceText}>“{item.original_input_text}”</Text>
        </View>
      ) : null}

      {editing ? (
        <>
          <Text style={styles.sectionTitle}>Categorization</Text>
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.chipRow}>
            {TYPES.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, type === option && styles.chipActive]}
                onPress={() => setType(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, type === option && styles.chipTextActive]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInputField label="Color" value={color} onChangeText={setColor} />
          <TextInputField label="Style" value={style} onChangeText={setStyle} />
          <Text style={styles.fieldLabel}>Flexibility tag</Text>
          <View style={styles.chipRow}>
            {FLEX_TAGS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, flexibility === option && styles.chipActive]}
                onPress={() => setFlexibility(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, flexibility === option && styles.chipTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ConditionSlider value={conditionRating} onValueChange={setConditionRating} label="Condition" />

          <Text style={styles.sectionTitle}>Acquisition</Text>
          <DateInput
            label="Acquired date"
            value={acquiredDate}
            onChange={setAcquiredDate}
            maxDate={getTodayLocal()}
          />
          <TextInputField
            label="Acquisition cost (₱)"
            value={acquisitionCost}
            onChangeText={setAcquisitionCost}
            keyboardType="numeric"
          />
          <TextAreaField label="Notes" value={notes} onChangeText={setNotes} minRows={3} />

          <View style={styles.spacer} />
          <Button title="Save Changes" variant="primary" fullWidth onPress={handleSaveEdit} />
          <View style={styles.spacerSm} />
          <Button title="Delete Item" variant="destructive" fullWidth onPress={handleDelete} />
        </>
      ) : (
        <>
          <View style={styles.detailCard}>
            <DetailRow label="Type" value={item.auto_categorized_type} />
            <DetailRow label="Color" value={item.auto_categorized_color} />
            <DetailRow label="Style" value={item.auto_categorized_style} />
            <DetailRow label="Flexibility" value={item.flexibility_tag.replace(/-/g, ' ')} />
            <DetailRow label="Condition" value={`${item.condition_rating} / 5`} />
            <DetailRow label="Acquired" value={formatDisplayDate(item.acquired_date)} />
            <DetailRow
              label="Cost"
              value={
                item.acquisition_cost > 0
                  ? `₱${item.acquisition_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'
              }
            />
            <DetailRow label="Committed to" value={committedProject?.project_name ?? '—'} />
          </View>

          {item.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>NOTES</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Condition history</Text>
          {item.condition_photo_history?.length ? (
            item.condition_photo_history
              .slice()
              .reverse()
              .map((entry, index) => (
                <View key={index} style={styles.historyRow}>
                  <View style={styles.historyDot} />
                  <Text style={styles.historyText}>
                    {new Date(entry.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.historyRating}>Rating {entry.condition_rating}/5</Text>
                </View>
              ))
          ) : (
            <Text style={styles.noHistory}>No condition updates yet.</Text>
          )}

          <View style={styles.spacer} />

          {item.availability_status === 'free' ? (
            <>
              <Text style={styles.sectionTitle}>Commit to Project</Text>
              <Text style={styles.commitHint}>
                Committing marks this item as used for a project so matching can reuse it.
              </Text>
              {isCommitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Updating...</Text>
                </View>
              ) : (
                <>
                  <DropdownField
                    label="Project"
                    value={commitTarget ? projects.find((p) => p.project_id === commitTarget)?.project_name ?? '' : ''}
                    placeholder="Select a project"
                    onPress={() => {
                      if (projects.length === 0) {
                        setShowNoProjectsModal(true);
                        return;
                      }
                      setShowCommitPicker(true);
                    }}
                  />
                  {showCommitPicker && (
                    <View style={styles.commitList}>
                      {projects.map((p) => (
                        <TouchableOpacity
                          key={p.project_id}
                          style={[styles.commitOption, commitTarget === p.project_id && styles.commitOptionActive]}
                          onPress={() => handleCommit(p.project_id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[styles.commitOptionText, commitTarget === p.project_id && styles.commitOptionTextActive]}
                            numberOfLines={1}
                          >
                            {p.project_name}
                          </Text>
                          {commitTarget === p.project_id && <Ionicons name="checkmark" size={16} color={colors.backgroundLight} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {commitTarget && (
                    <>
                      <View style={styles.spacerSm} />
                      <Button
                        title="Release from Project (make free)"
                        variant="tertiary"
                        fullWidth
                        onPress={() => handleCommit(null)}
                      />
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <View style={styles.committedBanner}>
              <Ionicons name="link" size={18} color={colors.secondary} />
              <Text style={styles.committedBannerText}>
                Committed to “{committedProject?.project_name ?? 'a project'}”. Release it to make it free again.
              </Text>
            </View>
          )}
        </>
      )}

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete item?"
        message="This removes the attire from your inventory."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
      <ConfirmationModal
        visible={showNoProjectsModal}
        title="No projects yet"
        message="Create a project first before committing this item."
        confirmText="OK"
        onConfirm={() => setShowNoProjectsModal(false)}
        onCancel={() => setShowNoProjectsModal(false)}
      />

      <Modal visible={enlargedPhoto !== null} transparent onRequestClose={() => setEnlargedPhoto(null)}>
        <TouchableOpacity style={styles.photoModal} activeOpacity={1} onPress={() => setEnlargedPhoto(null)}>
          {enlargedPhoto ? <Image source={{ uri: enlargedPhoto }} style={styles.photoModalImage} /> : null}
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setEnlargedPhoto(null)}>
            <Ionicons name="close-circle" size={40} color={colors.backgroundLight} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={2}>
      {value || '—'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  entryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    ...typography.caption,
    fontWeight: '700',
  },
  sourceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  sourceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sourceText: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  detailCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
  notesCard: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  notesLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  notesText: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  historyText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  historyRating: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  noHistory: {
    ...typography.body,
    color: colors.textSecondary,
  },
  fieldLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.backgroundLight,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  spacer: {
    height: spacing.xl,
  },
  spacerSm: {
    height: spacing.sm,
  },
  commitHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  commitList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  commitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  commitOptionActive: {
    backgroundColor: colors.primary,
  },
  commitOptionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  commitOptionTextActive: {
    color: colors.backgroundLight,
  },
  committedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary + '1A',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  committedBannerText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  photosSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  photosScroll: {
    flexGrow: 0,
  },
  photoItem: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoBox: {
    height: 160,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  noPhotoText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addPhotoText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  photoModalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: spacing.sm,
  },
});

