/**
 * ForgeMind - OwnedAttire Context (FE-5)
 * Persisted local inventory on AsyncStorage (same pattern as the AuthService
 * accounts/session keys). Each dressed apparel item mirrors the v0.2.1 schema.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from './UserContext';
import {
  OwnedAttire,
  NewOwnedAttireInput,
  UpdateOwnedAttireInput,
  AvailabilityStatus,
} from '../types/owned-attire';
import { ownedAttireSeed } from '../data/owned-attire-seed';

const STORAGE_KEY = '@forgemind:owned_attire';

interface OwnedAttireContextValue {
  items: OwnedAttire[];
  isLoaded: boolean;
  addItem: (input: NewOwnedAttireInput) => OwnedAttire;
  updateItem: (attireId: string, input: UpdateOwnedAttireInput) => void;
  deleteItem: (attireId: string) => void;
  setCommitment: (attireId: string, projectId: string | null) => void;
  getItemById: (attireId: string) => OwnedAttire | undefined;
}

const OwnedAttireContext = createContext<OwnedAttireContextValue | undefined>(undefined);

const nowIso = () => new Date().toISOString();

export const OwnedAttireProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [items, setItems] = useState<OwnedAttire[]>(ownedAttireSeed);
  const [isLoaded, setIsLoaded] = useState(false);

  const seedForUser = useCallback(
    () =>
      ownedAttireSeed.map((seed) => ({
        ...seed,
        user_id: user?.email ?? seed.user_id,
      })),
    [user?.email]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          // Normalize old items missing array fields (photo_urls, condition_photo_history)
          // from text/voice entry before D7a fix or items saved before these fields existed
          const normalized = stored.map((item: any) => ({
            ...item,
            photo_urls: Array.isArray(item.photo_urls) ? item.photo_urls : [],
            condition_photo_history: Array.isArray(item.condition_photo_history) 
              ? item.condition_photo_history 
              : [],
          }));
          if (!cancelled) {
            setItems(normalized);
            setItems((prev) => (prev.length === 0 ? seedForUser() : prev));
          }
        } else {
          if (!cancelled) {
            setItems(seedForUser());
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seedForUser()));
          }
        }
      } catch (e) {
        if (!cancelled) setItems(seedForUser());
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedForUser]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
      // local storage best-effort; failures are non-fatal in mock mode
    });
  }, [items, isLoaded]);

  /**
   * Normalize input to ensure photo_urls is always an array.
   * Text and voice entry don't provide photo_urls; old saved items may be missing it.
   */
  const normalizePhotoUrls = (photoUrls: (string | null)[] | undefined): (string | null)[] => {
    return Array.isArray(photoUrls) ? photoUrls : [];
  };

  const addItem = (input: NewOwnedAttireInput): OwnedAttire => {
    const now = nowIso();
    const photo_urls = normalizePhotoUrls(input.photo_urls);
    const item: OwnedAttire = {
      attire_id: `attr-${Date.now()}`,
      user_id: user?.email ?? 'demo-user-1',
      entry_method: input.entry_method,
      entry_language: input.entry_language,
      original_input_text: input.original_input_text,
      photo_urls,
      auto_categorized_type: input.auto_categorized_type,
      auto_categorized_color: input.auto_categorized_color,
      auto_categorized_style: input.auto_categorized_style,
      flexibility_tag: input.flexibility_tag,
      condition_rating: input.condition_rating,
      condition_photo_history: [
        {
          timestamp: now,
          photo_url: photo_urls[0] ?? null,
          condition_rating: input.condition_rating,
        },
      ],
      availability_status: 'free',
      committed_to_project_id: null,
      acquired_date: input.acquired_date,
      acquisition_cost: input.acquisition_cost,
      notes: input.notes ?? '',
      created_at: now,
      updated_at: now,
    };
    setItems((prev) => [item, ...prev]);
    return item;
  };

  const updateItem = (attireId: string, input: UpdateOwnedAttireInput) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.attire_id !== attireId) return item;
        const next = { ...item, ...input, updated_at: nowIso() };
        if (input.condition_rating && input.condition_rating !== item.condition_rating) {
          const photo_urls = normalizePhotoUrls(item.photo_urls);
          next.condition_photo_history = [
            ...(item.condition_photo_history ?? []),
            {
              timestamp: nowIso(),
              photo_url: photo_urls[0] ?? null,
              condition_rating: input.condition_rating,
            },
          ];
        }
        return next;
      })
    );
  };

  const deleteItem = (attireId: string) => {
    setItems((prev) => prev.filter((item) => item.attire_id !== attireId));
  };

  const setCommitment = (attireId: string, projectId: string | null) => {
    setItems((prev) =>
      prev.map((item) =>
        item.attire_id === attireId
          ? {
              ...item,
              availability_status: (projectId ? 'committed' : 'free') as AvailabilityStatus,
              committed_to_project_id: projectId,
              updated_at: nowIso(),
            }
          : item
      )
    );
  };

  const getItemById = (attireId: string) => items.find((i) => i.attire_id === attireId);

  return (
    <OwnedAttireContext.Provider
      value={{
        items,
        isLoaded,
        addItem,
        updateItem,
        deleteItem,
        setCommitment,
        getItemById,
      }}
    >
      {children}
    </OwnedAttireContext.Provider>
  );
};

export const useOwnedAttire = () => {
  const context = useContext(OwnedAttireContext);
  if (context === undefined) {
    throw new Error('useOwnedAttire must be used within an OwnedAttireProvider');
  }
  return context;
};