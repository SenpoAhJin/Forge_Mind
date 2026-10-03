/**
 * Public Event Calendar Context - API-Backed Version
 * Community-submitted event listings (cosplay.ph-style directory)
 * 
 * DATA SOURCE: Backend API (/calendar endpoints)
 * No local storage - all operations go to server
 * 
 * Guards (server-enforced):
 * - Create: approved staff (any department) OR Head Organizer
 * - Edit/Delete: original submitter OR any Head Organizer
 * - Review: Head Organizer (department-scoped)
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CalendarService } from '../services/CalendarService';
import { CalendarListing, CalendarListingStatus, CreateCalendarListingInput, UpdateCalendarListingInput } from '../types/api/calendar';

interface CalendarContextType {
  entries: CalendarListing[];
  isLoading: boolean;
  error: string | null;
  loadEntries: (status?: CalendarListingStatus) => Promise<void>;
  createEntry: (input: CreateCalendarListingInput) => Promise<{ success: boolean; entryId?: string; error?: string }>;
  updateEntry: (entryId: string, input: UpdateCalendarListingInput) => Promise<{ success: boolean; error?: string }>;
  deleteEntry: (entryId: string) => Promise<{ success: boolean; error?: string }>;
  approveEntry: (entryId: string) => Promise<{ success: boolean; error?: string }>;
  rejectEntry: (entryId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  getEntryById: (id: string) => CalendarListing | null;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<CalendarListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async (status?: CalendarListingStatus): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await CalendarService.listListings(status);
      if (result.success && result.data) {
        setEntries(result.data);
      } else {
        setError(result.error || 'Failed to load calendar listings');
      }
    } catch (err) {
      setError('Failed to load calendar listings');
      console.error('[CalendarContext] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createEntry = async (
    input: CreateCalendarListingInput
  ): Promise<{ success: boolean; entryId?: string; error?: string }> => {
    try {
      const result = await CalendarService.createListing(input);
      if (result.success && result.data) {
        // Optimistic update
        setEntries((prev) => [result.data!, ...prev]);
        return { success: true, entryId: result.data.id };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Failed to create listing' };
    }
  };

  const updateEntry = async (
    entryId: string,
    input: UpdateCalendarListingInput
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await CalendarService.updateListing(entryId, input);
      if (result.success && result.data) {
        // Optimistic update
        setEntries((prev) =>
          prev.map((e) => (e.id === entryId ? result.data! : e))
        );
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Failed to update listing' };
    }
  };

  const deleteEntry = async (
    entryId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await CalendarService.deleteListing(entryId);
      if (result.success) {
        // Optimistic update
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Failed to delete listing' };
    }
  };

  const approveEntry = async (
    entryId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await CalendarService.reviewListing(entryId, {
        decision: 'approve',
      });
      if (result.success && result.data) {
        // Optimistic update
        setEntries((prev) =>
          prev.map((e) => (e.id === entryId ? result.data! : e))
        );
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Failed to approve listing' };
    }
  };

  const rejectEntry = async (
    entryId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await CalendarService.reviewListing(entryId, {
        decision: 'reject',
        rejection_reason: reason,
      });
      if (result.success && result.data) {
        // Optimistic update
        setEntries((prev) =>
          prev.map((e) => (e.id === entryId ? result.data! : e))
        );
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Failed to reject listing' };
    }
  };

  const getEntryById = (id: string): CalendarListing | null => {
    return entries.find((e) => e.id === id) || null;
  };

  return (
    <CalendarContext.Provider
      value={{
        entries,
        isLoading,
        error,
        loadEntries,
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
