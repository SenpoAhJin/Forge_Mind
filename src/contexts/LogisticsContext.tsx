/**
 * FE-7 Step 2: Logistics Context
 * State management for participant logistics entries
 * 
 * Guards:
 * - All mutations require organizer_role === 'head'
 * - Staff can only read (no create/update/delete)
 * - Participant email validation (basic format check)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogisticsEntry, ParticipantKind, ParkingNeeds } from '../types/logistics';
import { useUser } from './UserContext';
import { getNowISO, getTodayLocal } from '../utils/dateHelpers';

const STORAGE_KEY = '@forgemind:logistics';

interface LogisticsContextValue {
  entries: LogisticsEntry[];
  loading: boolean;
  createEntry: (data: CreateEntryData) => Promise<{ success: boolean; error?: string; entry?: LogisticsEntry }>;
  updateEntry: (id: string, data: UpdateEntryData) => Promise<{ success: boolean; error?: string }>;
  deleteEntry: (id: string) => Promise<{ success: boolean; error?: string }>;
  getEntriesByEvent: (eventId: string) => LogisticsEntry[];
  reseedData: () => Promise<void>; // Dev-only
}

interface CreateEntryData {
  event_id: string;
  participant_email: string;
  participant_name: string;
  participant_kind: ParticipantKind;
  arrival_date?: string | null;
  arrival_time?: string | null;
  parking_needs?: ParkingNeeds;
  plate_number?: string | null;
  entourage_size?: number | null;
  stage_time_preference?: string | null;
}

interface UpdateEntryData {
  participant_name?: string;
  participant_kind?: ParticipantKind;
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
  
  // Calculate event dates relative to today
  const getRelativeDate = (daysOffset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Event 1: Tomorrow (critical - 1 day)
  const evt1Date = getRelativeDate(1);
  // Event 2: 4 days away (urgent)
  const evt2Date = getRelativeDate(4);
  // Event 3: 9 days away (reminder)
  const evt3Date = getRelativeDate(9);

  return [
    // Entry 1: CRITICAL - tomorrow, incomplete (missing arrival time)
    {
      id: 'log-001',
      event_id: 'evt-manila-coscon', // Tomorrow's event
      participant_email: 'guest@example.com',
      participant_name: 'Maria Santos',
      participant_kind: 'confirmed_guest' as ParticipantKind,
      arrival_date: evt1Date,
      arrival_time: null, // MISSING - causes CRITICAL urgency
      parking_needs: 'standard' as ParkingNeeds,
      plate_number: 'ABC123',
      entourage_size: 2,
      stage_time_preference: null,
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
    // Entry 2: URGENT - 4 days, incomplete (missing plate number)
    {
      id: 'log-002',
      event_id: 'evt-manila-coscon',
      participant_email: 'sponsor@techcorp.com',
      participant_name: 'TechCorp Inc.',
      participant_kind: 'sponsor' as ParticipantKind,
      arrival_date: evt1Date,
      arrival_time: '09:00',
      parking_needs: 'accessible' as ParkingNeeds,
      plate_number: null, // MISSING
      entourage_size: 0, // Answered: no entourage
      stage_time_preference: null,
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
    // Entry 3: URGENT - 4 days, complete
    {
      id: 'log-003',
      event_id: 'evt-cebu-anime', // 4 days away
      participant_email: 'performer@band.com',
      participant_name: 'Cosplay Band',
      participant_kind: 'performer' as ParticipantKind,
      arrival_date: evt2Date,
      arrival_time: '12:00',
      parking_needs: 'none' as ParkingNeeds,
      plate_number: null, // N/A when parking is 'none'
      entourage_size: 3,
      stage_time_preference: 'Afternoon preferred',
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
    // Entry 4: REMINDER - 9 days, incomplete (missing entourage size)
    {
      id: 'log-004',
      event_id: 'evt-cebu-anime',
      participant_email: 'guest2@example.com',
      participant_name: 'John Reyes',
      participant_kind: 'confirmed_guest' as ParticipantKind,
      arrival_date: evt2Date,
      arrival_time: '10:30',
      parking_needs: 'standard' as ParkingNeeds,
      plate_number: 'XYZ789',
      entourage_size: null, // MISSING
      stage_time_preference: null,
      created_at: now,
      updated_at: now,
      created_by_email: 'head@cosforge.ph',
      updated_by_email: 'head@cosforge.ph',
    },
    // Entry 5: REMINDER - 9 days, complete
    {
      id: 'log-005',
      event_id: 'evt-cebu-anime',
      participant_email: 'sponsor2@localstore.ph',
      participant_name: 'Local Store',
      participant_kind: 'sponsor' as ParticipantKind,
      arrival_date: evt2Date,
      arrival_time: '08:00',
      parking_needs: 'standard' as ParkingNeeds,
      plate_number: 'DEF456',
      entourage_size: 1,
      stage_time_preference: null,
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

  // Validation: Email format
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const createEntry = async (data: CreateEntryData): Promise<{ success: boolean; error?: string; entry?: LogisticsEntry }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    // Validate participant email
    if (!validateEmail(data.participant_email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate participant name
    if (!data.participant_name.trim() || data.participant_name.length > 100) {
      return { success: false, error: 'Participant name must be 1-100 characters' };
    }

    const now = getNowISO();
    const entry: LogisticsEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event_id: data.event_id,
      participant_email: data.participant_email.trim().toLowerCase(),
      participant_name: data.participant_name.trim(),
      participant_kind: data.participant_kind,
      arrival_date: data.arrival_date || null,
      arrival_time: data.arrival_time || null,
      parking_needs: data.parking_needs || 'none',
      plate_number: data.plate_number || null,
      entourage_size: data.entourage_size !== undefined ? data.entourage_size : null,
      stage_time_preference: data.stage_time_preference || null,
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

  const updateEntry = async (id: string, data: UpdateEntryData): Promise<{ success: boolean; error?: string }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    const entry = entries.find(e => e.id === id);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    // Validate participant name if updating
    if (data.participant_name !== undefined) {
      if (!data.participant_name.trim() || data.participant_name.length > 100) {
        return { success: false, error: 'Participant name must be 1-100 characters' };
      }
    }

    const now = getNowISO();
    const updated = entries.map(e =>
      e.id === id
        ? {
            ...e,
            ...data,
            participant_name: data.participant_name ? data.participant_name.trim() : e.participant_name,
            updated_at: now,
            updated_by_email: user!.email,
          }
        : e
    );

    setEntries(updated);
    await persist(updated);

    return { success: true };
  };

  const deleteEntry = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    const entry = entries.find(e => e.id === id);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    const updated = entries.filter(e => e.id !== id);
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
    updateEntry,
    deleteEntry,
    getEntriesByEvent,
    reseedData,
  };

  return <LogisticsContext.Provider value={value}>{children}</LogisticsContext.Provider>;
};
