/**
 * Wearing System - Data Layer
 * D8a Step 1: Slot mapping, color mapping, and worn garment builder
 */

import type { MatchResult } from '../services/AiMatcherService';
import type { OwnedAttire } from '../types/owned-attire';

// Garment slots for rendering (from docs/GARMENT_SPEC.md)
export type GarmentSlot = 'head' | 'torso' | 'legs' | 'hands' | 'prop';

/**
 * Map matcher slot names to garment renderer slots.
 * Matcher uses: wig, top, bottom, accessory, footwear
 * Renderer uses: head, torso, legs, hands, prop
 */
export function matcherSlotToGarmentSlot(matcherSlot: string): GarmentSlot | null {
  switch (matcherSlot) {
    case 'wig':
      return 'head';
    case 'top':
      return 'torso';
    case 'bottom':
      return 'legs';
    case 'accessory':
      return 'prop';
    case 'footwear':
      return 'prop'; // Spec: footwear under prop
    default:
      return null;
  }
}

/**
 * Color name to hex mapping.
 * DUPLICATED from forgemind-backend/src/ai/colorNames.ts on purpose
 * because repos are separate and mobile needs local access.
 * 
 * Source: forgemind-backend/src/ai/colorNames.ts (D6 Step 2)
 * Mobile vocabulary: white, black, red, blue, pink, brown, green, purple, yellow, unclear
 */
const COLOR_NAME_TO_HEX: Record<string, string> = {
  // Mobile categorizer vocabulary (9 colors)
  'white': '#FFFFFF',
  'black': '#000000',
  'red': '#FF0000',
  'blue': '#0000FF',
  'pink': '#FFC0CB',
  'brown': '#8B4513',
  'green': '#008000',
  'purple': '#800080',
  'yellow': '#FFFF00',
  
  // Common variations
  'silver': '#C0C0C0',
  'dark': '#1A1A1A',
  'navy': '#000080',
  'maroon': '#800000',
  'scarlet': '#FF2400',
  'rose': '#FF007F',
  'tan': '#D2B48C',
  'leather': '#A0522D',
  'olive': '#808000',
  'violet': '#EE82EE',
  'gold': '#FFD700',
  
  // Grayscale
  'gray': '#808080',
  'grey': '#808080',
  'light-gray': '#D3D3D3',
  'dark-gray': '#A9A9A9',
};

const DEFAULT_COLOR_HEX = '#808080'; // Neutral grey for unclear/unknown

/**
 * Convert color name to hex.
 * Used for owned_attire.auto_categorized_color which is always a NAME
 * (white, black, red, blue, pink, brown, green, purple, yellow, unclear).
 */
export function colorNameToHex(colorName: string): string {
  const normalized = colorName.toLowerCase().trim();
  return COLOR_NAME_TO_HEX[normalized] || DEFAULT_COLOR_HEX;
}

/**
 * PLACEHOLDER SHAPES (not real garments)
 * Runtime-generated geometry per slot until real GLB assets exist.
 */
export type PlaceholderShape = 
  | { type: 'cap'; radius: number } // head: cap sitting on head top
  | { type: 'tube'; radius: number; height: number } // torso/legs: tubes
  | { type: 'block'; width: number; height: number; depth: number }; // prop: small block

/**
 * Worn garment descriptor for renderer.
 * Renderer will create geometry from shape and color at runtime.
 */
export interface WornGarment {
  slot: GarmentSlot;
  itemId: string | null; // owned_attire.attire_id or null if slot is empty
  label: string; // e.g. "black wig" or "Missing"
  colorHex: string; // from colorNameToHex
  shape: PlaceholderShape; // PLACEHOLDER until real GLB exists
}

/**
 * Build worn garments array from matcher result.
 * Returns ALL garment slots (head, torso, legs, prop) with itemId=null for missing slots.
 * 
 * @param matchResult - Matcher response with suggested_outfit per slot
 * @param ownedItems - Full owned attire inventory (to look up color)
 * @param bodyType - 'male' or 'female' (not used yet, for future scaling)
 * @returns Array of worn garments with placeholder shapes (includes empty slots)
 */
export function buildWornGarments(
  matchResult: MatchResult,
  ownedItems: OwnedAttire[],
  bodyType: 'male' | 'female'
): WornGarment[] {
  // All possible garment slots
  const allSlots: GarmentSlot[] = ['head', 'torso', 'legs', 'prop'];
  const worn: WornGarment[] = [];
  
  // Build map of matcher slots to matched items
  const matchedBySlot = new Map<GarmentSlot, { itemId: string; label: string; colorHex: string }>();
  
  for (const [matcherSlot, matchedItem] of Object.entries(matchResult.suggested_outfit)) {
    const garmentSlot = matcherSlotToGarmentSlot(matcherSlot);
    if (!garmentSlot) continue; // Unknown slot
    
    // Find owned item to get color
    const ownedItem = ownedItems.find(item => item.attire_id === matchedItem.item_id);
    if (!ownedItem) continue; // Item not found (shouldn't happen)
    
    const colorHex = colorNameToHex(ownedItem.auto_categorized_color);
    const label = `${ownedItem.auto_categorized_color} ${ownedItem.auto_categorized_type}`;
    
    matchedBySlot.set(garmentSlot, { itemId: matchedItem.item_id, label, colorHex });
  }
  
  // Create worn garment for each slot (filled or empty)
  for (const slot of allSlots) {
    const matched = matchedBySlot.get(slot);
    
    // PLACEHOLDER SHAPES per slot (positioned from bodyBounds for BOTH bodies)
    // Body Y ranges: male -0.950 to 0.931, female -0.951 to 0.944
    let shape: PlaceholderShape;
    
    switch (slot) {
      case 'head':
        // Cap sitting on head top (Y ≈ 0.65 to 0.94)
        shape = { type: 'cap', radius: 0.15 };
        break;
      case 'torso':
        // Tube around torso band (Y ≈ 0.10 to 0.60)
        shape = { type: 'tube', radius: 0.25, height: 0.50 };
        break;
      case 'legs':
        // Two tubes (Y ≈ -0.50 to 0.10) - simplified as one tube for now
        shape = { type: 'tube', radius: 0.15, height: 0.60 };
        break;
      case 'prop':
        // Small block at hip (Y ≈ 0.0)
        shape = { type: 'block', width: 0.15, height: 0.15, depth: 0.10 };
        break;
      case 'hands':
        // Small block at wrist (Y ≈ 0.0 to 0.30) - not used by matcher yet
        shape = { type: 'block', width: 0.10, height: 0.10, depth: 0.10 };
        break;
    }
    
    worn.push({
      slot,
      itemId: matched?.itemId || null,
      label: matched?.label || 'Missing',
      colorHex: matched?.colorHex || '#808080', // Gray for missing
      shape,
    });
  }
  
  return worn;
}
