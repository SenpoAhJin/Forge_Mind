/**
 * ForgeMind Auth Navigator
 * FE-4.5: Persisted Register/Login (Mock Auth)
 * 
 * Handles login/register flow before main app
 * Dev-only: Includes hidden Head/Staff registration shortcuts
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { colors } from '../theme';

// DEV-ONLY imports
let HeadOrganizerRegistrationScreen: any = null;
let StaffRegistrationScreen: any = null;

if (__DEV__) {
  HeadOrganizerRegistrationScreen = require('../screens/dev/HeadOrganizerRegistrationScreen').HeadOrganizerRegistrationScreen;
  StaffRegistrationScreen = require('../screens/dev/StaffRegistrationScreen').StaffRegistrationScreen;
}

interface AuthNavigatorProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'head-registration' | 'staff-registration';

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <View style={styles.container}>
      {mode === 'login' && (
        <LoginScreen
          onSuccess={onAuthSuccess}
          onSwitchToRegister={() => setMode('register')}
          onSwitchToHeadRegistration={__DEV__ ? () => setMode('head-registration') : undefined}
          onSwitchToStaffRegistration={__DEV__ ? () => setMode('staff-registration') : undefined}
        />
      )}
      
      {mode === 'register' && (
        <RegisterScreen
          onSuccess={onAuthSuccess}
          onSwitchToLogin={() => setMode('login')}
        />
      )}

      {__DEV__ && mode === 'head-registration' && HeadOrganizerRegistrationScreen && (
        <HeadOrganizerRegistrationScreen
          onSuccess={onAuthSuccess}
          onSwitchToLogin={() => setMode('login')}
          onBack={() => setMode('login')}
        />
      )}

      {__DEV__ && mode === 'staff-registration' && StaffRegistrationScreen && (
        <StaffRegistrationScreen
          onSuccess={onAuthSuccess}
          onSwitchToLogin={() => setMode('login')}
          onBack={() => setMode('login')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
});
