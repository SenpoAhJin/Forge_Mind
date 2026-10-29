/**
 * Outfit Planning Helpers
 * 
 * COSTUME-2 Step 6: Item-to-piece mapping and outfit integration
 * 
 * Maps owned items to costume pieces for V2 3D preview system.
 */

import type { OwnedAttire } from '../types/owned-attire';
import itemSlotMap from '../data/itemSlotMap.json';

/**
 * Maps an item's category to a costume piece slot.
 * Returns null if the item type has no 3D piece representation yet.
 */
export function mapItemToPieceSlot(item: OwnedAttire): string | null {
  const category = item.auto_categorized_type;
  const mapping = itemSlotMap as Record<string, string | null>;
  
  return mapping[category] ?? null;
}

/**
 * Gets the color to use for a piece from an item.
 * Falls back to a default color if the item has no color specified.
 */
export function getItemColor(item: OwnedAttire, defaultColor: string = '#808080'): string {
  const color = item.auto_categorized_color;
  
  // If no color or unclear, use default
  if (!color || color === 'unclear' || color === 'unknown') {
    return defaultColor;
  }
  
  // Try to convert common color names to hex
  const colorMap: Record<string, string> = {
    white: '#FFFFFF',
    black: '#000000',
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#F97316',
    brown: '#92400E',
    gray: '#6B7280',
    grey: '#6B7280',
  };
  
  const colorLower = color.toLowerCase();
  return colorMap[colorLower] || defaultColor;
}

/**
 * Interface for piece suggestions (for future AI integration)
 */
export interface PieceSuggestion {
  slot: string;
  color: string;
  source: 'ai' | 'user' | 'item';
  itemId?: string; // Optional reference to the source item
}

/**
 * Applies a suggested piece to outfit state.
 * 
 * This is a STUB for future AI recommendation integration (COSTUME-2 Step 6).
 * Currently just provides the interface for applying suggestions.
 * 
 * @param slot - The costume piece slot (e.g., 'top', 'bottom', 'wig')
 * @param color - The color hex code (e.g., '#3B82F6')
 * @param source - Where the suggestion came from ('ai', 'user', or 'item')
 * @param itemId - Optional: ID of the source item if from owned inventory
 * @returns A PieceSuggestion object ready to apply to outfit state
 */
export function applySuggestedPiece(
  slot: string,
  color: string,
  source: 'ai' | 'user' | 'item',
  itemId?: string
): PieceSuggestion {
  return {
    slot,
    color,
    source,
    itemId,
  };
}

/**
 * Applies an owned item to outfit state.
 * Maps the item to a piece slot and extracts the color.
 * Returns null if the item type has no 3D representation.
 */
export function applyItemToOutfit(
  item: OwnedAttire,
  defaultColor?: string
): PieceSuggestion | null {
  const slot = mapItemToPieceSlot(item);
  
  if (!slot) {
    // Item type has no 3D piece yet
    return null;
  }
  
  const color = getItemColor(item, defaultColor);
  
  return applySuggestedPiece(slot, color, 'item', item.attire_id);
}

/**
 * Helper to check if an item can be mapped to a 3D piece.
 */
export function canMapItemToPiece(item: OwnedAttire): boolean {
  return mapItemToPieceSlot(item) !== null;
}

/**
 * Gets a human-readable message for unmapped items.
 */
export function getUnmappedItemMessage(item: OwnedAttire): string {
  const category = item.auto_categorized_type;
  return `No 3D piece for ${category} items yet`;
}
