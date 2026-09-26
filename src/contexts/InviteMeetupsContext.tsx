/**
 * Invite Meetups Context
 * 
 * SEPARATE from MeetupsContext (event-based meetups with RSVP + project linkage).
 * This is for casual invite-code/QR-based meetups with no event dependency.
 * 
 * Storage: @forgemind:invite_meetups
 * Guards: verified cosplayer only (is_cosplayer check, same pattern as marketplace)
 * No seed data (user-generated only)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InviteMeetupWithParticipants, InviteMeetupParticipant } from '../types/inviteMeetups';

const STORAGE_KEY = '@forgemind:invite_meetups';

interface CreateInviteMeetupInput {
  title: string;
  description: string | null;
  location: string;
  meetup_date: string;
  meetup_time: string;
  created_by_email: string;
  created_by_name: string;
}

interface InviteMeetupsContextType {
  meetups: InviteMeetupWithParticipants[];
  isLoading: boolean;
  
  createMeetup: (input: CreateInviteMeetupInput) => Promise<{ success: boolean; meetupId?: string; error?: string }>;
  getMeetupByCode: (code: string) => InviteMeetupWithParticipants | null;
  joinMeetup: (code: string, participantEmail: string, participantName: string) => Promise<{ success: boolean; error?: string }>;
  getMeetupsForUser: (email: string) => InviteMeetupWithParticipants[];
  leaveMeetup: (meetupId: string, participantEmail: string) => Promise<{ success: boolean; error?: string }>;
}

const InviteMeetupsContext = createContext<InviteMeetupsContextType | undefined>(undefined);

export const useInviteMeetups = () => {
  const context = useContext(InviteMeetupsContext);
  if (!context) {
    throw new Error('useInviteMeetups must be used within InviteMeetupsProvider');
  }
  return context;
};

/**
 * Generate unique 6-8 character uppercase alphanumeric code
 * Collision-checked against existing codes
 */
const generateInviteCode = (existingCodes: string[]): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars (I/1, O/0)
  const length = 6;
  
  let attempts = 0;
  while (attempts < 100) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    if (!existingCodes.includes(code)) {
      return code;
    }
    attempts++;
  }
  
  // Fallback: add timestamp suffix if collision after 100 attempts
  return 'M' + Date.now().toString(36).toUpperCase().slice(-5);
};

export const InviteMeetupsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [meetups, setMeetups] = useState<InviteMeetupWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMeetups();
  }, []);

  const loadMeetups = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      setMeetups(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('[InviteMeetupsContext] Failed to load:', error);
      setMeetups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMeetups = async (updated: InviteMeetupWithParticipants[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setMeetups(updated);
    } catch (error) {
      console.error('[InviteMeetupsContext] Failed to save:', error);
    }
  };

  const createMeetup = async (input: CreateInviteMeetupInput) => {
    // Validation
    const title = input.title.trim();
    if (title.length < 3 || title.length > 100) {
      return { success: false, error: 'Title must be 3-100 characters' };
    }

    const location = input.location.trim();
    if (!location) {
      return { success: false, error: 'Location is required' };
    }

    if (!input.meetup_date || !input.meetup_time) {
      return { success: false, error: 'Date and time are required' };
    }

    // Generate unique invite code
    const existingCodes = meetups.map(m => m.invite_code);
    const invite_code = generateInviteCode(existingCodes);

    const now = new Date().toISOString();
    const meetupId = `invite-meetup-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const meetup: InviteMeetupWithParticipants = {
      id: meetupId,
      title,
      description: input.description?.trim() || null,
      location,
      meetup_date: input.meetup_date,
      meetup_time: input.meetup_time,
      created_by_email: input.created_by_email,
      created_by_name: input.created_by_name,
      invite_code,
      created_at: now,
      // Creator auto-added as first participant
      participants: [
        {
          participant_email: input.created_by_email,
          participant_name: input.created_by_name,
          joined_at: now,
        },
      ],
    };

    await saveMeetups([...meetups, meetup]);
    return { success: true, meetupId };
  };

  const getMeetupByCode = (code: string): InviteMeetupWithParticipants | null => {
    const normalized = code.trim().toUpperCase();
    return meetups.find(m => m.invite_code === normalized) || null;
  };

  const joinMeetup = async (code: string, participantEmail: string, participantName: string) => {
    const meetup = getMeetupByCode(code);
    
    if (!meetup) {
      return { success: false, error: 'Invalid invite code' };
    }

    // Check if already joined
    if (meetup.participants.some(p => p.participant_email === participantEmail)) {
      return { success: false, error: 'You have already joined this meetup' };
    }

    const participant: InviteMeetupParticipant = {
      participant_email: participantEmail,
      participant_name: participantName,
      joined_at: new Date().toISOString(),
    };

    const updated = meetups.map(m =>
      m.id === meetup.id
        ? { ...m, participants: [...m.participants, participant] }
        : m
    );

    await saveMeetups(updated);
    return { success: true };
  };

  const getMeetupsForUser = (email: string): InviteMeetupWithParticipants[] => {
    return meetups
      .filter(m =>
        m.created_by_email === email ||
        m.participants.some(p => p.participant_email === email)
      )
      .sort((a, b) => {
        // Sort by date/time, soonest first
        const aDateTime = `${a.meetup_date}T${a.meetup_time}`;
        const bDateTime = `${b.meetup_date}T${b.meetup_time}`;
        return aDateTime.localeCompare(bDateTime);
      });
  };

  const leaveMeetup = async (meetupId: string, participantEmail: string) => {
    const meetup = meetups.find(m => m.id === meetupId);
    
    if (!meetup) {
      return { success: false, error: 'Meetup not found' };
    }

    // Creator cannot leave their own meetup (would need separate cancel/delete action)
    if (meetup.created_by_email === participantEmail) {
      return { success: false, error: 'Creator cannot leave their own meetup. Delete it instead if needed.' };
    }

    const updated = meetups.map(m =>
      m.id === meetupId
        ? { ...m, participants: m.participants.filter(p => p.participant_email !== participantEmail) }
        : m
    );

    await saveMeetups(updated);
    return { success: true };
  };

  return (
    <InviteMeetupsContext.Provider
      value={{
        meetups,
        isLoading,
        createMeetup,
        getMeetupByCode,
        joinMeetup,
        getMeetupsForUser,
        leaveMeetup,
      }}
    >
      {children}
    </InviteMeetupsContext.Provider>
  );
};
