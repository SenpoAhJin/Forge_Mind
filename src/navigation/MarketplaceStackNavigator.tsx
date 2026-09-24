/**
 * ForgeMind Navigation - Marketplace Stack
 * Marketplace tab → Registration flow + listing/offer flows
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  MarketplaceScreen,
  MarketplaceRegistrationScreen,
  CreateListingScreen,
  ListingDetailScreen,
  MakeOfferScreen,
  OfferLogScreen,
  OfferDetailScreen,
  ChatListScreen,
  ChatThreadScreen,
} from '../screens/cosplayer';
import { typography } from '../theme';
import { OfferType } from '../types/offers';
import { useTheme } from '../contexts/ThemeContext';

export type MarketplaceStackParamList = {
  MarketplaceHome: undefined;
  MarketplaceRegistration: undefined;
  CreateListing: undefined;
  ListingDetail: { listingId: string };
  MakeOffer: { listingId: string; offerType: OfferType };
  OfferLog: { initialTab?: 'sent' | 'received' } | undefined;
  OfferDetail: { offerId: string };
  ChatList: undefined;
  ChatThread: { threadId: string };
};

const Stack = createNativeStackNavigator<MarketplaceStackParamList>();

export const MarketplaceStackNavigator: React.FC = () => {
  const { themeColors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.primary },
        headerTintColor: themeColors.backgroundLight,
        headerTitleStyle: { ...typography.h3, color: themeColors.backgroundLight },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: themeColors.backgroundLight },
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
    <Stack.Screen
      name="MakeOffer"
      component={MakeOfferScreen}
      options={{ title: 'Make Offer' }}
    />
    <Stack.Screen
      name="OfferLog"
      component={OfferLogScreen}
      options={{ title: 'Offers' }}
    />
    <Stack.Screen
      name="OfferDetail"
      component={OfferDetailScreen}
      options={{ title: 'Offer Details' }}
    />
    <Stack.Screen
      name="ChatList"
      component={ChatListScreen}
      options={{ title: 'Messages' }}
    />
    <Stack.Screen
      name="ChatThread"
      component={ChatThreadScreen}
      options={{ title: 'Chat' }}
    />
  </Stack.Navigator>
  );
};
