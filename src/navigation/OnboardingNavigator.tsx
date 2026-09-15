/**
 * ForgeMind Navigation - Onboarding Flow
 * Handles the four onboarding screens with local/mock state
 * Transitions to appropriate dashboard based on role after completion
 */

import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  WelcomeScreen,
  RoleSelectionScreen,
  AccountCreationScreen,
  BodySliderOnboardingScreen,
} from '../screens/onboarding';
import { useUser } from '../contexts/UserContext';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export const OnboardingNavigator: React.FC = () => {
  const { setUserRoles, setUserAccount, setUserBody } = useUser();

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
              navigation.navigate('BodySliderOnboarding' as never);
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="BodySliderOnboarding">
        {({ navigation }) => (
          <BodySliderOnboardingScreen
            onComplete={(baseBody, bodySize) => {
              setUserBody(baseBody, bodySize);
              // Onboarding complete - RootNavigator will now show main app
              // No explicit navigation needed here
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
