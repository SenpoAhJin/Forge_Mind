/**
 * ForgeMind - OwnedAttire Context (M1)
 * 
 * Server-backed inventory with offline fallback.
 * - Primary: GET/POST/PATCH/DELETE /inventory API
 * - AsyncStorage per-user cache: `@forgemind:owned_attire:{email}` (READ-ONLY offline fallback)
 * - First login: auto-import local items to server via POST /inventory/import
 * - Offline indicator: shows when reads use cache (server unreachable)
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
import { InventoryService } from '../services/InventoryService';
import { isNetworkError } from '../services/http';
import { hasUsablePhoto } from '../utils/photoUtils';

const STORAGE_KEY_PREFIX = '@forgemind:owned_attire:';
const MIGRATION_FLAG_PREFIX = '@forgemind:inventory_migrated:';

interface OwnedAttireContextValue {
  items: OwnedAttire[];
  isLoaded: boolean;
  isOffline: boolean; // True when showing cached data (server unreachable)
  addItem: (input: NewOwnedAttireInput) => Promise<OwnedAttire>;
  updateItem: (attireId: string, input: UpdateOwnedAttireInput) => Promise<void>;
  deleteItem: (attireId: string) => Promise<void>;
  setCommitment: (attireId: string, projectId: string | null) => Promise<void>;
  getItemById: (attireId: string) => OwnedAttire | undefined;
}

const OwnedAttireContext = createContext<OwnedAttireContextValue | undefined>(undefined);

const nowIso = () => new Date().toISOString();

export const OwnedAttireProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [items, setItems] = useState<OwnedAttire[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [loadedAccount, setLoadedAccount] = useState<string | undefined>();

  const storageKey = user?.email ? `${STORAGE_KEY_PREFIX}${user.email}` : null;
  const migrationFlagKey = user?.email ? `${MIGRATION_FLAG_PREFIX}${user.email}` : null;

  /**
   * Load from server, fallback to cache on failure.
   * On first login with local data, auto-import to server.
   */
  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    setItems([]);

    const load = async () => {
      if (!storageKey || !user?.email) {
        // Not logged in: use seed
        if (!cancelled) {
          setItems([]);
          setLoadedAccount(user?.email);
          setIsLoaded(true);
          setIsOffline(false);
        }
        return;
      }

      // Try to fetch from server
      try {
        const serverItems = await InventoryService.listItems();
        console.log(`[OwnedAttire] Fetched ${serverItems.length} items from server`);
        
        // Log photo_urls for debugging (count only USABLE photos)
        const itemsWithUsablePhotos = serverItems.filter(item => hasUsablePhoto(item.photo_urls));
        console.log(`[OwnedAttire] Items with usable photos: ${itemsWithUsablePhotos.length}/${serverItems.length}`);
        
        // Check for blob URLs (invalid after refresh)
        const itemsWithBlobUrls = serverItems.filter(item => 
          item.photo_urls?.some(url => url && url.startsWith('blob:'))
        );
        if (itemsWithBlobUrls.length > 0) {
          console.warn(`[OwnedAttire] ⚠️ Found ${itemsWithBlobUrls.length} items with blob: URLs (will fail on refresh)`);
          console.warn(`[OwnedAttire] Items with blob URLs:`, itemsWithBlobUrls.map(i => i.attire_id));
        }
        
        // Check for file:// URLs (dead local paths)
        const itemsWithFileUrls = serverItems.filter(item =>
          item.photo_urls?.some(url => url && url.startsWith('file:'))
        );
        if (itemsWithFileUrls.length > 0) {
          console.warn(`[OwnedAttire] ⚠️ Found ${itemsWithFileUrls.length} items with file: URLs (dead local paths)`);
        }
        
        if (itemsWithUsablePhotos.length > 0) {
          const firstWithPhoto = itemsWithUsablePhotos[0];
          console.log(`[OwnedAttire] Sample usable photo:`, {
            attire_id: firstWithPhoto.attire_id,
            photo_count: firstWithPhoto.photo_urls.length,
            first_photo_preview: firstWithPhoto.photo_urls[0]?.substring(0, 100) + '...',
            is_data_uri: firstWithPhoto.photo_urls[0]?.startsWith('data:'),
            is_http: firstWithPhoto.photo_urls[0]?.startsWith('http'),
            is_server_path: firstWithPhoto.photo_urls[0]?.startsWith('/uploads/'),
          });
        }
        
        if (!cancelled) {
          // Server returned empty AND we have local data: auto-import
          if (serverItems.length === 0 && migrationFlagKey) {
            const migrated = await AsyncStorage.getItem(migrationFlagKey);
            if (!migrated) {
              // Check local cache for items to import
              const cachedRaw = await AsyncStorage.getItem(storageKey);
              if (cachedRaw) {
                const localItems = JSON.parse(cachedRaw) as OwnedAttire[];
                if (localItems.length > 0) {
                  console.log(`[OwnedAttire] Importing ${localItems.length} local items to server`);
                  
                  // Convert to import format with client_id
                  const importItems = localItems.map((item, index) => ({
                    client_id: item.client_id || `import-${Date.now()}-${index}`,
                    entry_method: item.entry_method,
                    entry_language: item.entry_language,
                    original_input_text: item.original_input_text,
                    photo_urls: item.photo_urls,
                    auto_categorized_type: item.auto_categorized_type,
                    auto_categorized_color: item.auto_categorized_color,
                    auto_categorized_style: item.auto_categorized_style,
                    flexibility_tag: item.flexibility_tag,
                    condition_rating: item.condition_rating,
                    acquired_date: item.acquired_date,
                    acquisition_cost: item.acquisition_cost,
                    notes: item.notes,
                    original_project_ref: item.committed_to_project_id || undefined, // Store old project ref
                  }));

                  try {
                    const result = await InventoryService.importItems(importItems);
                    console.log(`[OwnedAttire] Import result: ${result.imported} imported, ${result.skipped} skipped`);
                    
                    // Mark as migrated
                    await AsyncStorage.setItem(migrationFlagKey, 'true');
                    
                    // Fetch fresh data from server
                    const freshItems = await InventoryService.listItems();
                    setItems(freshItems);
                    
                    // Update cache
                    await AsyncStorage.setItem(storageKey, JSON.stringify(freshItems));
                  } catch (importError) {
                    console.error('[OwnedAttire] Import failed:', importError);
                    // Fall through to show server items (empty)
                    setItems(serverItems);
                  }
                } else {
                  // No local items: just use server data (empty)
                  setItems(serverItems);
                }
              } else {
                // No cache: use server data (empty)
                setItems(serverItems);
              }
            } else {
              // Already migrated: use server data
              setItems(serverItems);
            }
          } else {
            // Server has data OR already migrated: use server data
            console.log(`[OwnedAttire] Using server data: ${serverItems.length} items`);
            setItems(serverItems);
          }
          
          // Update cache
          console.log(`[OwnedAttire] Saving ${serverItems.length} items to cache`);
          await AsyncStorage.setItem(storageKey, JSON.stringify(serverItems));
          setIsOffline(false);
          setLoadedAccount(user?.email);
          setIsLoaded(true);
        }
      } catch (error) {
        // Server unreachable: fall back to cache
        console.warn('[OwnedAttire] Server unreachable, using cache:', error);
        
        if (!cancelled) {
          try {
            const cachedRaw = await AsyncStorage.getItem(storageKey);
            if (cachedRaw) {
              const cached = JSON.parse(cachedRaw) as OwnedAttire[];
              setItems(cached);
            } else {
              setItems([]);
              await AsyncStorage.setItem(storageKey, JSON.stringify([]));
            }
            setIsOffline(true);
          } catch (cacheError) {
            setItems([]);
            setIsOffline(true);
          }
          setLoadedAccount(user?.email);
          setIsLoaded(true);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.email, storageKey, migrationFlagKey]);

  // Sync to cache after changes (cache is READ-ONLY offline fallback)
  useEffect(() => {
    if (!isLoaded || !storageKey || isOffline || loadedAccount !== user?.email) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(items)).catch(() => {
      // local storage best-effort; failures are non-fatal
    });
  }, [items, isLoaded, storageKey, isOffline]);

  /**
   * Normalize input to ensure photo_urls is always an array.
   * Text and voice entry don't provide photo_urls; old saved items may be missing it.
   */
  const normalizePhotoUrls = (photoUrls: (string | null)[] | undefined): (string | null)[] => {
    return Array.isArray(photoUrls) ? photoUrls : [];
  };

  const addItem = async (input: NewOwnedAttireInput): Promise<OwnedAttire> => {
    if (isOffline) {
      throw new Error('Cannot add items while offline. Please check your connection.');
    }

    try {
      // Create on server
      const item = await InventoryService.createItem(input);
      
      // Update local state from server response
      setItems((prev) => [item, ...prev]);
      return item;
    } catch (error) {
      if (isNetworkError(error)) {
        throw new Error('Server unreachable. Cannot add items while offline.');
      }
      throw error;
    }
  };

  const updateItem = async (attireId: string, input: UpdateOwnedAttireInput): Promise<void> => {
    if (isOffline) {
      throw new Error('Cannot update items while offline. Please check your connection.');
    }

    const currentItem = items.find((i) => i.attire_id === attireId);
    if (!currentItem) {
      throw new Error('Item not found');
    }

    try {
      // Update on server with optimistic locking
      const updated = await InventoryService.updateItem(attireId, {
        ...input,
        version: currentItem.version,
      });
      
      // Update local state from server response
      setItems((prev) =>
        prev.map((item) => (item.attire_id === attireId ? updated : item))
      );
    } catch (error) {
      if (isNetworkError(error)) {
        throw new Error('Server unreachable. Cannot update items while offline.');
      }
      throw error;
    }
  };

  const deleteItem = async (attireId: string): Promise<void> => {
    if (isOffline) {
      throw new Error('Cannot delete items while offline. Please check your connection.');
    }

    try {
      // Delete on server
      await InventoryService.deleteItem(attireId);
      
      // Update local state
      setItems((prev) => prev.filter((item) => item.attire_id !== attireId));
    } catch (error) {
      if (isNetworkError(error)) {
        throw new Error('Server unreachable. Cannot delete items while offline.');
      }
      throw error;
    }
  };

  const setCommitment = async (attireId: string, projectId: string | null): Promise<void> => {
    // Find item
    const item = items.find((i) => i.attire_id === attireId);
    if (!item) {
      throw new Error(`Item ${attireId} not found`);
    }

    // Check if item exists on server (has attire_id that's not local-only)
    // Local-only items start with 'attr-' prefix and haven't been synced
    const isLocalOnly = item.attire_id.startsWith('attr-');
    if (isLocalOnly) {
      throw new Error('Cannot change commitment status offline. Item must be synced to server first.');
    }

    // Prepare payload
    const payload = projectId
      ? {
          version: item.version,
          availability_status: 'committed' as const,
          original_project_ref: projectId, // Store local project ID
        }
      : {
          version: item.version,
          availability_status: 'free' as const,
          // Server clears original_project_ref on release
        };

    try {
      // Call server
      const updated = await InventoryService.updateItem(attireId, payload);

      // Update local state with SERVER response (version, status, refs from server)
      setItems((prev) =>
        prev.map((i) =>
          i.attire_id === attireId
            ? {
                ...i,
                availability_status: updated.availability_status,
                committed_to_project_id: updated.committed_to_project_id,
                original_project_ref: updated.original_project_ref,
                version: updated.version,
                updated_at: updated.updated_at,
              }
            : i
        )
      );

      // Update AsyncStorage cache
      try {
        if (storageKey) {
          await AsyncStorage.setItem(storageKey, JSON.stringify(items));
        }
      } catch (storageError) {
        console.warn('Failed to update AsyncStorage cache:', storageError);
        // Non-critical - state is updated
      }
    } catch (error: any) {
      // Parse error for specific cases
      if (error.message?.includes('No session token') || error.message?.includes('network')) {
        throw new Error("Can't change commitment offline. Please check your connection.");
      }

      // 409 version conflict or cannot-commit
      if (error.message?.includes('409') || error.message?.includes('version') || error.message?.includes('conflict')) {
        // Refetch item from server
        try {
          const items = await InventoryService.listItems();
          setItems(items);
          
          // Update AsyncStorage
          if (storageKey) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(items));
          }
        } catch (refetchError) {
          console.error('Failed to refetch after conflict:', refetchError);
        }

        throw new Error('Item changed elsewhere. Refreshed from server. Please try again.');
      }

      // 400/401/other - pass through server message
      throw error;
    }
  };

  const getItemById = (attireId: string) => items.find((i) => i.attire_id === attireId);

  return (
    <OwnedAttireContext.Provider
      value={{
        items: loadedAccount === user?.email ? items : [],
        isLoaded: loadedAccount === user?.email && isLoaded,
        isOffline,
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
