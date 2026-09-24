/**
 * ForgeMind Navigation - Owned Item Stack (FE-5)
 * Home for the owned-inventory flow: dashboard -> detail, plus the three
 * entry methods converging on the confirmation screen.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  OwnedItemDashboard,
  EntryMethodScreen,
  PhotoEntryScreen,
  TextEntryScreen,
  VoiceEntryScreen,
  ItemConfirmationScreen,
  OwnedItemDetail,
} from '../screens/cosplayer';
import { typography } from '../theme';
import { OwnedAttireDraft } from '../screens/cosplayer/ItemConfirmationScreen';
import { EntryMethod } from '../types/owned-attire';
import { useTheme } from '../contexts/ThemeContext';

export type OwnedItemStackParamList = {
  OwnedList: undefined;
  EntryMethod: undefined;
  PhotoEntry: undefined;
  TextEntry: undefined;
  VoiceEntry: undefined;
  ItemConfirm: { draft: OwnedAttireDraft };
  OwnedDetail: { attireId: string };
};

const Stack = createNativeStackNavigator<OwnedItemStackParamList>();

export const OwnedItemStackNavigator: React.FC = () => {
  const { themeColors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.primary },
        headerTintColor: themeColors.backgroundLight,
        headerTitleStyle: { ...typography.h3, color: themeColors.backgroundLight },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: themeColors.backgroundLight },
      }}
    >
      <Stack.Screen name="OwnedList" options={{ title: 'My Items' }}>
        {({ navigation }) => (
          <OwnedItemDashboard
            onAddItem={() => navigation.navigate('EntryMethod')}
            onOpenItem={(attireId) => navigation.navigate('OwnedDetail', { attireId })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EntryMethod" options={{ title: 'Log an Owned Item' }}>
        {({ navigation }) => (
          <EntryMethodScreen
            onChooseMethod={(method: EntryMethod) => {
              if (method === 'photo') navigation.navigate('PhotoEntry');
              else if (method === 'text') navigation.navigate('TextEntry');
              else navigation.navigate('VoiceEntry');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PhotoEntry" options={{ title: 'Take Photo' }}>
        {({ navigation }) => (
          <PhotoEntryScreen
            onContinue={(input) => {
              navigation.navigate('ItemConfirm', { draft: input });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="TextEntry" options={{ title: 'Type Description' }}>
        {({ navigation }) => (
          <TextEntryScreen
            onContinue={(input) => {
              navigation.navigate('ItemConfirm', { draft: input });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="VoiceEntry" options={{ title: 'Voice Input' }}>
        {({ navigation }) => (
          <VoiceEntryScreen
            onContinue={(input) => {
              navigation.navigate('ItemConfirm', { draft: input });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ItemConfirm" options={{ title: 'Confirm Item' }}>
        {({ navigation, route }) => (
          <ItemConfirmationScreen
            draft={route.params.draft}
            onSaved={(attireId) => {
              navigation.popToTop();
              navigation.navigate('OwnedDetail', { attireId });
            }}
            onCancel={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="OwnedDetail" options={{ title: 'Item Details' }}>
        {({ navigation, route }) => (
          <OwnedItemDetail
            attireId={route.params.attireId}
            onBack={() => navigation.goBack()}
            onEdited={() => {}}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};