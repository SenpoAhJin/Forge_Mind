import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { CharacterStackNavigator } from './CharacterStackNavigator';
import { ProjectStackNavigator } from './ProjectStackNavigator';
import { OwnedItemStackNavigator } from './OwnedItemStackNavigator';
import { MarketplaceStackNavigator } from './MarketplaceStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { typography } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator();

const ICON_SIZE = 22;

const iconMap: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Projects:   { focused: 'folder',       unfocused: 'folder-outline' },
  Characters: { focused: 'people',       unfocused: 'people-outline' },
  OwnedItems: { focused: 'shirt',        unfocused: 'shirt-outline' },
  Marketplace:{ focused: 'cart',         unfocused: 'cart-outline' },
  Profile:    { focused: 'person',       unfocused: 'person-outline' },
};

export const CosplayerTabNavigator: React.FC = () => {
  const { themeColors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: themeColors.primary,
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
        headerStyle: { backgroundColor: themeColors.primary },
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
        name="Projects"
        component={ProjectStackNavigator}
        options={{ tabBarLabel: 'Home', headerShown: false }}
      />
      <Tab.Screen
        name="Characters"
        component={CharacterStackNavigator}
        options={{ tabBarLabel: 'Characters', title: 'Characters', headerShown: false }}
      />
      <Tab.Screen
        name="OwnedItems"
        component={OwnedItemStackNavigator}
        options={{ tabBarLabel: 'My Items', title: 'My Items', headerShown: false }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceStackNavigator}
        options={{ tabBarLabel: 'Marketplace', headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'Profile', headerShown: false }}
      />
    </Tab.Navigator>
  );
};
