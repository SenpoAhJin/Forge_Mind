/**
 * Meetups Tab (organizer shell)
 *
 * FE-7 Step 5: this used to be a dead stub whose own copy read "Group meetup
 * planner and scheduling will be built in FE-7". Rather than build a second
 * parallel meetup screen, it now renders the ONE real meetup screen
 * (EventMeetupsScreen) with no eventId, so it shows the index of confirmed
 * events the signed-in cosplayer has a project linked to.
 *
 * All meetup logic, RSVP state and the linkage guard live in
 * src/contexts/MeetupsContext.tsx. This file intentionally holds no logic of
 * its own.
 *
 * NOTE: screens/organizer/GroupMeetupScreen.tsx is a separate organizer-only
 * schedule-conflict tool on mock data and is left untouched.
 */

import React from 'react';
import { EventMeetupsScreen } from '../cosplayer/EventMeetupsScreen';

export const MeetupsScreen: React.FC = () => <EventMeetupsScreen />;
