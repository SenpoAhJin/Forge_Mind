/**
 * ForgeMind — Listing Screener (FE-6 Step 2 of 4)
 *
 * THIS IS A MOCK RULE-BASED SCREENER for Phase 1 front-end development.
 * Real image + text classification against a permitted-category list is
 * Phase 4 (AI/ML Layer) per the build plan — see
 * ForgeMind_Overall_Data_Information.docx.
 *
 * It runs at the point of posting: category validity plus a short
 * keyword check. It exists so the "every submitted listing is screened"
 * requirement is testable end-to-end with mock data.
 */

import { MARKETPLACE_CATEGORIES } from '../constants/marketplaceCategories';

// MOCK / DEMO blocklist — NOT a production moderation list.
// A short, defensible set of obviously off-topic/prohibited terms for
// hand-testing the screener. Replaced by real classification in Phase 4.
const BLOCKLISTED_TERMS: string[] = [
  'firearm',
  'weapon',
  'drug',
  'real estate',
  'vehicle for sale',
];

export interface ScreenableListing {
  title: string;
  description: string;
  category: string;
}

export interface ScreeningResult {
  passed: boolean;
  reason?: string;
}

export const screenListing = (listing: ScreenableListing): ScreeningResult => {
  // Check 1 — category must be one of the permitted marketplace categories.
  // Defensive: the create form already uses the same picker, but this
  // guards against any future entry point that might bypass it.
  if (!(MARKETPLACE_CATEGORIES as readonly string[]).includes(listing.category)) {
    return {
      passed: false,
      reason: `Category '${listing.category}' is not a recognized marketplace category.`,
    };
  }

  // Check 2 — keyword blocklist (case-insensitive) across title + description.
  // The specific triggering term is deliberately NOT revealed in the reason:
  // that mirrors how real moderation systems avoid teaching sellers how to
  // word around the filter.
  const haystack = `${listing.title} ${listing.description}`.toLowerCase();
  if (BLOCKLISTED_TERMS.some(term => haystack.includes(term))) {
    return {
      passed: false,
      reason:
        'Listing content did not match the cosplay-community permitted-category list. If you believe this is a mistake, you can appeal below.',
    };
  }

  return { passed: true };
};