/**
 * ForgeMind - Marketplace Context
 *
 * Manages marketplace listings from the server API.
 * AsyncStorage is used only as an offline cache with a "showing saved copy" note.
 * Three transaction types: sell, trade, commission.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MarketplaceApi, { CreateListingRequest } from '../services/MarketplaceApi';
import { mapServerListing, mapServerListings, parseCachedListings } from '../utils/marketplaceMapping';
import type { Listing, ServerPostType } from '../types/marketplace';

// The one server -> phone mapping, re-exported so a screen or a test can reach
// it without this file's React and storage dependencies.
export { mapServerListing, mapServerListings, parseCachedListings };

const STORAGE_KEY = '@forgemind:marketplace_listings_cache';
const STORAGE_KEY_OLD = '@forgemind:marketplace_listings'; // For clearing old local listings
const STORAGE_KEY_MIGRATED = '@forgemind:marketplace_migrated';

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

  // Load listings from server on mount
  useEffect(() => {
    loadListings();
    loadMyListings();
  }, []);

  /** Clear old AsyncStorage listings once, and only after a successful fetch. */
  const clearOldLocalListingsOnce = async () => {
    try {
      const migrated = await AsyncStorage.getItem(STORAGE_KEY_MIGRATED);
      if (!migrated) {
        await AsyncStorage.removeItem(STORAGE_KEY_OLD);
        await AsyncStorage.setItem(STORAGE_KEY_MIGRATED, 'true');
        if (__DEV__) {
          console.log('[MarketplaceContext] Cleared old local listings');
        }
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to clear old listings:', error);
    }
  };

  /**
   * The offline fallback. A cache that is missing, unparsable or in the old
   * local shape is ignored: the answer is always a valid array, so the screen
   * shows its empty state and never a blank page.
   */
  const applyCachedListings = async (): Promise<void> => {
    const cached = parseCachedListings(await AsyncStorage.getItem(STORAGE_KEY));
    setListings(cached);
    setIsOffline(true);
  };

  const loadListings = async () => {
    try {
      const response = await MarketplaceApi.getListings();

      if (response.success && Array.isArray(response.data)) {
        const mappedListings = mapServerListings(response.data);
        setListings(mappedListings);
        setIsOffline(false);
        // Cache for offline use
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mappedListings));
        await clearOldLocalListingsOnce();
      } else {
        // Failed to fetch: try the cache, then the empty state
        await applyCachedListings();
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to load listings:', error);
      try {
        await applyCachedListings();
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyListings = async () => {
    try {
      const response = await MarketplaceApi.getMyListings();
      if (response.success && Array.isArray(response.data)) {
        setMyListings(mapServerListings(response.data));
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to load my listings:', error);
    }
  };

  const refreshListings = async () => {
    try {
      const response = await MarketplaceApi.getListings();
      if (response.success && Array.isArray(response.data)) {
        const mappedListings = mapServerListings(response.data);
        setListings(mappedListings);
        setIsOffline(false);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mappedListings));
        await clearOldLocalListingsOnce();
      } else {
        await applyCachedListings();
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to refresh listings:', error);
      try {
        await applyCachedListings();
      } catch {}
    }
  };

  const refreshMyListings = async () => {
    try {
      const response = await MarketplaceApi.getMyListings();
      if (response.success && Array.isArray(response.data)) {
        setMyListings(mapServerListings(response.data));
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to refresh my listings:', error);
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
