/**
 * ForgeMind - Marketplace Categories (FE-6 Step 1)
 *
 * Draft permitted-category list for marketplace screener.
 * Categories relevant to cosplay community needs.
 * To be refined with real listing data in later phases.
 */

export const MARKETPLACE_CATEGORIES = [
  'Costumes & Cosplay',
  'Wigs',
  'Props & Accessories',
  'Materials & Fabric',
  'Makeup & Contacts',
  'Photography Services',
  'Commissions & Crafting Services',
  'Other',
] as const;

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number];

export const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  well_loved: 'Well Loved',
};
