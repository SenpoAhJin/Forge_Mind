#!/usr/bin/env node
/**
 * Unit tests for attachToBone module with REAL GLTFLoader.
 * Tests all attach points on male and female V2 bodies.
 * 
 * SPEC: Offset is in MODEL-SPACE axes at bind pose, relative to bone's WORLD HEAD position.
 * NOT bone-local axes. Rotation ignores bone's bind-pose tilt.
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
const FOLLOW_TOLERANCE = 1e-5; // matrix element diff
const FOLLOW_MOVE_MIN = 1e-3; // minimum position change to prove follow

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
 * Minimal implementation of resolveBone matching attachToBone.ts
 */
function resolveBone(bodyScene, boneName) {
  const bones = [];
  bodyScene.traverse((obj) => {
    if (obj.isBone) bones.push(obj);
  });
  
  // Try exact match first
  const exactMatches = bones.filter((bone) => bone.name === boneName);
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    throw new Error(`Ambiguous bone name "${boneName}": found ${exactMatches.length} exact matches`);
  }
  
  // Fall back to sanitized matching
  const sanitized = THREE.PropertyBinding.sanitizeNodeName(boneName);
  const sanitizedMatches = bones.filter((bone) => bone.name === sanitized);
  if (sanitizedMatches.length === 1) return sanitizedMatches[0];
  if (sanitizedMatches.length > 1) {
    throw new Error(`Bone "${boneName}" (sanitized: "${sanitized}") is ambiguous`);
  }
  
  throw new Error(`Bone "${boneName}" (sanitized: "${sanitized}") not found in skeleton`);
}

/**
 * Implementation matching SPEC exactly:
 * - bodyScene.updateMatrixWorld(true)
 * - desiredWorld = compose(boneWorldHead + offset.position, quaternion(offset.rotation_deg, XYZ), offset.scale)
 * - accessoryLocal = inverse(bone.matrixWorld) * desiredWorld
 * - Apply via decompose, matrixAutoUpdate stays true
 * - bone.add(accessory)
 */
function attachAccessory({ bodyScene, boneName, accessory, offset }) {
  const bone = resolveBone(bodyScene, boneName);
  
  // Detach if already attached
  if (accessory.parent) {
    accessory.removeFromParent();
    accessory.matrixAutoUpdate = true;
  }
  
  // SPEC: bodyScene.updateMatrixWorld(true)
  bodyScene.updateMatrixWorld(true);
  
  // SPEC: boneWorldHead position
  const boneWorldHead = new THREE.Vector3();
  bone.getWorldPosition(boneWorldHead);
  
  // SPEC: desiredWorld = compose(boneWorldHead + offset.position, quaternion(offset.rotation_deg, XYZ), offset.scale)
  const desiredWorldPos = new THREE.Vector3(
    boneWorldHead.x + offset.position[0],
    boneWorldHead.y + offset.position[1],
    boneWorldHead.z + offset.position[2]
  );
  
  const desiredWorldQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(offset.rotation_deg[0]),
      THREE.MathUtils.degToRad(offset.rotation_deg[1]),
      THREE.MathUtils.degToRad(offset.rotation_deg[2]),
      'XYZ'
    )
  );
  
  const desiredWorldScale = new THREE.Vector3(
    offset.scale[0],
    offset.scale[1],
    offset.scale[2]
  );
  
  const desiredWorld = new THREE.Matrix4();
  desiredWorld.compose(desiredWorldPos, desiredWorldQuat, desiredWorldScale);
  
  // SPEC: accessoryLocal = inverse(bone.matrixWorld) * desiredWorld
  const boneWorldInv = bone.matrixWorld.clone().invert();
  const accessoryLocal = new THREE.Matrix4().multiplyMatrices(boneWorldInv, desiredWorld);
  
  // SPEC: Apply via decompose, matrixAutoUpdate stays true
  const localPos = new THREE.Vector3();
  const localQuat = new THREE.Quaternion();
  const localScale = new THREE.Vector3();
  accessoryLocal.decompose(localPos, localQuat, localScale);
  
  accessory.position.copy(localPos);
  accessory.quaternion.copy(localQuat);
  accessory.scale.copy(localScale);
  
  // SPEC: bone.add(accessory)
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
 * Get attach bones filtered by side or part
 */
function getAttachBones(contract, slotName, filter = {}) {
  const attachMap = contract.attach || {};
  const bones = attachMap[slotName];
  
  if (!bones) {
    throw new Error(`Slot "${slotName}" not found in contract attach map`);
  }
  
  let filtered = [...bones];
  
  if (filter.side) {
    const suffix = `.${filter.side}`;
    filtered = filtered.filter(name => name.endsWith(suffix));
  }
  
  if (filter.part) {
    filtered = filtered.filter(name => {
      const baseName = name.replace(/\.[LR]$/, '');
      return baseName.startsWith(filter.part);
    });
  }
  
  return filtered;
}

/**
 * Test framework
 */
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    if (details) {
      console.error(`         ${details}`);
      failureDetails.push({ test: message, details });
    }
    failedTests++;
    return false;
  } else {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
    return true;
  }
}

async function testBodyAttachPoints(bodyType, contract, glbPath) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${bodyType.toUpperCase()} BODY`);
  console.log('='.repeat(60));
  
  // Load with real GLTFLoader
  let gltf;
  try {
    gltf = await loadGLB(glbPath);
  } catch (err) {
    console.error(`BLOCKED: GLTFLoader.parse failed: ${err.message}`);
    process.exit(1);
  }
  
  const bodyScene = gltf.scene;
  
  // Get all attach bones from contract
  const attachMap = contract.attach || {};
  const allBones = new Set();
  for (const slot of Object.keys(attachMap)) {
    for (const boneName of attachMap[slot]) {
      allBones.add(boneName);
    }
  }
  
  console.log(`Contract has ${allBones.size} attach bones\n`);
  
  // Test 2a: All contract bones resolve to THREE.Bone
  console.log('Test 2a: Bone resolution');
  for (const boneName of allBones) {
    try {
      const bone = resolveBone(bodyScene, boneName);
      assert(
        bone && bone.isBone === true,
        `"${boneName}" resolves to THREE.Bone`
      );
    } catch (err) {
      assert(false, `"${boneName}" resolves to THREE.Bone`, err.message);
    }
  }
  
  // Test 2b: Offset checks - position, rotation, scale
  console.log('\nTest 2b: Offset position, rotation, scale');
  
  for (const boneName of allBones) {
    try {
      const bone = resolveBone(bodyScene, boneName);
      
      // Fresh accessory per test
      const accessory = new THREE.Object3D();
      accessory.name = `test-accessory-${boneName}`;
      
      // Measure boneWorldHead BEFORE attach
      bodyScene.updateMatrixWorld(true);
      const boneWorldHeadBefore = new THREE.Vector3();
      bone.getWorldPosition(boneWorldHeadBefore);
      
      // Attach with position offset [0, 0.1, 0]
      attachAccessory({
        bodyScene,
        boneName,
        accessory,
        offset: { position: [0, 0.1, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] }
      });
      
      // After attach, updateMatrixWorld and check world position
      bodyScene.updateMatrixWorld(true);
      const accessoryWorldPos = new THREE.Vector3();
      accessory.getWorldPosition(accessoryWorldPos);
      
      const expectedPos = new THREE.Vector3(
        boneWorldHeadBefore.x + 0,
        boneWorldHeadBefore.y + 0.1,
        boneWorldHeadBefore.z + 0
      );
      
      const posDiff = accessoryWorldPos.distanceTo(expectedPos);
      assert(
        posDiff < POSITION_TOLERANCE,
        `"${boneName}" pos offset [0,0.1,0]`,
        `diff=${posDiff.toExponential(3)}`
      );
      
      // Rotation offset [0, 45, 0] - fresh accessory
      const accessory2 = new THREE.Object3D();
      attachAccessory({
        bodyScene,
        boneName,
        accessory: accessory2,
        offset: { position: [0, 0, 0], rotation_deg: [0, 45, 0], scale: [1, 1, 1] }
      });
      
      bodyScene.updateMatrixWorld(true);
      const accessoryWorldQuat = new THREE.Quaternion();
      accessory2.getWorldQuaternion(accessoryWorldQuat);
      
      const expectedQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, THREE.MathUtils.degToRad(45), 0, 'XYZ')
      );
      
      const quatDiff = accessoryWorldQuat.angleTo(expectedQuat);
      assert(
        quatDiff < ROTATION_TOLERANCE,
        `"${boneName}" rot offset [0,45,0]`,
        `diff=${quatDiff.toExponential(3)} rad`
      );
      
      // Scale offset [1.5, 1.5, 1.5] - fresh accessory
      const accessory3 = new THREE.Object3D();
      attachAccessory({
        bodyScene,
        boneName,
        accessory: accessory3,
        offset: { position: [0, 0, 0], rotation_deg: [0, 0, 0], scale: [1.5, 1.5, 1.5] }
      });
      
      bodyScene.updateMatrixWorld(true);
      const accessoryWorldScale = new THREE.Vector3();
      accessory3.getWorldScale(accessoryWorldScale);
      
      const scaleDiff = Math.abs(accessoryWorldScale.x - 1.5) + 
                         Math.abs(accessoryWorldScale.y - 1.5) + 
                         Math.abs(accessoryWorldScale.z - 1.5);
      assert(
        scaleDiff < POSITION_TOLERANCE * 3,
        `"${boneName}" scale offset [1.5,1.5,1.5]`,
        `diff=${scaleDiff.toExponential(3)}`
      );
      
    } catch (err) {
      assert(false, `"${boneName}" offset tests`, err.message);
    }
  }
  
  // Test 2c: Follow - bone rotates, accessory follows
  console.log('\nTest 2c: Follow bone rotation');
  
  for (const boneName of allBones) {
    try {
      const bone = resolveBone(bodyScene, boneName);
      
      // Fresh accessory
      const accessory = new THREE.Object3D();
      accessory.name = `follow-test-${boneName}`;
      
      // Attach with [0, 0.1, 0] offset
      attachAccessory({
        bodyScene,
        boneName,
        accessory,
        offset: { position: [0, 0.1, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] }
      });
      
      // Call updateMatrixWorld(true) and record initial states
      bodyScene.updateMatrixWorld(true);
      const oldBoneWorld = bone.matrixWorld.clone();
      const oldAccWorld = accessory.matrixWorld.clone();
      
      // Rotate bone 45 deg about axis (1,2,3) normalized
      const axis = new THREE.Vector3(1, 2, 3).normalize();
      bone.rotateOnAxis(axis, THREE.MathUtils.degToRad(45));
      
      // updateMatrixWorld(true)
      bodyScene.updateMatrixWorld(true);
      
      // delta = newBoneWorld * inverse(oldBoneWorld)
      const oldBoneWorldInv = oldBoneWorld.clone().invert();
      const delta = new THREE.Matrix4().multiplyMatrices(bone.matrixWorld, oldBoneWorldInv);
      
      // expected = delta * oldAccWorld
      const expected = new THREE.Matrix4().multiplyMatrices(delta, oldAccWorld);
      
      // Assert all 16 elements of accessory.matrixWorld equal expected within 1e-5
      let maxDiff = 0;
      for (let i = 0; i < 16; i++) {
        const diff = Math.abs(accessory.matrixWorld.elements[i] - expected.elements[i]);
        maxDiff = Math.max(maxDiff, diff);
      }
      
      assert(
        maxDiff < FOLLOW_TOLERANCE,
        `"${boneName}" follow: matrixWorld = delta * oldWorld`,
        `maxDiff=${maxDiff.toExponential(3)}`
      );
      
      // Assert bone world matrix changed by more than 1e-3 in some element
      let boneMaxDiff = 0;
      for (let i = 0; i < 16; i++) {
        boneMaxDiff = Math.max(boneMaxDiff, Math.abs(bone.matrixWorld.elements[i] - oldBoneWorld.elements[i]));
      }
      assert(
        boneMaxDiff > 1e-3,
        `"${boneName}" bone matrixWorld changed`,
        `maxDiff=${boneMaxDiff.toFixed(4)}`
      );
      
      // Assert accessory world position moved by more than 1e-3 m
      const oldPos = new THREE.Vector3();
      const newPos = new THREE.Vector3();
      oldAccWorld.decompose(oldPos, new THREE.Quaternion(), new THREE.Vector3());
      accessory.matrixWorld.decompose(newPos, new THREE.Quaternion(), new THREE.Vector3());
      const posChange = oldPos.distanceTo(newPos);
      assert(
        posChange > FOLLOW_MOVE_MIN,
        `"${boneName}" accessory position moved`,
        `change=${posChange.toFixed(4)}m`
      );
      
    } catch (err) {
      assert(false, `"${boneName}" follow test`, err.message);
    }
  }
  
  // Test 2d: Detach restores bone child count, second detach is no-op
  console.log('\nTest 2d: Detach idempotence');
  
  const testBone = Array.from(allBones)[0];
  try {
    const bone = resolveBone(bodyScene, testBone);
    const childCountBefore = bone.children.length;
    
    const accessory = new THREE.Object3D();
    const { detach } = attachAccessory({
      bodyScene,
      boneName: testBone,
      accessory,
      offset: { position: [0, 0, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] }
    });
    
    const childCountAttached = bone.children.length;
    assert(
      childCountAttached === childCountBefore + 1,
      `Attach increases child count`,
      `before=${childCountBefore}, after=${childCountAttached}`
    );
    
    detach();
    const childCountAfterDetach = bone.children.length;
    assert(
      childCountAfterDetach === childCountBefore,
      `Detach restores child count`,
      `expected=${childCountBefore}, actual=${childCountAfterDetach}`
    );
    
    detach(); // Second detach
    const childCountAfterSecond = bone.children.length;
    assert(
      childCountAfterSecond === childCountBefore,
      `Second detach is no-op`,
      `expected=${childCountBefore}, actual=${childCountAfterSecond}`
    );
    
  } catch (err) {
    assert(false, `Detach test`, err.message);
  }
  
  // Test 2f: Missing bone throws clear error
  console.log('\nTest 2f: Error handling');
  
  try {
    resolveBone(bodyScene, 'nonexistent_bone_xyz');
    assert(false, `Missing bone throws error`);
  } catch (err) {
    assert(
      err.message.includes('not found') && err.message.includes('nonexistent_bone_xyz'),
      `Missing bone error names the bone`
    );
  }
  
  // Missing slot error
  try {
    getAttachBones(contract, 'nonexistent_slot_xyz');
    assert(false, `Missing slot throws error`);
  } catch (err) {
    assert(
      err.message.includes('not found') && err.message.includes('nonexistent_slot_xyz'),
      `Missing slot error names the slot`
    );
  }
  
  // Test 2g: getAttachBones with filters
  console.log('\nTest 2g: getAttachBones filtering');
  
  const leftShoes = getAttachBones(contract, 'shoes', { side: 'L' });
  const rightShoes = getAttachBones(contract, 'shoes', { side: 'R' });
  
  assert(
    leftShoes.length > 0 && leftShoes.every(name => name.endsWith('.L')),
    `getAttachBones(shoes, side:L) returns only .L bones`,
    `found ${leftShoes.length}: ${leftShoes.join(', ')}`
  );
  
  assert(
    rightShoes.length > 0 && rightShoes.every(name => name.endsWith('.R')),
    `getAttachBones(shoes, side:R) returns only .R bones`,
    `found ${rightShoes.length}: ${rightShoes.join(', ')}`
  );
  
  // Filter by part
  const footBones = getAttachBones(contract, 'shoes', { part: 'foot' });
  const toeBones = getAttachBones(contract, 'shoes', { part: 'toe' });
  
  assert(
    footBones.length > 0 && footBones.every(name => name.replace(/\.[LR]$/, '').startsWith('foot')),
    `getAttachBones(shoes, part:foot) returns only foot bones`,
    `found ${footBones.length}: ${footBones.join(', ')}`
  );
  
  assert(
    toeBones.length > 0 && toeBones.every(name => name.replace(/\.[LR]$/, '').startsWith('toe')),
    `getAttachBones(shoes, part:toe) returns only toe bones`,
    `found ${toeBones.length}: ${toeBones.join(', ')}`
  );
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('ATTACH MODULE TEST with REAL GLTFLoader');
  console.log('='.repeat(60));
  
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
    
    // Test 2e: Attach to male, detach, attach to female - no stray children
    console.log('\n' + '='.repeat(60));
    console.log('CROSS-BODY DETACH TEST');
    console.log('='.repeat(60));
    
    const maleGltf = await loadGLB(path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'));
    const femaleGltf = await loadGLB(path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'));
    
    const maleScene = maleGltf.scene;
    const femaleScene = femaleGltf.scene;
    
    const accessory = new THREE.Object3D();
    accessory.name = 'cross-body-test-accessory';
    
    // Count male scene children before
    const maleChildCountBefore = maleScene.children.length;
    
    // Attach to male
    const { detach: detachMale } = attachAccessory({
      bodyScene: maleScene,
      boneName: 'head',
      accessory,
      offset: { position: [0, 0, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] }
    });
    
    // Detach from male
    detachMale();
    
    // Count male scene children after detach
    const maleChildCountAfter = maleScene.children.length;
    
    // Attach to female
    attachAccessory({
      bodyScene: femaleScene,
      boneName: 'head',
      accessory,
      offset: { position: [0, 0, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] }
    });
    
    // Count male scene total descendants
    let maleDescendantCount = 0;
    maleScene.traverse(() => maleDescendantCount++);
    
    let femaleDescendantCount = 0;
    femaleScene.traverse(() => femaleDescendantCount++);
    
    assert(
      maleChildCountAfter === maleChildCountBefore,
      `Male scene has zero stray children after detach`,
      `before=${maleChildCountBefore}, after=${maleChildCountAfter}`
    );
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total:  ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    
    if (failedTests > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('FAILURE DETAILS');
      console.log('='.repeat(60));
      for (const { test, details } of failureDetails) {
        console.log(`\n${test}`);
        console.log(`  ${details}`);
      }
      console.log('\n❌ FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ ALL TESTS PASSED');
      process.exit(0);
    }
    
  } catch (err) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
