/**
 * ForgeMind - Marketplace Context (FE-6 Step 1)
 *
 * Manages marketplace listings (mock data, in-memory for Phase 1).
 * Uses same persistence pattern as OwnedAttireContext (AsyncStorage).
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Listing, CreateListingInput } from '../types/marketplace';
import seedListings from '../data/marketplace_listings.json';

const STORAGE_KEY = '@forgemind:marketplace_listings';

interface MarketplaceContextType {
  listings: Listing[];
  isLoading: boolean;
  createListing: (sellerEmail: string, input: CreateListingInput) => Promise<Listing>;
  getListingById: (id: string) => Listing | undefined;
  getActiveListings: () => Listing[];
  getListingsBySeller: (sellerEmail: string) => Listing[];
  cancelListing: (id: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  // Load listings from AsyncStorage on mount
  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setListings(JSON.parse(stored));
      } else {
        // First load: seed with mock data
        setListings(seedListings as Listing[]);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seedListings));
      }
    } catch (error) {
      console.error('[MarketplaceContext] Failed to load listings:', error);
      setListings(seedListings as Listing[]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveListings = async (updatedListings: Listing[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedListings));
      setListings(updatedListings);
    } catch (error) {
      console.error('[MarketplaceContext] Failed to save listings:', error);
    }
  };

  const createListing = async (sellerEmail: string, input: CreateListingInput): Promise<Listing> => {
    const newListing: Listing = {
      id: `listing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      seller_email: sellerEmail,
      title: input.title,
      description: input.description,
      category: input.category,
      price: input.price,
      condition: input.condition,
      photos: input.photos,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    const updatedListings = [newListing, ...listings];
    await saveListings(updatedListings);
    return newListing;
  };

  const getListingById = (id: string): Listing | undefined => {
    return listings.find(listing => listing.id === id);
  };

  const getActiveListings = (): Listing[] => {
    return listings.filter(listing => listing.status === 'active');
  };

  const getListingsBySeller = (sellerEmail: string): Listing[] => {
    return listings.filter(listing => listing.seller_email === sellerEmail);
  };

  const cancelListing = async (id: string): Promise<void> => {
    const updatedListings = listings.map(listing =>
      listing.id === id ? { ...listing, status: 'cancelled' as const } : listing
    );
    await saveListings(updatedListings);
  };

  return (
    <MarketplaceContext.Provider
      value={{
        listings,
        isLoading,
        createListing,
        getListingById,
        getActiveListings,
        getListingsBySeller,
        cancelListing,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};
