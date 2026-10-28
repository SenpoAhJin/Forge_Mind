/**
 * attachToBone - Bone-based accessory attachment for rigged body models
 * 
 * Attaches rigid accessories (wigs, shoes) to bones in a THREE.js skeleton
 * so they follow bone transforms automatically.
 * 
 * DESIGN:
 * - Bone resolution with THREE.PropertyBinding.sanitizeNodeName (handles foot.L -> footL)
 * - Offset frame: position (m), rotation_deg (Euler XYZ), scale in model-space axes
 * - Attach sets accessory.matrixAutoUpdate = false and parents to bone
 * - Detach is idempotent and creates no leaks
 * 
 * USAGE:
 *   import { attachAccessory, resolveBone, getAttachBones } from './attachToBone';
 *   
 *   // Clone cached useGLTF scene first!
 *   const wigScene = gltf.scene.clone();
 *   
 *   const { detach } = attachAccessory({
 *     bodyScene,
 *     boneName: 'head',
 *     accessory: wigScene,
 *     offset: { position: [0, 0.1, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] }
 *   });
 *   
 *   // Later: detach();
 * 
 * REQUIREMENTS:
 * - Callers must clone useGLTF scenes before attaching (module doesn't clone)
 * - bodyScene.updateMatrixWorld(true) must be called before first attach
 * - Bone names from contracts must be sanitized with resolveBone()
 * 
 * @module attachToBone
 */

import * as THREE from 'three';
import { PropertyBinding } from 'three';

/**
 * Attachment offset specification
 * All in model-space axes at bind pose, relative to bone's head position
 */
export interface AttachmentOffset {
  /** Position offset in metres [x, y, z] */
  position: [number, number, number];
  /** Rotation in degrees, Euler XYZ order */
  rotation_deg: [number, number, number];
  /** Scale multiplier [x, y, z] */
  scale: [number, number, number];
}

/**
 * Contract structure (subset used by this module)
 */
export interface RigContract {
  attach: Record<string, string[]>; // slot -> bone names
}

/**
 * Filter for getAttachBones
 */
export interface AttachBoneFilter {
  /** Filter by bone suffix: 'L' or 'R' (matches .L, .R in bone names) */
  side?: 'L' | 'R';
  /** Filter by bone prefix: 'foot' or 'toe' (matches start of bone name after removing side) */
  part?: 'foot' | 'toe';
}

/**
 * Resolve bone name in THREE.js skeleton using exact or sanitized name matching
 * 
 * THREE.js GLTFLoader may sanitize node names (removes dots, slashes, brackets, colons),
 * so contract bone names like "foot.L" might become "footL" in some loaders.
 * However, glTF files exported with dots in bone names preserve those dots.
 * 
 * This function tries exact match first, then falls back to sanitized matching.
 * 
 * @param bodyScene - Root scene containing the skeleton
 * @param boneName - Bone name from contract (e.g., 'foot.L', 'head')
 * @returns THREE.Bone object
 * @throws Error if bone not found or ambiguous
 */
export function resolveBone(bodyScene: THREE.Object3D, boneName: string): THREE.Bone {
  // Collect all bones in the scene
  const bones: THREE.Bone[] = [];
  bodyScene.traverse((obj) => {
    if (obj instanceof THREE.Bone) {
      bones.push(obj);
    }
  });
  
  // Try exact match first (for bones with dots like "foot.L")
  const exactMatches = bones.filter((bone) => bone.name === boneName);
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }
  if (exactMatches.length > 1) {
    throw new Error(`Ambiguous bone name "${boneName}": found ${exactMatches.length} exact matches`);
  }
  
  // Fall back to sanitized matching (for loaders that strip special chars)
  const sanitized = PropertyBinding.sanitizeNodeName(boneName);
  const sanitizedMatches = bones.filter((bone) => bone.name === sanitized);
  if (sanitizedMatches.length === 1) {
    return sanitizedMatches[0];
  }
  if (sanitizedMatches.length > 1) {
    throw new Error(
      `Bone "${boneName}" (sanitized: "${sanitized}") is ambiguous: ` +
      `found ${sanitizedMatches.length} matches: ${sanitizedMatches.map((b) => b.name).join(', ')}`
    );
  }
  
  // Not found: provide helpful error with closest matches
  const allBoneNames = bones.map((b) => b.name).sort();
  const closeMatches = allBoneNames
    .filter((name) => 
      name.toLowerCase().includes(boneName.toLowerCase()) ||
      boneName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(sanitized.toLowerCase())
    )
    .slice(0, 5);
  
  throw new Error(
    `Bone "${boneName}" (sanitized: "${sanitized}") not found in skeleton. ` +
    `Closest matches: [${closeMatches.length > 0 ? closeMatches.join(', ') : 'none'}]. ` +
    `Available bones: [${allBoneNames.slice(0, 10).join(', ')}${allBoneNames.length > 10 ? `, +${allBoneNames.length - 10} more` : ''}]`
  );
}

/**
 * Get attach bones for a slot from contract
 * 
 * @param contract - Rig contract with attach map
 * @param slot - Slot name (e.g., 'wig', 'shoes')
 * @param filter - Optional filter by side (L/R) or part (foot/toe)
 * @returns Array of bone names from contract
 * @throws Error if slot not in contract
 */
export function getAttachBones(
  contract: RigContract,
  slot: string,
  filter?: AttachBoneFilter
): string[] {
  const bones = contract.attach[slot];
  if (!bones) {
    const availableSlots = Object.keys(contract.attach);
    throw new Error(
      `Slot "${slot}" not found in contract attach map. ` +
      `Available slots: [${availableSlots.join(', ')}]`
    );
  }
  
  let filtered = [...bones];
  
  // Filter by side
  if (filter?.side) {
    const suffix = `.${filter.side}`;
    filtered = filtered.filter((name) => name.endsWith(suffix));
  }
  
  // Filter by part
  if (filter?.part) {
    filtered = filtered.filter((name) => {
      // Remove side suffix for part matching
      const baseName = name.replace(/\.[LR]$/, '');
      return baseName.startsWith(filter.part!);
    });
  }
  
  return filtered;
}

/**
 * Attach an accessory to a bone
 * 
 * The accessory will follow the bone's transforms automatically.
 * Offset is in model-space axes at bind pose, relative to bone's head position.
 * 
 * IMPORTANT: Caller must clone useGLTF scenes before attaching to avoid mutating
 * the cached asset.
 * 
 * @param params - Attachment parameters
 * @param params.bodyScene - Root scene containing the skeleton (must have updateMatrixWorld called)
 * @param params.boneName - Bone name from contract (will be sanitized)
 * @param params.accessory - Object3D to attach (will be parented to bone)
 * @param params.offset - Offset relative to bone head in model-space
 * @returns Object with detach function
 */
export function attachAccessory(params: {
  bodyScene: THREE.Object3D;
  boneName: string;
  accessory: THREE.Object3D;
  offset: AttachmentOffset;
}): { detach: () => void } {
  const { bodyScene, boneName, accessory, offset } = params;
  
  // If accessory is already attached somewhere, detach it first
  if (accessory.parent) {
    accessory.removeFromParent();
  }
  
  // Resolve bone
  const bone = resolveBone(bodyScene, boneName);
  
  // Ensure world matrices are up to date
  bodyScene.updateMatrixWorld(true);
  
  // Get bone's current world position (head position)
  const boneWorldPos = new THREE.Vector3();
  bone.getWorldPosition(boneWorldPos);
  
  // Build desired world matrix from offset
  // Position: bone world position + offset
  const desiredWorldPos = new THREE.Vector3(
    boneWorldPos.x + offset.position[0],
    boneWorldPos.y + offset.position[1],
    boneWorldPos.z + offset.position[2]
  );
  
  // Rotation: offset rotation in degrees converted to radians
  const desiredWorldRot = new THREE.Euler(
    offset.rotation_deg[0] * Math.PI / 180,
    offset.rotation_deg[1] * Math.PI / 180,
    offset.rotation_deg[2] * Math.PI / 180,
    'XYZ'
  );
  
  // Scale: offset scale
  const desiredWorldScale = new THREE.Vector3(
    offset.scale[0],
    offset.scale[1],
    offset.scale[2]
  );
  
  // Build desired world matrix
  const desiredWorldMatrix = new THREE.Matrix4();
  desiredWorldMatrix.compose(desiredWorldPos, new THREE.Quaternion().setFromEuler(desiredWorldRot), desiredWorldScale);
  
  // Calculate local matrix: inverse(boneWorld) * desiredWorld
  const boneWorldMatrix = bone.matrixWorld.clone();
  const boneWorldInverse = boneWorldMatrix.clone().invert();
  const localMatrix = boneWorldInverse.clone().multiply(desiredWorldMatrix);
  
  // Set accessory's local transform
  accessory.matrix.copy(localMatrix);
  accessory.matrix.decompose(accessory.position, accessory.quaternion, accessory.scale);
  
  // Disable auto-update and parent to bone
  accessory.matrixAutoUpdate = false;
  bone.add(accessory);
  
  // Return detach function
  return {
    detach: () => {
      if (accessory.parent === bone) {
        accessory.removeFromParent();
        accessory.matrixAutoUpdate = true; // Restore default
      }
    }
  };
}
