/**
 * FE-7 Step 1: Events Stack Navigator
 * Events tab → EventsHome (list) → CreateEvent, EventDetail
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventsScreen, CreateEventScreen, EventDetailScreen } from '../screens/organizer';
import { colors, typography } from '../theme';

export type EventsStackParamList = {
  EventsHome: undefined;
  CreateEvent: { eventId?: string } | undefined;
  EventDetail: { eventId: string };
};

const Stack = createNativeStackNavigator<EventsStackParamList>();

export const EventsStackNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.secondary },
      headerTintColor: colors.backgroundLight,
      headerTitleStyle: { ...typography.h3, color: colors.backgroundLight },
      headerBackTitle: 'Back',
      contentStyle: { backgroundColor: colors.surface },
    }}
  >
    <Stack.Screen
      name="EventsHome"
      component={EventsScreen}
      options={{ title: 'Events' }}
    />
    <Stack.Screen
      name="CreateEvent"
      component={CreateEventScreen}
      options={{ title: 'Create Event' }}
    />
    <Stack.Screen
      name="EventDetail"
      component={EventDetailScreen}
      options={{ title: 'Event Details' }}
    />
  </Stack.Navigator>
);
