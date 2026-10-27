/**
 * Dynamic Garment Catalog
 * 
 * Data-driven table of 3D garments. Adding a new garment requires only:
 * 1. Add the GLB asset file to assets/models/garments/
 * 2. Add a row to this catalog (no code changes elsewhere)
 * 
 * DESIGN:
 * - Replaces hard-coded garmentRegistry.ts with data-driven lookup
 * - Garments selected by: slot + tags + body compatibility
 * - Supports tintable regions (for color variations from one mesh)
 * - Real assets and placeholders unified in one catalog
 * 
 * CURRENT STATE:
 * - 2 real garments (white wig caps for male/female)
 * - Rest are placeholders until hand-modeling completes
 */

import type { AttireCategory } from '../types/owned-attire';

// Original hand-crafted models
import WIG_WHITE_CAP_MALE from '../../assets/models/garments/Wig_White_Cap_Male.glb';
import WIG_WHITE_CAP_FEMALE from '../../assets/models/garments/Wig_White_Cap_Female.glb';

// Procedural garment models (Phase 1)
import WIG_SHORT_CAP from '../../assets/models/garments/procedural/Wig_Short_Cap.glb';
import WIG_MEDIUM_BOB from '../../assets/models/garments/procedural/Wig_Medium_Bob.glb';
import WIG_LONG_STRAIGHT from '../../assets/models/garments/procedural/Wig_Long_Straight.glb';
import WIG_SPIKY_SHORT from '../../assets/models/garments/procedural/Wig_Spiky_Short.glb';
import WIG_PONYTAIL from '../../assets/models/garments/procedural/Wig_Ponytail.glb';

import TOP_TSHIRT from '../../assets/models/garments/procedural/Top_TShirt.glb';
import TOP_JACKET from '../../assets/models/garments/procedural/Top_Jacket.glb';
import TOP_HOODIE from '../../assets/models/garments/procedural/Top_Hoodie.glb';
import TOP_TANK from '../../assets/models/garments/procedural/Top_Tank.glb';
import TOP_CROP from '../../assets/models/garments/procedural/Top_Crop.glb';

import BOTTOM_PANTS from '../../assets/models/garments/procedural/Bottom_Pants.glb';
import BOTTOM_SHORTS from '../../assets/models/garments/procedural/Bottom_Shorts.glb';
import BOTTOM_SKIRT from '../../assets/models/garments/procedural/Bottom_Skirt.glb';

import FOOTWEAR_BOOTS from '../../assets/models/garments/procedural/Footwear_Boots.glb';
import FOOTWEAR_SNEAKERS from '../../assets/models/garments/procedural/Footwear_Sneakers.glb';

import ACCESSORY_HEADBAND from '../../assets/models/garments/procedural/Accessory_Headband.glb';
import ACCESSORY_GLOVES from '../../assets/models/garments/procedural/Accessory_Gloves.glb';
import ACCESSORY_BELT from '../../assets/models/garments/procedural/Accessory_Belt.glb';
import ACCESSORY_BACKPACK from '../../assets/models/garments/procedural/Accessory_Backpack.glb';
import ACCESSORY_WEAPON from '../../assets/models/garments/procedural/Accessory_Weapon.glb';

export type GarmentSlot = 'wig' | 'top' | 'bottom' | 'footwear' | 'accessory';
export type BodyType = 'male' | 'female';

/**
 * Tintable regions of a garment mesh.
 * Allows recoloring portions of the garment to create color variations.
 */
export interface TintableRegion {
  /** Region identifier (e.g., 'base', 'trim', 'accent') */
  name: string;
  /** Material name in GLB that this region maps to */
  materialName: string;
  /** Default color hex (before tinting) */
  defaultColor: string;
}

/**
 * Garment Catalog Entry
 * 
 * Each entry describes one 3D garment asset or placeholder.
 */
export interface GarmentCatalogEntry {
  /** Unique identifier (kebab-case) */
  id: string;
  /** Display name */
  label: string;
  /** Slot this garment occupies */
  slot: GarmentSlot;
  /** Compatible body types */
  bodyTypes: BodyType[];
  /** Asset module (static import) or null for placeholder */
  assetModule: string | number | null;
  /** Tags for matching (e.g., ['spiky', 'short', 'blonde']) */
  tags: string[];
  /** Attire category this garment represents */
  category: AttireCategory;
  /** Primary color name (from mobile categorizer vocabulary) */
  primaryColor: string;
  /** Secondary color (optional) */
  secondaryColor?: string;
  /** Tintable regions (empty array if not tintable) */
  tintableRegions: TintableRegion[];
  /** Is this a placeholder? */
  isPlaceholder: boolean;
  /** Placeholder shape description (for placeholders only) */
  placeholderShape?: {
    type: 'cap' | 'tube' | 'block';
    dimensions: number | number[]; // radius or [w,h,d]
  };
}

/**
 * Garment Catalog
 * 
 * CURRENT STATE:
 * - Real garments: 2 (white wig caps)
 * - Placeholders: All other slots
 * 
 * TO ADD A NEW GARMENT:
 * 1. Import the GLB: import GARMENT from '../../assets/models/garments/YourGarment.glb';
 * 2. Add catalog entry with: slot, tags, category, colors, tintableRegions
 * 3. Set assetModule to the imported constant
 * 4. Set isPlaceholder = false
 */
export const garmentCatalog: GarmentCatalogEntry[] = [
  // === ORIGINAL HAND-CRAFTED GARMENTS ===
  
  // White wig cap - Male
  {
    id: 'wig-white-cap-male',
    label: 'White Wig Cap',
    slot: 'wig',
    bodyTypes: ['male'],
    assetModule: WIG_WHITE_CAP_MALE,
    tags: ['cap', 'white', 'base', 'short'],
    category: 'wig',
    primaryColor: 'white',
    tintableRegions: [
      {
        name: 'base',
        materialName: 'WigMaterial',
        defaultColor: '#FFFFFF',
      },
    ],
    isPlaceholder: false,
  },
  
  // White wig cap - Female
  {
    id: 'wig-white-cap-female',
    label: 'White Wig Cap',
    slot: 'wig',
    bodyTypes: ['female'],
    assetModule: WIG_WHITE_CAP_FEMALE,
    tags: ['cap', 'white', 'base', 'short'],
    category: 'wig',
    primaryColor: 'white',
    tintableRegions: [
      {
        name: 'base',
        materialName: 'WigMaterial',
        defaultColor: '#FFFFFF',
      },
    ],
    isPlaceholder: false,
  },
  
  // === PHASE 1 PROCEDURAL GARMENTS ===
  
  // ========== WIGS (5 styles) ==========
  
  {
    id: 'wig-short-cap',
    label: 'Short Cap Wig',
    slot: 'wig',
    bodyTypes: ['male', 'female'],
    assetModule: WIG_SHORT_CAP,
    tags: ['short', 'cap', 'base', 'simple'],
    category: 'wig',
    primaryColor: 'black',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#333333' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'wig-medium-bob',
    label: 'Medium Bob Wig',
    slot: 'wig',
    bodyTypes: ['male', 'female'],
    assetModule: WIG_MEDIUM_BOB,
    tags: ['medium', 'bob', 'straight', 'shoulder-length'],
    category: 'wig',
    primaryColor: 'brown',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#664028' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'wig-long-straight',
    label: 'Long Straight Wig',
    slot: 'wig',
    bodyTypes: ['male', 'female'],
    assetModule: WIG_LONG_STRAIGHT,
    tags: ['long', 'straight', 'waist-length'],
    category: 'wig',
    primaryColor: 'black',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#1a1a1a' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'wig-spiky-short',
    label: 'Spiky Short Wig',
    slot: 'wig',
    bodyTypes: ['male', 'female'],
    assetModule: WIG_SPIKY_SHORT,
    tags: ['spiky', 'short', 'anime', 'pointy'],
    category: 'wig',
    primaryColor: 'yellow',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#e6cc33' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'wig-ponytail',
    label: 'Ponytail Wig',
    slot: 'wig',
    bodyTypes: ['male', 'female'],
    assetModule: WIG_PONYTAIL,
    tags: ['ponytail', 'long', 'tied', 'high'],
    category: 'wig',
    primaryColor: 'brown',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#994d26' },
    ],
    isPlaceholder: false,
  },
  
  // ========== TOPS (5 styles) ==========
  
  {
    id: 'top-tshirt',
    label: 'T-Shirt',
    slot: 'top',
    bodyTypes: ['male', 'female'],
    assetModule: TOP_TSHIRT,
    tags: ['tshirt', 'casual', 'short-sleeve', 'basic'],
    category: 'top',
    primaryColor: 'blue',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#4d4dcc' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'top-jacket',
    label: 'Jacket',
    slot: 'top',
    bodyTypes: ['male', 'female'],
    assetModule: TOP_JACKET,
    tags: ['jacket', 'outerwear', 'long-sleeve', 'zip'],
    category: 'top',
    primaryColor: 'black',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#333333' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'top-hoodie',
    label: 'Hoodie',
    slot: 'top',
    bodyTypes: ['male', 'female'],
    assetModule: TOP_HOODIE,
    tags: ['hoodie', 'casual', 'hood', 'long-sleeve', 'pullover'],
    category: 'top',
    primaryColor: 'gray',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#808080' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'top-tank',
    label: 'Tank Top',
    slot: 'top',
    bodyTypes: ['male', 'female'],
    assetModule: TOP_TANK,
    tags: ['tank', 'sleeveless', 'casual', 'summer'],
    category: 'top',
    primaryColor: 'white',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#e6e6e6' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'top-crop',
    label: 'Crop Top',
    slot: 'top',
    bodyTypes: ['female'],
    assetModule: TOP_CROP,
    tags: ['crop', 'short', 'fitted', 'midriff'],
    category: 'top',
    primaryColor: 'red',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#cc334d' },
    ],
    isPlaceholder: false,
  },
  
  // ========== BOTTOMS (3 styles) ==========
  
  {
    id: 'bottom-pants',
    label: 'Pants',
    slot: 'bottom',
    bodyTypes: ['male', 'female'],
    assetModule: BOTTOM_PANTS,
    tags: ['pants', 'long', 'casual', 'trousers'],
    category: 'bottom',
    primaryColor: 'blue',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#333366' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'bottom-shorts',
    label: 'Shorts',
    slot: 'bottom',
    bodyTypes: ['male', 'female'],
    assetModule: BOTTOM_SHORTS,
    tags: ['shorts', 'short', 'casual', 'summer'],
    category: 'bottom',
    primaryColor: 'brown',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#664d33' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'bottom-skirt',
    label: 'Skirt',
    slot: 'bottom',
    bodyTypes: ['female'],
    assetModule: BOTTOM_SKIRT,
    tags: ['skirt', 'dress', 'feminine', 'pleated'],
    category: 'bottom',
    primaryColor: 'red',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#991a33' },
    ],
    isPlaceholder: false,
  },
  
  // ========== FOOTWEAR (2 styles) ==========
  
  {
    id: 'footwear-boots',
    label: 'Boots',
    slot: 'footwear',
    bodyTypes: ['male', 'female'],
    assetModule: FOOTWEAR_BOOTS,
    tags: ['boots', 'combat', 'tall', 'lace-up'],
    category: 'footwear',
    primaryColor: 'black',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#1a1a1a' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'footwear-sneakers',
    label: 'Sneakers',
    slot: 'footwear',
    bodyTypes: ['male', 'female'],
    assetModule: FOOTWEAR_SNEAKERS,
    tags: ['sneakers', 'shoes', 'casual', 'athletic'],
    category: 'footwear',
    primaryColor: 'white',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#e6e6e6' },
    ],
    isPlaceholder: false,
  },
  
  // ========== ACCESSORIES (5 styles) ==========
  
  {
    id: 'accessory-headband',
    label: 'Headband',
    slot: 'accessory',
    bodyTypes: ['male', 'female'],
    assetModule: ACCESSORY_HEADBAND,
    tags: ['headband', 'forehead', 'protector', 'ninja'],
    category: 'accessory',
    primaryColor: 'red',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#cc1a1a' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'accessory-gloves',
    label: 'Gloves',
    slot: 'accessory',
    bodyTypes: ['male', 'female'],
    assetModule: ACCESSORY_GLOVES,
    tags: ['gloves', 'hands', 'fingerless', 'combat'],
    category: 'accessory',
    primaryColor: 'black',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#4d4d4d' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'accessory-belt',
    label: 'Belt',
    slot: 'accessory',
    bodyTypes: ['male', 'female'],
    assetModule: ACCESSORY_BELT,
    tags: ['belt', 'waist', 'buckle', 'utility'],
    category: 'accessory',
    primaryColor: 'brown',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#664019' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'accessory-backpack',
    label: 'Backpack',
    slot: 'accessory',
    bodyTypes: ['male', 'female'],
    assetModule: ACCESSORY_BACKPACK,
    tags: ['backpack', 'bag', 'storage', 'pack'],
    category: 'accessory',
    primaryColor: 'green',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#336633' },
    ],
    isPlaceholder: false,
  },
  
  {
    id: 'accessory-weapon',
    label: 'Weapon (Stick)',
    slot: 'accessory',
    bodyTypes: ['male', 'female'],
    assetModule: ACCESSORY_WEAPON,
    tags: ['weapon', 'sword', 'staff', 'prop', 'combat'],
    category: 'accessory',
    primaryColor: 'gray',
    tintableRegions: [
      { name: 'base', materialName: 'GarmentMaterial', defaultColor: '#808080' },
    ],
    isPlaceholder: false,
  },
];

/**
 * Find garment by slot, tags, and body type.
 * 
 * Matching strategy:
 * - Must support the body type
 * - Must match the slot
 * - Tag matching: more matched tags = better match
 * - Prefers real garments over placeholders
 * 
 * @param slot - Garment slot to search
 * @param tags - Tags to match against (e.g., ['spiky', 'blonde'])
 * @param bodyType - Required body type compatibility
 * @param category - Optional category filter
 * @param color - Optional primary color filter
 * @returns Best matching garment or null
 */
export function findGarment(
  slot: GarmentSlot,
  tags: string[],
  bodyType: BodyType,
  category?: AttireCategory,
  color?: string
): GarmentCatalogEntry | null {
  // Filter candidates
  let candidates = garmentCatalog.filter(g => 
    g.slot === slot && 
    g.bodyTypes.includes(bodyType)
  );
  
  // Apply optional filters
  if (category) {
    candidates = candidates.filter(g => g.category === category);
  }
  
  if (color) {
    const colorLower = color.toLowerCase();
    candidates = candidates.filter(g => 
      g.primaryColor.toLowerCase() === colorLower ||
      g.secondaryColor?.toLowerCase() === colorLower
    );
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  // Score by tag overlap
  const scored = candidates.map(g => {
    const tagsLower = tags.map(t => t.toLowerCase());
    const garmentTagsLower = g.tags.map(t => t.toLowerCase());
    const matchCount = tagsLower.filter(t => garmentTagsLower.includes(t)).length;
    
    // Bonus for real garments (not placeholders)
    const realBonus = g.isPlaceholder ? 0 : 100;
    
    return { garment: g, score: matchCount + realBonus };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].garment;
}

/**
 * Get a garment by ID
 */
export function getGarmentById(id: string): GarmentCatalogEntry | undefined {
  return garmentCatalog.find(g => g.id === id);
}

/**
 * Get all garments for a slot
 */
export function getGarmentsBySlot(slot: GarmentSlot, bodyType?: BodyType): GarmentCatalogEntry[] {
  let result = garmentCatalog.filter(g => g.slot === slot);
  
  if (bodyType) {
    result = result.filter(g => g.bodyTypes.includes(bodyType));
  }
  
  return result;
}

/**
 * Get all real garments (no placeholders)
 */
export function getRealGarments(): GarmentCatalogEntry[] {
  return garmentCatalog.filter(g => !g.isPlaceholder);
}

/**
 * Get placeholder garment for a slot
 */
export function getPlaceholderForSlot(slot: GarmentSlot, bodyType: BodyType): GarmentCatalogEntry | null {
  const placeholder = garmentCatalog.find(g => 
    g.slot === slot && 
    g.isPlaceholder && 
    g.bodyTypes.includes(bodyType)
  );
  
  return placeholder || null;
}
