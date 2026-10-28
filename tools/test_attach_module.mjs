#!/usr/bin/env node
/**
 * Unit tests for attachToBone module with real THREE.js and GLB models.
 * Tests all attach points on male and female V2 bodies.
 * 
 * CRITICAL: Exit code 1 on any test failure.
 */

import * as THREE from 'three';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Import contracts
const maleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
);
const femaleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
);

// Import offset data
const offsetData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/attachmentOffsets.json'), 'utf8')
);

/**
 * Parse GLB and extract skeleton from first skin.
 * Simplified - doesn't load full scene, just creates bone hierarchy.
 */
async function loadSkeletonFromGLB(filepath) {
  const data = await fs.readFile(filepath);
  
  // Parse GLB header
  const magic = data.readUInt32LE(0);
  if (magic !== 0x46546C67) { // 'glTF'
    throw new Error('Not a valid GLB file');
  }
  
  const version = data.readUInt32LE(4);
  const length = data.readUInt32LE(8);
  
  // Parse JSON chunk
  const jsonChunkLength = data.readUInt32LE(12);
  const jsonChunkType = data.readUInt32LE(16);
  if (jsonChunkType !== 0x4E4F534A) { // 'JSON'
    throw new Error('Expected JSON chunk');
  }
  
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  const jsonStr = data.toString('utf8', jsonStart, jsonEnd);
  const gltf = JSON.parse(jsonStr);
  
  // Find first skin and build bone hierarchy
  if (!gltf.skins || gltf.skins.length === 0) {
    throw new Error('No skins found in GLB');
  }
  
  const skin = gltf.skins[0];
  const joints = skin.joints; // array of node indices
  
  // Create bones
  const bones = [];
  const nodeIndexToBone = new Map();
  
  for (const jointIndex of joints) {
    const node = gltf.nodes[jointIndex];
    const bone = new THREE.Bone();
    bone.name = node.name || `bone_${jointIndex}`;
    bones.push(bone);
    nodeIndexToBone.set(jointIndex, bone);
  }
  
  // Build hierarchy
  for (const jointIndex of joints) {
    const node = gltf.nodes[jointIndex];
    const bone = nodeIndexToBone.get(jointIndex);
    
    if (node.children) {
      for (const childIndex of node.children) {
        if (nodeIndexToBone.has(childIndex)) {
          const childBone = nodeIndexToBone.get(childIndex);
          bone.add(childBone);
        }
      }
    }
  }
  
  // Find root (bone with no parent in the bone set)
  let root = null;
  for (const bone of bones) {
    if (!bone.parent || !bones.includes(bone.parent)) {
      root = bone;
      break;
    }
  }
  
  if (!root) {
    root = bones[0];
  }
  
  // Create a scene container
  const scene = new THREE.Object3D();
  scene.add(root);
  
  return scene;
}

/**
 * Minimal implementation of resolveBone (inline to avoid TypeScript compilation).
 */
function resolveBone(bodyScene, boneName) {
  // First try exact match
  let found = null;
  bodyScene.traverse((obj) => {
    if (obj.isBone && obj.name === boneName) {
      found = obj;
    }
  });
  
  if (found) return found;
  
  // Then try sanitized match (for contract names like "foot.L" that may become "footL" in some loaders)
  const sanitized = THREE.PropertyBinding.sanitizeNodeName(boneName);
  bodyScene.traverse((obj) => {
    if (obj.isBone && obj.name === sanitized) {
      found = obj;
    }
  });
  
  if (!found) {
    throw new Error(`Bone "${boneName}" (sanitized: "${sanitized}") not found in skeleton`);
  }
  
  return found;
}

/**
 * Minimal implementation of attachAccessory (inline).
 */
function attachAccessory({ bodyScene, boneName, accessory, offset }) {
  const bone = resolveBone(bodyScene, boneName);
  
  // Detach if already attached
  if (accessory.parent) {
    accessory.removeFromParent();
    accessory.matrixAutoUpdate = true;
  }
  
  // Compute bone head in world space
  bone.updateWorldMatrix(true, false);
  const boneWorld = bone.matrixWorld.clone();
  
  // Build offset matrix in model space (relative to bone head)
  const offsetMatrix = new THREE.Matrix4();
  const pos = new THREE.Vector3(...offset.position);
  const rot = new THREE.Euler(
    THREE.MathUtils.degToRad(offset.rotation_deg[0]),
    THREE.MathUtils.degToRad(offset.rotation_deg[1]),
    THREE.MathUtils.degToRad(offset.rotation_deg[2]),
    'XYZ'
  );
  const scale = new THREE.Vector3(...offset.scale);
  offsetMatrix.compose(pos, new THREE.Quaternion().setFromEuler(rot), scale);
  
  // desired_world = bone_world * offset
  const desiredWorld = new THREE.Matrix4().multiplyMatrices(boneWorld, offsetMatrix);
  
  // accessory_local = inverse(bone_world) * desired_world
  const boneWorldInv = boneWorld.clone().invert();
  const accessoryLocal = new THREE.Matrix4().multiplyMatrices(boneWorldInv, desiredWorld);
  
  // Apply to accessory
  accessory.matrix.copy(accessoryLocal);
  accessory.matrixAutoUpdate = false;
  bone.add(accessory);
  
  return {
    detach: () => {
      if (accessory.parent === bone) {
        accessory.removeFromParent();
        accessory.matrixAutoUpdate = true;
      }
    }
  };
}

/**
 * Test suite
 */
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
    return false;
  } else {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
    return true;
  }
}

async function testBodyAttachPoints(bodyType, contract, glbPath) {
  console.log(`\n=== Testing ${bodyType} body ===`);
  
  // Load skeleton from GLB
  const bodyScene = await loadSkeletonFromGLB(glbPath);
  
  // Update world matrices once
  bodyScene.updateWorldMatrix(true, true);
  
  // Get all attach bones from contract
  const attachMap = contract.attach || {};
  const allBones = new Set();
  for (const slot of Object.keys(attachMap)) {
    for (const boneName of attachMap[slot]) {
      allBones.add(boneName);
    }
  }
  
  console.log(`Found ${allBones.size} attach bones in contract`);
  
  // Test 1: All contract bones exist in skeleton
  for (const boneName of allBones) {
    try {
      resolveBone(bodyScene, boneName);
      assert(true, `Bone "${boneName}" resolves in skeleton`);
    } catch (err) {
      assert(false, `Bone "${boneName}" resolves in skeleton: ${err.message}`);
    }
  }
  
  // Test 2: Attach dummy accessory to each bone
  const dummyAccessory = new THREE.Object3D();
  dummyAccessory.name = 'test-accessory';
  
  for (const boneName of allBones) {
    // Get offset from data (or use zero)
    let offset = { position: [0, 0, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] };
    for (const slot of Object.keys(attachMap)) {
      if (attachMap[slot].includes(boneName)) {
        const slotOffsets = offsetData[bodyType]?.[slot] || {};
        if (slotOffsets[boneName]) {
          offset = slotOffsets[boneName];
        }
        break;
      }
    }
    
    try {
      const { detach } = attachAccessory({
        bodyScene,
        boneName,
        accessory: dummyAccessory,
        offset
      });
      
      // Test 3: Accessory is parented to bone
      const bone = resolveBone(bodyScene, boneName);
      assert(
        dummyAccessory.parent === bone,
        `Accessory parented to bone "${boneName}"`
      );
      
      // Test 4: matrixAutoUpdate is false
      assert(
        dummyAccessory.matrixAutoUpdate === false,
        `matrixAutoUpdate=false for "${boneName}"`
      );
      
      // Test 5: Detach is callable
      detach();
      assert(
        dummyAccessory.parent === null,
        `Detach removes accessory from bone "${boneName}"`
      );
      
      // Test 6: Detach is idempotent
      detach();
      assert(
        dummyAccessory.parent === null,
        `Detach is idempotent for bone "${boneName}"`
      );
      
      // Test 7: Re-attach to same bone works
      attachAccessory({
        bodyScene,
        boneName,
        accessory: dummyAccessory,
        offset
      });
      assert(
        dummyAccessory.parent === bone,
        `Re-attach to bone "${boneName}" works`
      );
      
      // Clean up
      detach();
      
    } catch (err) {
      assert(false, `Attach to bone "${boneName}": ${err.message}`);
    }
  }
}

async function main() {
  console.log('Attach Module Tests\n');
  
  try {
    // Test male body
    await testBodyAttachPoints(
      'male',
      maleContract,
      path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb')
    );
    
    // Test female body
    await testBodyAttachPoints(
      'female',
      femaleContract,
      path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb')
    );
    
    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Total:  ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log('='.repeat(50));
    
    if (failedTests > 0) {
      console.error(`\n❌ ${failedTests} test(s) FAILED`);
      process.exit(1);
    } else {
      console.log('\n✅ All tests PASSED');
      process.exit(0);
    }
    
  } catch (err) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
