/**
 * Item-to-Model Mapper
 * 
 * Maps owned inventory items to procedural 3D garment models.
 * Uses item type, color, and text description to find best matching GLB.
 * 
 * DESIGN:
 * - Type-based primary matching (wig, top, bottom, footwear, accessory)
 * - Keyword-based style selection (long hair, hoodie, skirt, etc.)
 * - Color extraction and hex conversion
 * - Fallback to default models when specific match not found
 */

import type { OwnedAttire, AttireCategory } from '../types/owned-attire';
import type { BodyType } from '../data/garmentCatalog';

// Import all procedural garment GLB models
import WIG_LONG_STRAIGHT from '../../assets/models/garments/procedural/Wig_Long_Straight.glb';
import WIG_MEDIUM_BOB from '../../assets/models/garments/procedural/Wig_Medium_Bob.glb';
import WIG_PONYTAIL from '../../assets/models/garments/procedural/Wig_Ponytail.glb';
import WIG_SHORT_CAP from '../../assets/models/garments/procedural/Wig_Short_Cap.glb';
import WIG_SPIKY_SHORT from '../../assets/models/garments/procedural/Wig_Spiky_Short.glb';

import TOP_CROP from '../../assets/models/garments/procedural/Top_Crop.glb';
import TOP_HOODIE from '../../assets/models/garments/procedural/Top_Hoodie.glb';
import TOP_JACKET from '../../assets/models/garments/procedural/Top_Jacket.glb';
import TOP_TANK from '../../assets/models/garments/procedural/Top_Tank.glb';
import TOP_TSHIRT from '../../assets/models/garments/procedural/Top_TShirt.glb';

import BOTTOM_PANTS from '../../assets/models/garments/procedural/Bottom_Pants.glb';
import BOTTOM_SHORTS from '../../assets/models/garments/procedural/Bottom_Shorts.glb';
import BOTTOM_SKIRT from '../../assets/models/garments/procedural/Bottom_Skirt.glb';

import FOOTWEAR_BOOTS from '../../assets/models/garments/procedural/Footwear_Boots.glb';
import FOOTWEAR_SNEAKERS from '../../assets/models/garments/procedural/Footwear_Sneakers.glb';

import ACCESSORY_BACKPACK from '../../assets/models/garments/procedural/Accessory_Backpack.glb';
import ACCESSORY_BELT from '../../assets/models/garments/procedural/Accessory_Belt.glb';
import ACCESSORY_GLOVES from '../../assets/models/garments/procedural/Accessory_Gloves.glb';
import ACCESSORY_HEADBAND from '../../assets/models/garments/procedural/Accessory_Headband.glb';
import ACCESSORY_WEAPON from '../../assets/models/garments/procedural/Accessory_Weapon.glb';

export interface GarmentModel {
  assetModule: number | string;
  colorHex: string;
  slot: string;
  modelName: string; // For debugging
}

/**
 * Color name to hex conversion
 * Supports common color names from inventory categorization
 */
export function colorNameToHex(colorName: string | undefined): string {
  if (!colorName) return '#888888';
  
  const colorMap: Record<string, string> = {
    // Basic colors
    'white': '#FFFFFF',
    'black': '#000000',
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#00FF00',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'brown': '#8B4513',
    'gray': '#808080',
    'grey': '#808080',
    
    // Extended colors
    'navy': '#000080',
    'teal': '#008080',
    'cyan': '#00FFFF',
    'magenta': '#FF00FF',
    'gold': '#FFD700',
    'silver': '#C0C0C0',
    'beige': '#F5F5DC',
    'maroon': '#800000',
    'olive': '#808000',
    'lime': '#00FF00',
    'aqua': '#00FFFF',
    'indigo': '#4B0082',
    'violet': '#EE82EE',
    'coral': '#FF7F50',
    'salmon': '#FA8072',
    'khaki': '#F0E68C',
    'tan': '#D2B48C',
    
    // Anime/Cosplay common colors
    'blonde': '#FFEB9C',
    'golden': '#FFD700',
    'crimson': '#DC143C',
    'emerald': '#50C878',
    'sapphire': '#0F52BA',
    'ruby': '#E0115F',
    'midnight': '#191970',
    'scarlet': '#FF2400',
    'turquoise': '#40E0D0',
    'lavender': '#E6E6FA',
  };
  
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || '#888888'; // Default gray if not found
}

/**
 * Maps wig items to specific wig models based on description keywords
 */
function mapWigModel(item: OwnedAttire): GarmentModel | null {
  const text = item.original_input_text?.toLowerCase() || '';
  const color = colorNameToHex(item.auto_categorized_color);
  
  // Check for style keywords
  if (text.includes('long') || text.includes('straight')) {
    return {
      assetModule: WIG_LONG_STRAIGHT,
      colorHex: color,
      slot: 'wig',
      modelName: 'Wig_Long_Straight',
    };
  }
  
  if (text.includes('bob') || text.includes('medium')) {
    return {
      assetModule: WIG_MEDIUM_BOB,
      colorHex: color,
      slot: 'wig',
      modelName: 'Wig_Medium_Bob',
    };
  }
  
  if (text.includes('ponytail') || text.includes('tail')) {
    return {
      assetModule: WIG_PONYTAIL,
      colorHex: color,
      slot: 'wig',
      modelName: 'Wig_Ponytail',
    };
  }
  
  if (text.includes('spiky') || text.includes('spike')) {
    return {
      assetModule: WIG_SPIKY_SHORT,
      colorHex: color,
      slot: 'wig',
      modelName: 'Wig_Spiky_Short',
    };
  }
  
  // Default to short cap
  return {
    assetModule: WIG_SHORT_CAP,
    colorHex: color,
    slot: 'wig',
    modelName: 'Wig_Short_Cap',
  };
}

/**
 * Maps top/clothing items to specific top models
 */
function mapTopModel(item: OwnedAttire): GarmentModel | null {
  const text = item.original_input_text?.toLowerCase() || '';
  const color = colorNameToHex(item.auto_categorized_color);
  
  if (text.includes('hoodie') || text.includes('hood')) {
    return {
      assetModule: TOP_HOODIE,
      colorHex: color,
      slot: 'top',
      modelName: 'Top_Hoodie',
    };
  }
  
  if (text.includes('jacket') || text.includes('coat') || text.includes('blazer')) {
    return {
      assetModule: TOP_JACKET,
      colorHex: color,
      slot: 'top',
      modelName: 'Top_Jacket',
    };
  }
  
  if (text.includes('crop') || text.includes('cropped')) {
    return {
      assetModule: TOP_CROP,
      colorHex: color,
      slot: 'top',
      modelName: 'Top_Crop',
    };
  }
  
  if (text.includes('tank') || text.includes('sleeveless')) {
    return {
      assetModule: TOP_TANK,
      colorHex: color,
      slot: 'top',
      modelName: 'Top_Tank',
    };
  }
  
  // Default to t-shirt
  return {
    assetModule: TOP_TSHIRT,
    colorHex: color,
    slot: 'top',
    modelName: 'Top_TShirt',
  };
}

/**
 * Maps bottom items to specific bottom models
 */
function mapBottomModel(item: OwnedAttire): GarmentModel | null {
  const text = item.original_input_text?.toLowerCase() || '';
  const color = colorNameToHex(item.auto_categorized_color);
  
  if (text.includes('skirt') || text.includes('dress')) {
    return {
      assetModule: BOTTOM_SKIRT,
      colorHex: color,
      slot: 'bottom',
      modelName: 'Bottom_Skirt',
    };
  }
  
  if (text.includes('shorts') || text.includes('short')) {
    return {
      assetModule: BOTTOM_SHORTS,
      colorHex: color,
      slot: 'bottom',
      modelName: 'Bottom_Shorts',
    };
  }
  
  // Default to pants
  return {
    assetModule: BOTTOM_PANTS,
    colorHex: color,
    slot: 'bottom',
    modelName: 'Bottom_Pants',
  };
}

/**
 * Maps footwear items to specific footwear models
 */
function mapFootwearModel(item: OwnedAttire): GarmentModel | null {
  const text = item.original_input_text?.toLowerCase() || '';
  const color = colorNameToHex(item.auto_categorized_color);
  
  if (text.includes('boot')) {
    return {
      assetModule: FOOTWEAR_BOOTS,
      colorHex: color,
      slot: 'footwear',
      modelName: 'Footwear_Boots',
    };
  }
  
  // Default to sneakers
  return {
    assetModule: FOOTWEAR_SNEAKERS,
    colorHex: color,
    slot: 'footwear',
    modelName: 'Footwear_Sneakers',
  };
}

/**
 * Maps accessory items to specific accessory models
 */
function mapAccessoryModel(item: OwnedAttire): GarmentModel | null {
  const text = item.original_input_text?.toLowerCase() || '';
  const color = colorNameToHex(item.auto_categorized_color);
  
  if (text.includes('backpack') || text.includes('bag')) {
    return {
      assetModule: ACCESSORY_BACKPACK,
      colorHex: color,
      slot: 'accessory',
      modelName: 'Accessory_Backpack',
    };
  }
  
  if (text.includes('belt')) {
    return {
      assetModule: ACCESSORY_BELT,
      colorHex: color,
      slot: 'accessory',
      modelName: 'Accessory_Belt',
    };
  }
  
  if (text.includes('glove')) {
    return {
      assetModule: ACCESSORY_GLOVES,
      colorHex: color,
      slot: 'accessory',
      modelName: 'Accessory_Gloves',
    };
  }
  
  if (text.includes('headband') || text.includes('band')) {
    return {
      assetModule: ACCESSORY_HEADBAND,
      colorHex: color,
      slot: 'accessory',
      modelName: 'Accessory_Headband',
    };
  }
  
  if (text.includes('weapon') || text.includes('sword') || text.includes('staff')) {
    return {
      assetModule: ACCESSORY_WEAPON,
      colorHex: color,
      slot: 'accessory',
      modelName: 'Accessory_Weapon',
    };
  }
  
  // No default accessory (too varied, return null)
  return null;
}

/**
 * Main mapper: Maps an owned item to a 3D garment model
 * Returns null if no suitable model exists
 * 
 * USAGE:
 *   const model = mapItemToGarmentModel(item, bodyType);
 *   if (model) {
 *     // Render garment with model.assetModule and model.colorHex
 *   }
 */
export function mapItemToGarmentModel(
  item: OwnedAttire,
  bodyType: BodyType
): GarmentModel | null {
  // Support legacy types by casting to string for comparison
  const itemType = (item.auto_categorized_type?.toLowerCase() || 'other') as string;
  const itemText = item.original_input_text?.toLowerCase() || '';
  
  console.log(`[ItemMapper] Mapping item:`, {
    type: itemType,
    text: itemText,
    color: item.auto_categorized_color,
  });
  
  // WIG MAPPING
  if (itemType === 'wig') {
    console.log(`[ItemMapper] → Detected as WIG`);
    return mapWigModel(item);
  }
  
  // TOP MAPPING
  // Handle both "top" category and "clothing" with shirt keywords
  if (itemType === 'top' || (itemType === 'clothing' && (
    itemText.includes('shirt') || 
    itemText.includes('top') || 
    itemText.includes('hoodie') ||
    itemText.includes('jacket') ||
    itemText.includes('blouse')
  ))) {
    console.log(`[ItemMapper] → Detected as TOP`);
    return mapTopModel(item);
  }
  
  // FALLBACK: If item type is "clothing" and not matched above, default to t-shirt
  if (itemType === 'clothing') {
    console.log(`[ItemMapper] → Defaulting CLOTHING to TOP (t-shirt)`);
    return mapTopModel(item);
  }
  
  // BOTTOM MAPPING
  // Handle both "bottom" category and "clothing" with bottom keywords
  if (itemType === 'bottom' || (itemType === 'clothing' && (
    itemText.includes('pants') || 
    itemText.includes('skirt') ||
    itemText.includes('shorts') ||
    itemText.includes('trousers') ||
    itemText.includes('jeans')
  ))) {
    return mapBottomModel(item);
  }
  
  // FOOTWEAR MAPPING
  if (itemType === 'footwear') {
    return mapFootwearModel(item);
  }
  
  // ACCESSORY MAPPING
  // Handle accessory, prop, weapon, armor (all mapped to accessory slot)
  if (itemType === 'accessory' || itemType === 'prop' || itemType === 'weapon' || itemType === 'armor') {
    return mapAccessoryModel(item);
  }
  
  // No mapping found
  console.warn(`[ItemMapper] ❌ No 3D model for type "${itemType}": ${item.original_input_text}`);
  console.warn(`[ItemMapper] Available types: wig, top, bottom, footwear, accessory`);
  console.warn(`[ItemMapper] Legacy types (mapped to accessory): prop, weapon, armor`);
  return null;
}

// Export for testing
export { mapWigModel, mapTopModel, mapBottomModel, mapFootwearModel, mapAccessoryModel };
