/**
 * ForgeMind - Marketplace Types (FE-6 Step 1)
 *
 * MOCK DATA for Phase 1. Real backend schema to be defined in Phase 2.
 * Field names follow the project's convention (snake_case for data fields).
 */

export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'well_loved';

export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'blocked';

export type TransactionType = 'buy' | 'trade' | 'both';

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
  transaction_type: TransactionType;   // Buy (monetary), Trade (barter), or Both
  price: number;                       // Required for 'buy'/'both', can be 0 for 'trade'
  condition: MarketplaceCondition;
  photos: string[];                    // Mock: can be empty array or placeholder URLs
  status: ListingStatus;
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
  transaction_type: TransactionType;
  price: number;
  condition: MarketplaceCondition;
  photos: string[];
}
