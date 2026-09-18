/**
 * ForgeMind Navigation - Marketplace Stack
 * Marketplace tab → Registration flow
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  MarketplaceScreen,
  MarketplaceRegistrationScreen,
} from '../screens/cosplayer';
import { colors, typography } from '../theme';

export type MarketplaceStackParamList = {
  Marketplace: undefined;
  MarketplaceRegistration: undefined;
};

const Stack = createNativeStackNavigator<MarketplaceStackParamList>();

export const MarketplaceStackNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.backgroundLight,
      headerTitleStyle: { ...typography.h3, color: colors.backgroundLight },
      headerBackTitle: 'Back',
      contentStyle: { backgroundColor: colors.backgroundLight },
    }}
  >
    <Stack.Screen
      name="Marketplace"
      component={MarketplaceScreen}
      options={{ title: 'Marketplace' }}
    />
    <Stack.Screen
      name="MarketplaceRegistration"
      options={{ title: 'Register for Marketplace' }}
    >
      {({ navigation }) => (
        <MarketplaceRegistrationScreen
          onSuccess={() => navigation.navigate('Marketplace')}
        />
      )}
    </Stack.Screen>
  </Stack.Navigator>
);
