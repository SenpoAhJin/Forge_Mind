import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CosplayerTabNavigator } from './CosplayerTabNavigator';
import { OrganizerTabNavigator } from './OrganizerTabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { AuthNavigator } from './AuthNavigator';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { shouldShowOrganizerTabs } from '../utils/organizerAccess';
import { GlobalNotificationHandler } from '../components';
import { typography, spacing, borderRadius } from '../theme';

export const RootNavigator: React.FC = () => {
  const { user, isOnboardingComplete, isLoading: userIsLoading } = useUser();
  const { themeColors: colors, isLoading: themeIsLoading } = useTheme();
  const [activeRole, setActiveRole] = useState<'cosplayer' | 'organizer'>('cosplayer');

  // Show loading spinner while checking for active session or loading theme
  if (userIsLoading || themeIsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  // No active session - show auth (login/register)
  if (!user) {
    return (
      <NavigationContainer>
        <AuthNavigator onAuthSuccess={() => {}} />
      </NavigationContainer>
    );
  }

  // Active session but onboarding not complete - show onboarding
  if (!isOnboardingComplete) {
    return (
      <NavigationContainer>
        <OnboardingNavigator />
      </NavigationContainer>
    );
  }

  // Logged in and onboarding complete - show main app.
  // These three come from utils/organizerAccess so the tab bar and the Events /
  // Logistics guards read the same fields. They used to diverge: the navigator
  // read is_organizer and the guards read organizer_role, so an account could
  // be given the organizer tabs and then hit the access gate inside them.
  const isCosplayer = user!.is_cosplayer;
  const isOrganizer = shouldShowOrganizerTabs(user);
  const showRoleSwitcher = isCosplayer && isOrganizer;

  return (
    <NavigationContainer>
      <GlobalNotificationHandler />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {showRoleSwitcher && (
          <SafeAreaView edges={['top']} style={[styles.switcherSafe, { backgroundColor: colors.surface }]}>
            <View style={[styles.roleSwitcher, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.switcherLabel, { color: colors.textSecondary }]}>Viewing as:</Text>
              <View style={[styles.pillContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.pill, activeRole === 'cosplayer' && { backgroundColor: colors.primary }]}
                  onPress={() => setActiveRole('cosplayer')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, { color: colors.textSecondary }, activeRole === 'cosplayer' && { color: colors.textOnPrimary }]}>
                    Cosplayer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, activeRole === 'organizer' && { backgroundColor: colors.secondary }]}
                  onPress={() => setActiveRole('organizer')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, { color: colors.textSecondary }, activeRole === 'organizer' && { color: colors.textOnPrimary }]}>
                    Organizer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        )}
        <View style={styles.navigator}>
          {isCosplayer && isOrganizer ? (
            activeRole === 'cosplayer' ? <CosplayerTabNavigator /> : <OrganizerTabNavigator />
          ) : isCosplayer ? (
            <CosplayerTabNavigator />
          ) : (
            <OrganizerTabNavigator />
          )}
        </View>
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  root: {
    flex: 1,
  },
  switcherSafe: {
    // backgroundColor dynamic
  },
  roleSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  switcherLabel: {
    ...typography.caption,
    marginRight: spacing.sm,
  },
  pillContainer: {
    flexDirection: 'row',
    flex: 1,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  pillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  navigator: {
    flex: 1,
  },
});
