/**
 * FE-7 Step 3: Commitment Log Context
 * Tracks changes to confirmed events and logistics tracked fields
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommitmentLogEntry } from '../types/commitmentLog';
import { getNowISO } from '../utils/dateHelpers';

const STORAGE_KEY = '@forgemind:commitment_log';

interface CommitmentLogContextValue {
  entries: CommitmentLogEntry[];
  loading: boolean;
  addLogEntry: (
    entity_type: 'event' | 'logistics_entry',
    entity_id: string,
    changes: Array<{ field_name: string; old_value: string; new_value: string }>,
    changed_by: { email: string; name: string },
    department_routed_to?: string | null
  ) => Promise<void>;
  getLogForEntity: (entity_type: 'event' | 'logistics_entry', entity_id: string) => CommitmentLogEntry[];
  getLogForDepartment: (department: string) => CommitmentLogEntry[];
}

const CommitmentLogContext = createContext<CommitmentLogContextValue | undefined>(undefined);

export const useCommitmentLog = () => {
  const context = useContext(CommitmentLogContext);
  if (!context) {
    throw new Error('useCommitmentLog must be used within CommitmentLogProvider');
  }
  return context;
};

interface CommitmentLogProviderProps {
  children: ReactNode;
}

export const CommitmentLogProvider: React.FC<CommitmentLogProviderProps> = ({ children }) => {
  const [entries, setEntries] = useState<CommitmentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load on mount
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load commitment log:', error);
    } finally {
      setLoading(false);
    }
  };

  const persist = async (data: CommitmentLogEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist commitment log:', error);
    }
  };

  // Add log entries (one per field change, single timestamp for batch)
  const addLogEntry = async (
    entity_type: 'event' | 'logistics_entry',
    entity_id: string,
    changes: Array<{ field_name: string; old_value: string; new_value: string }>,
    changed_by: { email: string; name: string },
    department_routed_to: string | null = null
  ) => {
    const now = getNowISO();
    const newEntries: CommitmentLogEntry[] = changes.map((change, index) => ({
      id: `${entity_type}_${entity_id}_${now}_${index}`,
      entity_type,
      entity_id,
      field_name: change.field_name,
      old_value: change.old_value,
      new_value: change.new_value,
      changed_by_email: changed_by.email,
      changed_by_name: changed_by.name,
      changed_at: now,
      department_routed_to,
    }));

    const updated = [...entries, ...newEntries];
    setEntries(updated);
    await persist(updated);
  };

  // Get log for specific entity (sorted newest first)
  const getLogForEntity = (entity_type: 'event' | 'logistics_entry', entity_id: string): CommitmentLogEntry[] => {
    return entries
      .filter(e => e.entity_type === entity_type && e.entity_id === entity_id)
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  };

  // Get log for department (logistics only, sorted newest first)
  const getLogForDepartment = (department: string): CommitmentLogEntry[] => {
    return entries
      .filter(e => e.entity_type === 'logistics_entry' && e.department_routed_to === department)
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  };

  return (
    <CommitmentLogContext.Provider
      value={{
        entries,
        loading,
        addLogEntry,
        getLogForEntity,
        getLogForDepartment,
      }}
    >
      {children}
    </CommitmentLogContext.Provider>
  );
};
