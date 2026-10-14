/**
 * ForgeMind Navigation - Onboarding Flow
 * Handles the three onboarding screens with local/mock state
 * Transitions to appropriate dashboard based on role after completion
 * 
 * NOTE: Body slider screen removed (October 14, 2026) - feature cancelled.
 */

import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  WelcomeScreen,
  RoleSelectionScreen,
  AccountCreationScreen,
} from '../screens/onboarding';
import { useUser } from '../contexts/UserContext';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export const OnboardingNavigator: React.FC = () => {
  const { setUserRoles, setUserAccount } = useUser();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundLight },
      }}
    >
      <Stack.Screen name="Welcome">
        {({ navigation }) => (
          <WelcomeScreen
            onGetStarted={() => navigation.navigate('RoleSelection' as never)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="RoleSelection">
        {({ navigation }) => (
          <RoleSelectionScreen
            onContinue={(isCosplayer, isOrganizer) => {
              setUserRoles(isCosplayer, isOrganizer);
              navigation.navigate('AccountCreation' as never);
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="AccountCreation">
        {({ navigation }) => (
          <AccountCreationScreen
            onContinue={(email, password, displayName) => {
              setUserAccount(email, password, displayName);
              // Onboarding complete - body slider screen removed
              // RootNavigator will now show main app based on roles
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
