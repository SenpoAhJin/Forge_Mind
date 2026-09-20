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

// MOCK / DEMO blocklist — NOT a production moderation list. Replaced by
// real classification (Phase 4) against the permitted-category list.
//
// This is an ILLUSTRATIVE, NON-EXHAUSTIVE set of obviously off-topic /
// prohibited terms, organized by category so it is easy to extend while
// hand-testing. A real production system would need proper NLP /
// classification (Phase 4), not an ever-growing manual word list.
//
// NOTE: matching is a plain case-insensitive substring check, so both
// "firearm" (no space) AND "fire arm" (with space) must exist as separate
// entries — a normalized / fuzzy matcher is Phase 4 work.
//
// KNOWN TRADE-OFF: because this is a substring match, a legitimate cosplay
// listing containing a blocked word (e.g. "prop gun replica") will also be
// blocked. That is an accepted limitation of a demo word-list and is exactly
// the gap the seller appeal path exists for.
const BLOCKLISTED_TERMS: string[] = [
  // Weapons / firearms
  'firearm',
  'fire arm', // space variant: substring check is not normalized
  'weapon',
  'gun',
  'pistol',
  'rifle',
  'shotgun',
  'ammunition',
  'ammo',
  'explosive',
  'grenade',
  // Drugs / controlled substances
  'drug',
  'narcotic',
  'cocaine',
  'heroin',
  'meth',
  // Real estate / vehicles (already present, kept)
  'real estate',
  'vehicle for sale',
  'car for sale',
  'motorcycle for sale',
  // Live animals
  'live animal',
  'puppy for sale',
  'kitten for sale',
  // Counterfeit / illegal goods
  'counterfeit',
  'fake id',
  'stolen',
  // Adult content (kept generic and mild — demo list only)
  'explicit adult content',
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