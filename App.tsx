/**
 * ForgeMind Mobile App
 * FE-2: Onboarding Screens
 * Phase 0 v0.2.1 Design System + Onboarding Flow
 */

import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './src/contexts/UserContext';
import { SelectionProvider } from './src/contexts/SelectionContext';
import { ProjectsProvider } from './src/contexts/ProjectsContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PhoneFrame } from './src/components/testing/PhoneFrame';

export default function App() {
  const appContent = (
    <SafeAreaProvider>
      <UserProvider>
        <SelectionProvider>
          <ProjectsProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </ProjectsProvider>
        </SelectionProvider>
      </UserProvider>
    </SafeAreaProvider>
  );

  // Wrap in phone frame on web for testing
  if (Platform.OS === 'web') {
    return <PhoneFrame>{appContent}</PhoneFrame>;
  }

  return appContent;
}
