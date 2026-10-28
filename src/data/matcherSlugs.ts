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
  // Gojo Satoru - Jujutsu Kaisen (4 variants)
  'var-gojo-s2-uniform': 'gojo-satoru_season-2-uniform',
  'var-gojo-vol0-outfit': 'gojo-satoru_vol0-outfit',
  'var-gojo-casual-streetwear': 'gojo-satoru_casual-streetwear',
  'var-gojo-unsealed-past': 'gojo-satoru_unsealed-past',
  
  // Makima - Chainsaw Man (3 variants)
  'var-makima-suit': 'makima_public-safety-suit',
  'var-makima-casual-business': 'makima_casual-business',
  'var-makima-halloween': 'makima_halloween',
  
  // Zelda - Breath of the Wild / TotK (3 variants)
  'var-zelda-traveling-dress': 'zelda_traveling-dress',
  'var-zelda-totk-gown': 'zelda_totk-gown',
  'var-zelda-royal-gown': 'zelda_royal-gown',
  
  // Veira - Original Character (2 variants)
  'var-veira-emerald-armor': 'veira_emerald-armor',
  'var-veira-scholar-robes': 'veira_scholar-robes',
};

/**
 * Get Flask matcher slug for a mobile variant ID
 * @param variantId Mobile variant_id (e.g. "var-gojo-s2-uniform")
 * @returns Flask file ID or undefined if no mapping exists
 */
export function getMatcherSlug(variantId: string): string | undefined {
  return MATCHER_SLUG_MAP[variantId];
}
