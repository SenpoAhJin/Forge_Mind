/**
 * ForgeMind - Create Project Screen (FE-4)
 * Builds a Project from the FE-3-selected character/variant.
 * Mirrors Project schema field names so a real server can take over without renaming.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard, Button, TextInputField, Tag } from '../../components';
import { DateInput } from '../../components/inputs/DateInput';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useSelection } from '../../contexts/SelectionContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { SkillLevel } from '../../types/projects';
import { getTodayLocal } from '../../utils/dateHelpers';

interface CreateProjectScreenProps {
  onCreated: (projectId: string) => void;
  onBrowseCharacters: () => void;
}

const SKILL_OPTIONS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export const CreateProjectScreen: React.FC<CreateProjectScreenProps> = ({ onCreated, onBrowseCharacters }) => {
  const { selection } = useSelection();
  const { addProject } = useProjects();

  const [projectName, setProjectName] = useState(
    selection ? `${selection.character.character_name} — ${selection.variant.variant_name}` : ''
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [statedBudget, setStatedBudget] = useState('');
  const [startDate, setStartDate] = useState(getTodayLocal());
  const [targetDate, setTargetDate] = useState('');
  const [optedIn, setOptedIn] = useState(false);

  if (!selection) {
    return (
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="images-outline" size={48} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>No variant selected</Text>
          <Text style={styles.emptyBody}>
            Select a character and a variant first — that selection becomes your new project.
          </Text>
          <Button title="Browse Characters" onPress={onBrowseCharacters} fullWidth />
        </View>
      </View>
    );
  }

  const handleCreate = () => {
    const name = projectName.trim();
    if (!name) return;
    const project = addProject({
      character_id: selection.character.character_id,
      variant_id: selection.variant.variant_id,
      project_name: name,
      stated_budget: statedBudget.trim() ? parseFloat(statedBudget) : null,
      stated_skill_level: skillLevel,
      start_date: startDate,
      target_completion_date: targetDate || null,
      opted_in_readiness_sharing: optedIn,
    });
    onCreated(project.project_id);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StandardCard style={styles.selectionCard}>
        <Text style={styles.selectionLabel}>FROM YOUR SELECTED VARIANT</Text>
        <Text style={styles.characterName}>{selection.character.character_name}</Text>
        <Text style={styles.variantName}>{selection.variant.variant_name}</Text>
        <View style={styles.tagsRow}>
          <Tag type="category" label={selection.variant.origin_tag} />
          {selection.variant.build_difficulty_rating !== undefined && (
            <Text style={styles.difficulty}>Difficulty {selection.variant.build_difficulty_rating}/5</Text>
          )}
        </View>
        <Button title="Change Variant" variant="tertiary" onPress={onBrowseCharacters} />
      </StandardCard>

      <Text style={styles.sectionTitle}>Project details</Text>

      <TextInputField
        label="Project name"
        value={projectName}
        onChangeText={setProjectName}
        placeholder="e.g. Gojo — Season 2 Uniform"
      />

      <Text style={styles.fieldLabel}>Stated skill level</Text>
      <View style={styles.chipRow}>
        {SKILL_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.chip, skillLevel === option && styles.chipActive]}
            onPress={() => setSkillLevel(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, skillLevel === option && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInputField
        label="Stated budget (₱)"
        value={statedBudget}
        onChangeText={setStatedBudget}
        placeholder="e.g. 3500.00"
        keyboardType="numeric"
      />

      <DateInput
        label="Start date"
        value={startDate}
        onChange={setStartDate}
        minDate={getTodayLocal()}
      />

      <DateInput
        label="Target completion date (optional)"
        value={targetDate}
        onChange={setTargetDate}
        minDate={startDate || getTodayLocal()}
        optional
      />

      <TouchableOpacity style={styles.optInRow} onPress={() => setOptedIn(!optedIn)} activeOpacity={0.7}>
        <Ionicons
          name={optedIn ? 'checkbox' : 'square-outline'}
          size={22}
          color={optedIn ? colors.primary : colors.textSecondary}
        />
        <View style={styles.optInTextWrap}>
          <Text style={styles.optInTitle}>Share readiness with events</Text>
          <Text style={styles.optInSub}>
            Opts into event readiness aggregation (Project.opted_in_readiness_sharing). Requires linking an event later.
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.spacer} />
      <Button title="Create Project" onPress={handleCreate} fullWidth />
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
  selectionCard: {
    marginBottom: spacing.lg,
  },
  selectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  characterName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  variantName: {
    ...typography.bodyLarge,
    color: colors.primary,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  difficulty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
  },
  chipTextActive: {
    color: colors.backgroundLight,
  },
  optInRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  optInTextWrap: {
    flex: 1,
  },
  optInTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  optInSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  spacer: {
    height: spacing.xl,
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
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
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
});