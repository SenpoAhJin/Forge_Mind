/**
 * ForgeMind Navigation - Marketplace Stack
 * Marketplace tab → Registration flow
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  MarketplaceScreen,
  MarketplaceRegistrationScreen,
  CreateListingScreen,
  ListingDetailScreen,
} from '../screens/cosplayer';
import { colors, typography } from '../theme';

export type MarketplaceStackParamList = {
  MarketplaceHome: undefined;
  MarketplaceRegistration: undefined;
  CreateListing: undefined;
  ListingDetail: { listingId: string };
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
      name="MarketplaceHome"
      component={MarketplaceScreen}
      options={{ title: 'Marketplace' }}
    />
    <Stack.Screen
      name="MarketplaceRegistration"
      options={{ title: 'Register for Marketplace' }}
    >
      {({ navigation }) => (
        <MarketplaceRegistrationScreen
          onSuccess={() => navigation.navigate('MarketplaceHome')}
        />
      )}
    </Stack.Screen>
    <Stack.Screen
      name="CreateListing"
      options={{ title: 'Create Listing' }}
    >
      {({ navigation }) => (
        <CreateListingScreen
          onSuccess={() => navigation.navigate('MarketplaceHome')}
        />
      )}
    </Stack.Screen>
    <Stack.Screen
      name="ListingDetail"
      component={ListingDetailScreen}
      options={{ title: 'Listing Details' }}
    />
  </Stack.Navigator>
);
