/**
 * ForgeMind Navigation - Organizer Tab Stack
 * Bottom tabs: Events, Logistics, Meetups, Profile
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  EventsScreen,
  LogisticsScreen,
  MeetupsScreen,
} from '../screens/organizer';
import { ProfileScreen } from '../screens/shared';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

export const OrganizerTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundLight,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.secondary,
        },
        headerTintColor: colors.backgroundLight,
      }}
    >
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: () => <></>,
        }}
      />
      <Tab.Screen
        name="Logistics"
        component={LogisticsScreen}
        options={{
          tabBarLabel: 'Logistics',
          tabBarIcon: () => <></>,
        }}
      />
      <Tab.Screen
        name="Meetups"
        component={MeetupsScreen}
        options={{
          tabBarLabel: 'Meetups',
          tabBarIcon: () => <></>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => <></>,
        }}
      />
    </Tab.Navigator>
  );
};
