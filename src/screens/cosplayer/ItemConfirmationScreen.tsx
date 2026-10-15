/**
 * ForgeMind - Item Confirmation (FE-5)
 * Editable categorization + extras shown after any entry method.
 * Save persists to the local inventory via OwnedAttireContext (AsyncStorage).
 * D7a: Added photo picker (up to 3 photos, local-only, never sent to Flask/backend).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, TextInputField, TextAreaField, ConditionSlider } from '../../components';
import { DateInput } from '../../components/inputs/DateInput';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getTodayLocal } from '../../utils/dateHelpers';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import {
  AttireCategory,
  EntryLanguage,
  EntryMethod,
  FlexibilityTag,
} from '../../types/owned-attire';

export interface OwnedAttireDraft {
  entry_method: EntryMethod;
  entry_language: EntryLanguage;
  original_input_text: string;
  photo_urls: (string | null)[];
  auto_categorized_type: AttireCategory;
  auto_categorized_color: string;
  auto_categorized_style: string;
  condition_rating: number;
}

interface ItemConfirmationScreenProps {
  draft: OwnedAttireDraft;
  onSaved: (attireId: string) => void;
  onCancel: () => void;
}

const TYPES: AttireCategory[] = [
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

const FLEX_TAGS: FlexibilityTag[] = ['restyle-willing', 'dye-willing', 'as-is-only'];

const entryLabel: Record<EntryMethod, string> = {
  photo: 'Photo',
  text: 'Description',
  voice: 'Voice',
};

export const ItemConfirmationScreen: React.FC<ItemConfirmationScreenProps> = ({
  draft,
  onSaved,
  onCancel,
}) => {
  const { addItem } = useOwnedAttire();

  const [type, setType] = useState<AttireCategory>(draft.auto_categorized_type);
  const [color, setColor] = useState(draft.auto_categorized_color);
  const [style, setStyle] = useState(draft.auto_categorized_style);
  const [flexibility, setFlexibility] = useState<FlexibilityTag>('as-is-only');
  const [conditionRating, setConditionRating] = useState(draft.condition_rating);
  const [acquiredDate, setAcquiredDate] = useState(getTodayLocal());
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>(draft.photo_urls.filter((u): u is string => u !== null));

  const pickPhoto = async (source: 'gallery' | 'camera') => {
    if (photos.length >= 3) return;
    
    const permission = source === 'camera' 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) return;

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled && result.assets[0]) {
      let uri = result.assets[0].uri;
      
      // Web: convert to data URI for persistence (blob: URLs die on reload)
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const sizeMB = blob.size / (1024 * 1024);
          
          if (sizeMB > 0.7) {
            // Too large for local storage
            alert(`Photo is too large (${sizeMB.toFixed(1)} MB). Please choose a smaller image (max 700 KB).`);
            return;
          }
          
          uri = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          alert('Failed to process photo');
          return;
        }
      }
      // Native: expo-file-system would copy to document directory here,
      // but keeping picker URI for now (persistent on device)
      
      setPhotos([...photos, uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Photos are stored locally only, never sent to Flask matcher or backend API
    const item = addItem({
      entry_method: draft.entry_method,
      entry_language: draft.entry_language,
      original_input_text: draft.original_input_text,
      photo_urls: photos,
      auto_categorized_type: type,
      auto_categorized_color: color.trim() || 'unclear',
      auto_categorized_style: style.trim() || 'unclear',
      flexibility_tag: flexibility,
      condition_rating: conditionRating,
      acquired_date: acquiredDate,
      acquisition_cost: acquisitionCost.trim() ? parseFloat(acquisitionCost) : 0,
      notes: notes.trim(),
    });
    onSaved(item.attire_id);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Confirm Item</Text>
          <View style={styles.entryBadge}>
            <Ionicons
              name={draft.entry_method === 'photo' ? 'camera' : draft.entry_method === 'text' ? 'create-outline' : 'mic'}
              size={13}
              color={colors.primary}
            />
            <Text style={styles.entryBadgeText}>Entered via {entryLabel[draft.entry_method]}</Text>
          </View>
        </View>
      </View>

      {draft.original_input_text ? (
        <View style={styles.sourceCard}>
          <Text style={styles.sourceLabel}>Original input</Text>
          <Text style={styles.sourceText}>“{draft.original_input_text}”</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Photos (optional)</Text>
      {photos.length > 0 ? (
        <View style={styles.photoGrid}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri }} style={styles.photoImage} />
              <TouchableOpacity 
                style={styles.photoRemove} 
                onPress={() => removePhoto(i)} 
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      {photos.length < 3 ? (
        <View style={styles.photoActions}>
          <TouchableOpacity 
            style={styles.photoButton} 
            onPress={() => pickPhoto('gallery')} 
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={20} color={colors.primary} />
            <Text style={styles.photoButtonText}>Gallery</Text>
          </TouchableOpacity>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity 
              style={styles.photoButton} 
              onPress={() => pickPhoto('camera')} 
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.photoNotice}>Photos stored locally only. Not sent to matcher.</Text>

      <Text style={styles.sectionTitle}>Auto-categorized (editable)</Text>

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

      <TextInputField label="Color" value={color} onChangeText={setColor} placeholder="e.g. black" />

      <TextInputField
        label="Style"
        value={style}
        onChangeText={setStyle}
        placeholder="e.g. spiky short anime wig"
      />

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

      <Text style={styles.sectionTitle}>Acquisition details</Text>

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
        placeholder="e.g. 850.00"
        keyboardType="numeric"
      />

      <TextAreaField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes, provenance, care instructions…"
        minRows={3}
      />

      <View style={styles.spacer} />
      <Button title="Save to My Inventory" variant="primary" fullWidth onPress={handleSave} />
      <View style={styles.cancelRow}>
        <Button title="Cancel" variant="tertiary" fullWidth onPress={onCancel} />
      </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  entryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  entryBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  sourceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
  cancelRow: {
    marginTop: spacing.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoThumb: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
  },
  photoButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  photoNotice: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
});
