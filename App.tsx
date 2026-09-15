/**
 * ForgeMind Mobile App
 * FE-2: Onboarding Screens
 * Phase 0 v0.2.1 Design System + Onboarding Flow
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './src/contexts/UserContext';
import { SelectionProvider } from './src/contexts/SelectionContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <SelectionProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </SelectionProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
