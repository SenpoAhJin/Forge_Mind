/**
 * FE-7 Step 4: Contest Context
 * Contest opt-ins + criteria + tier assignment
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContestCriterion, ContestOptIn, ContestOptInStatus } from '../types/contest';
import { useUser } from './UserContext';
import { useEvents } from './EventsContext';
import { getNowISO } from '../utils/dateHelpers';

const STORAGE_KEY = '@forgemind:contest';

interface ContestData {
  criteria: ContestCriterion[];
  optIns: ContestOptIn[];
}

interface ContestContextValue {
  criteria: ContestCriterion[];
  optIns: ContestOptIn[];
  loading: boolean;
  addCriterion: (event_id: string, label: string, description: string) => Promise<{ success: boolean; error?: string }>;
  removeCriterion: (criterionId: string) => Promise<{ success: boolean; error?: string }>;
  getCriteriaForEvent: (event_id: string) => ContestCriterion[];
  optIn: (event_id: string, cosplayer: { email: string; display_name: string }) => Promise<{ success: boolean; error?: string }>;
  getMyOptIns: (email: string) => ContestOptIn[];
  getOptInsForEvent: (event_id: string) => ContestOptIn[];
  assignTier: (optInId: string, criterionId: string) => Promise<{ success: boolean; error?: string }>;
  confirmDecision: (optInId: string, decision: 'confirmed' | 'declined') => Promise<{ success: boolean; error?: string }>;
}

const ContestContext = createContext<ContestContextValue | undefined>(undefined);

export const useContest = () => {
  const context = useContext(ContestContext);
  if (!context) {
    throw new Error('useContest must be used within ContestProvider');
  }
  return context;
};

interface ContestProviderProps {
  children: ReactNode;
}

export const ContestProvider: React.FC<ContestProviderProps> = ({ children }) => {
  const [criteria, setCriteria] = useState<ContestCriterion[]>([]);
  const [optIns, setOptIns] = useState<ContestOptIn[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { events } = useEvents();

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: ContestData = JSON.parse(stored);
        setCriteria(data.criteria || []);
        setOptIns(data.optIns || []);
      }
    } catch (error) {
      console.error('Failed to load contest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const persist = async (newCriteria: ContestCriterion[], newOptIns: ContestOptIn[]) => {
    try {
      const data: ContestData = { criteria: newCriteria, optIns: newOptIns };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist contest data:', error);
    }
  };

  // Guard: Head Organizer only
  const requireHeadOrganizer = (): { success: boolean; error?: string } => {
    if (user?.organizer_role !== 'head') {
      return { success: false, error: 'Only Head Organizers can perform this action' };
    }
    return { success: true };
  };

  // Add criterion (Head only, event must be confirmed AND has_contest)
  const addCriterion = async (
    event_id: string,
    label: string,
    description: string
  ): Promise<{ success: boolean; error?: string }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    const event = events.find(e => e.id === event_id);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }
    if (event.status !== 'confirmed') {
      return { success: false, error: 'Event must be confirmed' };
    }
    if (!event.has_contest) {
      return { success: false, error: 'Event does not have a contest' };
    }

    const now = getNowISO();
    const newCriterion: ContestCriterion = {
      id: `criterion_${event_id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
      event_id,
      label: label.trim(),
      description: description.trim(),
      created_at: now,
    };

    const updated = [...criteria, newCriterion];
    setCriteria(updated);
    await persist(updated, optIns);

    return { success: true };
  };

  // Remove criterion (Head only, blocks if assigned)
  const removeCriterion = async (criterionId: string): Promise<{ success: boolean; error?: string }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    // Check if any opt-in has this criterion assigned
    const hasAssignment = optIns.some(o => o.assigned_tier_id === criterionId);
    if (hasAssignment) {
      return { success: false, error: 'Cannot remove criterion - it has already been assigned to one or more participants' };
    }

    const updated = criteria.filter(c => c.id !== criterionId);
    setCriteria(updated);
    await persist(updated, optIns);

    return { success: true };
  };

  // Get criteria for event
  const getCriteriaForEvent = (event_id: string): ContestCriterion[] => {
    return criteria.filter(c => c.event_id === event_id);
  };

  // Opt in (cosplayer only, event must be confirmed AND has_contest, no duplicates)
  const optIn = async (
    event_id: string,
    cosplayer: { email: string; display_name: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.is_cosplayer) {
      return { success: false, error: 'Only cosplayers can opt into contests' };
    }

    const event = events.find(e => e.id === event_id);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }
    if (event.status !== 'confirmed') {
      return { success: false, error: 'Event must be confirmed' };
    }
    if (!event.has_contest) {
      return { success: false, error: 'Event does not have a contest' };
    }

    // Check for duplicate
    const existing = optIns.find(o => o.event_id === event_id && o.cosplayer_email === cosplayer.email);
    if (existing) {
      return { success: false, error: 'You have already opted into this contest' };
    }

    const now = getNowISO();
    const newOptIn: ContestOptIn = {
      id: `optin_${event_id}_${cosplayer.email}_${now}`,
      event_id,
      cosplayer_email: cosplayer.email,
      cosplayer_display_name: cosplayer.display_name,
      status: 'pending',
      assigned_tier_id: null,
      assigned_at: null,
      confirmed_by_email: null,
      confirmed_at: null,
      created_at: now,
    };

    const updated = [...optIns, newOptIn];
    setOptIns(updated);
    await persist(criteria, updated);

    return { success: true };
  };

  // Get my opt-ins
  const getMyOptIns = (email: string): ContestOptIn[] => {
    return optIns.filter(o => o.cosplayer_email === email);
  };

  // Get opt-ins for event (Head only)
  const getOptInsForEvent = (event_id: string): ContestOptIn[] => {
    if (user?.organizer_role !== 'head') return [];
    return optIns.filter(o => o.event_id === event_id);
  };

  // Assign tier (Head only, does NOT confirm, reassigning OK before confirmation)
  const assignTier = async (optInId: string, criterionId: string): Promise<{ success: boolean; error?: string }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    const optIn = optIns.find(o => o.id === optInId);
    if (!optIn) {
      return { success: false, error: 'Opt-in not found' };
    }

    // Block if already confirmed or declined
    if (optIn.status !== 'pending') {
      return { success: false, error: 'Cannot assign tier - opt-in has already been ' + optIn.status };
    }

    const now = getNowISO();
    const updated = optIns.map(o =>
      o.id === optInId
        ? {
            ...o,
            assigned_tier_id: criterionId,
            assigned_at: now,
          }
        : o
    );

    setOptIns(updated);
    await persist(criteria, updated);

    return { success: true };
  };

  // Confirm decision (Head only, must have tier assigned if confirming, THIS IS FINAL)
  const confirmDecision = async (
    optInId: string,
    decision: 'confirmed' | 'declined'
  ): Promise<{ success: boolean; error?: string }> => {
    const guard = requireHeadOrganizer();
    if (!guard.success) return guard;

    const optIn = optIns.find(o => o.id === optInId);
    if (!optIn) {
      return { success: false, error: 'Opt-in not found' };
    }

    // Block if already confirmed or declined
    if (optIn.status !== 'pending') {
      return { success: false, error: 'Cannot change decision - opt-in has already been ' + optIn.status };
    }

    // If confirming, must have assigned tier
    if (decision === 'confirmed' && !optIn.assigned_tier_id) {
      return { success: false, error: 'Cannot confirm without assigning a tier first' };
    }

    const now = getNowISO();
    const updated = optIns.map(o =>
      o.id === optInId
        ? {
            ...o,
            status: decision,
            confirmed_by_email: user!.email,
            confirmed_at: now,
          }
        : o
    );

    setOptIns(updated);
    await persist(criteria, updated);

    return { success: true };
  };

  return (
    <ContestContext.Provider
      value={{
        criteria,
        optIns,
        loading,
        addCriterion,
        removeCriterion,
        getCriteriaForEvent,
        optIn,
        getMyOptIns,
        getOptInsForEvent,
        assignTier,
        confirmDecision,
      }}
    >
      {children}
    </ContestContext.Provider>
  );
};
