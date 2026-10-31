/**
 * Types for deterministic outfit extraction from character photos.
 * Fixed enums, closed vocabularies, no free text.
 */

export type OutfitConfidence = 'low' | 'medium' | 'high';

export type OutfitSlot = 'top' | 'bottom' | 'shoes' | 'gloves' | 'wig';

export interface ExtractedSlot {
  /** Whether the slot was detected in the image */
  present: boolean;
  
  /** Palette color id (from outfitPalette.json), or null if not detected */
  color: string | null;
  
  /** Keyword ids from the fixed vocabulary (outfitKeywords.json) */
  keywords: string[];
  
  /** Confidence level: low | medium | high */
  confidence: OutfitConfidence;
}

export interface ExtractedOutfit {
  /** Schema version for forward compatibility */
  version: string;
  
  /** Exactly 5 slots, always present */
  slots: {
    top: ExtractedSlot;
    bottom: ExtractedSlot;
    shoes: ExtractedSlot;
    gloves: ExtractedSlot;
    wig: ExtractedSlot;
  };
  
  /** Keywords that didn't map to any of the 5 slots */
  unmapped: string[];
}

/**
 * Validate an ExtractedOutfit against the fixed vocabularies.
 * Throws Error with specific message on validation failure.
 */
export function validateExtractedOutfit(
  outfit: any,
  paletteIds: Set<string>,
  keywordsBySlot: Map<OutfitSlot, Set<string>>
): ExtractedOutfit {
  if (typeof outfit !== 'object' || outfit === null) {
    throw new Error('Outfit must be an object');
  }
  
  if (typeof outfit.version !== 'string') {
    throw new Error('Outfit.version must be a string');
  }
  
  if (typeof outfit.slots !== 'object' || outfit.slots === null) {
    throw new Error('Outfit.slots must be an object');
  }
  
  const requiredSlots: OutfitSlot[] = ['top', 'bottom', 'shoes', 'gloves', 'wig'];
  const slotKeys = Object.keys(outfit.slots);
  
  if (slotKeys.length !== 5) {
    throw new Error(`Outfit.slots must have exactly 5 keys, got ${slotKeys.length}`);
  }
  
  for (const slot of requiredSlots) {
    if (!(slot in outfit.slots)) {
      throw new Error(`Missing required slot: ${slot}`);
    }
  }
  
  for (const slot of requiredSlots) {
    const slotData = outfit.slots[slot];
    
    if (typeof slotData !== 'object' || slotData === null) {
      throw new Error(`Slot ${slot} must be an object`);
    }
    
    if (typeof slotData.present !== 'boolean') {
      throw new Error(`Slot ${slot}.present must be a boolean`);
    }
    
    if (slotData.color !== null && typeof slotData.color !== 'string') {
      throw new Error(`Slot ${slot}.color must be a string or null`);
    }
    
    if (slotData.color !== null && !paletteIds.has(slotData.color)) {
      throw new Error(`Slot ${slot}.color "${slotData.color}" is not in the palette`);
    }
    
    if (!Array.isArray(slotData.keywords)) {
      throw new Error(`Slot ${slot}.keywords must be an array`);
    }
    
    const validKeywords = keywordsBySlot.get(slot);
    if (!validKeywords) {
      throw new Error(`No keywords defined for slot ${slot}`);
    }
    
    for (const keyword of slotData.keywords) {
      if (typeof keyword !== 'string') {
        throw new Error(`Slot ${slot}.keywords must be an array of strings`);
      }
      if (!validKeywords.has(keyword)) {
        throw new Error(`Slot ${slot}.keywords contains invalid keyword "${keyword}"`);
      }
    }
    
    const validConfidence = ['low', 'medium', 'high'];
    if (!validConfidence.includes(slotData.confidence)) {
      throw new Error(`Slot ${slot}.confidence must be one of: ${validConfidence.join(', ')}`);
    }
  }
  
  if (!Array.isArray(outfit.unmapped)) {
    throw new Error('Outfit.unmapped must be an array');
  }
  
  for (const keyword of outfit.unmapped) {
    if (typeof keyword !== 'string') {
      throw new Error('Outfit.unmapped must be an array of strings');
    }
  }
  
  return outfit as ExtractedOutfit;
}

/**
 * Load palette and keywords, then validate an outfit.
 * For use in backend and tests.
 */
export function loadAndValidateOutfit(
  outfit: any,
  paletteJson: any,
  keywordsJson: any
): ExtractedOutfit {
  // Build palette id set
  if (!Array.isArray(paletteJson.colors)) {
    throw new Error('paletteJson.colors must be an array');
  }
  const paletteIds = new Set<string>(paletteJson.colors.map((c: any) => c.id as string));
  
  // Build keywords by slot
  if (typeof keywordsJson.keywords !== 'object') {
    throw new Error('keywordsJson.keywords must be an object');
  }
  const keywordsBySlot = new Map<OutfitSlot, Set<string>>();
  for (const slot of ['top', 'bottom', 'shoes', 'gloves', 'wig'] as OutfitSlot[]) {
    if (!Array.isArray(keywordsJson.keywords[slot])) {
      throw new Error(`keywordsJson.keywords.${slot} must be an array`);
    }
    keywordsBySlot.set(slot, new Set(keywordsJson.keywords[slot] as string[]));
  }
  
  return validateExtractedOutfit(outfit, paletteIds, keywordsBySlot);
}
