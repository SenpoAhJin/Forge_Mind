/**
 * ForgeMind - Offers Context (FE-6 Step 3)
 *
 * Manages structured trade / commission / purchase offers (mock data,
 * persisted with the same AsyncStorage pattern as MarketplaceContext).
 * NO seed offers: offers only exist once a user creates them through the flow.
 *
 * Context guards mirror the spec boundary:
 *  - createOffer: listing active, proposer is not the seller, offer type allowed
 *    for the category, and no pending offer by the same proposer on the listing.
 *  - accept/decline: seller only, pending only.
 *  - withdraw: proposer only, pending only.
 *  - For purchase/trade offers, accepting is refused if another offer is already
 *    accepted on the listing. Commissions may be accepted several times.
 * Accepting an offer does NOT change the listing status or any other offers
 * (finalization of the listing is explicitly out of scope for this step).
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Offer,
  CreateOfferInput,
  OfferType,
} from '../types/offers';
import { isOfferTypeAllowed } from '../utils/offerRules';
import { useMarketplace } from './MarketplaceContext';

const STORAGE_KEY = '@forgemind:marketplace_offers';

type OfferResult = { success: boolean; error?: string; offer?: Offer };

interface OffersContextType {
  offers: Offer[];
  isLoading: boolean;
  createOffer: (proposerEmail: string, input: CreateOfferInput) => Promise<OfferResult>;
  getOffersSentBy: (email: string) => Offer[];
  getOffersReceivedFor: (sellerEmail: string) => Offer[];
  getOffersForListing: (listingId: string) => Offer[];
  getOfferById: (id: string) => Offer | undefined;
  acceptOffer: (offerId: string, sellerEmail: string) => Promise<OfferResult>;
  declineOffer: (offerId: string, sellerEmail: string) => Promise<OfferResult>;
  withdrawOffer: (offerId: string, proposerEmail: string) => Promise<OfferResult>;
}

const OffersContext = createContext<OffersContextType | undefined>(undefined);

export const useOffers = (): OffersContextType => {
  const context = useContext(OffersContext);
  if (!context) {
    throw new Error('useOffers must be used within OffersProvider');
  }
  return context;
};

// Display names are snapshotted as the email handle, matching the seller name
// derivation used across the marketplace surface.
const displayNameFromEmail = (email: string): string => email.split('@')[0];

export const OffersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getListingById } = useMarketplace();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setOffers(JSON.parse(stored));
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error('[OffersContext] Failed to load offers:', error);
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveOffers = async (updatedOffers: Offer[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOffers));
      setOffers(updatedOffers);
    } catch (error) {
      console.error('[OffersContext] Failed to save offers:', error);
    }
  };

  const createOffer = async (proposerEmail: string, input: CreateOfferInput): Promise<OfferResult> => {
    const listing = getListingById(input.listing_id);
    if (!listing) {
      return { success: false, error: 'That listing no longer exists.' };
    }
    if (listing.status !== 'active') {
      return { success: false, error: 'That listing is no longer accepting offers.' };
    }
    if (listing.seller_email === proposerEmail) {
      return { success: false, error: 'You cannot make an offer on your own listing.' };
    }
    if (!isOfferTypeAllowed(listing.category, input.offer_type)) {
      return { success: false, error: 'That offer type is not available for this listing.' };
    }

    const existingPending = offers.some(
      offer =>
        offer.listing_id === input.listing_id &&
        offer.proposer_email === proposerEmail &&
        offer.status === 'pending'
    );
    if (existingPending) {
      return { success: false, error: 'You already have a pending offer on this listing.' };
    }

    const newOffer: Offer = {
      id: `offer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      listing_id: listing.id,
      listing_title: listing.title,
      listing_price: listing.price,
      listing_seller_email: listing.seller_email,
      seller_display_name: displayNameFromEmail(listing.seller_email),
      proposer_email: proposerEmail,
      proposer_display_name: displayNameFromEmail(proposerEmail),
      offer_type: input.offer_type,
      status: 'pending',
      offered_price: input.offered_price,
      trade_offered_item: input.trade_offered_item,
      trade_offered_condition: input.trade_offered_condition,
      trade_offered_est_value: input.trade_offered_est_value,
      commission_description: input.commission_description,
      timeline_days: input.timeline_days,
      created_at: new Date().toISOString(),
    };

    const updatedOffers = [newOffer, ...offers];
    await saveOffers(updatedOffers);
    return { success: true, offer: newOffer };
  };

  const getOffersSentBy = (email: string): Offer[] => {
    return offers.filter(offer => offer.proposer_email === email);
  };

  const getOffersReceivedFor = (sellerEmail: string): Offer[] => {
    return offers.filter(offer => offer.listing_seller_email === sellerEmail);
  };

  const getOffersForListing = (listingId: string): Offer[] => {
    return offers.filter(offer => offer.listing_id === listingId);
  };

  const getOfferById = (id: string): Offer | undefined => {
    return offers.find(offer => offer.id === id);
  };

  const acceptOffer = async (offerId: string, sellerEmail: string): Promise<OfferResult> => {
    const offer = getOfferById(offerId);
    if (!offer) {
      return { success: false, error: 'Offer not found.' };
    }
    if (offer.listing_seller_email !== sellerEmail) {
      return { success: false, error: 'Only the seller can accept this offer.' };
    }
    if (offer.status !== 'pending') {
      return { success: false, error: 'Only pending offers can be accepted.' };
    }
    if (offer.offer_type !== 'commission') {
      const listingOffers = getOffersForListing(offer.listing_id);
      const alreadyAccepted = listingOffers.some(
        other => other.id !== offer.id && other.status === 'accepted'
      );
      if (alreadyAccepted) {
        return {
          success: false,
          error: 'Another offer is already accepted on this listing. One item can only be sold or traded once.',
        };
      }
    }

    const updatedOffers = offers.map(current =>
      current.id === offerId
        ? { ...current, status: 'accepted' as const, responded_at: new Date().toISOString() }
        : current
    );
    await saveOffers(updatedOffers);
    return { success: true };
  };

  const declineOffer = async (offerId: string, sellerEmail: string): Promise<OfferResult> => {
    const offer = getOfferById(offerId);
    if (!offer) {
      return { success: false, error: 'Offer not found.' };
    }
    if (offer.listing_seller_email !== sellerEmail) {
      return { success: false, error: 'Only the seller can decline this offer.' };
    }
    if (offer.status !== 'pending') {
      return { success: false, error: 'Only pending offers can be declined.' };
    }

    const updatedOffers = offers.map(current =>
      current.id === offerId
        ? { ...current, status: 'declined' as const, responded_at: new Date().toISOString() }
        : current
    );
    await saveOffers(updatedOffers);
    return { success: true };
  };

  const withdrawOffer = async (offerId: string, proposerEmail: string): Promise<OfferResult> => {
    const offer = getOfferById(offerId);
    if (!offer) {
      return { success: false, error: 'Offer not found.' };
    }
    if (offer.proposer_email !== proposerEmail) {
      return { success: false, error: 'Only the proposer can withdraw this offer.' };
    }
    if (offer.status !== 'pending') {
      return { success: false, error: 'Only pending offers can be withdrawn.' };
    }

    const updatedOffers = offers.map(current =>
      current.id === offerId
        ? { ...current, status: 'withdrawn' as const, responded_at: new Date().toISOString() }
        : current
    );
    await saveOffers(updatedOffers);
    return { success: true };
  };

  return (
    <OffersContext.Provider
      value={{
        offers,
        isLoading,
        createOffer,
        getOffersSentBy,
        getOffersReceivedFor,
        getOffersForListing,
        getOfferById,
        acceptOffer,
        declineOffer,
        withdrawOffer,
      }}
    >
      {children}
    </OffersContext.Provider>
  );
};