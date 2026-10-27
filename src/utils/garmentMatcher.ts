/**
 * Garment Matcher
 * 
 * Matches owned items to variant slot specifications and selects appropriate
 * 3D garments from the catalog. Returns a complete wearing specification
 * for rendering.
 * 
 * MATCHING FLOW:
 * 1. For each variant slot, try to match an owned item
 * 2. If owned item exists, find suitable 3D garment from catalog
 * 3. If no owned item or no garment found, use default/placeholder
 * 4. Return complete wearing spec with visual distinction for missing items
 */

import type { OwnedAttire } from '../types/owned-attire';
import type { VariantSpecification, SlotComponent, VariantSlot } from '../data/variantSpecifications';
import type { GarmentCatalogEntry, BodyType, GarmentSlot } from '../data/garmentCatalog';
import { findGarment, getPlaceholderForSlot } from '../data/garmentCatalog';
import { colorNameToHex } from '../utils/wearing';

/**
 * Wearing specification for a single slot.
 * Contains all data needed to render the garment.
 */
export interface WearingSlotSpec {
  /** Slot identifier */
  slot: GarmentSlot;
  /** Variant slot (may differ from garment slot) */
  variantSlot: VariantSlot;
  /** Matched owned item (null if slot is empty) */
  ownedItem: OwnedAttire | null;
  /** Selected garment from catalog (null if no garment available) */
  garment: GarmentCatalogEntry | null;
  /** Is this slot filled with an owned item? */
  isFilled: boolean;
  /** Is this using a placeholder garment? */
  isPlaceholder: boolean;
  /** Display label for UI */
  label: string;
  /** Color hex for rendering */
  colorHex: string;
  /** Component spec from variant */
  componentSpec: SlotComponent;
}

/**
 * Complete wearing specification for a character variant.
 */
export interface WearingSpecification {
  /** Variant being worn */
  variant: VariantSpecification;
  /** Body type */
  bodyType: BodyType;
  /** Wearing specs per slot */
  slots: WearingSlotSpec[];
  /** Overall readiness (0-1, percentage of required slots filled) */
  readiness: number;
  /** Cost summary */
  costs: {
    /** Total cost of owned items used */
    ownedValue: number;
    /** Estimated cost for missing required items */
    missingRequired: number;
    /** Estimated cost for missing optional items */
    missingOptional: number;
    /** Total estimated project cost */
    totalEstimated: number;
  };
}

/**
 * Map variant slot to garment slot.
 * Variant uses: wig, top, bottom, footwear, accessory
 * Garment catalog uses same naming convention
 */
function variantSlotToGarmentSlot(variantSlot: VariantSlot): GarmentSlot {
  return variantSlot; // Direct 1:1 mapping now that both use same names
}

/**
 * Match owned items to variant specification.
 * 
 * UPDATED: More flexible matching logic
 * - Type match: Check if item type makes sense for slot (e.g., "clothing" can match "top" or "bottom")
 * - Color match: Scores points but not required
 * - Keyword match: Scores points but not required
 * - ANY positive score = potential match
 * 
 * Returns best match or null if no suitable item found.
 */
function matchOwnedItemToSlot(
  componentSpec: SlotComponent,
  ownedItems: OwnedAttire[]
): OwnedAttire | null {
  const candidates: Array<{ item: OwnedAttire; score: number; reason: string }> = [];
  
  const specColorLower = componentSpec.color.toLowerCase();
  const specTypeLower = componentSpec.type.toLowerCase();
  const specKeywordsLower = componentSpec.keywords.map(k => k.toLowerCase());
  
  console.log(`[Matcher] Looking for ${componentSpec.slot}: type=${specTypeLower}, color=${specColorLower}`);
  console.log(`[Matcher] Received ${ownedItems.length} items:`, ownedItems.map(i => `"${i.original_input_text}" (${i.auto_categorized_type}/${i.auto_categorized_color})`));
  
  for (const item of ownedItems) {
    // Skip committed items (already used in another project)
    if (item.availability_status === 'committed') {
      continue;
    }
    
    const itemTypeLower = (item.auto_categorized_type || '').toLowerCase();
    const itemColorLower = (item.auto_categorized_color || '').toLowerCase();
    const itemStyleLower = (item.auto_categorized_style || '').toLowerCase();
    const itemTextLower = (item.original_input_text || '').toLowerCase();
    
    console.log(`[Matcher]   Checking "${item.original_input_text || 'NO TEXT'}" - type:"${itemTypeLower}" color:"${itemColorLower}" status:"${item.availability_status}"`);
    
    let score = 0;
    let reasons: string[] = [];
    
    // TYPE MATCHING (Very flexible now - handle generic types)
    // Check if item type is compatible with slot
    let typeCompatible = false;
    
    if (itemTypeLower === specTypeLower) {
      // Exact type match
      score += 20;
      reasons.push('exact type');
      typeCompatible = true;
    } else if (itemTypeLower === 'other' || itemTypeLower === 'material' || itemTypeLower === 'fabric') {
      // Generic types can match ANY slot (user hasn't categorized yet)
      score += 3;
      reasons.push(`generic ${itemTypeLower}`);
      typeCompatible = true;
    } else if (itemTypeLower === 'prop' && specTypeLower === 'accessory') {
      // Props can be accessories
      score += 10;
      reasons.push('prop as accessory');
      typeCompatible = true;
    } else if (itemTypeLower === 'clothing') {
      // Clothing is flexible - can be top, bottom, or even wig (like a hood)
      score += 5;
      reasons.push('clothing (flexible)');
      typeCompatible = true;
    } else if (itemTypeLower === 'wig' && specTypeLower === 'wig') {
      score += 20;
      reasons.push('wig match');
      typeCompatible = true;
    } else if (itemTypeLower === 'accessory' && specTypeLower === 'accessory') {
      score += 20;
      reasons.push('accessory match');
      typeCompatible = true;
    } else if (itemTypeLower === 'footwear' && specTypeLower === 'footwear') {
      score += 20;
      reasons.push('footwear match');
      typeCompatible = true;
    } else if (itemTypeLower === 'weapon' && specTypeLower === 'weapon') {
      score += 20;
      reasons.push('weapon match');
      typeCompatible = true;
    } else if (itemTypeLower === 'armor' && (specTypeLower === 'clothing' || specTypeLower === 'top')) {
      score += 10;
      reasons.push('armor as top');
      typeCompatible = true;
    }
    
    // Skip if completely incompatible type
    if (!typeCompatible && score === 0) {
      console.log(`[Matcher]     → SKIPPED (incompatible type, score=0)`);
      continue;
    }
    
    // COLOR MATCHING
    if (itemColorLower && specColorLower) {
      if (itemColorLower === specColorLower) {
        score += 15; // Exact color match
        reasons.push(`color ${itemColorLower}`);
      } else if (componentSpec.secondaryColor?.toLowerCase() === itemColorLower) {
        score += 8; // Secondary color match
        reasons.push(`secondary color ${itemColorLower}`);
      } else if (itemColorLower.includes(specColorLower) || specColorLower.includes(itemColorLower)) {
        score += 5; // Partial color match (e.g., "light blue" matches "blue")
        reasons.push(`similar color`);
      }
    }
    
    // KEYWORD/STYLE MATCHING
    for (const keyword of specKeywordsLower) {
      if (itemStyleLower.includes(keyword)) {
        score += 3;
        reasons.push(`style: ${keyword}`);
      } else if (itemTextLower.includes(keyword)) {
        score += 2;
        reasons.push(`text: ${keyword}`);
      }
    }
    
    // Condition bonus (prefer higher condition items)
    score += item.condition_rating * 0.5;
    
    // Only consider items with positive scores
    if (score > 0) {
      console.log(`[Matcher]     → MATCH! Score: ${score} (${reasons.join(', ')})`);
      candidates.push({ item, score, reason: reasons.join(', ') });
    } else {
      console.log(`[Matcher]     → REJECTED (score=${score}, reasons: ${reasons.length === 0 ? 'none' : reasons.join(', ')})`);
    }
  }
  
  if (candidates.length === 0) {
    console.log(`[Matcher]   No matches found for ${componentSpec.slot}`);
    return null;
  }
  
  // Sort by score descending and return best match
  candidates.sort((a, b) => b.score - a.score);
  console.log(`[Matcher]   ✅ Best match: "${candidates[0].item.original_input_text}" (score: ${candidates[0].score})`);
  return candidates[0].item;
}

/**
 * Build complete wearing specification from variant and owned items.
 * 
 * @param variant - Character variant to build
 * @param ownedItems - User's owned attire inventory
 * @param bodyType - Body type to use ('male' or 'female')
 * @returns Complete wearing specification with all slots
 */
export function buildWearingSpecification(
  variant: VariantSpecification,
  ownedItems: OwnedAttire[],
  bodyType: BodyType
): WearingSpecification {
  const slots: WearingSlotSpec[] = [];
  let filledRequiredCount = 0;
  let totalRequiredCount = 0;
  
  let ownedValue = 0;
  let missingRequired = 0;
  let missingOptional = 0;
  
  // Process each component in the variant
  for (const componentSpec of variant.components) {
    const garmentSlot = variantSlotToGarmentSlot(componentSpec.slot);
    
    // Track required slots
    if (componentSpec.required) {
      totalRequiredCount++;
    }
    
    // Try to match an owned item
    const matchedItem = matchOwnedItemToSlot(componentSpec, ownedItems);
    
    let garment: GarmentCatalogEntry | null = null;
    let colorHex = colorNameToHex(componentSpec.color);
    let label = componentSpec.description;
    
    if (matchedItem) {
      // Found owned item - find corresponding garment from catalog
      garment = findGarment(
        garmentSlot,
        componentSpec.keywords,
        bodyType,
        componentSpec.type,
        matchedItem.auto_categorized_color
      );
      
      // Use item's actual color
      colorHex = colorNameToHex(matchedItem.auto_categorized_color);
      label = `${matchedItem.auto_categorized_color} ${matchedItem.auto_categorized_type}`;
      
      // Add to owned value
      ownedValue += matchedItem.acquisition_cost || 0;
      
      if (componentSpec.required) {
        filledRequiredCount++;
      }
    } else {
      // No owned item - use placeholder
      garment = getPlaceholderForSlot(garmentSlot, bodyType);
      label = `Missing: ${componentSpec.description}`;
      
      // Estimate missing cost from variant's cost range
      const avgCost = (variant.estimatedCostRange.min + variant.estimatedCostRange.max) / 2;
      const slotCost = avgCost / variant.components.length;
      
      if (componentSpec.required) {
        missingRequired += slotCost;
      } else {
        missingOptional += slotCost;
      }
    }
    
    slots.push({
      slot: garmentSlot,
      variantSlot: componentSpec.slot,
      ownedItem: matchedItem,
      garment,
      isFilled: matchedItem !== null,
      isPlaceholder: garment?.isPlaceholder ?? true,
      label,
      colorHex,
      componentSpec,
    });
  }
  
  // Calculate readiness (percentage of required slots filled)
  const readiness = totalRequiredCount > 0 
    ? filledRequiredCount / totalRequiredCount 
    : 1.0;
  
  return {
    variant,
    bodyType,
    slots,
    readiness,
    costs: {
      ownedValue,
      missingRequired,
      missingOptional,
      totalEstimated: ownedValue + missingRequired + missingOptional,
    },
  };
}

/**
 * Get slots that are missing (not filled with owned items).
 */
export function getMissingSlots(spec: WearingSpecification): WearingSlotSpec[] {
  return spec.slots.filter(s => !s.isFilled);
}

/**
 * Get required slots that are missing.
 */
export function getMissingRequiredSlots(spec: WearingSpecification): WearingSlotSpec[] {
  return spec.slots.filter(s => !s.isFilled && s.componentSpec.required);
}

/**
 * Get filled slots (with owned items).
 */
export function getFilledSlots(spec: WearingSpecification): WearingSlotSpec[] {
  return spec.slots.filter(s => s.isFilled);
}

/**
 * Check if variant is complete (all required slots filled).
 */
export function isVariantComplete(spec: WearingSpecification): boolean {
  return spec.readiness >= 1.0;
}
