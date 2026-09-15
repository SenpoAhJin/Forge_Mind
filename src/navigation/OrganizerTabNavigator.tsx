import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  EventsScreen,
  LogisticsScreen,
  MeetupsScreen,
} from '../screens/organizer';
import { ProfileScreen } from '../screens/shared';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator();

const ICON_SIZE = 22;

const iconMap: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Events:     { focused: 'calendar',     unfocused: 'calendar-outline' },
  Logistics:  { focused: 'car',          unfocused: 'car-outline' },
  Meetups:    { focused: 'map',          unfocused: 'map-outline' },
  Profile:    { focused: 'person',       unfocused: 'person-outline' },
};

export const OrganizerTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: {
          backgroundColor: colors.backgroundLight,
          borderTopColor: colors.border,
          paddingBottom: 6,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '600',
          fontSize: 11,
        },
        headerStyle: { backgroundColor: colors.secondary },
        headerTintColor: colors.backgroundLight,
        headerTitleStyle: { ...typography.h3, color: colors.backgroundLight },
        tabBarIcon: ({ focused, color }) => {
          const names = iconMap[route.name];
          const iconName = focused ? names.focused : names.unfocused;
          return <Ionicons name={iconName} size={ICON_SIZE} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ tabBarLabel: 'Events' }}
      />
      <Tab.Screen
        name="Logistics"
        component={LogisticsScreen}
        options={{ tabBarLabel: 'Logistics' }}
      />
      <Tab.Screen
        name="Meetups"
        component={MeetupsScreen}
        options={{ tabBarLabel: 'Meetups' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
