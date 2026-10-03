/**
 * Post Type Helper Functions
 * Handles backward compatibility with old transaction_type field
 */

import type { Listing, PostType } from '../types/marketplace';

/**
 * Get effective post type for a listing, handling legacy transaction_type.
 * Mapping: buy -> sell, trade -> trade, both -> sell (with open_to_trade flag)
 */
export function getEffectivePostType(listing: Listing): PostType {
  // New listings have post_type
  if (listing.post_type) {
    return listing.post_type;
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
 * Check if listing is open to trade offers (handles legacy 'both' type)
 */
export function isOpenToTrade(listing: Listing): boolean {
  if (listing.open_to_trade !== undefined) {
    return listing.open_to_trade;
  }
  
  // Legacy: 'both' means open to trade
  return listing.transaction_type === 'both';
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
