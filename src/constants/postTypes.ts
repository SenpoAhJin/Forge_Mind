/**
 * Post Type Constants
 * Single source of truth for post type labels and community captions
 */

import type { PostType } from '../types/marketplace';

export const POST_TYPE_LABELS: Record<PostType, string> = {
  sell: 'Selling',
  buy: 'Buying',
  trade: 'Trading',
  rent: 'Renting out',
  service_offer: 'Offering a service',
  service_request: 'Looking for a service',
};

export const POST_TYPE_CAPTIONS: Record<PostType, string> = {
  sell: 'WTS / FS',
  buy: 'WTB / LF',
  trade: 'WTT',
  rent: 'For rent',
  service_offer: 'MTO / commissions',
  service_request: 'Commission request',
};

export const POST_TYPE_MONEY_LABELS: Record<PostType, string> = {
  sell: 'Price',
  buy: 'Budget',
  trade: 'Estimated Value',
  rent: 'Rental Fee',
  service_offer: 'Rate',
  service_request: 'Budget',
};
