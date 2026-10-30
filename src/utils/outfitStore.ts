/**
 * Outfit Store - Pure functions for managing outfit state
 * 
 * COSTUME-4D-1: Shared outfit store for V2 costume pieces.
 * No React or AsyncStorage imports - designed for testing with injected storage.
 */

import costumePiecesData from '../data/costumePieces.json' with { type: 'json' };
import itemSlotMap from '../data/itemSlotMap.json' with { type: 'json' };
import colorNames from '../data/colorNames.json' with { type: 'json' };

// Storage adapter interface for dependency injection
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Outfit state structure (version 1)
export interface OutfitState {
  version: number;
  pieces: {
    [slot: string]: {
      on: boolean;
      color: string;
      itemId?: string;
      source: 'user' | 'item' | 'suggestion';
    };
  };
}

// Scope types
export type OutfitScope = 
  | { type: 'body'; bodyType: 'male' | 'female' }
  | { type: 'project'; projectId: string };

/**
 * Generate storage key from scope
 */
export function getScopeKey(scope: OutfitScope): string {
  if (scope.type === 'body') {
    return `body:${scope.bodyType}`;
  } else {
    return `project:${scope.projectId}`;
  }
}

/**
 * Generate full storage key
 */
export function getStorageKey(scope: OutfitScope): string {
  return `@forgemind:outfit:${getScopeKey(scope)}`;
}

/**
 * Get all available slots from costumePieces.json
 */
export function getAvailableSlots(): string[] {
  return costumePiecesData.pieces.map(p => p.id);
}

/**
 * Get default color for a slot
 */
export function getSlotDefaultColor(slot: string): string {
  const piece = costumePiecesData.pieces.find(p => p.id === slot);
  return piece?.defaultColor || '#FFFFFF';
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
      source: 'user'
    };
  }
  
  return {
    version: 1,
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
  try {
    const key = getStorageKey(scope);
    const json = await storage.getItem(key);
    
    if (!json) {
      return createEmptyOutfit();
    }
    
    const data = JSON.parse(json);
    
    // Check version
    if (data.version !== 1) {
      console.warn('[outfitStore] Unknown version, returning empty outfit');
      return createEmptyOutfit();
    }
    
    // Validate structure
    if (!data.pieces || typeof data.pieces !== 'object') {
      return createEmptyOutfit();
    }
    
    return data as OutfitState;
  } catch (error) {
    console.error('[outfitStore] Failed to load outfit:', error);
    return createEmptyOutfit();
  }
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
  if (!outfit.pieces[slot]) {
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
  if (!outfit.pieces[slot]) {
    return outfit;
  }
  
  return {
    ...outfit,
    pieces: {
      ...outfit.pieces,
      [slot]: {
        ...outfit.pieces[slot],
        color,
        source: 'user'
      }
    }
  };
}

/**
 * Get slot for an item category
 */
export function getSlotForCategory(category: string): string | null {
  const slotMap = itemSlotMap as Record<string, string | null>;
  return slotMap[category] || null;
}

/**
 * Get color hex from color name
 */
export function getColorFromName(colorName: string | undefined): string | null {
  if (!colorName) return null;
  
  const colorMap = colorNames as Record<string, string | null>;
  const normalized = colorName.toLowerCase();
  return colorMap[normalized] || null;
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
  const slot = getSlotForCategory(category);
  
  if (!slot) {
    return {
      outfit,
      action: 'no-slot',
      message: 'No 3D piece for this item yet'
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
    message: wasWearing ? `Replaced ${itemName}` : `Wearing ${itemName}`
  };
}

/**
 * Wear full costume (all pieces on with default colors)
 */
export function wearFullCostume(outfit: OutfitState): OutfitState {
  const pieces = { ...outfit.pieces };
  
  for (const slot of getAvailableSlots()) {
    if (pieces[slot]) {
      pieces[slot] = {
        on: true,
        color: getSlotDefaultColor(slot),
        source: 'user'
      };
    }
  }
  
  return {
    ...outfit,
    pieces
  };
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
