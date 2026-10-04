/**
 * ForgeMind - Marketplace Context
 *
 * Manages marketplace listings from the server API.
 * AsyncStorage is used only as an offline cache with a "showing saved copy" note.
 * Three transaction types: sell, trade, commission.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MarketplaceApi, { Listing as ApiListing, CreateListingRequest } from '../services/MarketplaceApi';

const STORAGE_KEY = '@forgemind:marketplace_listings_cache';
const STORAGE_KEY_OLD = '@forgemind:marketplace_listings'; // For clearing old local listings
const STORAGE_KEY_MIGRATED = '@forgemind:marketplace_migrated';

export interface Listing {
  id: string;
  post_type: 'sell' | 'trade' | 'commission';
  transaction_type?: 'sell' | 'trade' | 'commission'; // Deprecated alias for post_type
  title: string;
  description: string;
  category: string;
  condition: string;
  price?: number;
  rate?: number;
  trade_offered_item?: string;
  trade_wanted_item?: string;
  status: 'active' | 'blocked' | 'cancelled' | 'sold';
  screening_result?: 'passed' | 'blocked';
  screening_reason?: string | null;
  appeal_status?: 'none' | 'pending' | 'approved' | 'rejected';
  seller_user_id?: string;
  seller_name?: string;
  seller_email?: string; // Deprecated, use seller_user_id
  photos?: string[]; // Optional array of photo URLs
  created_at: string;
}

interface MarketplaceContextType {
  listings: Listing[];
  myListings: Listing[];
  isLoading: boolean;
  isOffline: boolean;
  createListing: (emailOrInput: string | CreateListingRequest, maybeInput?: CreateListingRequest) => Promise<{ success: boolean; listing?: Listing; error?: string }>;
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
    clearOldLocalListingsOnce();
  }, []);

  /** Clear old AsyncStorage listings once after first successful server fetch */
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

  const loadListings = async () => {
    try {
      const response = await MarketplaceApi.getListings();
      
      if (response.success && response.data) {
        // Map post_type to transaction_type for backward compatibility
        const mappedListings = response.data.map(listing => ({
          ...listing,
          transaction_type: listing.post_type,
        }));
        setListings(mappedListings);
        setIsOffline(false);
        // Cache for offline use
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mappedListings));
      } else {
        // Failed to fetch: try cache
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          setListings(JSON.parse(cached));
          setIsOffline(true);
        } else {
          setListings([]);
        }
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to load listings:', error);
      // Try cache on error
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          setListings(JSON.parse(cached));
          setIsOffline(true);
        }
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyListings = async () => {
    try {
      const response = await MarketplaceApi.getMyListings();
      if (response.success && response.data) {
        // Map post_type to transaction_type for backward compatibility
        const mappedListings = response.data.map(listing => ({
          ...listing,
          transaction_type: listing.post_type,
        }));
        setMyListings(mappedListings);
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to load my listings:', error);
    }
  };

  const refreshListings = async () => {
    try {
      const response = await MarketplaceApi.getListings();
      if (response.success && response.data) {
        // Map post_type to transaction_type for backward compatibility
        const mappedListings = response.data.map(listing => ({
          ...listing,
          transaction_type: listing.post_type,
        }));
        setListings(mappedListings);
        setIsOffline(false);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mappedListings));
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to refresh listings:', error);
    }
  };

  const refreshMyListings = async () => {
    try {
      const response = await MarketplaceApi.getMyListings();
      if (response.success && response.data) {
        // Map post_type to transaction_type for backward compatibility
        const mappedListings = response.data.map(listing => ({
          ...listing,
          transaction_type: listing.post_type,
        }));
        setMyListings(mappedListings);
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to refresh my listings:', error);
    }
  };

  const createListing = async (emailOrInput: string | CreateListingRequest, maybeInput?: CreateListingRequest): Promise<{ success: boolean; listing?: Listing; error?: string }> => {
    // Support both old signature createListing(email, input) and new createListing(input)
    let input: CreateListingRequest = typeof emailOrInput === 'string' ? maybeInput! : emailOrInput;
    
    // Map transaction_type to post_type if needed (backward compatibility)
    if ('transaction_type' in input && !('post_type' in input)) {
      const txType = (input as any).transaction_type;
      input = {
        ...input,
        post_type: txType === 'sell' ? 'sell' : txType === 'trade' ? 'trade' : txType === 'commission' ? 'commission' : 'sell',
      };
    }
    
    const response = await MarketplaceApi.createListing(input);
    
    if (response.success && response.data) {
      // Refresh both lists
      await refreshListings();
      await refreshMyListings();
      return { 
        success: true, 
        listing: { ...response.data, transaction_type: response.data.post_type } 
      };
    }
    
    return { success: false, error: response.error };
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
