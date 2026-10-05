/**
 * Post Type Helper Functions
 * Handles backward compatibility with old transaction_type field
 */

import type { Listing, PostType } from '../types/marketplace';

/**
 * Get effective post type for a listing, handling legacy transaction_type.
 * The server stores sell, trade and commission. 'commission' predates the
 * six-value PostType union as a service_offer, so it maps to that here.
 */
export function getEffectivePostType(listing: Listing): PostType {
  // New listings have post_type
  if (listing.post_type) {
    return listing.post_type === 'commission' ? 'service_offer' : listing.post_type;
  }

  // Legacy listings: map transaction_type
  if (listing.transaction_type === 'trade') {
    return 'trade';
  }

  // 'buy' and 'both' both map to 'sell'
  // ('both' sets open_to_trade flag separately)
  return 'sell';
}

/**
 * Check if listing is open to trade offers. The server sends the flag itself,
 * so there is no legacy 'both' transaction type left to fall back to.
 */
export function isOpenToTrade(listing: Listing): boolean {
  return listing.open_to_trade === true;
}

/**
 * Get the money value for display (handles different field names per type)
 */
export function getListingMoneyValue(listing: Listing): number | null {
  const postType = getEffectivePostType(listing);
  
  switch (postType) {
    case 'sell':
      return listing.price ?? null;
    case 'buy':
    case 'service_request':
      return listing.budget ?? null;
    case 'service_offer':
      return listing.rate ?? null;
    case 'rent':
      return listing.rental_fee ?? null;
    case 'trade':
      return listing.trade_estimated_value ?? null;
    default:
      return null;
  }
}
