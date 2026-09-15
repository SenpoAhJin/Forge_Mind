import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CosplayerTabNavigator } from './CosplayerTabNavigator';
import { OrganizerTabNavigator } from './OrganizerTabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { useUser } from '../contexts/UserContext';
import { colors, typography, spacing, borderRadius } from '../theme';

export const RootNavigator: React.FC = () => {
  const { user, isOnboardingComplete } = useUser();
  const [activeRole, setActiveRole] = useState<'cosplayer' | 'organizer'>('cosplayer');

  if (!isOnboardingComplete) {
    return (
      <NavigationContainer>
        <OnboardingNavigator />
      </NavigationContainer>
    );
  }

  const isCosplayer = user!.is_cosplayer;
  const isOrganizer = user!.is_organizer;
  const showRoleSwitcher = isCosplayer && isOrganizer;

  return (
    <NavigationContainer>
      <View style={styles.root}>
        {showRoleSwitcher && (
          <SafeAreaView edges={['top']} style={styles.switcherSafe}>
            <View style={styles.roleSwitcher}>
              <Text style={styles.switcherLabel}>Viewing as:</Text>
              <View style={styles.pillContainer}>
                <TouchableOpacity
                  style={[styles.pill, activeRole === 'cosplayer' && styles.pillActivePrimary]}
                  onPress={() => setActiveRole('cosplayer')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, activeRole === 'cosplayer' && styles.pillTextActive]}>
                    Cosplayer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, activeRole === 'organizer' && styles.pillActiveSecondary]}
                  onPress={() => setActiveRole('organizer')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, activeRole === 'organizer' && styles.pillTextActive]}>
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
  root: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  switcherSafe: {
    backgroundColor: colors.surface,
  },
  roleSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  switcherLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  pillContainer: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  pillActivePrimary: {
    backgroundColor: colors.primary,
  },
  pillActiveSecondary: {
    backgroundColor: colors.secondary,
  },
  pillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.backgroundLight,
  },
  navigator: {
    flex: 1,
  },
});
