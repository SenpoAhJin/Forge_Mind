/**
 * ForgeMind - Marketplace Types (FE-6 Step 1 + Post Types)
 *
 * The server is the authority for a listing. `Listing` below is the shape the
 * PHONE uses: it is what `mapServerListing` in src/utils/marketplaceMapping.ts
 * produces, so every field has a usable value even when the server sends null
 * or omits it. There is no `seller_email` here on purpose: the server never
 * returns another user's email (privacy rule B1).
 *
 * Field names follow the project's convention (snake_case for data fields).
 */

export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'well_loved';

export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'blocked';

// Legacy field - kept for old listings. The server retired 'buy' in migration 016.
export type TransactionType = 'buy' | 'trade' | 'both';

// The three post types the server actually stores.
export type ServerPostType = 'sell' | 'trade' | 'commission';

// New post type field (the six values a listing may have carried in Phase 1)
export type PostType = 'sell' | 'buy' | 'trade' | 'rent' | 'service_offer' | 'service_request';

export type HandoffMethod = 'meetup' | 'courier' | 'either';

export type RemovedReason = 'sold_elsewhere' | 'no_longer_available' | 'posted_by_mistake' | 'other';

// Outcome of the permitted-category screener for a listing (FE-6 Step 2).
// 'blocked' = failed the screen at the point of posting and never went public.
export type ScreeningResult = 'passed' | 'blocked';

// Seller appeal path (spec: "Holder appeal path ... for disputed blocks").
// These four values are the ones the server's CHECK constraint allows.
export type AppealStatus = 'none' | 'pending' | 'upheld' | 'overturned';

/**
 * A listing as the phone reads it. Every field below is safe to render: an
 * absent number is null, an absent list is an empty array and an absent name
 * is a placeholder. No screen needs a guard on any of them.
 */
export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;

  post_type: ServerPostType;
  /** Alias of post_type. Kept because older screens still read it. */
  transaction_type: ServerPostType;

  condition: string;
  photos: string[];

  // Money fields are null when the listing has no such amount (a commission
  // listing has a rate and no price, for example). 0 is a real amount.
  price: number | null;
  budget: number | null;
  rate: number | null;
  rental_fee: number | null;
  trade_estimated_value: number | null;
  rental_period_days: number | null;
  deposit_note: string | null;
  trade_offered_item: string | null;
  trade_wanted_item: string | null;
  request_deadline: string | null;
  handoff_method: string | null;
  open_to_trade: boolean;

  status: ListingStatus;

  // Screening and appeal state. The public feed omits screening_reason and
  // appeal_status, so both have a fallback in the mapping.
  screening_result: ScreeningResult;
  screening_reason: string | null;
  appeal_status: AppealStatus;
  appeal_message: string | null;
  removed_at: string | null;
  removed_reason: string | null;

  // Seller identity. seller_user_id is the id, seller_name is the display name
  // the seller chose at registration, is_owner is true only for the caller's
  // own listings. No email is involved anywhere.
  seller_user_id: string | null;
  seller_name: string;
  seller_verified: boolean;
  is_owner: boolean;

  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  post_type: ServerPostType;

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
  handoff_method?: string;
  open_to_trade?: boolean;

  condition: MarketplaceCondition;
  photos: string[];
}
