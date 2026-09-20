/**
 * FE-7 Step 1: Events Context
 * Manages organizer-confirmed event details with AsyncStorage persistence
 * Guards: Head Organizer-only create/update/confirm/cancel, validated fields, locked confirmed events
 * Mock data - will be replaced with real API in BE-1
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, EventStatus } from '../types/events';
import seedEvents from '../data/events.json';

const STORAGE_KEY = '@forgemind:events';

interface CreateEventInput {
  name: string;
  description?: string | null;
  venue_name: string;
  city?: string | null;
  start_date: string;  // YYYY-MM-DD
  end_date?: string | null;
  has_contest: boolean;
  created_by_email: string;
}

interface UpdateEventInput {
  name?: string;
  description?: string | null;
  venue_name?: string;
  city?: string | null;
  start_date?: string;
  end_date?: string | null;
  has_contest?: boolean;
}

interface EventsContextType {
  events: Event[];
  isLoading: boolean;
  getEvents: () => Event[];
  getEventById: (id: string) => Event | null;
  createEvent: (
    input: CreateEventInput,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ) => Promise<{ success: boolean; eventId?: string; error?: string }>;
  updateEvent: (
    eventId: string,
    input: UpdateEventInput,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ) => Promise<{ success: boolean; error?: string }>;
  confirmEvent: (
    eventId: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ) => Promise<{ success: boolean; error?: string }>;
  cancelEvent: (
    eventId: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ) => Promise<{ success: boolean; error?: string }>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load events from storage on mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setEvents(JSON.parse(stored));
        } else {
          // First load: seed with mock data
          const seededEvents = seedEvents as Event[];
          setEvents(seededEvents);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seededEvents));
        }
      } catch (error) {
        console.error('[EventsContext] Failed to load events:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Persist events to storage whenever they change
  const persistEvents = async (updatedEvents: Event[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
    } catch (error) {
      console.error('[EventsContext] Failed to persist events:', error);
    }
  };

  // Validation helpers
  const validateField = (
    name: string,
    value: any,
    rules: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
    }
  ): string | null => {
    if (rules.required && (value === undefined || value === null || value === '')) {
      return `${name} is required`;
    }
    if (value && typeof value === 'string') {
      const trimmed = value.trim();
      if (rules.required && trimmed === '') {
        return `${name} is required`;
      }
      if (rules.minLength && trimmed.length < rules.minLength) {
        return `${name} must be at least ${rules.minLength} characters`;
      }
      if (rules.maxLength && trimmed.length > rules.maxLength) {
        return `${name} must be at most ${rules.maxLength} characters`;
      }
      if (rules.pattern && !rules.pattern.test(trimmed)) {
        return `${name} has an invalid format`;
      }
    }
    return null;
  };

  const validateEventInput = (
    input: CreateEventInput | UpdateEventInput,
    isCreate: boolean
  ): string | null => {
    // Name validation
    if ('name' in input) {
      const nameError = validateField('Name', input.name, {
        required: isCreate,
        minLength: 3,
        maxLength: 80,
      });
      if (nameError) return nameError;
    }

    // Venue validation
    if ('venue_name' in input) {
      const venueError = validateField('Venue name', input.venue_name, {
        required: isCreate,
        minLength: 2,
        maxLength: 80,
      });
      if (venueError) return venueError;
    }

    // Description validation
    if ('description' in input && input.description) {
      const descError = validateField('Description', input.description, {
        maxLength: 500,
      });
      if (descError) return descError;
    }

    // Start date validation
    if ('start_date' in input) {
      const startError = validateField('Start date', input.start_date, {
        required: isCreate,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
      });
      if (startError) return startError;

      // Check if start_date is in the past (only for NEW events)
      if (isCreate && input.start_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(input.start_date + 'T00:00:00');
        if (startDate < today) {
          return 'Start date cannot be in the past';
        }
      }
    }

    // End date validation
    if ('end_date' in input && input.end_date) {
      const endError = validateField('End date', input.end_date, {
        pattern: /^\d{4}-\d{2}-\d{2}$/,
      });
      if (endError) return endError;

      // End date must be >= start_date
      const startDate = 'start_date' in input ? input.start_date : null;
      if (startDate && input.end_date) {
        if (input.end_date < startDate) {
          return 'End date must be on or after start date';
        }
      }
    }

    return null;
  };

  // Guard: Only Head Organizer can perform these actions
  const requireHeadOrganizer = (actorRole: 'head' | 'staff' | null): string | null => {
    if (actorRole !== 'head') {
      return 'Only Head Organizers can perform this action';
    }
    return null;
  };

  const getEvents = (): Event[] => {
    return events;
  };

  const getEventById = (id: string): Event | null => {
    return events.find(e => e.id === id) || null;
  };

  const createEvent = async (
    input: CreateEventInput,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ): Promise<{ success: boolean; eventId?: string; error?: string }> => {
    // Guard: Head Organizer only
    const roleError = requireHeadOrganizer(actorRole);
    if (roleError) {
      return { success: false, error: roleError };
    }

    // Validate input
    const validationError = validateEventInput(input, true);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Create new event
    const now = new Date().toISOString();
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newEvent: Event = {
      id: eventId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      venue_name: input.venue_name.trim(),
      city: input.city?.trim() || null,
      start_date: input.start_date,
      end_date: input.end_date || null,
      has_contest: input.has_contest,
      status: 'draft',
      created_by_email: actorEmail,
      created_at: now,
      updated_at: now,
      confirmed_at: null,
      confirmed_by_email: null,
      cancelled_at: null,
      cancelled_by_email: null,
    };

    const updated = [...events, newEvent];
    await persistEvents(updated);

    return { success: true, eventId };
  };

  const updateEvent = async (
    eventId: string,
    input: UpdateEventInput,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ): Promise<{ success: boolean; error?: string }> => {
    // Guard: Head Organizer only
    const roleError = requireHeadOrganizer(actorRole);
    if (roleError) {
      return { success: false, error: roleError };
    }

    // Find event
    const event = getEventById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Guard: Can only update draft events
    if (event.status !== 'draft') {
      return { success: false, error: 'Only draft events can be edited' };
    }

    // Validate input (merge with existing for validation)
    const mergedForValidation = {
      name: input.name !== undefined ? input.name : event.name,
      venue_name: input.venue_name !== undefined ? input.venue_name : event.venue_name,
      description: input.description !== undefined ? input.description : event.description,
      start_date: input.start_date !== undefined ? input.start_date : event.start_date,
      end_date: input.end_date !== undefined ? input.end_date : event.end_date,
      has_contest: input.has_contest !== undefined ? input.has_contest : event.has_contest,
    };

    const validationError = validateEventInput(mergedForValidation, false);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Update event
    const updated = events.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.description !== undefined && { description: input.description?.trim() || null }),
          ...(input.venue_name !== undefined && { venue_name: input.venue_name.trim() }),
          ...(input.city !== undefined && { city: input.city?.trim() || null }),
          ...(input.start_date !== undefined && { start_date: input.start_date }),
          ...(input.end_date !== undefined && { end_date: input.end_date || null }),
          ...(input.has_contest !== undefined && { has_contest: input.has_contest }),
          updated_at: new Date().toISOString(),
        };
      }
      return e;
    });

    await persistEvents(updated);
    return { success: true };
  };

  const confirmEvent = async (
    eventId: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ): Promise<{ success: boolean; error?: string }> => {
    // Guard: Head Organizer only
    const roleError = requireHeadOrganizer(actorRole);
    if (roleError) {
      return { success: false, error: roleError };
    }

    // Find event
    const event = getEventById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Guard: Can only confirm draft events
    if (event.status !== 'draft') {
      return { success: false, error: 'Only draft events can be confirmed' };
    }

    // Re-validate all required fields
    const validationError = validateEventInput(
      {
        name: event.name,
        venue_name: event.venue_name,
        description: event.description,
        start_date: event.start_date,
        end_date: event.end_date,
        has_contest: event.has_contest,
      },
      true
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Check if start_date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(event.start_date + 'T00:00:00');
    if (startDate < today) {
      return { success: false, error: 'Cannot confirm event with past start date' };
    }

    // Confirm event
    const now = new Date().toISOString();
    const updated = events.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          status: 'confirmed' as EventStatus,
          confirmed_at: now,
          confirmed_by_email: actorEmail,
          updated_at: now,
        };
      }
      return e;
    });

    await persistEvents(updated);
    return { success: true };
  };

  const cancelEvent = async (
    eventId: string,
    actorEmail: string,
    actorRole: 'head' | 'staff' | null
  ): Promise<{ success: boolean; error?: string }> => {
    // Guard: Head Organizer only
    const roleError = requireHeadOrganizer(actorRole);
    if (roleError) {
      return { success: false, error: roleError };
    }

    // Find event
    const event = getEventById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Guard: Can only cancel draft or confirmed events
    if (event.status === 'cancelled') {
      return { success: false, error: 'Event is already cancelled' };
    }

    // Cancel event
    const now = new Date().toISOString();
    const updated = events.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          status: 'cancelled' as EventStatus,
          cancelled_at: now,
          cancelled_by_email: actorEmail,
          updated_at: now,
        };
      }
      return e;
    });

    await persistEvents(updated);
    return { success: true };
  };

  return (
    <EventsContext.Provider
      value={{
        events,
        isLoading,
        getEvents,
        getEventById,
        createEvent,
        updateEvent,
        confirmEvent,
        cancelEvent,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};
