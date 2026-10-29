/**
 * Body Bounding Box Measurements
 * 
 * Min/max coordinates for male and female base bodies (V1 and V2),
 * read from bodyBounds.generated.json which is created by
 * scripts/compute_body_bounds.mjs from the GLB POSITION accessors.
 * 
 * Used for:
 * - Camera framing (computing target and distance from body height)
 * - Placeholder garment positioning (e.g., hat at top of head)
 * - Slot anchor validation
 * - Runtime bounds checks if needed
 * 
 * V1 comparison (hand-entered vs generated, all in millimeters):
 *   male:   minX diff 0.10mm, minY diff 0.02mm, maxY diff 0.00mm (within 2mm tolerance)
 *   female: minX diff 0.04mm, minY diff 0.02mm, maxY diff 0.02mm (within 2mm tolerance)
 */

import generatedBounds from './bodyBounds.generated.json';
import { getActiveBodySetId } from '../config/bodyAssets';
import type { BaseBodySelection } from '../constants/bodyType';

export interface BodyBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

interface BodyBoundsFlat {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerY: number;
  height: number;
}

/**
 * Get the bounding box for a body type in the active body set.
 */
export function getBodyBounds(bodyType: BaseBodySelection): BodyBounds {
  const setId = getActiveBodySetId();
  const flat = generatedBounds[setId][bodyType] as BodyBoundsFlat;
  return {
    min: { x: flat.minX, y: flat.minY, z: flat.minZ },
    max: { x: flat.maxX, y: flat.maxY, z: flat.maxZ },
  };
}

/**
 * DEPRECATED: Use getBodyBounds(bodyType) instead.
 * This constant reflects V1 only and is kept for compatibility.
 */
export const BODY_BOUNDS: Record<BaseBodySelection, BodyBounds> = {
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
export function getBodyCenter(bodyType: BaseBodySelection): [number, number, number] {
  const bounds = getBodyBounds(bodyType);
  return [
    (bounds.min.x + bounds.max.x) / 2,
    (bounds.min.y + bounds.max.y) / 2,
    (bounds.min.z + bounds.max.z) / 2,
  ];
}

/** Get top of head Y coordinate for a body */
export function getHeadTopY(bodyType: BaseBodySelection): number {
  return getBodyBounds(bodyType).max.y;
}

/** Get feet Y coordinate for a body */
export function getFeetY(bodyType: BaseBodySelection): number {
  return getBodyBounds(bodyType).min.y;
}

/** Get body height (Y-axis extent) for the active set */
export function getBodyHeight(bodyType: BaseBodySelection): number {
  const setId = getActiveBodySetId();
  return (generatedBounds[setId][bodyType] as BodyBoundsFlat).height;
}

/** Get vertical center Y coordinate for the active set */
export function getBodyCenterY(bodyType: BaseBodySelection): number {
  const setId = getActiveBodySetId();
  return (generatedBounds[setId][bodyType] as BodyBoundsFlat).centerY;
}

/** Get torso mid Y coordinate (for torso garments) */
export function getTorsoMidY(bodyType: BaseBodySelection): number {
  // Torso band Y ≈ 0.10 to 0.60 (from GARMENT_SPEC.md)
  return 0.35;
}

