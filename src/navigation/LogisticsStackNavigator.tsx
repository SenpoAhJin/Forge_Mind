/**
 * FE-7 Step 2: Logistics Stack Navigator
 * Stack for logistics-related screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogisticsHomeScreen, AddLogisticsEntryScreen, LogisticsEntryDetailScreen, EventLogisticsScreen } from '../screens/organizer';
import { useTheme } from '../contexts/ThemeContext';

export type LogisticsStackParamList = {
  LogisticsHome: undefined;
  EventLogistics: { eventId: string };
  AddLogisticsEntry: { eventId?: string };
  LogisticsEntryDetail: { entryId: string };
};

const Stack = createNativeStackNavigator<LogisticsStackParamList>();

export const LogisticsStackNavigator: React.FC = () => {
  const { themeColors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: themeColors.secondary },
        headerTintColor: themeColors.backgroundLight,
        headerTitleStyle: { fontWeight: '600', color: themeColors.backgroundLight },
      }}
    >
      <Stack.Screen
        name="LogisticsHome"
        component={LogisticsHomeScreen}
        options={{ title: 'Logistics' }}
      />
      <Stack.Screen
        name="EventLogistics"
        component={EventLogisticsScreen}
        options={{ title: 'Event Logistics' }}
      />
      <Stack.Screen
        name="AddLogisticsEntry"
        component={AddLogisticsEntryScreen}
        options={{ title: 'Add Logistics Entry' }}
      />
      <Stack.Screen
        name="LogisticsEntryDetail"
        component={LogisticsEntryDetailScreen}
        options={{ title: 'Entry Details' }}
      />
    </Stack.Navigator>
  );
};
