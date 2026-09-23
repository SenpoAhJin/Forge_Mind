/**
 * FE-7 Step 1: Events Stack Navigator
 * Events tab → EventsHome (list) → CreateEvent, EventDetail
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventsScreen } from '../screens/organizer/EventsScreen';
import { CreateEventScreen } from '../screens/organizer/CreateEventScreen';
import { EventDetailScreen } from '../screens/organizer/EventDetailScreen';
import { ContestManageScreen } from '../screens/organizer/ContestManageScreen';
import { GroupMeetupScreen } from '../screens/organizer/GroupMeetupScreen';
import { colors, typography } from '../theme';

export type EventsStackParamList = {
  EventsHome: undefined;
  CreateEvent: { eventId?: string } | undefined;
  EventDetail: { eventId: string };
  ContestManage: { eventId: string };
  GroupMeetup: { eventId: string };
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
    <Stack.Screen
      name="ContestManage"
      component={ContestManageScreen}
      options={{ title: 'Manage Contest' }}
    />
    <Stack.Screen
      name="GroupMeetup"
      component={GroupMeetupScreen}
      options={{ title: 'Group Meetup' }}
    />
  </Stack.Navigator>
);
