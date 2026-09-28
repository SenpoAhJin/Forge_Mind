/**
 * ForgeMind - BodyTypeSelector
 *
 * The ONE place in the app where the 3D preview's body type is chosen.
 *
 * FE-3D Milestone 1c. This is intentionally a rendering/silhouette choice and is
 * never framed as a gender or identity question. There is deliberately no gender
 * field in registration, profile, or onboarding — see
 * `src/constants/bodyType.ts` for the full rationale.
 *
 * The selector lives inside the 3D Preview rather than in settings so that an unset
 * preference is a one-tap fix instead of a hidden assumption: it is visible the
 * moment the user opens a project.
 *
 * Labels are "Male" / "Female" referring to body shape for rendering purposes only.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Button } from './buttons';
import {
  BaseBodySelection,
  BODY_TYPE_OPTIONS,
  BODY_TYPE_SELECTOR_CAPTION,
  DEFAULT_BASE_BODY,
} from '../constants/bodyType';
import { colors, typography, spacing, borderRadius } from '../theme';

interface BodyTypeSelectorProps {
  /** Currently selected body type. `null`/undefined falls back to the technical default. */
  value: BaseBodySelection | null | undefined;
  onChange: (next: BaseBodySelection) => void;
  /** Heading above the toggle. */
  label?: string;
  /** Hide the explanatory caption (for tight layouts). */
  showCaption?: boolean;
  /** Called when the user taps the already-selected option. */
  onCommit?: (next: BaseBodySelection) => void;
}

export const BodyTypeSelector: React.FC<BodyTypeSelectorProps> = ({
  value,
  onChange,
  label = 'Body type',
  showCaption = true,
  onCommit,
}) => {
  const selected = value ?? DEFAULT_BASE_BODY;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.toggleRow}>
        {BODY_TYPE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            title={option.label}
            onPress={() => {
              onChange(option.value);
              // Persist even on a re-tap of the current option, so the selector is
              // also a one-tap "save my choice" for a user who never picked one.
              onCommit?.(option.value);
            }}
            variant={selected === option.value ? 'primary' : 'secondary'}
            style={styles.toggleButton}
          />
        ))}
      </View>

      {showCaption && <Text style={styles.caption}>{BODY_TYPE_SELECTOR_CAPTION}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  toggleButton: {
    flex: 1,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 16,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
});

export default BodyTypeSelector;
