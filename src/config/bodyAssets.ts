/**
 * Body asset configuration.
 *
 * This module defines two body asset sets (V1 and V2) and controls which set is
 * active at runtime. The default is V1; switching to V2 is dev-only.
 *
 * V1: The original skinned bodies (3D_Model_Male.glb, 3D_Model_Female.glb).
 *     Centered near the origin, feet at approximately y=-0.95.
 *
 * V2: The rigged bodies (*_V2_rigged.glb) with their contracts (*_V2_contract.json).
 *     Floor origin (feet at y=0), 1.9m tall, 23 bones, dotted bone names.
 *
 * WHAT THIS SOLVES
 *
 * - Data-driven body loading: bounds, framing, and bone attachments read from the
 *   active set instead of hard-coding V1 dimensions.
 * - Dev-time V2 testing: a toggle on Preview3DTestScreen switches the active set
 *   without affecting production.
 * - Static imports: Metro requires GLB modules to be statically imported, so both
 *   sets are defined here with `require()` calls that resolve at build time.
 *
 * USAGE
 *
 *   import { getActiveBodySet, setActiveBodySet } from '@/config/bodyAssets';
 *
 *   const { male, female } = getActiveBodySet();
 *   const gltf = useGLTF(male.glb);
 *
 *   // Dev only:
 *   if (__DEV__) {
 *     setActiveBodySet('v2');
 *   }
 */

import { BaseBodySelection } from '../constants/bodyType';

// V1 bodies (original)
const V1_MALE_GLB = require('../../assets/models/3D_Model_Male.glb');
const V1_FEMALE_GLB = require('../../assets/models/3D_Model_Female.glb');

// V2 bodies (rigged with contracts)
const V2_MALE_GLB = require('../../assets/models/3D_Model_Male_V2_rigged.glb');
const V2_FEMALE_GLB = require('../../assets/models/3D_Model_Female_V2_rigged.glb');
const V2_MALE_CONTRACT = require('../../assets/models/3D_Model_Male_V2_contract.json');
const V2_FEMALE_CONTRACT = require('../../assets/models/3D_Model_Female_V2_contract.json');

export type BodySetId = 'v1' | 'v2';

export interface BodyAsset {
  /** Metro module reference (numeric asset ID on native, URL on web). */
  glb: string | number;
  /** Contract JSON (V2 only). Defines bones, attach map, and metadata. */
  contract?: any;
}

export interface BodyAssetSet {
  male: BodyAsset;
  female: BodyAsset;
}

const BODY_ASSET_SETS: Record<BodySetId, BodyAssetSet> = {
  v1: {
    male: { glb: V1_MALE_GLB },
    female: { glb: V1_FEMALE_GLB },
  },
  v2: {
    male: { glb: V2_MALE_GLB, contract: V2_MALE_CONTRACT },
    female: { glb: V2_FEMALE_GLB, contract: V2_FEMALE_CONTRACT },
  },
};

/** The currently active body set. Default: v1. */
let activeBodySetId: BodySetId = 'v1';

/**
 * Get the currently active body asset set.
 *
 * Returns the male and female body assets (GLB modules and contracts) for the
 * active set. BodyModel uses this to resolve which GLB to load.
 */
export function getActiveBodySet(): BodyAssetSet {
  return BODY_ASSET_SETS[activeBodySetId];
}

/**
 * Get the ID of the currently active body set.
 */
export function getActiveBodySetId(): BodySetId {
  return activeBodySetId;
}

/**
 * Set the active body set.
 *
 * DEV ONLY. Switches the active body set at runtime. Production code must not
 * call this; the default (v1) ensures existing behavior is unchanged.
 *
 * @param setId - 'v1' or 'v2'
 */
export function setActiveBodySet(setId: BodySetId): void {
  if (!__DEV__) {
    console.warn('[bodyAssets] setActiveBodySet called in production; ignoring');
    return;
  }
  if (!BODY_ASSET_SETS[setId]) {
    throw new Error(`[bodyAssets] Unknown body set ID: ${setId}`);
  }
  activeBodySetId = setId;
  console.log(`[bodyAssets] Active body set: ${setId}`);
}

/**
 * Get a specific body asset from the active set.
 *
 * @param bodyType - 'male' or 'female'
 * @returns The BodyAsset for the specified type in the active set
 */
export function getActiveBodyAsset(bodyType: BaseBodySelection): BodyAsset {
  return getActiveBodySet()[bodyType];
}
