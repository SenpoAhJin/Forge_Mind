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
  CommissionProgressScreen,
} from '../screens/cosplayer';
import { typography } from '../theme';
import { OfferType } from '../types/offers';
import { useTheme } from '../contexts/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export type MarketplaceStackParamList = {
  MarketplaceHome: undefined;
  MarketplaceRegistration: undefined;
  CreateListing: undefined;
  ListingDetail: { listingId: string };
  MakeOffer: { listingId: string; offerType: OfferType };
  OfferLog: { initialTab?: 'sent' | 'received' } | undefined;
  OfferDetail: { offerId: string };
  CommissionProgress: { offerId: string };
  ChatList: undefined;
  ChatThread: { threadId: string };
};

const Stack = createNativeStackNavigator<MarketplaceStackParamList>();

/**
 * Wrap a screen in the error boundary. Built once per screen at module scope:
 * a wrapper created during render would be a new component type every render
 * and the screen would remount (and lose its state) each time.
 */
function withBoundary(Screen: React.ComponentType<any>, label: string): React.ComponentType<any> {
  const Guarded: React.FC<any> = props => (
    <ErrorBoundary label={label}>
      <Screen {...props} />
    </ErrorBoundary>
  );
  Guarded.displayName = `Guarded(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Guarded;
}

const GuardedMarketplaceHome = withBoundary(MarketplaceScreen, 'The Marketplace');
const GuardedListingDetail = withBoundary(ListingDetailScreen, 'This listing');
const GuardedMakeOffer = withBoundary(MakeOfferScreen, 'The offer form');
const GuardedOfferLog = withBoundary(OfferLogScreen, 'Your offers');
const GuardedOfferDetail = withBoundary(OfferDetailScreen, 'This offer');
const GuardedCommissionProgress = withBoundary(CommissionProgressScreen, 'The commission progress');
const GuardedChatList = withBoundary(ChatListScreen, 'Your messages');
const GuardedChatThread = withBoundary(ChatThreadScreen, 'This conversation');

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
        component={GuardedMarketplaceHome}
        options={{ title: 'Marketplace' }}
      />
      <Stack.Screen
        name="MarketplaceRegistration"
        options={{ title: 'Register for Marketplace' }}
      >
        {({ navigation }) => (
          <ErrorBoundary label="The marketplace registration form">
            <MarketplaceRegistrationScreen
              onSuccess={() => navigation.navigate('MarketplaceHome')}
            />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="CreateListing"
        options={{ title: 'Create Listing' }}
      >
        {({ navigation }) => (
          <ErrorBoundary label="The create listing form">
            <CreateListingScreen
              onSuccess={() => navigation.navigate('MarketplaceHome')}
            />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ListingDetail"
        component={GuardedListingDetail}
        options={{ title: 'Listing Details' }}
      />
      <Stack.Screen
        name="MakeOffer"
        component={GuardedMakeOffer}
        options={{ title: 'Make Offer' }}
      />
      <Stack.Screen
        name="OfferLog"
        component={GuardedOfferLog}
        options={{ title: 'Offers' }}
      />
      <Stack.Screen
        name="OfferDetail"
        component={GuardedOfferDetail}
        options={{ title: 'Offer Details' }}
      />
      <Stack.Screen
        name="CommissionProgress"
        component={GuardedCommissionProgress}
        options={{ title: 'Commission Progress' }}
      />
      <Stack.Screen
        name="ChatList"
        component={GuardedChatList}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="ChatThread"
        component={GuardedChatThread}
        options={{ title: 'Chat' }}
      />
    </Stack.Navigator>
  );
};
