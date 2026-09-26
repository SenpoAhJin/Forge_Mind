/**
 * FE-7 Step 5: Meetups Context
 *
 * THE single source of truth for group meetups. Created fresh in this session
 * after `grep -rn "Meetup" src/` confirmed there was no data model, no RSVP
 * storage and no cosplayer-facing screen anywhere in the repo.
 *
 * Deliberately NOT a second parallel implementation:
 * - screens/organizer/MeetupsScreen.tsx was a dead stub whose own copy said
 *   "Group meetup planner and scheduling will be built in FE-7". It now renders
 *   EventMeetupsScreen instead of duplicating meetup logic.
 * - screens/organizer/GroupMeetupScreen.tsx is a separate organizer-only
 *   schedule-conflict tool built on mock data. Left untouched.
 *
 * AsyncStorage persistence pattern matches CommissionMilestonesContext /
 * OffersContext / MarketplaceContext.
 *
 * GUARD: every mutation requires the acting cosplayer to have a project whose
 * linked_event_id is the target event AND that event must be 'confirmed'.
 * Enforced here rather than only in the UI so no screen can bypass it.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meetup, MeetupRsvp, RsvpStatus } from '../types/meetups';
import { useProjects } from './ProjectsContext';
import { useEvents } from './EventsContext';

const STORAGE_KEY = '@forgemind:event_meetups';

type MeetupResult = { success: boolean; error?: string };

export interface ProposeMeetupInput {
  event_id: string;
  proposed_by_email: string;
  proposed_by_name: string;
  title: string;
  purpose?: string | null;
  proposed_date: string;
  proposed_time: string;
  proposed_location: string;
}

interface MeetupsContextValue {
  meetups: Meetup[];
  isLoading: boolean;

  /** Meetups for one event, soonest first. Empty if the user is not linked. */
  getMeetupsForEvent: (eventId: string) => Meetup[];

  /** True when this cosplayer has a project linked to the given confirmed event. */
  isLinkedToEvent: (eventId: string, email: string) => boolean;

  /** Confirmed events this cosplayer has at least one project linked to. */
  getLinkedConfirmedEvents: (email: string) => { id: string; name: string; start_date: string }[];

  proposeMeetup: (input: ProposeMeetupInput) => Promise<MeetupResult>;
  setRsvp: (meetupId: string, email: string, name: string, status: RsvpStatus) => Promise<MeetupResult>;
  clearRsvp: (meetupId: string, email: string) => Promise<MeetupResult>;
  withdrawMeetup: (meetupId: string, email: string) => Promise<MeetupResult>;
}

const MeetupsContext = createContext<MeetupsContextValue | undefined>(undefined);

export const useMeetups = (): MeetupsContextValue => {
  const context = useContext(MeetupsContext);
  if (!context) {
    throw new Error('useMeetups must be used within a MeetupsProvider');
  }
  return context;
};

export const MeetupsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Must sit inside ProjectsProvider + EventsProvider to enforce the linkage guard.
  const { projects } = useProjects();
  const { events, getEventById } = useEvents();

  useEffect(() => {
    loadMeetups();
  }, []);

  const loadMeetups = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      setMeetups(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('[MeetupsContext] Failed to load meetups:', error);
      setMeetups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMeetups = async (updated: Meetup[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setMeetups(updated);
    } catch (error) {
      console.error('[MeetupsContext] Failed to save meetups:', error);
    }
  };

  /**
   * Core guard: acting cosplayer must have a project linked to a CONFIRMED event.
   * Returns an error string when access is denied, or null when allowed.
   */
  const checkLinkage = (eventId: string, email: string): string | null => {
    if (!email) return 'You must be signed in to coordinate meetups.';

    const event = getEventById(eventId);
    if (!event) return 'Event not found.';
    if (event.status !== 'confirmed') return 'Meetups are only available for confirmed events.';

    const linked = projects.some(
      (project) => project.user_id === email && project.linked_event_id === eventId
    );
    if (!linked) return 'Link one of your projects to this event to join its meetups.';

    return null;
  };

  const isLinkedToEvent = (eventId: string, email: string): boolean =>
    checkLinkage(eventId, email) === null;

  const getLinkedConfirmedEvents = (email: string) =>
    events
      .filter(
        (event) =>
          event.status === 'confirmed' &&
          projects.some((p) => p.user_id === email && p.linked_event_id === event.id)
      )
      .map((event) => ({ id: event.id, name: event.name, start_date: event.start_date }))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const getMeetupsForEvent = (eventId: string): Meetup[] =>
    meetups
      .filter((meetup) => meetup.event_id === eventId)
      .sort((a, b) => {
        const bySlot = `${a.proposed_date}T${a.proposed_time}`.localeCompare(
          `${b.proposed_date}T${b.proposed_time}`
        );
        return bySlot !== 0 ? bySlot : a.created_at.localeCompare(b.created_at);
      });

  const proposeMeetup = async (input: ProposeMeetupInput): Promise<MeetupResult> => {
    const denied = checkLinkage(input.event_id, input.proposed_by_email);
    if (denied) return { success: false, error: denied };

    const title = input.title.trim();
    const location = input.proposed_location.trim();

    if (title.length < 3) return { success: false, error: 'Give the meetup a title (3+ characters).' };
    if (!input.proposed_date) return { success: false, error: 'Pick a date for the meetup.' };
    if (!input.proposed_time) return { success: false, error: 'Pick a time for the meetup.' };
    if (location.length < 2) return { success: false, error: 'Add a meeting point.' };

    const event = getEventById(input.event_id);
    if (event) {
      const eventEnd = event.end_date ?? event.start_date;
      if (input.proposed_date > eventEnd) {
        return { success: false, error: `Meetup must be on or before the event ends (${eventEnd}).` };
      }
    }

    const now = new Date().toISOString();
    const meetup: Meetup = {
      meetup_id: `meetup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_id: input.event_id,
      proposed_by_email: input.proposed_by_email,
      proposed_by_name: input.proposed_by_name,
      title,
      purpose: input.purpose?.trim() ? input.purpose.trim() : null,
      proposed_date: input.proposed_date,
      proposed_time: input.proposed_time,
      proposed_location: location,
      // Proposer is automatically Going so their own headcount is never ambiguous.
      rsvps: [
        {
          cosplayer_email: input.proposed_by_email,
          cosplayer_name: input.proposed_by_name,
          status: 'going',
          responded_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    await saveMeetups([...meetups, meetup]);
    return { success: true };
  };

  const setRsvp = async (
    meetupId: string,
    email: string,
    name: string,
    status: RsvpStatus
  ): Promise<MeetupResult> => {
    const meetup = meetups.find((m) => m.meetup_id === meetupId);
    if (!meetup) return { success: false, error: 'Meetup not found.' };

    const denied = checkLinkage(meetup.event_id, email);
    if (denied) return { success: false, error: denied };

    const rsvp: MeetupRsvp = {
      cosplayer_email: email,
      cosplayer_name: name,
      status,
      responded_at: new Date().toISOString(),
    };

    // Re-RSVP replaces any prior answer instead of stacking duplicates.
    const updated: Meetup = {
      ...meetup,
      rsvps: [...meetup.rsvps.filter((r) => r.cosplayer_email !== email), rsvp],
      updated_at: new Date().toISOString(),
    };

    await saveMeetups(meetups.map((m) => (m.meetup_id === meetupId ? updated : m)));
    return { success: true };
  };

  const clearRsvp = async (meetupId: string, email: string): Promise<MeetupResult> => {
    const meetup = meetups.find((m) => m.meetup_id === meetupId);
    if (!meetup) return { success: false, error: 'Meetup not found.' };

    const denied = checkLinkage(meetup.event_id, email);
    if (denied) return { success: false, error: denied };

    const updated: Meetup = {
      ...meetup,
      rsvps: meetup.rsvps.filter((r) => r.cosplayer_email !== email),
      updated_at: new Date().toISOString(),
    };

    await saveMeetups(meetups.map((m) => (m.meetup_id === meetupId ? updated : m)));
    return { success: true };
  };

  const withdrawMeetup = async (meetupId: string, email: string): Promise<MeetupResult> => {
    const meetup = meetups.find((m) => m.meetup_id === meetupId);
    if (!meetup) return { success: false, error: 'Meetup not found.' };
    if (meetup.proposed_by_email !== email) {
      return { success: false, error: 'Only the proposer can withdraw this meetup.' };
    }

    await saveMeetups(meetups.filter((m) => m.meetup_id !== meetupId));
    return { success: true };
  };

  return (
    <MeetupsContext.Provider
      value={{
        meetups,
        isLoading,
        getMeetupsForEvent,
        isLinkedToEvent,
        getLinkedConfirmedEvents,
        proposeMeetup,
        setRsvp,
        clearRsvp,
        withdrawMeetup,
      }}
    >
      {children}
    </MeetupsContext.Provider>
  );
};
