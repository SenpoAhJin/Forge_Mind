/**
 * Portfolio Management Screen
 * Allows sellers/crafters to add and remove portfolio photos
 * Accessible from Profile screen (sellers and 'both' marketplace roles only)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Button, ConfirmationModal } from '../../components';
import { typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

// ============================================================================
// TEMP MOCK DATA - DELETE IN CODING PASS
// ============================================================================
const MOCK_PORTFOLIO_PHOTOS = [
  { uri: 'https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=Gojo+Wig', caption: 'Gojo Satoru - white wig styling' },
  { uri: 'https://via.placeholder.com/400x400/EC4899/FFFFFF?text=Miku+Costume', caption: 'Hatsune Miku - full costume' },
  { uri: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=Link+Props', caption: 'Legend of Zelda - prop sword & shield' },
  { uri: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=Armor+Build', caption: 'EVA foam armor build' },
  { uri: 'https://via.placeholder.com/400x400/6366F1/FFFFFF?text=Wig+Commission', caption: 'Custom pink wig commission' },
  { uri: 'https://via.placeholder.com/400x400/EF4444/FFFFFF?text=Photoshoot', caption: 'Convention photoshoot sample' },
];
// ============================================================================

const getDynamicStyles = (themeColors: ThemeColors) => ({
  container: { backgroundColor: themeColors.surface },
  title: { color: themeColors.textPrimary },
  subtitle: { color: themeColors.textSecondary },
  infoCard: { backgroundColor: themeColors.backgroundLight, borderLeftColor: themeColors.info },
  infoText: { color: themeColors.textSecondary },
  emptyTitle: { color: themeColors.textPrimary },
  emptySub: { color: themeColors.textSecondary },
  photoCard: { backgroundColor: themeColors.backgroundLight, borderColor: themeColors.border },
  photoCaption: { color: themeColors.textPrimary },
  editButton: { backgroundColor: themeColors.backgroundLight + 'CC' },
  addButton: { backgroundColor: themeColors.backgroundLight, borderColor: themeColors.border },
  addButtonText: { color: themeColors.primary },
  deleteButton: { backgroundColor: themeColors.backgroundLight },
});

export const PortfolioManagementScreen: React.FC = () => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const navigation = useNavigation<any>();
  const { user, addPortfolioPhoto, removePortfolioPhoto } = useUser();
  
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  // TEMP: Use mock data for visual preview
  const portfolioPhotos = MOCK_PORTFOLIO_PHOTOS;

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setShowPermissionModal(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await addPortfolioPhoto(result.assets[0].uri);
    }
  };

  const handleDeletePress = (photoUri: string) => {
    setPhotoToDelete(photoUri);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (photoToDelete) {
      await removePortfolioPhoto(photoToDelete);
    }
    setPhotoToDelete(null);
    setShowDeleteModal(false);
  };

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.title]}>My Portfolio</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          Showcase your past work to attract commission requests
        </Text>
      </View>

      {/* Info card */}
      <View style={[styles.infoCard, dynamicStyles.infoCard]}>
        <Ionicons name="information-circle-outline" size={16} color={themeColors.info} />
        <Text style={[styles.infoText, dynamicStyles.infoText]}>
          Add photos of your completed cosplay work, props, wigs, or crafts. Buyers will see your portfolio when viewing your service listings.
        </Text>
      </View>

      {/* Portfolio grid */}
      {portfolioPhotos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color={themeColors.textDisabled} />
          <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>No Portfolio Photos Yet</Text>
          <Text style={[styles.emptySub, dynamicStyles.emptySub]}>
            Add photos to showcase your skills and attract buyers
          </Text>
        </View>
      ) : (
        <>
          {/* Add Photo - First Cell */}
          <TouchableOpacity
            style={[styles.addButtonCell, dynamicStyles.addButton]}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={32} color={themeColors.primary} />
            <Text style={[styles.addButtonText, dynamicStyles.addButtonText]}>Add Photo</Text>
          </TouchableOpacity>

          {/* Photo Grid */}
          <View style={styles.photoGrid}>
            {portfolioPhotos.map((photo, index) => (
              <View key={index} style={[styles.photoCard, dynamicStyles.photoCard]}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                
                {/* Caption overlay */}
                {photo.caption ? (
                  <View style={styles.captionOverlay}>
                    <Text style={[styles.photoCaption, dynamicStyles.photoCaption]} numberOfLines={2}>
                      {photo.caption}
                    </Text>
                  </View>
                ) : null}

                {/* Edit button (static, no-op for now) */}
                <TouchableOpacity
                  style={[styles.editButton, dynamicStyles.editButton]}
                  onPress={() => {}}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={16} color={themeColors.textPrimary} />
                </TouchableOpacity>

                {/* Delete button */}
                <TouchableOpacity
                  style={[styles.deleteButton, dynamicStyles.deleteButton]}
                  onPress={() => handleDeletePress(photo.uri)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={24} color={themeColors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Add photo button removed - now first cell in grid */}

      {/* Photo count */}
      <Text style={[styles.subtitle, dynamicStyles.subtitle, { textAlign: 'center', marginTop: spacing.md }]}>
        {portfolioPhotos.length} {portfolioPhotos.length === 1 ? 'photo' : 'photos'} in portfolio
      </Text>

      {/* Confirmation Modals */}
      <ConfirmationModal
        visible={showPermissionModal}
        title="Permission Required"
        message="We need access to your photo library to add portfolio photos."
        confirmText="OK"
        onConfirm={() => setShowPermissionModal(false)}
        onCancel={() => setShowPermissionModal(false)}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Photo?"
        message="Are you sure you want to remove this photo from your portfolio?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setPhotoToDelete(null);
          setShowDeleteModal(false);
        }}
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    marginBottom: spacing.xl,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 18,
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  photoCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.sm,
  },
  photoCaption: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
  },
  editButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 6,
    borderRadius: borderRadius.sm,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
  },
  addButtonCell: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  addButton: {
    width: '100%',
    aspectRatio: 2.5,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  addButtonText: {
    ...typography.body,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
