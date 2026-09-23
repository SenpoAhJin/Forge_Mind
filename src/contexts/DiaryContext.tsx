/**
 * Cosplay Diary Context
 * Personal photo journal for completed looks
 * Separate from AI-facing build history
 * Persisted to AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@forgemind:diary_entries';

export interface DiaryEntry {
  id: string;
  project_id: string;
  project_name: string;
  character_name: string;
  variant_name: string;
  photos: string[]; // URIs
  rating: number; // 1-5 stars
  notes: string;
  completion_date: string; // ISO date
  created_at: string; // ISO timestamp
}

interface DiaryContextType {
  entries: DiaryEntry[];
  isLoading: boolean;
  createEntry: (entry: Omit<DiaryEntry, 'id' | 'created_at'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Omit<DiaryEntry, 'id' | 'created_at'>>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryByProjectId: (projectId: string) => DiaryEntry | null;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export const DiaryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, []);

  // Persist entries whenever they change
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch((error) =>
        console.error('[DiaryContext] Failed to persist entries:', error)
      );
    }
  }, [entries, isLoading]);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[DiaryContext] Failed to load entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createEntry = async (entry: Omit<DiaryEntry, 'id' | 'created_at'>) => {
    const newEntry: DiaryEntry = {
      ...entry,
      id: `diary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };
    setEntries((prev) => [newEntry, ...prev]);
  };

  const updateEntry = async (
    id: string,
    updates: Partial<Omit<DiaryEntry, 'id' | 'created_at'>>
  ) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const deleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const getEntryByProjectId = (projectId: string): DiaryEntry | null => {
    return entries.find((e) => e.project_id === projectId) || null;
  };

  return (
    <DiaryContext.Provider
      value={{
        entries,
        isLoading,
        createEntry,
        updateEntry,
        deleteEntry,
        getEntryByProjectId,
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
};

export const useDiary = () => {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error('useDiary must be used within DiaryProvider');
  }
  return context;
};
