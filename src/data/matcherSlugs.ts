/**
 * Flask Matcher Slug Mapping
 * 
 * Maps mobile variant_id to Flask character_variant_id (file name without .json).
 * Only confirmed matches are included. Missing entries mean no Flask data exists yet.
 * 
 * Match criteria: character name and variant name must match Flask JSON fields
 * (character, variant) not file path or guessed slugs.
 */

export const MATCHER_SLUG_MAP: Record<string, string> = {
  // Gojo Satoru - Jujutsu Kaisen
  'var-gojo-s2-uniform': 'gojo-satoru_season-2-uniform',
  
  // Note: Other mobile variants (Makima, Zelda, Veira) have no Flask data files yet.
  // Flask files exist for: asta, luck-voltia, oc_cyberpunk-street, raiden, spiderman
  // but mobile catalog does not include these characters.
};

/**
 * Get Flask matcher slug for a mobile variant ID
 * @param variantId Mobile variant_id (e.g. "var-gojo-s2-uniform")
 * @returns Flask file ID or undefined if no mapping exists
 */
export function getMatcherSlug(variantId: string): string | undefined {
  return MATCHER_SLUG_MAP[variantId];
}
