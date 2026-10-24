/**
 * ForgeMind - Offers Context (FE-6 Step 3 - Server Integration)
 *
 * Manages structured trade / commission / purchase offers from the server.
 * All offer data now comes from forgemind-backend/src/marketplace/offersRouter.ts.
 *
 * Context guards mirror the server rules:
 *  - createOffer: listing active, proposer is not the seller, offer type allowed
 *    for the category, and no pending offer by the same proposer on the listing.
 *  - accept/decline: seller only, pending only.
 *  - withdraw: proposer only, pending only.
 *  - For purchase/trade offers, accepting is refused if another offer is already
 *    accepted on the listing (enforced server-side). Commissions may be accepted multiple times.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Offer,
  CreateOfferInput,
} from '../types/offers';
import * as OffersApi from '../services/OffersApi';
import { useUser } from './UserContext';

type OfferResult = { success: boolean; error?: string; offer?: Offer };

interface OffersContextType {
  offers: Offer[];
  isLoading: boolean;
  needsRelogin: boolean;  // True if user session lacks user_id
  createOffer: (proposerEmail: string, input: CreateOfferInput) => Promise<OfferResult>;
  getOffersSentBy: (email: string) => Offer[];
  getOffersReceivedFor: (sellerEmail: string) => Offer[];
  getOffersForListing: (listingId: string) => Offer[];
  getOfferById: (id: string) => Offer | undefined;
  acceptOffer: (offerId: string, sellerEmail: string) => Promise<OfferResult>;
  declineOffer: (offerId: string, sellerEmail: string) => Promise<OfferResult>;
  withdrawOffer: (offerId: string, proposerEmail: string) => Promise<OfferResult>;
  confirmOffer: (offerId: string) => Promise<OfferResult>;
  refreshOffers: () => Promise<void>;
}

const OffersContext = createContext<OffersContextType | undefined>(undefined);

export const useOffers = (): OffersContextType => {
  const context = useContext(OffersContext);
  if (!context) {
    throw new Error('useOffers must be used within OffersProvider');
  }
  return context;
};

export const OffersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Combined offers array for backward compatibility
  const offers = [...sentOffers, ...receivedOffers];
  
  // Check if user session lacks user_id (old cached session)
  const needsRelogin = user !== null && !user.user_id;

  const refreshOffers = useCallback(async () => {
    if (!user?.user_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [sentResult, receivedResult] = await Promise.all([
        OffersApi.getSentOffers(user.user_id),
        OffersApi.getReceivedOffers(user.user_id),
      ]);

      if (sentResult.success) {
        setSentOffers(sentResult.offers);
      }
      if (receivedResult.success) {
        setReceivedOffers(receivedResult.offers);
      }
    } catch (error) {
      console.error('[OffersContext] Failed to refresh offers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    refreshOffers();
  }, [refreshOffers]);

  const createOffer = async (proposerEmail: string, input: CreateOfferInput): Promise<OfferResult> => {
    const result = await OffersApi.createOffer(input);
    
    if (result.success) {
      // Add to local state immediately for optimistic UI
      setSentOffers(prev => [result.offer, ...prev]);
      return { success: true, offer: result.offer };
    }
    
    return { success: false, error: result.error };
  };

  const getOffersSentBy = (email: string): Offer[] => {
    // email parameter kept for backward compatibility but not used
    // since we're already filtering by current user on the server
    return sentOffers;
  };

  const getOffersReceivedFor = (sellerEmail: string): Offer[] => {
    // email parameter kept for backward compatibility but not used
    // since we're already filtering by current user (as seller) on the server
    return receivedOffers;
  };

  const getOffersForListing = (listingId: string): Offer[] => {
    return offers.filter(offer => offer.listing_id === listingId);
  };

  const getOfferById = (id: string): Offer | undefined => {
    return offers.find(offer => offer.id === id);
  };

  const acceptOffer = async (offerId: string, sellerEmail: string): Promise<OfferResult> => {
    const result = await OffersApi.acceptOffer(offerId);
    
    if (result.success) {
      // Update local state
      setReceivedOffers(prev =>
        prev.map(offer =>
          offer.id === offerId
            ? { ...offer, status: 'accepted', responded_at: new Date().toISOString() }
            : offer
        )
      );
      return { success: true };
    }
    
    return { success: false, error: result.error };
  };

  const declineOffer = async (offerId: string, sellerEmail: string): Promise<OfferResult> => {
    const result = await OffersApi.declineOffer(offerId);
    
    if (result.success) {
      // Update local state
      setReceivedOffers(prev =>
        prev.map(offer =>
          offer.id === offerId
            ? { ...offer, status: 'declined', responded_at: new Date().toISOString() }
            : offer
        )
      );
      return { success: true };
    }
    
    return { success: false, error: result.error };
  };

  const withdrawOffer = async (offerId: string, proposerEmail: string): Promise<OfferResult> => {
    const result = await OffersApi.withdrawOffer(offerId);
    
    if (result.success) {
      // Update local state
      setSentOffers(prev =>
        prev.map(offer =>
          offer.id === offerId
            ? { ...offer, status: 'withdrawn', responded_at: new Date().toISOString() }
            : offer
        )
      );
      return { success: true };
    }
    
    return { success: false, error: result.error };
  };

  const confirmOffer = async (offerId: string): Promise<OfferResult> => {
    const result = await OffersApi.confirmOffer(offerId);
    
    if (result.success) {
      // Refresh offers to get updated confirmation status
      await refreshOffers();
      return { success: true };
    }
    
    return { success: false, error: result.error };
  };

  return (
    <OffersContext.Provider
      value={{
        offers,
        isLoading,
        needsRelogin,
        createOffer,
        getOffersSentBy,
        getOffersReceivedFor,
        getOffersForListing,
        getOfferById,
        acceptOffer,
        declineOffer,
        withdrawOffer,
        confirmOffer,
        refreshOffers,
      }}
    >
      {children}
    </OffersContext.Provider>
  );
};