/**
 * ForgeMind Mobile App
 * FE-2: Onboarding Screens
 * Phase 0 v0.2.1 Design System + Onboarding Flow
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './src/contexts/UserContext';
import { SelectionProvider } from './src/contexts/SelectionContext';
import { ProjectsProvider } from './src/contexts/ProjectsContext';
import { OwnedAttireProvider } from './src/contexts/OwnedAttireContext';
import { MarketplaceProvider } from './src/contexts/MarketplaceContext';
import { OffersProvider } from './src/contexts/OffersContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { EventsProvider } from './src/contexts/EventsContext';
import { LogisticsProvider } from './src/contexts/LogisticsContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PhoneFrame } from './src/components/testing/PhoneFrame';
import { DebugLogger } from './src/utils/debugLogger';

export default function App() {
  // Expose DebugLogger to browser console for FE-5.5 verification
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).DebugLogger = DebugLogger;
      console.log('═══════════════════════════════════════');
      console.log('DEBUG LOGGER AVAILABLE');
      console.log('═══════════════════════════════════════');
      console.log('Available commands in browser console:');
      console.log('- await DebugLogger.logAllAccounts()');
      console.log('- await DebugLogger.logActiveSession()');
      console.log('- await DebugLogger.logAccountByEmail("email")');
      console.log('- await DebugLogger.logAllAccessRequests()');
      console.log('- await DebugLogger.logAccessRequestByUser("email")');
      console.log('- await DebugLogger.clearAllStorage()');
      console.log('═══════════════════════════════════════');
    }
  }, []);
  const appContent = (
    <SafeAreaProvider>
      <UserProvider>
        <SelectionProvider>
          <ProjectsProvider>
            <OwnedAttireProvider>
              <MarketplaceProvider>
                <OffersProvider>
                  <ChatProvider>
                    <EventsProvider>
                      <LogisticsProvider>
                        <RootNavigator />
                        <StatusBar style="auto" />
                      </LogisticsProvider>
                    </EventsProvider>
                  </ChatProvider>
                </OffersProvider>
              </MarketplaceProvider>
            </OwnedAttireProvider>
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
