/**
 * ForgeMind Navigation - Project Stack (FE-4)
 * Home tab hosts this stack: projects list -> project dashboard -> create project.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProjectsScreen } from '../screens/cosplayer/ProjectsScreen';
import { ProjectDashboardScreen } from '../screens/cosplayer/ProjectDashboardScreen';
import { CreateProjectScreen } from '../screens/cosplayer/CreateProjectScreen';
import { ContestsListScreen } from '../screens/cosplayer/ContestsListScreen';
import { CalendarBrowseScreen } from '../screens/cosplayer/CalendarBrowseScreen';
import { getProjectById } from '../data';
import { colors, typography } from '../theme';

export type ProjectStackParamList = {
  ProjectsList: undefined;
  ProjectDashboard: { projectId: string };
  CreateProject: undefined;
  ContestsList: undefined;
  CalendarBrowse: undefined;
};

const Stack = createNativeStackNavigator<ProjectStackParamList>();

export const ProjectStackNavigator: React.FC = () => {
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
      <Stack.Screen name="ProjectsList" options={{ title: 'Projects' }}>
        {({ navigation }) => (
          <ProjectsScreen
            onStartProject={() => navigation.navigate('CreateProject')}
            onBrowseCharacters={() => navigation.getParent()?.navigate('Characters')}
            onOpenProject={(projectId) => navigation.navigate('ProjectDashboard', { projectId })}
            onOpenContests={() => navigation.navigate('ContestsList')}
            onOpenCalendar={() => navigation.navigate('CalendarBrowse')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ContestsList" options={{ title: 'Contests' }}>
        {() => <ContestsListScreen />}
      </Stack.Screen>

      <Stack.Screen name="CalendarBrowse" options={{ title: 'Community Calendar' }}>
        {() => <CalendarBrowseScreen />}
      </Stack.Screen>

      <Stack.Screen
        name="ProjectDashboard"
        options={({ route }) => ({
          title: getProjectById(route.params.projectId)?.project_name ?? 'Project Dashboard',
        })}
      >
        {({ route }) => <ProjectDashboardScreen projectId={route.params.projectId} />}
      </Stack.Screen>

      <Stack.Screen name="CreateProject" options={{ title: 'New Project' }}>
        {({ navigation }) => (
          <CreateProjectScreen
            onCreated={(projectId) =>
              navigation.replace('ProjectDashboard', { projectId })
            }
            onBrowseCharacters={() => navigation.getParent()?.navigate('Characters')}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};