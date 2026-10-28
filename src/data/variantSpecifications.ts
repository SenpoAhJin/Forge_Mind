/**
 * Character Variant Specifications
 * 
 * Defines the "target look" for each character variant. Each variant specifies:
 * - Required components per slot (wig, top, bottom, footwear, accessory)
 * - Expected colors, types, and keywords for matcher
 * - Display metadata (name, description, difficulty)
 * 
 * The wearing pipeline matches owned items to these specs, showing owned items
 * worn and missing slots with defaults/placeholders.
 * 
 * DESIGN NOTES:
 * - Variants are organized by character (e.g., "Naruto" has multiple variants)
 * - Each slot component includes keywords to help matcher find suitable items
 * - Colors use the mobile categorizer vocabulary (white, black, red, blue, pink, brown, green, purple, yellow)
 * - Types match AttireCategory from owned-attire.ts
 */

import type { AttireCategory } from '../types/owned-attire';

export type VariantSlot = 'wig' | 'top' | 'bottom' | 'footwear' | 'accessory';

export interface SlotComponent {
  /** Slot identifier */
  slot: VariantSlot;
  /** Expected attire type (must match AttireCategory) */
  type: AttireCategory;
  /** Primary color name (from mobile categorizer vocabulary) */
  color: string;
  /** Secondary color (optional, for multi-color items) */
  secondaryColor?: string;
  /** Keywords for matcher to find suitable items */
  keywords: string[];
  /** Human-readable description shown in UI */
  description: string;
  /** Is this slot required or optional? */
  required: boolean;
}

export interface VariantSpecification {
  /** Unique variant identifier (kebab-case) */
  id: string;
  /** Character name */
  characterName: string;
  /** Variant name (e.g., "Classic", "Shippuden", "Sage Mode") */
  variantName: string;
  /** Full display name */
  displayName: string;
  /** Brief description of this variant */
  description: string;
  /** Difficulty level (affects project planning) */
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  /** Estimated cost range in PHP */
  estimatedCostRange: { min: number; max: number };
  /** Estimated time to complete (in days) */
  estimatedDays: number;
  /** Components required for this variant */
  components: SlotComponent[];
  /** Body type preference (optional - variants can work with either) */
  bodyType?: 'male' | 'female';
  /** Reference image URL (optional) */
  referenceImageUrl?: string;
  /** Tags for filtering/search */
  tags: string[];
}

/**
 * Variant Specification Registry
 * 
 * START WITH 3 VARIANTS covering different difficulty levels and styles.
 * Each variant must have complete slot specifications.
 */
export const variantSpecifications: VariantSpecification[] = [
  // VARIANT 1: Naruto Uzumaki (Classic) - Beginner-friendly, iconic orange
  {
    id: 'naruto-classic',
    characterName: 'Naruto Uzumaki',
    variantName: 'Classic',
    displayName: 'Naruto Uzumaki (Classic)',
    description: 'Iconic orange jumpsuit with blue sandals and spiky yellow hair. Perfect for beginners.',
    difficulty: 'beginner',
    estimatedCostRange: { min: 2000, max: 5000 },
    estimatedDays: 14,
    bodyType: 'male',
    tags: ['anime', 'naruto', 'beginner', 'orange', 'ninja'],
    components: [
      {
        slot: 'wig',
        type: 'wig',
        color: 'yellow',
        keywords: ['spiky', 'blonde', 'yellow', 'naruto', 'short'],
        description: 'Spiky yellow/blonde wig',
        required: true,
      },
      {
        slot: 'top',
        type: 'top',
        color: 'yellow',
        secondaryColor: 'blue',
        keywords: ['jumpsuit', 'orange', 'jacket', 'ninja', 'collar'],
        description: 'Orange jumpsuit jacket with blue trim',
        required: true,
      },
      {
        slot: 'bottom',
        type: 'bottom',
        color: 'yellow',
        keywords: ['pants', 'orange', 'jumpsuit', 'ninja'],
        description: 'Orange jumpsuit pants',
        required: true,
      },
      {
        slot: 'footwear',
        type: 'footwear',
        color: 'blue',
        keywords: ['sandals', 'ninja', 'blue', 'straps'],
        description: 'Blue ninja sandals',
        required: true,
      },
      {
        slot: 'accessory',
        type: 'accessory',
        color: 'blue',
        keywords: ['headband', 'forehead protector', 'konoha', 'metal plate'],
        description: 'Konoha headband (forehead protector)',
        required: false,
      },
    ],
  },

  // VARIANT 2: Sailor Moon - Intermediate, multiple colors
  {
    id: 'sailor-moon-classic',
    characterName: 'Sailor Moon',
    variantName: 'Classic',
    displayName: 'Sailor Moon (Classic)',
    description: 'White sailor fuku with blue collar and red bow. Blonde twintails with odango buns.',
    difficulty: 'intermediate',
    estimatedCostRange: { min: 3500, max: 7000 },
    estimatedDays: 21,
    bodyType: 'female',
    tags: ['anime', 'sailor moon', 'magical girl', 'white', 'blue'],
    components: [
      {
        slot: 'wig',
        type: 'wig',
        color: 'yellow',
        keywords: ['blonde', 'twintails', 'odango', 'long', 'yellow'],
        description: 'Blonde twintails with odango buns',
        required: true,
      },
      {
        slot: 'top',
        type: 'top',
        color: 'white',
        secondaryColor: 'blue',
        keywords: ['sailor fuku', 'sailor', 'white', 'blue collar', 'bow'],
        description: 'White sailor fuku top with blue collar',
        required: true,
      },
      {
        slot: 'bottom',
        type: 'bottom',
        color: 'blue',
        keywords: ['skirt', 'pleated', 'blue', 'sailor'],
        description: 'Blue pleated sailor skirt',
        required: true,
      },
      {
        slot: 'footwear',
        type: 'footwear',
        color: 'red',
        keywords: ['boots', 'red', 'knee-high', 'heels'],
        description: 'Red knee-high boots',
        required: true,
      },
      {
        slot: 'accessory',
        type: 'accessory',
        color: 'red',
        keywords: ['bow', 'choker', 'red', 'ribbon'],
        description: 'Red bow choker',
        required: false,
      },
    ],
  },

  // VARIANT 3: Cloud Strife (Final Fantasy VII) - Advanced, complex styling
  {
    id: 'cloud-strife-soldier',
    characterName: 'Cloud Strife',
    variantName: 'SOLDIER 1st Class',
    displayName: 'Cloud Strife (SOLDIER)',
    description: 'Black SOLDIER uniform with purple accents. Spiky blonde hair and massive buster sword.',
    difficulty: 'advanced',
    estimatedCostRange: { min: 5000, max: 12000 },
    estimatedDays: 35,
    bodyType: 'male',
    tags: ['game', 'final fantasy', 'rpg', 'black', 'advanced', 'weapon'],
    components: [
      {
        slot: 'wig',
        type: 'wig',
        color: 'yellow',
        keywords: ['spiky', 'blonde', 'yellow', 'anime', 'gravity-defying'],
        description: 'Extreme spiky blonde wig',
        required: true,
      },
      {
        slot: 'top',
        type: 'top',
        color: 'black',
        secondaryColor: 'purple',
        keywords: ['soldier', 'uniform', 'sleeveless', 'black', 'purple'],
        description: 'Black SOLDIER sleeveless top with purple trim',
        required: true,
      },
      {
        slot: 'bottom',
        type: 'bottom',
        color: 'black',
        keywords: ['pants', 'cargo', 'black', 'belts'],
        description: 'Black cargo pants with belts',
        required: true,
      },
      {
        slot: 'footwear',
        type: 'footwear',
        color: 'black',
        keywords: ['boots', 'combat', 'black', 'heavy'],
        description: 'Black combat boots',
        required: true,
      },
      {
        slot: 'accessory',
        type: 'accessory',
        color: 'brown',
        secondaryColor: 'gray',
        keywords: ['buster sword', 'sword', 'large', 'prop'],
        description: 'Buster Sword (large prop weapon)',
        required: false,
      },
    ],
  },
];

/**
 * Get a variant by its ID
 */
export function getVariantById(id: string): VariantSpecification | undefined {
  return variantSpecifications.find(v => v.id === id);
}

/**
 * Get all variants for a character
 */
export function getVariantsByCharacter(characterName: string): VariantSpecification[] {
  return variantSpecifications.filter(v => v.characterName === characterName);
}

/**
 * Get variants by difficulty
 */
export function getVariantsByDifficulty(difficulty: VariantSpecification['difficulty']): VariantSpecification[] {
  return variantSpecifications.filter(v => v.difficulty === difficulty);
}

/**
 * Get all unique character names
 */
export function getAllCharacterNames(): string[] {
  return Array.from(new Set(variantSpecifications.map(v => v.characterName)));
}

/**
 * Get variant component by slot
 */
export function getVariantComponent(variant: VariantSpecification, slot: VariantSlot): SlotComponent | undefined {
  return variant.components.find(c => c.slot === slot);
}
