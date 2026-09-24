import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  MeetupsScreen,
} from '../screens/organizer';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { EventsStackNavigator } from './EventsStackNavigator';
import { LogisticsStackNavigator } from './LogisticsStackNavigator';
import { typography } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator();

const ICON_SIZE = 22;

const iconMap: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Events:     { focused: 'calendar',     unfocused: 'calendar-outline' },
  Logistics:  { focused: 'car',          unfocused: 'car-outline' },
  Meetups:    { focused: 'map',          unfocused: 'map-outline' },
  Profile:    { focused: 'person',       unfocused: 'person-outline' },
};

export const OrganizerTabNavigator: React.FC = () => {
  const { themeColors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: themeColors.secondary,
        tabBarInactiveTintColor: themeColors.textDisabled,
        tabBarStyle: {
          backgroundColor: themeColors.backgroundLight,
          borderTopColor: themeColors.border,
          paddingBottom: 6,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '600',
          fontSize: 11,
        },
        headerStyle: { backgroundColor: themeColors.secondary },
        headerTintColor: themeColors.backgroundLight,
        headerTitleStyle: { ...typography.h3, color: themeColors.backgroundLight },
        tabBarIcon: ({ focused, color }) => {
          const names = iconMap[route.name];
          const iconName = focused ? names.focused : names.unfocused;
          return <Ionicons name={iconName} size={ICON_SIZE} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Events"
        component={EventsStackNavigator}
        options={{ tabBarLabel: 'Events', headerShown: false }}
      />
      <Tab.Screen
        name="Logistics"
        component={LogisticsStackNavigator}
        options={{ tabBarLabel: 'Logistics', headerShown: false }}
      />
      <Tab.Screen
        name="Meetups"
        component={MeetupsScreen}
        options={{ tabBarLabel: 'Meetups' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'Profile', headerShown: false }}
      />
    </Tab.Navigator>
  );
};
