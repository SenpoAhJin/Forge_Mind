/**
 * ForgeMind Navigation - Cosplayer Tab Stack
 * Bottom tabs: Home (Projects), Character Browse, Marketplace, Profile
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ProjectsScreen,
  CharacterBrowseScreen,
  MarketplaceScreen,
} from '../screens/cosplayer';
import { ProfileScreen } from '../screens/shared';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

export const CosplayerTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundLight,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.backgroundLight,
      }}
    >
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: () => <></>, // Icons will be added in FE-2+
        }}
      />
      <Tab.Screen
        name="CharacterBrowse"
        component={CharacterBrowseScreen}
        options={{
          tabBarLabel: 'Characters',
          title: 'Character Browse',
          tabBarIcon: () => <></>,
        }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: 'Marketplace',
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
