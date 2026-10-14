/**
 * Garment Registry
 * 
 * Registry of 3D garment assets that can be displayed on body models.
 * Each entry either references a real GLB asset or defines a placeholder primitive.
 * 
 * PLACEHOLDER NOTE: Entries marked isPlaceholder=true use code-generated primitives
 * (spheres, boxes, etc.) and are labeled "(placeholder)" to indicate no real asset exists yet.
 */

import { getHeadTopY } from './bodyBounds';

export type GarmentSlot = 'head' | 'torso' | 'legs' | 'hands' | 'prop';
export type BodyType = 'male' | 'female';

export interface PlaceholderShape {
  type: 'sphere' | 'box' | 'cylinder';
  /** Position offset from body origin [x, y, z], or function to compute per body type */
  position: [number, number, number] | ((bodyType: BodyType) => [number, number, number]);
  /** Scale [x, y, z] for box/cylinder, or radius for sphere */
  scale: number | [number, number, number];
  /** Color as hex string (e.g., '#FF0000') */
  color: string;
}

export interface GarmentEntry {
  /** Unique identifier (kebab-case) */
  id: string;
  /** Display name shown in UI */
  label: string;
  /** Body slot this garment occupies */
  slot: GarmentSlot;
  /** Which body types this garment supports */
  bodyTypes: BodyType[];
  /** GLB asset (Metro require) or null for placeholder */
  asset: number | string | null;
  /** Placeholder shape definition (used when asset is null) */
  placeholder: PlaceholderShape | null;
  /** True if this is a placeholder (no real asset exists) */
  isPlaceholder: boolean;
}

/**
 * Garment Registry
 * 
 * Add entries here as garment GLB files are created and placed in assets/models/garments/.
 * 
 * CURRENT STATE: Only placeholder entries exist. No real garment assets have been created yet.
 */
export const garmentRegistry: GarmentEntry[] = [
  // Placeholder: Head slot (hat-like cylinder sitting on top of head)
  {
    id: 'placeholder-head-hat',
    label: 'Head Hat (placeholder)',
    slot: 'head',
    bodyTypes: ['male', 'female'],
    asset: null,
    placeholder: {
      type: 'cylinder',
      position: (bodyType: BodyType) => {
        const headTop = getHeadTopY(bodyType);
        const hatHeight = 0.12;
        return [0, headTop + hatHeight / 2, 0]; // Center of cylinder sits above head
      },
      scale: [0.12, 0.12, 0.12], // [radiusTop, radiusBottom, height]
      color: '#FF6B6B', // Visible red color
    },
    isPlaceholder: true,
  },
];

/** Get all garments valid for a specific body type */
export function getGarmentsForBodyType(bodyType: BodyType): GarmentEntry[] {
  return garmentRegistry.filter((g) => g.bodyTypes.includes(bodyType));
}

/** Get a garment by its ID */
export function getGarmentById(id: string): GarmentEntry | undefined {
  return garmentRegistry.find((g) => g.id === id);
}

/** Get all garments for a specific slot */
export function getGarmentsBySlot(slot: GarmentSlot): GarmentEntry[] {
  return garmentRegistry.filter((g) => g.slot === slot);
}
