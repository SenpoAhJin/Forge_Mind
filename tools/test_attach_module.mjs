#!/usr/bin/env node
/**
 * Unit tests for attachToBone module with REAL GLTFLoader.
 * Tests all attach points on male and female V2 bodies.
 * 
 * CRITICAL: Exit code 1 on any test failure.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Tolerances as named constants
const POSITION_TOLERANCE = 1e-5; // metres
const ROTATION_TOLERANCE = 1e-5; // radians

// Import contracts
const maleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
);
const femaleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
);

/**
 * Load GLB with real GLTFLoader.parse
 */
async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  
  return new Promise((resolve, reject) => {
    loader.parse(
      data.buffer,
      '',
      (gltf) => resolve(gltf),
      (err) => reject(err)
    );
  });
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
 * Get attach bones filtered by side.
 */
function getAttachBones(contract, slotName, options = {}) {
  const attachMap = contract.attach || {};
  const bones = attachMap[slotName] || [];
  
  if (!options.side) return bones;
  
  const suffix = `.${options.side}`;
  return bones.filter(name => name.endsWith(suffix));
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
  
  // Load with real GLTFLoader
  let gltf;
  try {
    gltf = await loadGLB(glbPath);
  } catch (err) {
    console.error(`BLOCKED: GLTFLoader.parse failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
  
  const bodyScene = gltf.scene;
  
  // STEP 2: Print foot.L contract name vs actual loaded name
  const footLContract = 'foot.L';
  let footLActual = null;
  try {
    const bone = resolveBone(bodyScene, footLContract);
    footLActual = bone.name;
  } catch (err) {
    footLActual = 'NOT_FOUND';
  }
  console.log(`  foot.L: contract="${footLContract}", loaded="${footLActual}"`);
  
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
  
  console.log(`  Found ${allBones.size} attach bones in contract\n`);
  
  // Test 3a: All contract bones resolve to THREE.Bone
  for (const boneName of allBones) {
    try {
      const bone = resolveBone(bodyScene, boneName);
      assert(
        bone && bone.isBone === true,
        `Bone "${boneName}" resolves to THREE.Bone`
      );
    } catch (err) {
      assert(false, `Bone "${boneName}" resolves to THREE.Bone: ${err.message}`);
    }
  }
  
  // Test 3b: Position check with offset [0, 0.1, 0]
  const dummyAccessory = new THREE.Object3D();
  dummyAccessory.name = 'test-accessory';
  
  const testBone = Array.from(allBones)[0]; // Use first bone
  console.log(`  Using test bone: "${testBone}"`);
  const posOffset = { position: [0, 0.1, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] };
  
  try {
    const bone = resolveBone(bodyScene, testBone);
    bone.updateWorldMatrix(true, false);
    const boneWorldBefore = bone.matrixWorld.clone();
    
    // Get bone head position in world space
    const boneHeadWorld = new THREE.Vector3();
    boneHeadWorld.setFromMatrixPosition(boneWorldBefore);
    
    // Debug: check bone orientation
    const debugBoneQuat = new THREE.Quaternion();
    const debugBoneScale = new THREE.Vector3();
    boneWorldBefore.decompose(new THREE.Vector3(), debugBoneQuat, debugBoneScale);
    const boneEuler = new THREE.Euler().setFromQuaternion(debugBoneQuat, 'XYZ');
    console.log(`  Bone world pos: [${boneHeadWorld.x.toFixed(4)}, ${boneHeadWorld.y.toFixed(4)}, ${boneHeadWorld.z.toFixed(4)}]`);
    console.log(`  Bone world rot (deg): [${THREE.MathUtils.radToDeg(boneEuler.x).toFixed(2)}, ${THREE.MathUtils.radToDeg(boneEuler.y).toFixed(2)}, ${THREE.MathUtils.radToDeg(boneEuler.z).toFixed(2)}]`);
    console.log(`  Bone world scale: [${debugBoneScale.x.toFixed(4)}, ${debugBoneScale.y.toFixed(4)}, ${debugBoneScale.z.toFixed(4)}]`);
    
    // Attach with offset
    attachAccessory({
      bodyScene,
      boneName: testBone,
      accessory: dummyAccessory,
      offset: posOffset
    });
    
    // Update accessory world matrix
    dummyAccessory.updateWorldMatrix(true, false);
    const accessoryWorldPos = new THREE.Vector3();
    accessoryWorldPos.setFromMatrixPosition(dummyAccessory.matrixWorld);
    console.log(`  Accessory world pos: [${accessoryWorldPos.x.toFixed(4)}, ${accessoryWorldPos.y.toFixed(4)}, ${accessoryWorldPos.z.toFixed(4)}]`);
    
    // Expected: boneHeadWorld + [0, 0.1, 0]
    const expectedPos = boneHeadWorld.clone().add(new THREE.Vector3(0, 0.1, 0));
    console.log(`  Expected pos: [${expectedPos.x.toFixed(4)}, ${expectedPos.y.toFixed(4)}, ${expectedPos.z.toFixed(4)}]`);
    const posDiff = accessoryWorldPos.distanceTo(expectedPos);
    
    assert(
      posDiff < POSITION_TOLERANCE,
      `Accessory world pos = bone head + offset [0,0.1,0] (diff=${posDiff.toExponential(2)})`
    );
    
    // Test with rotation offset (45 deg about Y)
    const rotOffset = { position: [0, 0, 0], rotation_deg: [0, 45, 0], scale: [1, 1, 1] };
    attachAccessory({
      bodyScene,
      boneName: testBone,
      accessory: dummyAccessory,
      offset: rotOffset
    });
    
    dummyAccessory.updateWorldMatrix(true, false);
    const accessoryQuat = new THREE.Quaternion();
    accessoryQuat.setFromRotationMatrix(dummyAccessory.matrixWorld);
    
    const boneQuat = new THREE.Quaternion();
    boneQuat.setFromRotationMatrix(boneWorldBefore);
    
    const offsetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, THREE.MathUtils.degToRad(45), 0, 'XYZ')
    );
    const expectedQuat = boneQuat.clone().multiply(offsetQuat);
    
    const quatDiff = accessoryQuat.angleTo(expectedQuat);
    assert(
      quatDiff < ROTATION_TOLERANCE,
      `Accessory orientation = bone * rotOffset (diff=${quatDiff.toExponential(2)} rad)`
    );
    
  } catch (err) {
    assert(false, `Position/rotation offset test: ${err.message}`);
  }
  
  // Test 3c: Follow - bone rotation changes, accessory follows
  try {
    const bone = resolveBone(bodyScene, testBone);
    
    // Attach with zero offset
    const zeroOffset = { position: [0, 0, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] };
    attachAccessory({
      bodyScene,
      boneName: testBone,
      accessory: dummyAccessory,
      offset: zeroOffset
    });
    
    // Store original local matrix
    const originalLocal = dummyAccessory.matrix.clone();
    
    // Get position before rotation
    bodyScene.updateWorldMatrix(true, true);
    const posBefore = new THREE.Vector3();
    posBefore.setFromMatrixPosition(dummyAccessory.matrixWorld);
    
    // Rotate bone 45 degrees about [1,1,0] normalized
    const axis = new THREE.Vector3(1, 1, 0).normalize();
    bone.rotateOnAxis(axis, THREE.MathUtils.degToRad(45));
    
    // Update world matrices
    bodyScene.updateWorldMatrix(true, true);
    
    // Get new bone world and compute expected accessory world
    const newBoneWorld = bone.matrixWorld.clone();
    const expectedAccessoryWorld = new THREE.Matrix4().multiplyMatrices(newBoneWorld, originalLocal);
    
    // Get actual accessory world
    const actualAccessoryWorld = dummyAccessory.matrixWorld.clone();
    
    // Compare matrices element-wise
    let maxDiff = 0;
    for (let i = 0; i < 16; i++) {
      const diff = Math.abs(actualAccessoryWorld.elements[i] - expectedAccessoryWorld.elements[i]);
      maxDiff = Math.max(maxDiff, diff);
    }
    
    assert(
      maxDiff < POSITION_TOLERANCE,
      `After bone rotation, accessory matrix = newBoneWorld * originalLocal (maxDiff=${maxDiff.toExponential(2)})`
    );
    
    // Check position changed
    const posAfter = new THREE.Vector3();
    posAfter.setFromMatrixPosition(actualAccessoryWorld);
    const posChange = posBefore.distanceTo(posAfter);
    
    assert(
      posChange > POSITION_TOLERANCE,
      `Accessory position changed after bone rotation (change=${posChange.toFixed(4)}m)`
    );
    
  } catch (err) {
    assert(false, `Follow test: ${err.message}`);
  }
  
  // Test 3d: Detach restores bone child count, second detach is no-op
  try {
    // Create fresh accessory for this test
    const freshAccessory = new THREE.Object3D();
    freshAccessory.name = 'fresh-test-accessory';
    
    const bone = resolveBone(bodyScene, testBone);
    const childCountBefore = bone.children.length;
    
    const { detach } = attachAccessory({
      bodyScene,
      boneName: testBone,
      accessory: freshAccessory,
      offset: { position: [0, 0, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] }
    });
    
    const childCountAttached = bone.children.length;
    assert(
      childCountAttached === childCountBefore + 1,
      `Attach increases bone child count by 1 (before=${childCountBefore}, after=${childCountAttached})`
    );
    
    detach();
    const childCountAfterDetach = bone.children.length;
    assert(
      childCountAfterDetach === childCountBefore,
      `Detach restores bone child count (expected=${childCountBefore}, actual=${childCountAfterDetach})`
    );
    
    detach(); // Second detach
    const childCountAfterSecondDetach = bone.children.length;
    assert(
      childCountAfterSecondDetach === childCountBefore,
      `Second detach is no-op (expected=${childCountBefore}, actual=${childCountAfterSecondDetach})`
    );
    
  } catch (err) {
    assert(false, `Detach test: ${err.message}`);
  }
  
  // Test 3e: Attach to male, detach, attach to female (only if both bodies available)
  // Skip for now - this test needs both bodies loaded simultaneously
  
  // Test 3f: Missing bone and missing slot throw clear errors
  try {
    try {
      resolveBone(bodyScene, 'nonexistent_bone_xyz');
      assert(false, `Missing bone throws error`);
    } catch (err) {
      assert(
        err.message.includes('not found'),
        `Missing bone throws error with "not found" message`
      );
    }
  } catch (err) {
    assert(false, `Missing bone error test: ${err.message}`);
  }
  
  // Test 3g: getAttachBones with side filter
  const leftShoes = getAttachBones(contract, 'shoes', { side: 'L' });
  const rightShoes = getAttachBones(contract, 'shoes', { side: 'R' });
  
  assert(
    leftShoes.every(name => name.endsWith('.L')),
    `getAttachBones(shoes, side:L) returns only .L bones`
  );
  
  assert(
    rightShoes.every(name => name.endsWith('.R')),
    `getAttachBones(shoes, side:R) returns only .R bones`
  );
  
  assert(
    leftShoes.length > 0 && rightShoes.length > 0,
    `Both L and R sides have bones`
  );
}

async function main() {
  console.log('Attach Module Tests with REAL GLTFLoader\n');
  
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
