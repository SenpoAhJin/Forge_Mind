/**
 * ForgeMind Onboarding - Role Selection Screen
 * "I'm a Cosplayer" / "I'm an Event Organizer" / "Both"
 * Maps to User.is_cosplayer and User.is_organizer (both booleans)
 * Store locally for now; becomes real API call in BE-1
 * Transitions to Account Creation
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface RoleSelectionScreenProps {
  onContinue: (isCosplayer: boolean, isOrganizer: boolean) => void;
  onBack: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  onContinue,
  onBack,
}) => {
  const [isCosplayer, setIsCosplayer] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  const handleContinue = () => {
    // Validation: at least one role must be selected
    if (!isCosplayer && !isOrganizer) {
      return; // Could show error message here
    }
    onContinue(isCosplayer, isOrganizer);
  };

  const isValid = isCosplayer || isOrganizer;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>I'm a...</Text>
        <Text style={styles.subtitle}>
          Select all that apply. You can be both a cosplayer and an event organizer.
        </Text>

        {/* Cosplayer Role */}
        <TouchableOpacity
          style={[styles.roleCard, isCosplayer && styles.roleCardSelected]}
          onPress={() => setIsCosplayer(!isCosplayer)}
          activeOpacity={0.7}
        >
          <View style={styles.roleHeader}>
            <Text style={[styles.roleTitle, isCosplayer && styles.roleTextSelected]}>
              Cosplayer
            </Text>
            <View style={[styles.checkbox, isCosplayer && styles.checkboxSelected]}>
              {isCosplayer && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
          <Text style={[styles.roleDescription, isCosplayer && styles.roleTextSelected]}>
            Build cosplay projects, track items, shop the marketplace, and connect with the
            community
          </Text>
        </TouchableOpacity>

        {/* Organizer Role */}
        <TouchableOpacity
          style={[styles.roleCard, isOrganizer && styles.roleCardSelected]}
          onPress={() => setIsOrganizer(!isOrganizer)}
          activeOpacity={0.7}
        >
          <View style={styles.roleHeader}>
            <Text style={[styles.roleTitle, isOrganizer && styles.roleTextSelected]}>
              Event Organizer
            </Text>
            <View style={[styles.checkbox, isOrganizer && styles.checkboxSelected]}>
              {isOrganizer && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
          <Text style={[styles.roleDescription, isOrganizer && styles.roleTextSelected]}>
            Manage events, coordinate logistics, plan meetups, and view attendee readiness
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        {!isValid && (
          <Text style={styles.errorText}>Please select at least one role</Text>
        )}
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          fullWidth
          disabled={!isValid}
        />
        <Button title="Back" onPress={onBack} variant="tertiary" fullWidth />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  roleCard: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10', // 10% opacity
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roleTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  roleTextSelected: {
    color: colors.primary,
  },
  roleDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.backgroundLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
