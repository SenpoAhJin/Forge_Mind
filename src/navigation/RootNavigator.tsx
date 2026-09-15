/**
 * ForgeMind Navigation - Root Navigator
 * Handles onboarding vs. main app flow
 * Shows onboarding if user not complete, otherwise shows role-based tabs
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { CosplayerTabNavigator } from './CosplayerTabNavigator';
import { OrganizerTabNavigator } from './OrganizerTabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { useUser } from '../contexts/UserContext';
import { colors, typography, spacing, borderRadius } from '../theme';

export const RootNavigator: React.FC = () => {
  const { user, isOnboardingComplete } = useUser();
  const [activeRole, setActiveRole] = useState<'cosplayer' | 'organizer'>('cosplayer');

  // Show onboarding if user hasn't completed setup
  if (!isOnboardingComplete) {
    return (
      <NavigationContainer>
        <OnboardingNavigator />
      </NavigationContainer>
    );
  }

  // User completed onboarding - show main app
  const isCosplayer = user!.is_cosplayer;
  const isOrganizer = user!.is_organizer;

  // If user has both roles, show role switcher
  const showRoleSwitcher = isCosplayer && isOrganizer;

  return (
    <NavigationContainer>
      {showRoleSwitcher && (
        <View style={styles.roleSwitcher}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              activeRole === 'cosplayer' && styles.roleButtonActive,
            ]}
            onPress={() => setActiveRole('cosplayer')}
          >
            <Text
              style={[
                styles.roleButtonText,
                activeRole === 'cosplayer' && styles.roleButtonTextActive,
              ]}
            >
              Cosplayer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleButton,
              activeRole === 'organizer' && styles.roleButtonActive,
            ]}
            onPress={() => setActiveRole('organizer')}
          >
            <Text
              style={[
                styles.roleButtonText,
                activeRole === 'organizer' && styles.roleButtonTextActive,
              ]}
            >
              Organizer
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Show appropriate navigator based on user's roles and active selection */}
      {isCosplayer && isOrganizer ? (
        activeRole === 'cosplayer' ? <CosplayerTabNavigator /> : <OrganizerTabNavigator />
      ) : isCosplayer ? (
        <CosplayerTabNavigator />
      ) : (
        <OrganizerTabNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  roleSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.xl + 20, // Account for status bar
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
  },
  roleButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: colors.backgroundLight,
  },
});
