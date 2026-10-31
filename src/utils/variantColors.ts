/**
 * WEAR-2: Variant Target Colors Helper
 * 
 * Loads per-variant, per-slot target colors from variantTargetColors.json.
 * Falls back to neutral grays for unknown variants.
 */

import variantTargetColorsData from '../data/variantTargetColors.json' with { type: 'json' };

export type SlotColorMap = {
  wig: string[];
  top: string[];
  bottom: string[];
  gloves: string[];
  shoes: string[];
};

export interface VariantColors {
  placeholder?: boolean;
  wig: string[];
  top: string[];
  bottom: string[];
  gloves: string[];
  shoes: string[];
}

const DEFAULT_COLORS: VariantColors = {
  placeholder: true,
  wig: ['#F5F5F5'],
  top: ['#808080'],
  bottom: ['#808080'],
  gloves: ['#808080'],
  shoes: ['#808080'],
};

/**
 * Get target colors for a specific variant
 * @param variantId - Variant ID from variants.json
 * @returns Per-slot color arrays
 */
export function getVariantTargetColors(variantId: string | null | undefined): VariantColors {
  if (!variantId) {
    return DEFAULT_COLORS;
  }
  
  const data = variantTargetColorsData as Record<string, VariantColors>;
  return data[variantId] || DEFAULT_COLORS;
}

/**
 * Get target colors for a specific slot of a variant
 * @param variantId - Variant ID
 * @param slot - Slot name (wig, top, bottom, gloves, shoes)
 * @returns Array of hex color strings
 */
export function getSlotTargetColors(
  variantId: string | null | undefined,
  slot: 'wig' | 'top' | 'bottom' | 'gloves' | 'shoes'
): string[] {
  const colors = getVariantTargetColors(variantId);
  return colors[slot] || DEFAULT_COLORS[slot];
}

/**
 * Check if variant colors are placeholders (need real data)
 * @param variantId - Variant ID
 * @returns true if colors are placeholders
 */
export function isPlaceholderColors(variantId: string | null | undefined): boolean {
  const colors = getVariantTargetColors(variantId);
  return colors.placeholder === true;
}

/**
 * Get all target colors as flat array (for "Character colors" row)
 * @param variantId - Variant ID
 * @returns Unique hex colors across all slots
 */
export function getAllVariantColors(variantId: string | null | undefined): string[] {
  const colors = getVariantTargetColors(variantId);
  const allColors = [
    ...colors.wig,
    ...colors.top,
    ...colors.bottom,
    ...colors.gloves,
    ...colors.shoes,
  ];
  
  // Return unique colors
  return Array.from(new Set(allColors));
}
