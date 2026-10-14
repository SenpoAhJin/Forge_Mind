/**
 * Body Bounding Box Measurements
 * 
 * Min/max coordinates for male and female base bodies,
 * extracted from GLB files via scripts/glb_inspect.js.
 * 
 * Used for:
 * - Placeholder garment positioning (e.g., hat at top of head)
 * - Slot anchor validation
 * - Runtime bounds checks if needed
 */

export interface BodyBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export const BODY_BOUNDS: Record<'male' | 'female', BodyBounds> = {
  male: {
    min: { x: -0.440, y: -0.950, z: -0.174 },
    max: { x: 0.436, y: 0.931, z: 0.150 },
  },
  female: {
    min: { x: -0.404, y: -0.951, z: -0.185 },
    max: { x: 0.399, y: 0.944, z: 0.189 },
  },
};

/** Get center point of a body's bounding box */
export function getBodyCenter(bodyType: 'male' | 'female'): [number, number, number] {
  const bounds = BODY_BOUNDS[bodyType];
  return [
    (bounds.min.x + bounds.max.x) / 2,
    (bounds.min.y + bounds.max.y) / 2,
    (bounds.min.z + bounds.max.z) / 2,
  ];
}

/** Get top of head Y coordinate for a body */
export function getHeadTopY(bodyType: 'male' | 'female'): number {
  return BODY_BOUNDS[bodyType].max.y;
}

/** Get feet Y coordinate for a body */
export function getFeetY(bodyType: 'male' | 'female'): number {
  return BODY_BOUNDS[bodyType].min.y;
}
