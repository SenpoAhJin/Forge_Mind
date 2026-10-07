/**
 * ForgeMind - Marketplace Context
 *
 * Manages marketplace listings from the server API.
 * AsyncStorage is used only as an offline cache with a "showing saved copy" note.
 * Three transaction types: sell, trade, commission.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import MarketplaceApi, { CreateListingRequest } from '../services/MarketplaceApi';
import { mapServerListing, mapServerListings, parseCachedListings, parseCachedCache } from '../utils/marketplaceMapping';
import { isNetworkError } from '../services/http';
import { subscribeServerStatus } from '../services/serverStatus';
import { logApiIssue } from '../utils/debugLog';
import { AuthService } from '../services/AuthService';
import type { Listing, ServerPostType } from '../types/marketplace';

// The one server -> phone mapping, re-exported so a screen or a test can reach
// it without this file's React and storage dependencies.
export { mapServerListing, mapServerListings, parseCachedListings };

/**
 * Offline cache. Only the LAST SUCCESSFUL server fetch may write to it, and it
 * is keyed so a signed-in user's "my listings" saved copy can never leak into
 * another account.
 *
 *   - CACHE_KEY_V2         the current cache: { version: 2, savedAt, items }
 *                          where items is exactly what the server returned.
 *   - CACHE_KEY_OLD        what older builds wrote (pre-v2, raw events).
 *   - CACHE_KEY_OLD_LOCAL  the pre-server local items old builds stored.
 *   - CACHE_KEY_MIGRATED   set once the old keys have been folded in and
 *                          cleared; v2 builds never write the old keys again.
 */
const CACHE_KEY_V2 = '@forgemind:marketplace_cache_v2';
const CACHE_KEY_OLD = '@forgemind:marketplace_listings_cache';
const CACHE_KEY_OLD_LOCAL = '@forgemind:marketplace_listings';
const CACHE_KEY_MIGRATED = '@forgemind:marketplace_migrated';
const MINE_KEY_PREFIX = '@forgemind:marketplace_mine_v2';

export type { Listing };

/**
 * What the older screens still pass: a transaction_type from before the server
 * migration and a photos array the server does not accept. Accepted and
 * translated, never sent as it is.
 */
export interface LegacyCreateListingInput {
  title: string;
  description: string;
  category: string;
  transaction_type?: string;
  post_type?: string;
  price?: number;
  rate?: number;
  condition?: string;
  trade_offered_item?: string;
  trade_wanted_item?: string;
  [key: string]: unknown;
}

/** The legacy transaction types, mapped onto the three the server stores. */
function toServerPostType(value: unknown): ServerPostType {
  if (value === 'sell' || value === 'commission') return value;
  if (value === 'trade') return 'trade';
  // 'buy' and 'both' both meant "the seller is selling this".
  if (value === 'buy' || value === 'both') return 'sell';
  return 'sell';
}

function toCreateListingRequest(input: LegacyCreateListingInput): CreateListingRequest {
  const postType = toServerPostType(input.post_type ?? input.transaction_type);
  const request: CreateListingRequest = {
    post_type: postType,
    title: typeof input.title === 'string' ? input.title : '',
    description: typeof input.description === 'string' ? input.description : '',
    category: typeof input.category === 'string' ? input.category : '',
  };
  if (typeof input.condition === 'string' && input.condition !== '') request.condition = input.condition;
  if (typeof input.price === 'number' && Number.isFinite(input.price)) request.price = input.price;
  if (typeof input.rate === 'number' && Number.isFinite(input.rate)) request.rate = input.rate;
  if (typeof input.trade_offered_item === 'string' && input.trade_offered_item !== '') {
    request.trade_offered_item = input.trade_offered_item;
  }
  if (typeof input.trade_wanted_item === 'string' && input.trade_wanted_item !== '') {
    request.trade_wanted_item = input.trade_wanted_item;
  }
  return request;
}

interface MarketplaceContextType {
  listings: Listing[];
  myListings: Listing[];
  isLoading: boolean;
  isOffline: boolean;
  /**
   * The timestamp of the last successful server fetch, used by the offline
   * note ("showing the saved copy ... updated <relative time>"). Null until a
   * fetch has ever succeeded (or the persisted v2 envelope has been read).
   */
  lastUpdatedAt: string | null;
  createListing: (emailOrInput: string | LegacyCreateListingInput, maybeInput?: LegacyCreateListingInput) => Promise<{ success: boolean; listing?: Listing; error?: string; fieldErrors?: Record<string, string> }>;
  getListingById: (id: string) => Listing | undefined;
  getActiveListings: () => Listing[];
  getListingsBySeller: (sellerUserId: string) => Listing[];
  cancelListing: (listingId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  removeListing: (listingId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  deleteListingPermanently: (listingId: string) => Promise<{ success: boolean; error?: string }>;
  submitAppeal: (listingId: string, message: string) => Promise<{ success: boolean; error?: string }>;
  refreshListings: () => Promise<void>;
  refreshMyListings: () => Promise<void>;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const useMarketplace = (): MarketplaceContextType => {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within MarketplaceProvider');
  }
  return context;
};

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Load listings from server on mount
  useEffect(() => {
    loadListings();
    loadMyListings();
  }, []);

  /**
   * Keep the saved copy fresh without the user doing anything: refresh every
   * 30 s while the app is in the foreground, the moment a previously dead
   * server becomes reachable again, and (on web) when the tab becomes visible
   * or the browser reports online. Overlapping requests are avoided by the
   * single-flight guard around fetch in MarketplaceApi.
   */
  useEffect(() => {
    let active = true;

    const { AppState } = require('react-native');
    const refreshWhileForeground = async (): Promise<void> => {
      if (!active) return;
      await refreshListings().catch(() => {});
      await refreshMyListings().catch(() => {});
    };

    const interval = setInterval(() => {
      if (!active) return;
      const state = AppState.currentState;
      if (state === 'active') refreshWhileForeground();
    }, 30000);

    const unsubscribeStatus = subscribeServerStatus((reachable) => {
      if (reachable && active) refreshWhileForeground();
    });

    const onVisible = async (): Promise<void> => {
      if (active && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        await refreshWhileForeground();
      }
    };
    const onOnline = async (): Promise<void> => {
      if (active) await refreshWhileForeground();
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('online', onOnline);
    }

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribeStatus();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('online', onOnline);
      }
    };
  }, []);

  /** Which email the per-user "my listings" cache belongs to, this session. */
  const mineCacheForRef = useRef<string | null>(null);

  /**
   * One-time migration: read whatever the two old keys held (for continuity),
   * then remove them and remember it happened. Newer builds never write the
   * old keys, so this runs at most once per install. Returns the folded-in
   * listings, or [] when there was nothing usable.
   */
  const migrateLegacyCacheOnce = async (): Promise<Listing[]> => {
    try {
      const migrated = await AsyncStorage.getItem(CACHE_KEY_MIGRATED);
      if (migrated) return [];

      const rawOld = await AsyncStorage.getItem(CACHE_KEY_OLD);
      const rawLegacy = await AsyncStorage.getItem(CACHE_KEY_OLD_LOCAL);
      const folded = parseCachedListings(rawOld ?? rawLegacy);

      await AsyncStorage.removeItem(CACHE_KEY_OLD);
      await AsyncStorage.removeItem(CACHE_KEY_OLD_LOCAL);
      await AsyncStorage.setItem(CACHE_KEY_MIGRATED, 'true');
      if (__DEV__) {
        console.log('[MarketplaceContext] Migrated legacy listings cache');
      }
      return folded;
    } catch (error) {
      if (isNetworkError(error)) logApiIssue('MarketplaceContext', 'network', 'unreachable');
      else console.error('[MarketplaceContext] Failed to migrate old listings:', error);
      return [];
    }
  };

  /**
   * Persist the v2 offline copy: only the last successful server fetch calls
   * this. The old keys are cleared once the first good fetch lands.
   */
  const saveListingsCache = async (rawItems: unknown[]): Promise<void> => {
    const envelope = {
      version: 2,
      savedAt: new Date().toISOString(),
      items: rawItems,
    };
    await AsyncStorage.setItem(CACHE_KEY_V2, JSON.stringify(envelope));
    await migrateLegacyCacheOnce();
  };

  /**
   * The offline fallback. The v2 key is authoritative: if it exists, its items
   * are shown even when empty (the last fetch genuinely returned none).
   * Only when the v2 key is absent do we run the one-time legacy migration.
   */
  const applyCachedListings = async (): Promise<void> => {
    const raw = await AsyncStorage.getItem(CACHE_KEY_V2);
    if (raw !== null) {
      const parsed = parseCachedCache(raw);
      setListings(parsed.items);
      setLastUpdatedAt(parsed.savedAt);
      setIsOffline(true);
      return;
    }
    const legacyItems = await migrateLegacyCacheOnce();
    setListings(legacyItems);
    setLastUpdatedAt(null);
    setIsOffline(true);
  };

  /**
   * Per-user "my listings" offline copy, so one account's merchant view can
   * never show another's. Keyed by the active account's email (the StoredAccount
   * has no user_id). Cleared when the active email changes or the session ends.
   */
  const mineCacheKey = (email: string): string => `${MINE_KEY_PREFIX}_${email}`;

  const loadMyListingsFromCache = async (
    setCached: (items: Listing[]) => void,
  ): Promise<void> => {
    const session = await AuthService.getActiveSession();
    if (!session?.email) return;
    const parsed = parseCachedCache(await AsyncStorage.getItem(mineCacheKey(session.email)));
    setCached(parsed.items);
    setIsOffline(true);
  };

  const saveMyListingsCache = async (rawItems: unknown[]): Promise<void> => {
    const session = await AuthService.getActiveSession();
    if (!session?.email) return;
    const envelope = {
      version: 2,
      savedAt: new Date().toISOString(),
      items: rawItems,
    };
    await AsyncStorage.setItem(mineCacheKey(session.email), JSON.stringify(envelope));
  };

  /** Clear the previous account's saved copy when the email changes or logs out. */
  const clearStaleMineCache = async (sessionEmail: string | null): Promise<void> => {
    if (mineCacheForRef.current !== null && mineCacheForRef.current !== sessionEmail) {
      await AsyncStorage.removeItem(mineCacheKey(mineCacheForRef.current));
    }
    mineCacheForRef.current = sessionEmail;
  };

  const loadListings = async () => {
    try {
      const response = await MarketplaceApi.getListings();

      if (response.success && Array.isArray(response.data)) {
        const mappedListings = mapServerListings(response.data);
        setListings(mappedListings);
        setLastUpdatedAt(new Date().toISOString());
        setIsOffline(false);
        // Cache the exact server payload for offline use.
        await saveListingsCache(Array.isArray(response.data) ? response.data : []);
      } else {
        // Failed to fetch: try the cache, then the empty state
        await applyCachedListings();
      }
    } catch (error) {
      if (isNetworkError(error)) logApiIssue('MarketplaceContext', 'network', 'unreachable');
      else console.error('[MarketplaceContext] Failed to load listings:', error);
      try {
        await applyCachedListings();
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyListings = async () => {
    const session = await AuthService.getActiveSession();
    await clearStaleMineCache(session?.email ?? null);
    try {
      const response = await MarketplaceApi.getMyListings();
      if (response.success && Array.isArray(response.data)) {
        setMyListings(mapServerListings(response.data));
        await saveMyListingsCache(Array.isArray(response.data) ? response.data : []);
      } else if (session?.email) {
        await loadMyListingsFromCache(setMyListings);
      }
    } catch (error) {
      if (isNetworkError(error)) logApiIssue('MarketplaceContext', 'network', 'unreachable');
      else console.error('[MarketplaceContext] Failed to load my listings:', error);
      if (session?.email) await loadMyListingsFromCache(setMyListings);
    }
  };

  const refreshListings = async () => {
    try {
      const response = await MarketplaceApi.getListings();
      if (response.success && Array.isArray(response.data)) {
        const mappedListings = mapServerListings(response.data);
        setListings(mappedListings);
        setLastUpdatedAt(new Date().toISOString());
        setIsOffline(false);
        await saveListingsCache(Array.isArray(response.data) ? response.data : []);
      } else {
        await applyCachedListings();
      }
    } catch (error) {
      if (isNetworkError(error)) logApiIssue('MarketplaceContext', 'network', 'unreachable');
      else console.error('[MarketplaceContext] Failed to refresh listings:', error);
      try {
        await applyCachedListings();
      } catch {}
    }
  };

  const refreshMyListings = async () => {
    const session = await AuthService.getActiveSession();
    await clearStaleMineCache(session?.email ?? null);
    try {
      const response = await MarketplaceApi.getMyListings();
      if (response.success && Array.isArray(response.data)) {
        setMyListings(mapServerListings(response.data));
        await saveMyListingsCache(Array.isArray(response.data) ? response.data : []);
      } else if (session?.email) {
        await loadMyListingsFromCache(setMyListings);
      }
    } catch (error) {
      if (isNetworkError(error)) logApiIssue('MarketplaceContext', 'network', 'unreachable');
      else console.error('[MarketplaceContext] Failed to refresh my listings:', error);
      if (session?.email) await loadMyListingsFromCache(setMyListings);
    }
  };

  const createListing = async (
    emailOrInput: string | LegacyCreateListingInput,
    maybeInput?: LegacyCreateListingInput,
  ): Promise<{ success: boolean; listing?: Listing; error?: string; fieldErrors?: Record<string, string> }> => {
    // Support both old signature createListing(email, input) and new createListing(input)
    const input = typeof emailOrInput === 'string' ? maybeInput : emailOrInput;

    if (!input) {
      return { success: false, error: 'Please check the listing details and try again.' };
    }

    const response = await MarketplaceApi.createListing(toCreateListingRequest(input));

    if (response.success && response.data) {
      // Refresh both lists
      await refreshListings();
      await refreshMyListings();
      return { success: true, listing: mapServerListing(response.data) };
    }

    return { success: false, error: response.error, fieldErrors: response.fieldErrors };
  };

  const cancelListing = async (listingId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    // cancelListing is an alias for removeListing (old signature)
    return removeListing(listingId, reason);
  };

  const getListingsBySeller = (sellerUserId: string): Listing[] => {
    return listings.filter(listing => listing.seller_user_id === sellerUserId);
  };

  const removeListing = async (listingId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    const response = await MarketplaceApi.removeListing(listingId, reason);
    
    if (response.success) {
      // Refresh both lists
      await refreshListings();
      await refreshMyListings();
      return { success: true };
    }
    
    return { success: false, error: response.error };
  };

  const deleteListingPermanently = async (listingId: string): Promise<{ success: boolean; error?: string }> => {
    const response = await MarketplaceApi.deleteListingPermanently(listingId);
    
    if (response.success) {
      // Refresh both lists
      await refreshListings();
      await refreshMyListings();
      return { success: true };
    }
    
    return { success: false, error: response.error };
  };

  const submitAppeal = async (listingId: string, message: string): Promise<{ success: boolean; error?: string }> => {
    const response = await MarketplaceApi.appealListing(listingId, message);
    
    if (response.success) {
      // Refresh my listings to see updated appeal status
      await refreshMyListings();
      return { success: true };
    }
    
    return { success: false, error: response.error };
  };

  const getListingById = (id: string): Listing | undefined => {
    return listings.find(listing => listing.id === id) || myListings.find(listing => listing.id === id);
  };

  const getActiveListings = (): Listing[] => {
    return listings.filter(listing => listing.status === 'active');
  };

  return (
    <MarketplaceContext.Provider
      value={{
        listings,
        myListings,
        isLoading,
        isOffline,
        lastUpdatedAt,
        createListing,
        getListingById,
        getActiveListings,
        getListingsBySeller,
        cancelListing,
        removeListing,
        deleteListingPermanently,
        submitAppeal,
        refreshListings,
        refreshMyListings,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};
