/**
 * Photo Upload Section Component
 * 
 * Handles photo picking, uploading, and management for marketplace listings.
 * Up to 5 photos, with the first being the cover photo.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import PhotoService from '../services/PhotoService';
import { colors, typography, spacing, borderRadius } from '../theme';

const MAX_PHOTOS = 5;

interface UploadedPhoto {
  photo_id: string;
  url: string;
  localUri?: string;
}

interface PhotoUploadState {
  status: 'idle' | 'uploading' | 'uploaded' | 'failed';
  localUri: string;
  photo_id?: string;
  url?: string;
  error?: string;
}

interface PhotoUploadSectionProps {
  onPhotosChange: (photoIds: string[]) => void;
  disabled?: boolean;
}

export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  onPhotosChange,
  disabled = false,
}) => {
  const [photos, setPhotos] = useState<PhotoUploadState[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Notify parent of photo_ids whenever photos change
  useEffect(() => {
    const uploadedIds = photos
      .filter((p) => p.status === 'uploaded' && p.photo_id)
      .map((p) => p.photo_id!);
    onPhotosChange(uploadedIds);
  }, [photos, onPhotosChange]);

  const hasUploading = photos.some((p) => p.status === 'uploading');
  const hasFailed = photos.some((p) => p.status === 'failed');
  const canAddMore = photos.length < MAX_PHOTOS;

  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPermissionError('Camera roll permission is required to upload photos.');
      return false;
    }
    setPermissionError(null);
    return true;
  };

  const pickImage = async (useCamera: boolean) => {
    if (!canAddMore) return;
    if (!(await requestPermissions())) return;

    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadPhoto(asset.uri, asset.fileName || undefined, asset.mimeType || undefined, asset.fileSize);
      }
    } catch (error) {
      console.error('[PhotoUploadSection] Error picking image:', error);
    }
  };

  const uploadPhoto = async (
    uri: string,
    fileName?: string,
    mimeType?: string,
    fileSize?: number,
  ) => {
    // Client-side validation
    const validationError = PhotoService.validatePhoto(uri, fileSize, mimeType);
    if (validationError) {
      const failedPhoto: PhotoUploadState = {
        status: 'failed',
        localUri: uri,
        error: validationError,
      };
      setPhotos((prev) => [...prev, failedPhoto]);
      return;
    }

    // Add to list as uploading
    const uploadingIndex = photos.length;
    const uploadingPhoto: PhotoUploadState = {
      status: 'uploading',
      localUri: uri,
    };
    setPhotos((prev) => [...prev, uploadingPhoto]);

    // Upload
    const result = await PhotoService.uploadPhoto(uri, fileName, mimeType);

    if (result.success && result.photo_id && result.url) {
      setPhotos((prev) => {
        const updated = [...prev];
        updated[uploadingIndex] = {
          status: 'uploaded',
          localUri: uri,
          photo_id: result.photo_id,
          url: result.url,
        };
        return updated;
      });
    } else {
      setPhotos((prev) => {
        const updated = [...prev];
        updated[uploadingIndex] = {
          status: 'failed',
          localUri: uri,
          error: result.error || 'Upload failed',
        };
        return updated;
      });
    }
  };

  const removePhoto = async (index: number) => {
    const photo = photos[index];

    // If uploaded, try to delete from server
    if (photo.status === 'uploaded' && photo.photo_id) {
      await PhotoService.deletePhoto(photo.photo_id);
    }

    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const retryUpload = async (index: number) => {
    const photo = photos[index];
    if (photo.status !== 'failed') return;

    setPhotos((prev) => {
      const updated = [...prev];
      updated[index] = { ...photo, status: 'uploading', error: undefined };
      return updated;
    });

    const result = await PhotoService.uploadPhoto(photo.localUri);

    if (result.success && result.photo_id && result.url) {
      setPhotos((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...photo,
          status: 'uploaded',
          photo_id: result.photo_id,
          url: result.url,
        };
        return updated;
      });
    } else {
      setPhotos((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...photo,
          status: 'failed',
          error: result.error || 'Upload failed',
        };
        return updated;
      });
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Photos (optional, up to 5)</Text>
      <Text style={styles.helperText}>
        The first photo will be the cover. JPEG, PNG, or WebP, max 5 MB each.
      </Text>

      {/* Permission Error */}
      {permissionError && (
        <View style={styles.permissionError}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.permissionErrorText}>{permissionError}</Text>
          {Platform.OS !== 'web' && (
            <TouchableOpacity 
              onPress={openSettings} 
              style={styles.settingsButton}
              activeOpacity={0.7}
              accessibilityLabel="Open device settings to grant camera roll permission"
              accessibilityRole="button"
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Photos Grid */}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
          {photos.map((photo, index) => (
            <View key={`${photo.localUri}-${index}`} style={styles.photoCard}>
              {/* Cover Badge */}
              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>Cover</Text>
                </View>
              )}

              {/* Photo Preview */}
              <Image
                source={{ uri: photo.localUri }}
                style={styles.photoImage}
                resizeMode="cover"
                accessibilityLabel={index === 0 ? `Cover photo, ${index + 1} of ${photos.length}` : `Photo ${index + 1} of ${photos.length}`}
                accessibilityRole="image"
              />

              {/* Status Overlay */}
              {photo.status === 'uploading' && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="small" color={colors.backgroundLight} />
                  <Text style={styles.overlayText}>Uploading...</Text>
                </View>
              )}

              {photo.status === 'uploaded' && (
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </View>
              )}

              {photo.status === 'failed' && (
                <View style={styles.overlay}>
                  <Ionicons name="alert-circle" size={24} color={colors.error} />
                  <Text style={styles.overlayText}>{photo.error}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => retryUpload(index)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Retry uploading photo ${index + 1}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Remove Button */}
              {photo.status !== 'uploading' && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                  disabled={disabled}
                  activeOpacity={0.7}
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Photo Buttons */}
      {canAddMore && !disabled && (
        <View style={styles.addButtonsContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => pickImage(false)}
            disabled={hasUploading}
            activeOpacity={0.7}
            accessibilityLabel="Add photo from gallery"
            accessibilityRole="button"
            accessibilityState={{ disabled: hasUploading }}
          >
            <Ionicons name="images-outline" size={24} color={colors.tertiary} />
            <Text style={styles.addButtonText}>Gallery</Text>
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => pickImage(true)}
              disabled={hasUploading}
              activeOpacity={0.7}
              accessibilityLabel="Take photo with camera"
              accessibilityRole="button"
              accessibilityState={{ disabled: hasUploading }}
            >
              <Ionicons name="camera-outline" size={24} color={colors.tertiary} />
              <Text style={styles.addButtonText}>Camera</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Status Message */}
      {hasUploading && (
        <Text style={styles.statusText}>Uploading photos...</Text>
      )}
      {hasFailed && !hasUploading && (
        <Text style={styles.errorText}>
          Some photos failed to upload. Please retry or remove them.
        </Text>
      )}
      {photos.length === MAX_PHOTOS && (
        <Text style={styles.statusText}>Maximum {MAX_PHOTOS} photos reached</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  permissionError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  permissionErrorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  settingsButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
  },
  settingsButtonText: {
    ...typography.caption,
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  photosScroll: {
    marginVertical: spacing.sm,
  },
  photoCard: {
    width: 120,
    height: 120,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    zIndex: 2,
  },
  coverBadgeText: {
    ...typography.caption,
    color: colors.backgroundLight,
    fontWeight: '600',
    fontSize: 10,
  },
  uploadedBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    zIndex: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  overlayText: {
    ...typography.caption,
    color: colors.backgroundLight,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.tertiary,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  retryButtonText: {
    ...typography.caption,
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    zIndex: 2,
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  addButtonText: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '600',
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
});
