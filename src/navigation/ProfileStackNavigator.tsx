import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/shared';
import RequestOrganizerAccessScreen from '../screens/organizer/RequestOrganizerAccessScreen';
import HolderReviewQueueScreen from '../screens/holder/HolderReviewQueueScreen';
import { VerifyCosplayersScreen } from '../screens/organizer';
import { VerifyStaffScreen } from '../screens/organizer';
import { ManageStaffScreen } from '../screens/organizer';
import { CalendarManageScreen } from '../screens/organizer/CalendarManageScreen';
import { CalendarApprovalScreen } from '../screens/organizer/CalendarApprovalScreen';
import { ShareableCardScreen } from '../screens/shared/ShareableCardScreen';
import { colors, typography } from '../theme';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  RequestOrganizerAccess: undefined;
  HolderReviewQueue: undefined;
  VerifyCosplayers: undefined;
  VerifyStaff: undefined;
  ManageStaff: undefined;
  CalendarManage: undefined;
  CalendarApproval: undefined;
  ShareableCard: undefined;
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
      <Stack.Screen
        name="VerifyCosplayers"
        component={VerifyCosplayersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VerifyStaff"
        component={VerifyStaffScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManageStaff"
        component={ManageStaffScreen}
        options={{ title: 'Manage Staff' }}
      />
      <Stack.Screen
        name="CalendarManage"
        component={CalendarManageScreen}
        options={{ title: 'Community Calendar' }}
      />
      <Stack.Screen
        name="CalendarApproval"
        component={CalendarApprovalScreen}
        options={{ title: 'Approve Calendar Listings' }}
      />
      <Stack.Screen
        name="ShareableCard"
        component={ShareableCardScreen}
        options={{ title: 'Shareable Cards' }}
      />
    </Stack.Navigator>
  );
};
