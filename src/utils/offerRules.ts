/**
 * ForgeMind - Offer rules (FE-6 Step 3)
 *
 * Which offer types may be made against a given listing category.
 * Services (commission listings) are negotiated as commissions only; physical
 * goods support cash purchase or item-for-item trade offers.
 */

import { OfferType } from '../types/offers';

const COMMISSION_ONLY_CATEGORIES = [
  'Commissions & Crafting Services',
  'Photography Services',
];

export const getAllowedOfferTypes = (category: string): OfferType[] => {
  if (COMMISSION_ONLY_CATEGORIES.includes(category)) {
    return ['commission'];
  }
  return ['purchase', 'trade'];
};

export const isOfferTypeAllowed = (category: string, offerType: OfferType): boolean =>
  getAllowedOfferTypes(category).includes(offerType);