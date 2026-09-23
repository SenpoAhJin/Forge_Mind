/**
 * Public Event Calendar Context
 * Community-submitted event listings (cosplay.ph-style directory)
 * Staff-submitted (any approved staff OR Head Organizer), visible to all cosplayers
 * 
 * Guards:
 * - Create: approved staff (any department) OR Head Organizer
 * - Edit/Delete: original submitter OR any Head Organizer
 * 
 * No seed data (starts empty, staff-generated content)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarEntry, CalendarEntryStatus } from '../types/calendarEntries';

const STORAGE_KEY = '@forgemind:calendar_entries';

interface CreateEntryInput {
  title: string;
  organizer_name: string;
  venue_name: string;
  city: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  external_link?: string | null;
}

interface UpdateEntryInput {
  title?: string;
  organizer_name?: string;
  venue_name?: string;
  city?: string;
  start_date?: string;
  end_date?: string | null;
  description?: string | null;
  external_link?: string | null;
}

interface CalendarContextType {
  entries: CalendarEntry[];
  isLoading: boolean;
  createEntry: (
    input: CreateEntryInput,
    actorEmail: string,
    actorName: string,
    actorRole: 'head' | 'staff' | null,
    actorStatus: string | null,
    actorDepartment?: string | null
  ) => Promise<{ success: boolean; entryId?: string; error?: string }>;
  updateEntry: (
    entryId: string,
    input: UpdateEntryInput,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ) => Promise<{ success: boolean; error?: string }>;
  deleteEntry: (
    entryId: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ) => Promise<{ success: boolean; error?: string }>;
  approveEntry: (
    entryId: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null,
    actorDepartment?: string | null
  ) => Promise<{ success: boolean; error?: string }>;
  rejectEntry: (
    entryId: string,
    reason: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null,
    actorDepartment?: string | null
  ) => Promise<{ success: boolean; error?: string }>;
  getEntryById: (id: string) => CalendarEntry | null;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const nowIso = () => new Date().toISOString();

// Simple URL pattern check (not exhaustive, just plausibility)
const isPlausibleUrl = (str: string): boolean => {
  return /^https?:\/\/.+\..+/.test(str) || /^www\..+\..+/.test(str);
};

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setEntries(JSON.parse(stored));
        }
        // No seed data - starts empty
      } catch (error) {
        console.error('[CalendarContext] Failed to load entries:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEntries();
  }, []);

  // Persist to storage whenever entries change
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch((error) =>
        console.error('[CalendarContext] Failed to persist entries:', error)
      );
    }
  }, [entries, isLoading]);

  const createEntry = async (
    input: CreateEntryInput,
    actorEmail: string,
    actorName: string,
    actorRole: 'head' | 'staff' | null,
    actorStatus: string | null,
    actorDepartment?: string | null
  ): Promise<{ success: boolean; entryId?: string; error?: string }> => {
    // Guard: must be approved staff OR Head Organizer
    if (actorRole === 'staff' && actorStatus !== 'approved') {
      return { success: false, error: 'Only approved staff can submit listings' };
    }
    if (actorRole !== 'staff' && actorRole !== 'head') {
      return { success: false, error: 'Only staff or Head Organizers can submit listings' };
    }

    // Validate title length
    if (input.title.trim().length < 3 || input.title.trim().length > 100) {
      return { success: false, error: 'Title must be 3-100 characters' };
    }

    // Validate dates
    if (input.end_date && input.end_date < input.start_date) {
      return { success: false, error: 'End date must be on or after start date' };
    }

    // Validate description length
    if (input.description && input.description.length > 500) {
      return { success: false, error: 'Description must be 500 characters or less' };
    }

    // Validate external_link if provided
    if (input.external_link && !isPlausibleUrl(input.external_link)) {
      return { success: false, error: 'External link must be a valid URL' };
    }

    const entry: CalendarEntry = {
      id: `calendar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: input.title.trim(),
      organizer_name: input.organizer_name.trim(),
      venue_name: input.venue_name.trim(),
      city: input.city.trim(),
      start_date: input.start_date,
      end_date: input.end_date || null,
      description: input.description?.trim() || null,
      external_link: input.external_link?.trim() || null,
      submitted_by_email: actorEmail,
      submitted_by_name: actorName,
      submitted_by_department: actorRole === 'staff' ? actorDepartment || null : null,
      status: actorRole === 'head' ? 'approved' : 'pending',  // Head submissions auto-approved, Staff go to pending
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    setEntries((prev) => [entry, ...prev]);
    return { success: true, entryId: entry.id };
  };

  const updateEntry = async (
    entryId: string,
    input: UpdateEntryInput,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ): Promise<{ success: boolean; error?: string }> => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    // Guard: only original submitter OR Head Organizer
    if (actorRole !== 'head' && entry.submitted_by_email !== actorEmail) {
      return { success: false, error: 'You can only edit your own listings' };
    }

    // Validate title if provided
    if (input.title !== undefined) {
      if (input.title.trim().length < 3 || input.title.trim().length > 100) {
        return { success: false, error: 'Title must be 3-100 characters' };
      }
    }

    // Validate dates if provided
    const newStartDate = input.start_date || entry.start_date;
    const newEndDate = input.end_date !== undefined ? input.end_date : entry.end_date;
    if (newEndDate && newEndDate < newStartDate) {
      return { success: false, error: 'End date must be on or after start date' };
    }

    // Validate description if provided
    if (input.description !== undefined && input.description && input.description.length > 500) {
      return { success: false, error: 'Description must be 500 characters or less' };
    }

    // Validate external_link if provided
    if (input.external_link !== undefined && input.external_link && !isPlausibleUrl(input.external_link)) {
      return { success: false, error: 'External link must be a valid URL' };
    }

    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              title: input.title !== undefined ? input.title.trim() : e.title,
              organizer_name: input.organizer_name !== undefined ? input.organizer_name.trim() : e.organizer_name,
              venue_name: input.venue_name !== undefined ? input.venue_name.trim() : e.venue_name,
              city: input.city !== undefined ? input.city.trim() : e.city,
              start_date: input.start_date || e.start_date,
              end_date: input.end_date !== undefined ? input.end_date : e.end_date,
              description: input.description !== undefined ? (input.description?.trim() || null) : e.description,
              external_link: input.external_link !== undefined ? (input.external_link?.trim() || null) : e.external_link,
              updated_at: nowIso(),
            }
          : e
      )
    );

    return { success: true };
  };

  const deleteEntry = async (
    entryId: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ): Promise<{ success: boolean; error?: string }> => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    // Guard: only original submitter OR Head Organizer
    if (actorRole !== 'head' && entry.submitted_by_email !== actorEmail) {
      return { success: false, error: 'You can only delete your own listings' };
    }

    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    return { success: true };
  };

  const getEntryById = (id: string) => entries.find((e) => e.id === id) || null;

  const approveEntry = async (
    entryId: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null,
    actorDepartment?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    // Guard: Head Organizer only
    if (actorRole !== 'head') {
      return { success: false, error: 'Only Head Organizers can approve listings' };
    }

    const entry = entries.find((e) => e.id === entryId);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    // Department scope: Head can only approve submissions from their own department
    if (entry.submitted_by_department && entry.submitted_by_department !== actorDepartment) {
      return { success: false, error: 'You can only approve listings from your own department' };
    }

    if (entry.status !== 'pending') {
      return { success: false, error: 'Entry is not pending approval' };
    }

    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              status: 'approved' as CalendarEntryStatus,
              reviewed_by_email: actorEmail,
              reviewed_at: nowIso(),
              updated_at: nowIso(),
            }
          : e
      )
    );

    return { success: true };
  };

  const rejectEntry = async (
    entryId: string,
    reason: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null,
    actorDepartment?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    // Guard: Head Organizer only
    if (actorRole !== 'head') {
      return { success: false, error: 'Only Head Organizers can reject listings' };
    }

    const entry = entries.find((e) => e.id === entryId);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    // Department scope: Head can only reject submissions from their own department
    if (entry.submitted_by_department && entry.submitted_by_department !== actorDepartment) {
      return { success: false, error: 'You can only reject listings from your own department' };
    }

    if (entry.status !== 'pending') {
      return { success: false, error: 'Entry is not pending approval' };
    }

    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              status: 'rejected' as CalendarEntryStatus,
              reviewed_by_email: actorEmail,
              reviewed_at: nowIso(),
              rejection_reason: reason.trim() || null,
              updated_at: nowIso(),
            }
          : e
      )
    );

    return { success: true };
  };

  return (
    <CalendarContext.Provider
      value={{
        entries,
        isLoading,
        createEntry,
        updateEntry,
        deleteEntry,
        approveEntry,
        rejectEntry,
        getEntryById,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
