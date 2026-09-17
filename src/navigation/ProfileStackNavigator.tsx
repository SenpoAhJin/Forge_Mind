import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/shared';
import RequestOrganizerAccessScreen from '../screens/organizer/RequestOrganizerAccessScreen';
import HolderReviewQueueScreen from '../screens/holder/HolderReviewQueueScreen';
import { colors, typography } from '../theme';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  RequestOrganizerAccess: undefined;
  HolderReviewQueue: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.backgroundLight,
        headerTitleStyle: { ...typography.h3, color: colors.backgroundLight },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.backgroundLight },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="RequestOrganizerAccess"
        component={RequestOrganizerAccessScreen}
        options={{ title: 'Request Organizer Access' }}
      />
      <Stack.Screen
        name="HolderReviewQueue"
        component={HolderReviewQueueScreen}
        options={{ title: 'Review Queue' }}
      />
    </Stack.Navigator>
  );
};
