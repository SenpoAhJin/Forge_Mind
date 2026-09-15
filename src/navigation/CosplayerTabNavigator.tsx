import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  ProjectsScreen,
  MarketplaceScreen,
} from '../screens/cosplayer';
import { CharacterStackNavigator } from './CharacterStackNavigator';
import { ProfileScreen } from '../screens/shared';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator();

const ICON_SIZE = 22;

const iconMap: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Projects:       { focused: 'folder',       unfocused: 'folder-outline' },
  CharacterBrowse:{ focused: 'people',       unfocused: 'people-outline' },
  Marketplace:    { focused: 'cart',         unfocused: 'cart-outline' },
  Profile:        { focused: 'person',       unfocused: 'person-outline' },
};

export const CosplayerTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
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
        headerStyle: { backgroundColor: colors.primary },
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
        name="Projects"
        component={ProjectsScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="CharacterBrowse"
        component={CharacterStackNavigator}
        options={{ tabBarLabel: 'Characters', title: 'Characters', headerShown: false }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{ tabBarLabel: 'Marketplace' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
