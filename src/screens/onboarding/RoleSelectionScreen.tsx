/**
 * ForgeMind Onboarding - Role Selection Screen
 * FE-5.5: SIMPLIFIED - "I'm a Cosplayer" only
 * Organizer access must be requested separately after registration (no public signup)
 * Maps to User.is_cosplayer (boolean)
 * Transitions to Account Creation
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  // FE-5.5: Every new account starts as cosplayer-only
  // Organizer access requires separate request flow (not part of signup)
  const handleContinue = () => {
    onContinue(true, false); // isCosplayer=true, isOrganizer=false
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>I'm a...</Text>
        <Text style={styles.subtitle}>
          Welcome to ForgeMind! All new accounts start as Cosplayers. You can request Event Organizer access later from your Profile.
        </Text>

        {/* Cosplayer Role - Auto-selected, non-interactive */}
        <View style={[styles.roleCard, styles.roleCardSelected]}>
          <View style={styles.roleHeader}>
            <Text style={[styles.roleTitle, styles.roleTextSelected]}>
              Cosplayer
            </Text>
            <View style={[styles.checkbox, styles.checkboxSelected]}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>
          <Text style={[styles.roleDescription, styles.roleDescriptionSelected]}>
            Build cosplay projects, track items, shop the marketplace, and connect with the
            community
          </Text>
        </View>

        <Text style={styles.note}>
          Want to organize events? You can request Event Organizer access from your Profile after creating your account.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          fullWidth
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
  roleDescriptionSelected: {
    ...typography.body,
    color: colors.primary,
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
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
});
