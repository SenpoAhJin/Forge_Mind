/**
 * ForgeMind - Marketplace Types (FE-6 Step 1)
 *
 * MOCK DATA for Phase 1. Real backend schema to be defined in Phase 2.
 * Field names follow the project's convention (snake_case for data fields).
 */

export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'well_loved';

export type ListingStatus = 'active' | 'sold' | 'cancelled';

export interface Listing {
  id: string;                          // Mock UUID-style (e.g. "listing-gojo-wig")
  seller_email: string;                // Links to StoredAccount
  title: string;
  description: string;
  category: string;                    // From permitted-category list
  price: number;
  condition: MarketplaceCondition;
  photos: string[];                    // Mock: can be empty array or placeholder URLs
  status: ListingStatus;
  created_at: string;                  // ISO timestamp
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  price: number;
  condition: MarketplaceCondition;
  photos: string[];
}
