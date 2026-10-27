/**
 * User Characters Context
 * 
 * Manages characters that users want to cosplay.
 * Stores locally in AsyncStorage per user.
 * 
 * DESIGN:
 * - Primary: Local AsyncStorage (offline-first)
 * - Future: Sync with server API
 * - Per-user storage key: @forgemind:characters:{email}
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
import type {
  UserCharacter,
  NewUserCharacterInput,
  UpdateUserCharacterInput,
} from '../types/user-character';

const STORAGE_KEY_PREFIX = '@forgemind:characters:';

interface UserCharactersContextValue {
  characters: UserCharacter[];
  isLoaded: boolean;
  addCharacter: (input: NewUserCharacterInput) => Promise<UserCharacter>;
  updateCharacter: (id: string, input: UpdateUserCharacterInput) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  getCharacterById: (id: string) => UserCharacter | undefined;
}

const UserCharactersContext = createContext<UserCharactersContextValue | undefined>(undefined);

const nowIso = () => new Date().toISOString();
const generateId = () => `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const UserCharactersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [characters, setCharacters] = useState<UserCharacter[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = user?.email ? `${STORAGE_KEY_PREFIX}${user.email}` : null;

  // Load characters from storage
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!storageKey) {
        // Not logged in: empty list
        if (!cancelled) {
          setCharacters([]);
          setIsLoaded(true);
        }
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored && !cancelled) {
          const parsed = JSON.parse(stored) as UserCharacter[];
          setCharacters(parsed);
        }
      } catch (error) {
        console.error('[UserCharacters] Failed to load:', error);
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  // Save characters to storage
  const saveToStorage = useCallback(
    async (chars: UserCharacter[]) => {
      if (!storageKey) return;
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(chars));
      } catch (error) {
        console.error('[UserCharacters] Failed to save:', error);
      }
    },
    [storageKey]
  );

  // Add new character
  const addCharacter = useCallback(
    async (input: NewUserCharacterInput): Promise<UserCharacter> => {
      if (!user?.email) {
        throw new Error('User not logged in');
      }

      const newCharacter: UserCharacter = {
        id: generateId(),
        user_id: user.email,
        ...input,
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      const updated = [...characters, newCharacter];
      setCharacters(updated);
      await saveToStorage(updated);

      console.log('[UserCharacters] Added:', newCharacter.name);
      return newCharacter;
    },
    [user, characters, saveToStorage]
  );

  // Update existing character
  const updateCharacter = useCallback(
    async (id: string, input: UpdateUserCharacterInput): Promise<void> => {
      const index = characters.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Character not found: ${id}`);
      }

      const updated = [...characters];
      updated[index] = {
        ...updated[index],
        ...input,
        updated_at: nowIso(),
      };

      setCharacters(updated);
      await saveToStorage(updated);

      console.log('[UserCharacters] Updated:', id);
    },
    [characters, saveToStorage]
  );

  // Delete character
  const deleteCharacter = useCallback(
    async (id: string): Promise<void> => {
      const updated = characters.filter(c => c.id !== id);
      setCharacters(updated);
      await saveToStorage(updated);

      console.log('[UserCharacters] Deleted:', id);
    },
    [characters, saveToStorage]
  );

  // Get character by ID
  const getCharacterById = useCallback(
    (id: string): UserCharacter | undefined => {
      return characters.find(c => c.id === id);
    },
    [characters]
  );

  return (
    <UserCharactersContext.Provider
      value={{
        characters,
        isLoaded,
        addCharacter,
        updateCharacter,
        deleteCharacter,
        getCharacterById,
      }}
    >
      {children}
    </UserCharactersContext.Provider>
  );
};

/**
 * Hook to access user characters
 */
export function useUserCharacters(): UserCharactersContextValue {
  const context = useContext(UserCharactersContext);
  if (!context) {
    throw new Error('useUserCharacters must be used within UserCharactersProvider');
  }
  return context;
}
