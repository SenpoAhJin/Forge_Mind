/**
 * ForgeMind Navigation - Character Browse & Variant Selection Stack (FE-3)
 * Characters tab hosts this stack: browse -> variant list -> match results.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  CharacterBrowseScreen,
  VariantListScreen,
  MatchResultsScreen,
} from '../screens/cosplayer';
import { useSelection } from '../contexts/SelectionContext';
import { getCharacterById } from '../data';
import { colors, typography } from '../theme';

export type CharacterStackParamList = {
  CharacterBrowse: undefined;
  VariantList: { characterId: string };
  MatchResults: undefined;
};

const Stack = createNativeStackNavigator<CharacterStackParamList>();

export const CharacterStackNavigator: React.FC = () => {
  const { selectVariant } = useSelection();

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
      <Stack.Screen name="CharacterBrowse" options={{ title: 'Characters' }}>
        {({ navigation }) => (
          <CharacterBrowseScreen
            onSelectCharacter={(characterId) =>
              navigation.navigate('VariantList', { characterId })
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="VariantList"
        options={({ route }) => ({
          title: getCharacterById(route.params.characterId)?.character_name ?? 'Select Variant',
        })}
      >
        {({ navigation, route }) => (
          <VariantListScreen
            characterId={route.params.characterId}
            onSelectVariant={(character, variant) => {
              selectVariant(character, variant);
              navigation.navigate('MatchResults');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="MatchResults" options={{ title: 'Match Results' }}>
        {({ navigation }) => (
          <MatchResultsScreen onBackToBrowse={() => navigation.navigate('CharacterBrowse')} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};