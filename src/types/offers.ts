/**
 * ForgeMind - Offer Types (FE-6 Step 3)
 *
 * Structured Trade / Commission / Purchase offers. Final agreements must be
 * recorded as structured offers; free-text messaging is a separate surface
 * (FE-6 Step 4) and intentionally has NO field here.
 *
 * MOCK DATA for Phase 1. Real backend schema to be defined in Phase 2.
 * Field names follow the project's convention (snake_case for data fields).
 */

import { MarketplaceCondition } from './marketplace';

export type OfferType = 'purchase' | 'trade' | 'commission';

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface Offer {
  id: string;                          // Mock UUID-style (e.g. "offer-2m9df8k4")
  listing_id: string;                  // The listing this offer is against
  listing_title: string;               // Snapshot of the listing title at offer time
  listing_price: number;               // Snapshot of the listing's asking price
  listing_seller_email: string;
  seller_display_name: string;         // Snapshot, surface display only
  proposer_email: string;
  proposer_display_name: string;       // Snapshot, surface display only
  offer_type: OfferType;
  status: OfferStatus;                 // Always 'pending' at creation
  // purchase + commission: the buyer's proposed amount
  offered_price?: number;
  // trade fields
  trade_offered_item?: string;
  trade_offered_condition?: MarketplaceCondition;
  trade_offered_est_value?: number;    // Optional, buyer-provided estimate
  // commission fields
  commission_description?: string;
  timeline_days?: number;              // Integer, 1-365
  created_at: string;                  // ISO timestamp
  responded_at?: string;               // ISO timestamp, set when status leaves 'pending'
}

export interface CreateOfferInput {
  listing_id: string;
  offer_type: OfferType;
  offered_price?: number;
  trade_offered_item?: string;
  trade_offered_condition?: MarketplaceCondition;
  trade_offered_est_value?: number;
  commission_description?: string;
  timeline_days?: number;
}