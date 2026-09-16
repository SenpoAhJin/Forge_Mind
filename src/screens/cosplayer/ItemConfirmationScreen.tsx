/**
 * ForgeMind - Item Confirmation (FE-5)
 * Editable categorization + extras shown after any entry method.
 * Save persists to the local inventory via OwnedAttireContext (AsyncStorage).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, TextInputField, TextAreaField, ConditionSlider } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
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
  const [acquiredDate, setAcquiredDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [notes, setNotes] = useState('');

  const formatDate = (date: Date) => date.toISOString().slice(0, 10);

  const handleSave = () => {
    const item = addItem({
      entry_method: draft.entry_method,
      entry_language: draft.entry_language,
      original_input_text: draft.original_input_text,
      photo_urls: draft.photo_urls,
      auto_categorized_type: type,
      auto_categorized_color: color.trim() || 'unclear',
      auto_categorized_style: style.trim() || 'unclear',
      flexibility_tag: flexibility,
      condition_rating: conditionRating,
      acquired_date: formatDate(acquiredDate),
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

      <Text style={styles.fieldLabel}>Acquired date</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.dateButtonText}>{formatDate(acquiredDate)}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={acquiredDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(event: any, selectedDate?: Date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setAcquiredDate(selectedDate);
          }}
        />
      )}

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
});