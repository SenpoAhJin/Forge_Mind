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
import { EventMeetupsScreen } from '../screens/cosplayer/EventMeetupsScreen';
import { InviteMeetupsHomeScreen } from '../screens/cosplayer/InviteMeetupsHomeScreen';
import { CreateInviteMeetupScreen } from '../screens/cosplayer/CreateInviteMeetupScreen';
import { InviteMeetupDetailScreen } from '../screens/cosplayer/InviteMeetupDetailScreen';
import { JoinInviteMeetupScreen } from '../screens/cosplayer/JoinInviteMeetupScreen';
import { getProjectById } from '../data';
import { typography } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

export type ProjectStackParamList = {
  ProjectsList: undefined;
  ProjectDashboard: { projectId: string };
  CreateProject: undefined;
  ContestsList: undefined;
  CalendarBrowse: undefined;
  EventMeetups: { eventId: string };
  InviteMeetupsHome: undefined;
  CreateInviteMeetup: undefined;
  InviteMeetupDetail: { meetupId: string };
  JoinInviteMeetup: undefined;
};

const Stack = createNativeStackNavigator<ProjectStackParamList>();

export const ProjectStackNavigator: React.FC = () => {
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
      <Stack.Screen name="ProjectsList" options={{ title: 'Projects' }}>
        {({ navigation }) => (
          <ProjectsScreen
            onStartProject={() => navigation.navigate('CreateProject')}
            onBrowseCharacters={() => navigation.getParent()?.navigate('Characters')}
            onOpenProject={(projectId) => navigation.navigate('ProjectDashboard', { projectId })}
            onOpenMeetups={(eventId) => navigation.navigate('EventMeetups', { eventId })}
            onOpenContests={() => navigation.navigate('ContestsList')}
            onOpenCalendar={() => navigation.navigate('CalendarBrowse')}
            onOpenInviteMeetups={() => navigation.navigate('InviteMeetupsHome')}
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
        {({ route, navigation }) => (
          <ProjectDashboardScreen
            projectId={route.params.projectId}
            onOpenMeetups={(eventId) => navigation.navigate('EventMeetups', { eventId })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EventMeetups" options={{ title: 'Meetups' }}>
        {({ route }) => <EventMeetupsScreen eventId={route.params.eventId} />}
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

      <Stack.Screen name="InviteMeetupsHome" component={InviteMeetupsHomeScreen} options={{ title: 'Invite Meetups' }} />

      <Stack.Screen name="CreateInviteMeetup" component={CreateInviteMeetupScreen} options={{ title: 'Create Meetup' }} />

      <Stack.Screen name="InviteMeetupDetail" component={InviteMeetupDetailScreen} options={{ title: 'Meetup Details' }} />

      <Stack.Screen name="JoinInviteMeetup" component={JoinInviteMeetupScreen} options={{ title: 'Join Meetup' }} />
    </Stack.Navigator>
  );
};