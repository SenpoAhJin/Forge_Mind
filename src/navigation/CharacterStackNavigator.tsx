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
import ProjectPlanningScreen from '../screens/cosplayer/ProjectPlanningScreen'; // 3D view (future)
import ProjectPlanning2DScreen from '../screens/cosplayer/ProjectPlanning2DScreen'; // 2D view (current)
import CreateCharacterScreen from '../screens/cosplayer/CreateCharacterScreen'; // New: Add character
import About3DPreviewScreen from '../screens/cosplayer/About3DPreviewScreen'; // WEAR-2: Explainer
import { useSelection } from '../contexts/SelectionContext';
import { getCharacterById } from '../data';
import { typography } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

export type CharacterStackParamList = {
  BrowseCharacters: undefined;
  CreateCharacter: undefined; // New: Add character form
  VariantList: { characterId: string };
  MatchResults: undefined;
  ProjectPlanning: { characterId?: string }; // Updated: optional character context
  About3DPreview: undefined; // WEAR-2: Explainer
};

const Stack = createNativeStackNavigator<CharacterStackParamList>();

export const CharacterStackNavigator: React.FC = () => {
  const { themeColors } = useTheme();
  const { selectVariant } = useSelection();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.primary },
        headerTintColor: themeColors.background,
        headerTitleStyle: { ...typography.h3, color: themeColors.background },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="BrowseCharacters" options={{ title: 'Characters' }}>
        {({ navigation }) => (
          <CharacterBrowseScreen
            onSelectCharacter={(characterId) =>
              navigation.navigate('ProjectPlanning', { characterId })
            }
            navigation={navigation}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CreateCharacter" options={{ title: 'Add Character' }}>
        {({ navigation }) => (
          <CreateCharacterScreen navigation={navigation} />
        )}
      </Stack.Screen>

      <Stack.Screen name="ProjectPlanning" options={{ title: 'Outfit Planning' }}>
        {({ navigation, route }) => (
          <ProjectPlanningScreen navigation={navigation} route={route} />
        )}
      </Stack.Screen>

      <Stack.Screen name="About3DPreview" options={{ title: 'About the 3D Preview' }}>
        {({ navigation }) => (
          <About3DPreviewScreen navigation={navigation} />
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
          <MatchResultsScreen
            onBackToBrowse={() => navigation.navigate('BrowseCharacters')}
            onStartProject={() => navigation.getParent()?.navigate('Projects')}
          />
        )}
      </Stack.Screen>

      {/* Future: 3D View as separate route or toggle */}
      {/* <Stack.Screen name="ProjectPlanning3D" options={{ title: '3D Preview' }}>
        {({ navigation }) => (
          <ProjectPlanningScreen navigation={navigation} />
        )}
      </Stack.Screen> */}
    </Stack.Navigator>
  );
};