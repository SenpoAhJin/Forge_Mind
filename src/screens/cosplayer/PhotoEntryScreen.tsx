/**
 * ForgeMind - Photo Entry (FE-5)
 * Camera/gallery access via expo-image-picker. AI categorization (type/color/style)
 * is MOCKED for this phase — real image classification is a backend feature (BE-1).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, ConditionSlider } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { AttireCategory, EntryLanguage } from '../../types/owned-attire';

interface PhotoEntryScreenProps {
  onContinue: (input: {
    entry_method: 'photo';
    entry_language: EntryLanguage;
    original_input_text: string;
    photo_urls: (string | null)[];
    auto_categorized_type: AttireCategory;
    auto_categorized_color: string;
    auto_categorized_style: string;
    condition_rating: number;
  }) => void;
}

const MOCK_TYPES: AttireCategory[] = [
  'wig',
  'clothing',
  'footwear',
  'accessory',
  'armor',
  'weapon',
  'prop',
  'fabric',
  'material',
  'other',
];

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const MOCK_COLORS = ['black', 'white', 'red', 'blue', 'pink', 'brown', 'green', 'purple'];
const MOCK_STYLES = [
  'anime-inspired costume piece',
  'casual everyday wear',
  'formal dress piece',
  'streetwear accessory',
  'handcrafted prop-like item',
];

export const PhotoEntryScreen: React.FC<PhotoEntryScreenProps> = ({ onContinue }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [categorization, setCategorization] = useState<{
    type: AttireCategory;
    color: string;
    style: string;
  } | null>(null);
  const [conditionRating, setConditionRating] = useState(3);

  const requestPermissionAndPick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Media library permission is needed to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handlePhotoUri(result.assets[0].uri);
    }
  };

  const handlePhotoUri = (uri: string | null) => {
    setPhotoUrl(uri);
    if (uri) {
      setAnalyzing(true);
      setCategorization(null);
      setTimeout(() => {
        setCategorization({
          type: pickRandom(MOCK_TYPES),
          color: pickRandom(MOCK_COLORS),
          style: pickRandom(MOCK_STYLES),
        });
        setAnalyzing(false);
      }, 1200);
    }
  };

  const canContinue = photoUrl && categorization && !analyzing;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Photo Entry</Text>
      <Text style={styles.subtitle}>
        Pick a photo of the item. Categorization runs as a mock for now.
      </Text>

      <TouchableOpacity style={styles.photoBox} activeOpacity={0.8} onPress={requestPermissionAndPick}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image-outline" size={40} color={colors.primary} />
            <Text style={styles.photoPlaceholderText}>Tap to pick a photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {photoUrl && (
        <TouchableOpacity style={styles.retake} onPress={requestPermissionAndPick}>
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.retakeText}>Pick a different photo</Text>
        </TouchableOpacity>
      )}

      {analyzing && (
        <View style={styles.analyzingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.analyzingText}>Categorizing photo…</Text>
        </View>
      )}

      {categorization && !analyzing && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Mock categorization result</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Type</Text>
            <Text style={styles.resultValue}>{categorization.type}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Color</Text>
            <Text style={styles.resultValue}>{categorization.color}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Style</Text>
            <Text style={styles.resultValue}>{categorization.style}</Text>
          </View>
          <Text style={styles.resultHint}>
            All fields are editable on the confirmation screen.
          </Text>
        </View>
      )}

      {categorization && !analyzing && (
        <>
          <ConditionSlider value={conditionRating} onValueChange={setConditionRating} label="Condition" />
          <Button
            title="Continue to Confirmation"
            variant="primary"
            fullWidth
            onPress={() =>
              onContinue({
                entry_method: 'photo',
                entry_language: 'english',
                original_input_text: '',
                photo_urls: [photoUrl],
                auto_categorized_type: categorization.type,
                auto_categorized_color: categorization.color,
                auto_categorized_style: categorization.style,
                condition_rating: conditionRating,
              })
            }
          />
        </>
      )}
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
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  photoBox: {
    width: '100%',
    height: 240,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  retake: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  retakeText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  analyzingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  resultTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  resultLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resultValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  resultHint: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.md,
  },
});