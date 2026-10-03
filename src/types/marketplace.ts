/**
 * ForgeMind - Marketplace Types (FE-6 Step 1 + Post Types)
 *
 * MOCK DATA for Phase 1. Real backend schema to be defined in Phase 2.
 * Field names follow the project's convention (snake_case for data fields).
 */

export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'well_loved';

export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'blocked';

// Legacy field - kept for old listings
export type TransactionType = 'buy' | 'trade' | 'both';

// New post type field
export type PostType = 'sell' | 'buy' | 'trade' | 'rent' | 'service_offer' | 'service_request';

export type HandoffMethod = 'meetup' | 'courier' | 'either';

export type RemovedReason = 'sold_elsewhere' | 'no_longer_available' | 'posted_by_mistake' | 'other';

// Outcome of the permitted-category screener for a listing (FE-6 Step 2).
// 'blocked' = failed the screen at the point of posting and never went public.
export type ScreeningResult = 'passed' | 'blocked';

// Seller appeal path (spec: "Holder appeal path ... for disputed blocks").
export type AppealStatus = 'none' | 'pending' | 'upheld' | 'overturned';

export interface Listing {
  id: string;                          // Mock UUID-style (e.g. "listing-gojo-wig")
  seller_email: string;                // Links to StoredAccount
  title: string;
  description: string;
  category: string;                    // From permitted-category list
  
  // Post type (new)
  post_type?: PostType;                // Optional for backward compatibility
  
  // Legacy field - kept for old listings without post_type
  transaction_type?: TransactionType;  // Mapped: buy->sell, trade->trade, both->sell+open_to_trade
  
  // Type-specific fields
  price?: number;                      // sell: required >0
  budget?: number;                     // buy, service_request: optional >0
  rate?: number;                       // service_offer: optional >0
  rental_fee?: number;                 // rent: optional >0
  rental_period_days?: number;         // rent: optional >0
  deposit_note?: string;               // rent: informational text only
  trade_offered_item?: string;         // trade: what seller offers
  trade_wanted_item?: string;          // trade: what seller wants
  trade_estimated_value?: number;      // trade: optional estimate
  request_deadline?: string;           // service_request: YYYY-MM-DD
  handoff_method?: HandoffMethod;      // optional, informational
  
  // Trade compatibility flag
  open_to_trade?: boolean;             // sell: whether to accept trade offers
  
  condition: MarketplaceCondition;
  photos: string[];                    // Mock: can be empty array or placeholder URLs
  status: ListingStatus;
  
  // Removal fields
  removed_at?: string;                 // ISO timestamp
  removed_reason?: RemovedReason;      // Optional reason
  
  screening_result: ScreeningResult;   // Explicit screen outcome, queryable independent of later sold/cancelled
  screening_reason?: string;           // Plain-language reason, populated only when blocked
  appeal_status?: AppealStatus;        // Defaults to 'none'; tracks the Holder-appeal path
  appeal_message?: string;             // The seller's appeal text, if submitted
  created_at: string;                  // ISO timestamp
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  post_type: PostType;
  
  // Type-specific fields (validated per post_type)
  price?: number;
  budget?: number;
  rate?: number;
  rental_fee?: number;
  rental_period_days?: number;
  deposit_note?: string;
  trade_offered_item?: string;
  trade_wanted_item?: string;
  trade_estimated_value?: number;
  request_deadline?: string;
  handoff_method?: HandoffMethod;
  open_to_trade?: boolean;
  
  condition: MarketplaceCondition;
  photos: string[];
}
