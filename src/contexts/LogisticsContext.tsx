/**
 * FE-7 Step 2 Correction Pass C1-C2: Logistics Context
 * State management for participant logistics entries
 * 
 * Guards:
 * - All mutations require organizer_role === 'head'
 * - createEntry only for CONFIRMED events
 * - submission_deadline: >= today, <= event start_date
 * - Cancelled event entries are read-only
 * - Staff can only read
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogisticsEntry, ParticipantKind, ParkingNeeds, LogisticsStatus } from '../types/logistics';
import { useUser } from './UserContext';
import { useEvents } from './EventsContext';
import { getNowISO, getTodayLocal, compareDateStrings } from '../utils/dateHelpers';

const STORAGE_KEY = '@forgemind:logistics_entries';

interface LogisticsContextValue {
  entries: LogisticsEntry[];
  loading: boolean;
  createEntry: (data: CreateEntryData) => Promise<{ success: boolean; error?: string; entry?: LogisticsEntry }>;
  updateLogisticsFields: (id: string, data: UpdateLogisticsFieldsData) => Promise<{ success: boolean; error?: string }>;
  withdrawEntry: (id: string) => Promise<{ success: boolean; error?: string }>;
  getEntriesByEvent: (eventId: string) => LogisticsEntry[];
  reseedData: () => Promise<void>; // Dev-only
}

interface CreateEntryData {
  event_id: string;
  participant_email?: string | null;
  participant_name: string;
  participant_kind: ParticipantKind;
  submission_deadline: string; // YYYY-MM-DD, >= today, <= event start_date
  arrival_date?: string | null;
  arrival_time?: string | null;
  parking_needs?: ParkingNeeds;
  plate_number?: string | null;
  entourage_size?: number | null;
  stage_time_preference?: string | null;
}

interface UpdateLogisticsFieldsData {
  arrival_date?: string | null;
  arrival_time?: string | null;
  parking_needs?: ParkingNeeds;
  plate_number?: string | null;
  entourage_size?: number | null;
  stage_time_preference?: string | null;
}

const LogisticsContext = createContext<LogisticsContextValue | undefined>(undefined);

export const useLogistics = (): LogisticsContextValue => {
  const context = useContext(LogisticsContext);
  if (!context) {
    throw new Error('useLogistics must be used within LogisticsProvider');
  }
  return context;
};

// Generate seed data relative to today
const generateSeedData = (): LogisticsEntry[] => {
  const today = getTodayLocal();
  const now = getNowISO();
  
  // Calculate relative dates
  const getRelativeDate = (daysOffset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Event is Manila CosCon (24 days from today)
  const eventDate = getRelativeDate(24);

  return [
    // Entry 1: COMPLETE (deadline in 17 days)
    {
      id: 'log-001',
      event_id: 'evt-manila-coscon',
      participant_kind: 'sponsor' as ParticipantKind,
      participant_name: 'TechCorp Inc.',
      submission_deadline: getRelativeDate(17),
      participant_email: 'sponsor@techcorp.com',
      arrival_date: eventDate,
      arrival_time: '09:00',
      parking_needs: 'accessible' as ParkingNeeds,
      plate_number: 'ABC123',
      entourage_size: 2,
      stage_time_preference: null,
      status: 'active' as LogisticsStatus,
      withdrawn_at: null,
      withdrawn_by_email: null,
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
    // Entry 2: ON_TRACK (deadline in 20 days, missing arrival_time)
    {
      id: 'log-002',
      event_id: 'evt-manila-coscon',
      participant_kind: 'confirmed_guest' as ParticipantKind,
      participant_name: 'Maria Santos',
      submission_deadline: getRelativeDate(20),
      participant_email: 'guest@example.com',
      arrival_date: eventDate,
      arrival_time: null, // MISSING
      parking_needs: 'standard' as ParkingNeeds,
      plate_number: 'XYZ789',
      entourage_size: 1,
      stage_time_preference: null,
      status: 'active' as LogisticsStatus,
      withdrawn_at: null,
      withdrawn_by_email: null,
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
    // Entry 3: REMINDER (deadline in 6 days, missing plate_number)
    {
      id: 'log-003',
      event_id: 'evt-manila-coscon',
      participant_kind: 'confirmed_guest' as ParticipantKind,
      participant_name: 'John Reyes',
      submission_deadline: getRelativeDate(6),
      participant_email: null, // Optional field
      arrival_date: eventDate,
      arrival_time: '10:30',
      parking_needs: 'standard' as ParkingNeeds,
      plate_number: null, // MISSING
      entourage_size: 0,
      stage_time_preference: null,
      status: 'active' as LogisticsStatus,
      withdrawn_at: null,
      withdrawn_by_email: null,
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
    // Entry 4: URGENT (deadline in 2 days, missing entourage_size)
    {
      id: 'log-004',
      event_id: 'evt-manila-coscon',
      participant_kind: 'performer' as ParticipantKind,
      participant_name: 'Cosplay Band',
      submission_deadline: getRelativeDate(2),
      participant_email: 'performer@band.com',
      arrival_date: eventDate,
      arrival_time: '12:00',
      parking_needs: 'none' as ParkingNeeds,
      plate_number: null,
      entourage_size: null, // MISSING
      stage_time_preference: 'Afternoon preferred',
      status: 'active' as LogisticsStatus,
      withdrawn_at: null,
      withdrawn_by_email: null,
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
    // Entry 5: CRITICAL (deadline YESTERDAY = past deadline, missing arrival_date and arrival_time)
    {
      id: 'log-005',
      event_id: 'evt-manila-coscon',
      participant_kind: 'sponsor' as ParticipantKind,
      participant_name: 'Local Store',
      submission_deadline: getRelativeDate(-1), // YESTERDAY
      participant_email: 'sponsor@localstore.ph',
      arrival_date: null, // MISSING
      arrival_time: null, // MISSING
      parking_needs: 'standard' as ParkingNeeds,
      plate_number: 'DEF456',
      entourage_size: 1,
      stage_time_preference: null,
      status: 'active' as LogisticsStatus,
      withdrawn_at: null,
      withdrawn_by_email: null,
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
  ];
};

export const LogisticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<LogisticsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { events } = useEvents();

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      } else {
        // First-time seed
        const seed = generateSeedData();
        setEntries(seed);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      }
    } catch (error) {
      console.error('[LogisticsContext] Load error:', error);
      // Fallback to seed data
      const seed = generateSeedData();
      setEntries(seed);
    } finally {
      setLoading(false);
    }
  };

  const persist = async (data: LogisticsEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[LogisticsContext] Persist error:', error);
    }
  };

  // Guard: Head Organizer only
  const requireHeadOrganizer = (): { success: boolean; error?: string } => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    if (user.organizer_role !== 'head') {
      return { success: false, error: 'Head Organizer access required' };
    }
    return { success: true };
  };

  // Validation: Email format (optional field)
  const validateEmail = (email: string | null | undefined): boolean => {
    if (!email) return true; // Optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const createEntry = async (data: CreateEntryData): Promise<{ success: boolean; error?: string; entry?: LogisticsEntry }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    // Find event
    const event = events.find(e => e.id === data.event_id);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Guard: only CONFIRMED events
    if (event.status !== 'confirmed') {
      return { success: false, error: 'Can only create entries for confirmed events' };
    }

    // Validate participant email (optional)
    if (!validateEmail(data.participant_email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate participant name (2-80 chars, CORE field)
    const trimmedName = data.participant_name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return { success: false, error: 'Participant name must be 2-80 characters' };
    }

    // Validate submission_deadline
    const today = getTodayLocal();
    if (compareDateStrings(data.submission_deadline, today) < 0) {
      return { success: false, error: 'Submission deadline cannot be in the past' };
    }
    if (compareDateStrings(data.submission_deadline, event.start_date) > 0) {
      return { success: false, error: 'Submission deadline cannot be after event start date' };
    }

    const now = getNowISO();
    const entry: LogisticsEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // CORE fields (lock after creation)
      event_id: data.event_id,
      participant_kind: data.participant_kind,
      participant_name: trimmedName,
      submission_deadline: data.submission_deadline,
      // Optional email
      participant_email: data.participant_email ? data.participant_email.trim().toLowerCase() : null,
      // Tracked fields
      arrival_date: data.arrival_date || null,
      arrival_time: data.arrival_time || null,
      parking_needs: data.parking_needs || 'none',
      plate_number: data.plate_number || null,
      entourage_size: data.entourage_size !== undefined ? data.entourage_size : null,
      stage_time_preference: data.stage_time_preference || null,
      // Status
      status: 'active',
      withdrawn_at: null,
      withdrawn_by_email: null,
      // Metadata
      created_at: now,
      updated_at: now,
      created_by_email: user!.email,
      updated_by_email: user!.email,
    };

    const updated = [...entries, entry];
    setEntries(updated);
    await persist(updated);

    return { success: true, entry };
  };

  const updateLogisticsFields = async (id: string, data: UpdateLogisticsFieldsData): Promise<{ success: boolean; error?: string }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    const entry = entries.find(e => e.id === id);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    // Guard: cannot update withdrawn entries
    if (entry.status === 'withdrawn') {
      return { success: false, error: 'Cannot update withdrawn entries' };
    }

    // Guard: cannot update entries of cancelled events
    const event = events.find(e => e.id === entry.event_id);
    if (event && event.status === 'cancelled') {
      return { success: false, error: 'Cannot update entries of cancelled events' };
    }

    // Validate arrival_date if provided
    if (data.arrival_date !== undefined && data.arrival_date) {
      if (event && compareDateStrings(data.arrival_date, event.start_date) > 0) {
        return { success: false, error: 'Arrival date cannot be after event start' };
      }
    }

    // Validate plate_number if provided (3-10 chars, A-Z 0-9 space hyphen)
    if (data.plate_number !== undefined && data.plate_number) {
      const trimmed = data.plate_number.trim().toUpperCase();
      if (trimmed.length < 3 || trimmed.length > 10) {
        return { success: false, error: 'Plate number must be 3-10 characters' };
      }
      if (!/^[A-Z0-9 -]+$/.test(trimmed)) {
        return { success: false, error: 'Plate number can only contain A-Z, 0-9, space, and hyphen' };
      }
    }

    // Validate entourage_size if provided (0-50)
    if (data.entourage_size !== undefined && data.entourage_size !== null) {
      if (data.entourage_size < 0 || data.entourage_size > 50) {
        return { success: false, error: 'Entourage size must be between 0 and 50' };
      }
    }

    const now = getNowISO();
    const updated = entries.map(e =>
      e.id === id
        ? {
            ...e,
            ...data,
            plate_number: data.plate_number ? data.plate_number.trim().toUpperCase() : e.plate_number,
            updated_at: now,
            updated_by_email: user!.email,
          }
        : e
    );

    setEntries(updated);
    await persist(updated);

    return { success: true };
  };

  const withdrawEntry = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    const entry = entries.find(e => e.id === id);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    if (entry.status === 'withdrawn') {
      return { success: false, error: 'Entry already withdrawn' };
    }

    const now = getNowISO();
    const updated = entries.map(e =>
      e.id === id
        ? {
            ...e,
            status: 'withdrawn' as LogisticsStatus,
            withdrawn_at: now,
            withdrawn_by_email: user!.email,
            updated_at: now,
            updated_by_email: user!.email,
          }
        : e
    );

    setEntries(updated);
    await persist(updated);

    return { success: true };
  };

  const getEntriesByEvent = (eventId: string): LogisticsEntry[] => {
    return entries.filter(e => e.event_id === eventId);
  };

  // Dev-only: reseed with fresh relative dates
  const reseedData = async () => {
    const seed = generateSeedData();
    setEntries(seed);
    await persist(seed);
  };

  const value: LogisticsContextValue = {
    entries,
    loading,
    createEntry,
    updateLogisticsFields,
    withdrawEntry,
    getEntriesByEvent,
    reseedData,
  };

  return <LogisticsContext.Provider value={value}>{children}</LogisticsContext.Provider>;
};
