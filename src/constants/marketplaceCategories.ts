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
] as const;

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number];

export const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  well_loved: 'Well Loved',
};

/**
 * Category-to-Post-Type mapping.
 * Defines which transaction types are allowed for each category.
 * Must match backend validation in forgemind-backend/src/marketplace/postTypeRules.ts
 */
export const CATEGORY_POST_TYPE_RULES: Record<string, string[]> = {
  'Costumes & Cosplay': ['sell', 'trade'],
  'Wigs': ['sell', 'trade'],
  'Props & Accessories': ['sell', 'trade'],
  'Materials & Fabric': ['sell', 'trade'],
  'Makeup & Contacts': ['sell', 'trade'],
  'Photography Services': ['commission'],
  'Commissions & Crafting Services': ['commission'],
};

/**
 * Get allowed post types for a category.
 * Returns ['sell'] as fallback for unknown categories.
 */
export function getAllowedPostTypesForCategory(category: string): string[] {
  return CATEGORY_POST_TYPE_RULES[category] || ['sell', 'trade'];
}

/**
 * Check if a post type is allowed for a category.
 */
export function isPostTypeAllowedForCategory(category: string, postType: string): boolean {
  const allowed = getAllowedPostTypesForCategory(category);
  // Map mobile transaction types to backend post types
  const serverPostType = postType === 'buy' || postType === 'both' ? 'sell' : postType;
  return allowed.includes(serverPostType);
}
