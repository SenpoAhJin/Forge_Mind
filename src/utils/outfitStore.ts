/**
 * Outfit Store - Pure functions for managing outfit state
 * 
 * COSTUME-4D-1: Shared outfit store for V2 costume pieces.
 * No React or AsyncStorage imports - designed for testing with injected storage.
 */

import costumePiecesData from '../data/costumePieces.json' with { type: 'json' };
import colorNames from '../data/colorNames.json' with { type: 'json' };
import costumeStyles from '../data/costumeStyles.json' with { type: 'json' };
import palette from '../data/outfitPalette.json' with { type: 'json' };
import type { OwnedAttire } from '../types/owned-attire';

// Storage adapter interface for dependency injection
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Outfit state structure (version 2)
export interface OutfitState {
  version: number;
  pieces: {
    [slot: string]: {
      on: boolean;
      color: string;
      colorTip?: string; // For gradient styles
      style?: Record<string, string>; // e.g., { sleeve: 'short', neckline: 'crew' }
      itemId?: string;
      source: 'user' | 'item' | 'suggestion';
    };
  };
}

// Scope types
export type OutfitScope = 
  | { type: 'body'; bodyType: 'male' | 'female'; accountId?: string }
  | { type: 'project'; projectId: string; accountId?: string };

/**
 * Generate storage key from scope
 */
export function getScopeKey(scope: OutfitScope): string {
  if (scope.type === 'body') {
    return 'wardrobe'; // A body change must not change the worn outfit.
  } else {
    return `project:${scope.projectId}`;
  }
}

/**
 * Generate full storage key
 */
export function getStorageKey(scope: OutfitScope): string {
  if (!scope.accountId?.trim()) throw new Error('Sign in to save a worn outfit.');
  return `@forgemind:outfit:v3:${encodeURIComponent(scope.accountId.trim().toLowerCase())}:${getScopeKey(scope)}`;
}

/**
 * Get all available slots from costumePieces.json
 */
export function getAvailableSlots(): string[] {
  return getSlotDefinitions().map(p => p.id);
}

export function getSlotDefinitions() {
  return costumePiecesData.pieces.filter(p => !('supported' in p) || p.supported !== false);
}

/**
 * Get default color for a slot
 */
export function getSlotDefaultColor(slot: string): string {
  const piece = costumePiecesData.pieces.find(p => p.id === slot);
  return piece?.defaultColor || '#FFFFFF';
}

/**
 * Get default styles for a slot
 */
export function getSlotDefaultStyles(slot: string): Record<string, string> {
  const styles: Record<string, string> = {};
  const slotStyles = (costumeStyles as any)[slot];
  
  if (slotStyles) {
    for (const [styleKey, styleDef] of Object.entries(slotStyles)) {
      if (styleKey !== 'config' && typeof styleDef === 'object' && styleDef !== null) {
        const def = styleDef as { default?: string };
        if (def.default) {
          styles[styleKey] = def.default;
        }
      }
    }
  }
  
  return styles;
}

/**
 * Create empty outfit with all pieces off
 */
export function createEmptyOutfit(): OutfitState {
  const pieces: OutfitState['pieces'] = {};
  
  for (const slot of getAvailableSlots()) {
    pieces[slot] = {
      on: false,
      color: getSlotDefaultColor(slot),
      style: getSlotDefaultStyles(slot),
      source: 'user'
    };
  }
  
  return {
    version: 3,
    pieces
  };
}

/**
 * Load outfit from storage
 */
export async function loadOutfit(
  storage: StorageAdapter,
  scope: OutfitScope
): Promise<OutfitState> {
  // Old unscoped keys cannot be attributed to an account and are not imported.
  const json = await storage.getItem(getStorageKey(scope));
  if (!json) return createEmptyOutfit();
  const data = JSON.parse(json);
  if (data?.version !== 3 || !data.pieces || typeof data.pieces !== 'object') {
    throw new Error('Saved outfit has an unsupported format. It has not been overwritten.');
  }
  const outfit = createEmptyOutfit();
  for (const slot of getAvailableSlots()) {
    const p = data.pieces[slot];
    if (!p) continue;
    if (typeof p.on !== 'boolean' || !getColorFromName(p.color) ||
        (p.itemId !== undefined && typeof p.itemId !== 'string')) {
      throw new Error('Saved outfit could not be read. It has not been overwritten.');
    }
    outfit.pieces[slot] = { ...outfit.pieces[slot], ...p, on: p.on && !!p.itemId };
  }
  return outfit;
}

/**
 * Save outfit to storage
 */
export async function saveOutfit(
  storage: StorageAdapter,
  scope: OutfitScope,
  outfit: OutfitState
): Promise<void> {
  try {
    const key = getStorageKey(scope);
    const json = JSON.stringify(outfit);
    await storage.setItem(key, json);
  } catch (error) {
    console.error('[outfitStore] Failed to save outfit:', error);
    throw error;
  }
}

/**
 * Toggle a piece on/off
 */
export function togglePiece(
  outfit: OutfitState,
  slot: string,
  on: boolean
): OutfitState {
  if (!outfit.pieces[slot] || (on && !outfit.pieces[slot].itemId)) {
    return outfit;
  }
  
  return {
    ...outfit,
    pieces: {
      ...outfit.pieces,
      [slot]: {
        ...outfit.pieces[slot],
        on,
        source: 'user'
      }
    }
  };
}

/**
 * Change piece color
 */
export function setPieceColor(
  outfit: OutfitState,
  slot: string,
  color: string
): OutfitState {
  const hex = getColorFromName(color);
  if (!outfit.pieces[slot] || !hex) {
    return outfit;
  }
  
  return {
    ...outfit,
    pieces: {
      ...outfit.pieces,
      [slot]: {
        ...outfit.pieces[slot],
        color: hex,
        source: 'user'
      }
    }
  };
}

/**
 * Set piece style option
 */
export function setPieceStyle(
  outfit: OutfitState,
  slot: string,
  styleKey: string,
  styleValue: string
): OutfitState {
  if (!outfit.pieces[slot]) {
    return outfit;
  }
  
  return {
    ...outfit,
    pieces: {
      ...outfit.pieces,
      [slot]: {
        ...outfit.pieces[slot],
        style: {
          ...outfit.pieces[slot].style,
          [styleKey]: styleValue
        },
        source: 'user'
      }
    }
  };
}

/**
 * Set piece colorTip (for gradients)
 */
export function setPieceColorTip(
  outfit: OutfitState,
  slot: string,
  colorTip: string
): OutfitState {
  if (!outfit.pieces[slot]) {
    return outfit;
  }
  
  return {
    ...outfit,
    pieces: {
      ...outfit.pieces,
      [slot]: {
        ...outfit.pieces[slot],
        colorTip,
        source: 'user'
      }
    }
  };
}

/**
 * Get slot for an item category
 */
export function getSlotForCategory(category: string): string | null {
  const normalized = category.trim().toLowerCase();
  return getSlotDefinitions().find(piece => piece.categories?.includes(normalized))?.id ?? null;
}

export function getSlotForItem(item: Pick<OwnedAttire, 'auto_categorized_type' | 'original_input_text' | 'auto_categorized_style'>): string | null {
  const category = item.auto_categorized_type.toLowerCase();
  const words = `${item.original_input_text} ${item.auto_categorized_style}`.toLowerCase().split(/[^a-z0-9]+/);
  const specific = getSlotDefinitions().find(piece =>
    'keywordCategories' in piece && piece.keywordCategories?.includes(category) &&
    'itemKeywords' in piece && piece.itemKeywords?.some(keyword => words.includes(keyword)));
  return specific?.id ?? getSlotForCategory(category);
}

/**
 * Get color hex from color name
 */
export function getColorFromName(colorName: string | undefined): string | null {
  if (!colorName) return null;
  
  const colorMap = colorNames as Record<string, string | null>;
  const normalized = colorName.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(normalized)) return `#${normalized.slice(1).split('').map(c => c + c).join('')}`.toUpperCase();
  return palette.colors.find(color => color.id === normalized || color.name.toLowerCase() === normalized)?.hex.toUpperCase() ?? colorMap[normalized] ?? null;
}

/**
 * Apply item to outfit
 * Returns { outfit, action, message }
 */
export function applyItem(
  outfit: OutfitState,
  itemId: string,
  category: string,
  colorName: string | undefined,
  itemName: string
): { outfit: OutfitState; action: 'worn' | 'removed' | 'replaced' | 'no-slot'; message: string } {
  // Check if category has a slot
  const slot = getSlotForItem({ auto_categorized_type: category as OwnedAttire['auto_categorized_type'], original_input_text: itemName, auto_categorized_style: '' });
  
  if (!slot) {
    return {
      outfit,
      action: 'no-slot',
      message: 'Not shown in 3D yet'
    };
  }
  
  if (!outfit.pieces[slot]) {
    return {
      outfit,
      action: 'no-slot',
      message: 'Slot not found'
    };
  }
  
  const currentPiece = outfit.pieces[slot];
  
  // If same item is already worn, remove it
  if (currentPiece.on && currentPiece.itemId === itemId) {
    return {
      outfit: {
        ...outfit,
        pieces: {
          ...outfit.pieces,
          [slot]: {
            ...currentPiece,
            on: false,
            itemId: undefined,
            source: 'user'
          }
        }
      },
      action: 'removed',
      message: `Removed ${itemName}`
    };
  }
  
  // Determine color
  let color = getColorFromName(colorName);
  if (!color || color === null) {
    color = getSlotDefaultColor(slot);
  }
  
  // Check if replacing another item
  const wasWearing = currentPiece.on && currentPiece.itemId && currentPiece.itemId !== itemId;
  
  // Wear the item
  const newOutfit = {
    ...outfit,
    pieces: {
      ...outfit.pieces,
      [slot]: {
        ...currentPiece,
        style: getSlotDefaultStyles(slot),
        on: true,
        color,
        itemId,
        source: 'item' as const
      }
    }
  };
  
  return {
    outfit: newOutfit,
    action: wasWearing ? 'replaced' : 'worn',
    message: `${itemName} is now on your ${getSlotDefinitions().find(piece => piece.id === slot)?.label ?? slot} slot`
  };
}

/**
 * Wear full costume (all pieces on with default colors)
 */
export function wearFullCostume(outfit: OutfitState, inventory: OwnedAttire[] = []): OutfitState {
  let result = reconcileInventory(outfit, inventory);
  for (const slot of getAvailableSlots()) {
    const assigned = result.pieces[slot];
    const item = inventory.find(candidate => candidate.attire_id === assigned.itemId) ??
      inventory.find(candidate => getSlotForItem(candidate) === slot);
    if (!item) continue;
    result = assigned.itemId === item.attire_id
      ? togglePiece(result, slot, true)
      : applyItem(result, item.attire_id, item.auto_categorized_type, item.auto_categorized_color,
          `${item.original_input_text} ${item.auto_categorized_style}`.trim()).outfit;
  }
  return result;
}

export function reconcileInventory(outfit: OutfitState, inventory: OwnedAttire[]): OutfitState {
  const pieces = { ...outfit.pieces };
  for (const slot of getAvailableSlots()) {
    const piece = pieces[slot];
    if (!inventory.some(item => item.attire_id === piece.itemId && getSlotForItem(item) === slot)) {
      pieces[slot] = { ...piece, on: false, itemId: undefined };
    }
  }
  return { ...outfit, pieces };
}

/**
 * Remove all pieces
 */
export function removeAllPieces(outfit: OutfitState): OutfitState {
  const pieces = { ...outfit.pieces };
  
  for (const slot of getAvailableSlots()) {
    if (pieces[slot]) {
      pieces[slot] = {
        ...pieces[slot],
        on: false,
        source: 'user'
      };
    }
  }
  
  return {
    ...outfit,
    pieces
  };
}
