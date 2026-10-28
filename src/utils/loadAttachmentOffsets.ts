/**
 * Loader and validator for attachment offset data.
 * Offsets define how accessories attach to bones in model-space coordinates.
 */

import attachmentOffsetsData from '../data/attachmentOffsets.json';
import type { AttachmentOffset } from './attachToBone';

/**
 * Structure of the attachment offsets JSON file.
 */
export interface AttachmentOffsetsData {
  [bodyType: string]: {
    [slot: string]: {
      [boneName: string]: AttachmentOffset;
    };
  };
}

/**
 * Validation constraints for offset values.
 */
const VALIDATION = {
  position: { min: -1.0, max: 1.0 },  // metres, relative to bone head
  scale: { min: 0.1, max: 10.0 },     // scale factors
  rotation: { min: -360, max: 360 },  // degrees
} as const;

/**
 * Validates a single AttachmentOffset object.
 * @throws Error if validation fails
 */
function validateOffset(
  bodyType: string,
  slot: string,
  boneName: string,
  offset: unknown
): asserts offset is AttachmentOffset {
  if (!offset || typeof offset !== 'object') {
    throw new Error(
      `Invalid offset for ${bodyType}/${slot}/${boneName}: not an object`
    );
  }

  const obj = offset as Record<string, unknown>;

  // Validate position
  if (!Array.isArray(obj.position) || obj.position.length !== 3) {
    throw new Error(
      `Invalid position for ${bodyType}/${slot}/${boneName}: must be [x,y,z] array`
    );
  }
  for (let i = 0; i < 3; i++) {
    const val = obj.position[i];
    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error(
        `Invalid position[${i}] for ${bodyType}/${slot}/${boneName}: not a number`
      );
    }
    if (val < VALIDATION.position.min || val > VALIDATION.position.max) {
      throw new Error(
        `Invalid position[${i}] for ${bodyType}/${slot}/${boneName}: ${val} outside range [${VALIDATION.position.min}, ${VALIDATION.position.max}]`
      );
    }
  }

  // Validate rotation_deg
  if (!Array.isArray(obj.rotation_deg) || obj.rotation_deg.length !== 3) {
    throw new Error(
      `Invalid rotation_deg for ${bodyType}/${slot}/${boneName}: must be [x,y,z] array`
    );
  }
  for (let i = 0; i < 3; i++) {
    const val = obj.rotation_deg[i];
    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error(
        `Invalid rotation_deg[${i}] for ${bodyType}/${slot}/${boneName}: not a number`
      );
    }
    if (val < VALIDATION.rotation.min || val > VALIDATION.rotation.max) {
      throw new Error(
        `Invalid rotation_deg[${i}] for ${bodyType}/${slot}/${boneName}: ${val} outside range [${VALIDATION.rotation.min}, ${VALIDATION.rotation.max}]`
      );
    }
  }

  // Validate scale
  if (!Array.isArray(obj.scale) || obj.scale.length !== 3) {
    throw new Error(
      `Invalid scale for ${bodyType}/${slot}/${boneName}: must be [x,y,z] array`
    );
  }
  for (let i = 0; i < 3; i++) {
    const val = obj.scale[i];
    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error(
        `Invalid scale[${i}] for ${bodyType}/${slot}/${boneName}: not a number`
      );
    }
    if (val < VALIDATION.scale.min || val > VALIDATION.scale.max) {
      throw new Error(
        `Invalid scale[${i}] for ${bodyType}/${slot}/${boneName}: ${val} outside range [${VALIDATION.scale.min}, ${VALIDATION.scale.max}]`
      );
    }
  }
}

/**
 * Validates the entire attachment offsets data structure.
 * @throws Error if validation fails
 */
function validateAttachmentOffsets(
  data: unknown
): asserts data is AttachmentOffsetsData {
  if (!data || typeof data !== 'object') {
    throw new Error('Attachment offsets data must be an object');
  }

  const obj = data as Record<string, unknown>;

  for (const bodyType of Object.keys(obj)) {
    const bodyData = obj[bodyType];
    if (!bodyData || typeof bodyData !== 'object') {
      throw new Error(`Body type "${bodyType}" must be an object`);
    }

    const slots = bodyData as Record<string, unknown>;
    for (const slot of Object.keys(slots)) {
      const slotData = slots[slot];
      if (!slotData || typeof slotData !== 'object') {
        throw new Error(`Slot "${slot}" in body type "${bodyType}" must be an object`);
      }

      const bones = slotData as Record<string, unknown>;
      for (const boneName of Object.keys(bones)) {
        validateOffset(bodyType, slot, boneName, bones[boneName]);
      }
    }
  }
}

/**
 * Loads and validates attachment offset data.
 * Validation happens at module load time.
 */
export function loadAttachmentOffsets(): AttachmentOffsetsData {
  validateAttachmentOffsets(attachmentOffsetsData);
  return attachmentOffsetsData as AttachmentOffsetsData;
}

/**
 * Gets the offset for a specific body type, slot, and bone.
 * Returns undefined if not found.
 */
export function getAttachmentOffset(
  bodyType: string,
  slot: string,
  boneName: string
): AttachmentOffset | undefined {
  const data = loadAttachmentOffsets();
  return data[bodyType]?.[slot]?.[boneName];
}

/**
 * Gets all offsets for a specific body type and slot.
 * Returns an empty object if not found.
 */
export function getSlotOffsets(
  bodyType: string,
  slot: string
): Record<string, AttachmentOffset> {
  const data = loadAttachmentOffsets();
  return data[bodyType]?.[slot] ?? {};
}
