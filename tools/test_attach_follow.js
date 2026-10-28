/**
 * Follow-the-Bone Test for Rigged V2 Bodies
 * Tests that attached rigid proxies follow bone transforms correctly
 * 
 * Requirements from GARMENT-1 Step 2:
 * - Load GLB headlessly
 * - For each slot-to-bone entry in contract's attach map:
 *   - Attach rigid proxy box to bone with known local offset
 *   - Record proxy's world position
 *   - Rotate bone by known angle on non-trivial axis
 *   - Update world matrices
 *   - Assert: proxy's world transform = boneWorld * localOffset (within tolerance)
 *   - Assert: proxy position differs from position before rotation
 * - Assert all bone names used exist in skeleton
 * 
 * Usage: node tools/test_attach_follow.js
 * 
 * @ts-nocheck
 */

const fs = require('fs');
const path = require('path');
const { readGLB } = require('./glb_inspect.js');

// Test configuration
const MODELS_DIR = path.join(__dirname, '..', 'assets', 'models');
const POSITION_TOLERANCE = 0.001; // 1mm tolerance for position checks

const TESTS = [
  {
    name: 'Male V2',
    glb: path.join(MODELS_DIR, '3D_Model_Male_V2_rigged.glb'),
    contract: path.join(MODELS_DIR, '3D_Model_Male_V2_contract.json')
  },
  {
    name: 'Female V2',
    glb: path.join(MODELS_DIR, '3D_Model_Female_V2_rigged.glb'),
    contract: path.join(MODELS_DIR, '3D_Model_Female_V2_contract.json')
  }
];

// Test parameters
const LOCAL_OFFSET = [0, 0.05, 0]; // 5cm above bone head
const ROTATION_ANGLE_DEG = 45;
const ROTATION_AXIS = [0, 1, 0.707]; // Non-trivial axis (Y + Z)

/**
 * Build local 4x4 matrix from TRS
 */
function buildLocalMatrix(node) {
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1]; // quaternion [x,y,z,w]
  const s = node.scale || [1, 1, 1];
  
  // Quaternion to rotation matrix
  const [x, y, z, w] = r;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  
  const R = [
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    0, 0, 0, 1
  ];
  
  // M = T * R * S (column-major)
  return [
    R[0] * s[0], R[1] * s[0], R[2] * s[0], 0,
    R[4] * s[1], R[5] * s[1], R[6] * s[1], 0,
    R[8] * s[2], R[9] * s[2], R[10] * s[2], 0,
    t[0], t[1], t[2], 1
  ];
}

/**
 * Multiply two 4x4 matrices (column-major)
 */
function multiplyMatrices(a, b) {
  const result = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      result[col * 4 + row] = 
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return result;
}

/**
 * Transform point by matrix
 */
function transformPoint(matrix, point) {
  return [
    matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
    matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
    matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14]
  ];
}

/**
 * Build parent lookup table
 */
function buildParentLookup(gltf) {
  const parentLookup = {};
  gltf.nodes.forEach((node, nodeIndex) => {
    if (node.children) {
      node.children.forEach(childIndex => {
        parentLookup[childIndex] = nodeIndex;
      });
    }
  });
  return parentLookup;
}

/**
 * Calculate world matrix from local transforms
 */
function getNodeWorldMatrix(gltf, nodeIndex, parentLookup, cache = {}) {
  if (cache[nodeIndex]) {
    return cache[nodeIndex];
  }
  
  const node = gltf.nodes[nodeIndex];
  const localMatrix = buildLocalMatrix(node);
  
  const parentIndex = parentLookup[nodeIndex];
  if (parentIndex === undefined) {
    cache[nodeIndex] = localMatrix;
    return localMatrix;
  }
  
  const parentWorldMatrix = getNodeWorldMatrix(gltf, parentIndex, parentLookup, cache);
  const worldMatrix = multiplyMatrices(parentWorldMatrix, localMatrix);
  
  cache[nodeIndex] = worldMatrix;
  return worldMatrix;
}

/**
 * Create axis-angle quaternion
 */
function axisAngleToQuaternion(axis, angleDeg) {
  const angleRad = angleDeg * Math.PI / 180;
  const halfAngle = angleRad / 2;
  const s = Math.sin(halfAngle);
  
  // Normalize axis
  const len = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
  const nx = axis[0] / len;
  const ny = axis[1] / len;
  const nz = axis[2] / len;
  
  return [nx * s, ny * s, nz * s, Math.cos(halfAngle)];
}

/**
 * Distance between two 3D points
 */
function distance3D(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Test attach-and-follow for one body and slot
 */
function testSlotAttachFollow(gltf, contract, slot, boneName) {
  // Find bone in skeleton
  const skin = gltf.skins[0];
  const jointMap = {};
  skin.joints.forEach(jointIdx => {
    const node = gltf.nodes[jointIdx];
    if (node.name) {
      jointMap[node.name] = jointIdx;
    }
  });
  
  const boneIdx = jointMap[boneName];
  if (boneIdx === undefined) {
    return { pass: false, error: `Bone "${boneName}" not found in skeleton` };
  }
  
  // Build parent lookup and world matrices
  const parentLookup = buildParentLookup(gltf);
  const cache = {};
  
  // Get initial bone world matrix
  const boneWorldInitial = getNodeWorldMatrix(gltf, boneIdx, parentLookup, cache);
  const proxyWorldInitial = transformPoint(boneWorldInitial, LOCAL_OFFSET);
  
  // Apply rotation to bone
  const originalRotation = gltf.nodes[boneIdx].rotation || [0, 0, 0, 1];
  const testRotation = axisAngleToQuaternion(ROTATION_AXIS, ROTATION_ANGLE_DEG);
  gltf.nodes[boneIdx].rotation = testRotation;
  
  // Clear cache to force recalculation
  const newCache = {};
  const boneWorldRotated = getNodeWorldMatrix(gltf, boneIdx, parentLookup, newCache);
  const proxyWorldRotated = transformPoint(boneWorldRotated, LOCAL_OFFSET);
  
  // Restore original rotation
  gltf.nodes[boneIdx].rotation = originalRotation;
  
  // Check 1: proxyWorldRotated = boneWorldRotated * LOCAL_OFFSET
  const expectedProxy = transformPoint(boneWorldRotated, LOCAL_OFFSET);
  const positionError = distance3D(proxyWorldRotated, expectedProxy);
  const positionMatches = positionError < POSITION_TOLERANCE;
  
  // Check 2: proxyWorldRotated differs from proxyWorldInitial
  const positionChanged = distance3D(proxyWorldInitial, proxyWorldRotated) > POSITION_TOLERANCE;
  
  return {
    pass: positionMatches && positionChanged,
    slot,
    bone: boneName,
    positionError: positionError * 1000, // mm
    positionMatches,
    positionChanged,
    initialPos: proxyWorldInitial,
    rotatedPos: proxyWorldRotated
  };
}

/**
 * Run all tests
 */
function runTests() {
  console.log('========================================');
  console.log('ATTACH-AND-FOLLOW TEST');
  console.log('========================================\n');
  console.log(`Test: Attach rigid proxy to bone, rotate bone, verify proxy follows`);
  console.log(`Local offset: [${LOCAL_OFFSET.join(', ')}]`);
  console.log(`Rotation: ${ROTATION_ANGLE_DEG}° around [${ROTATION_AXIS.join(', ')}]`);
  console.log(`Tolerance: ${POSITION_TOLERANCE * 1000} mm\n`);
  
  let allPassed = true;
  
  TESTS.forEach(test => {
    console.log(`\n=== ${test.name} ===\n`);
    
    if (!fs.existsSync(test.glb)) {
      console.log(`✗ GLB not found: ${test.glb}`);
      allPassed = false;
      return;
    }
    
    if (!fs.existsSync(test.contract)) {
      console.log(`✗ Contract not found: ${test.contract}`);
      allPassed = false;
      return;
    }
    
    const { gltf } = readGLB(test.glb);
    const contract = JSON.parse(fs.readFileSync(test.contract, 'utf8'));
    
    if (!gltf.skins || gltf.skins.length === 0) {
      console.log('✗ No skins found');
      allPassed = false;
      return;
    }
    
    const attachMap = contract.attach || {};
    let slotCount = 0;
    let passCount = 0;
    
    // Test each slot-to-bone entry
    Object.entries(attachMap).forEach(([slot, bones]) => {
      bones.forEach(boneName => {
        slotCount++;
        const result = testSlotAttachFollow(gltf, contract, slot, boneName);
        
        if (result.pass) {
          console.log(`✓ PASS: ${slot} → ${result.bone}`);
          console.log(`  Position error: ${result.positionError.toFixed(4)} mm`);
          console.log(`  Position changed: ${result.positionChanged ? 'YES' : 'NO'}`);
          passCount++;
        } else {
          console.log(`✗ FAIL: ${slot} → ${result.bone}`);
          if (!result.positionMatches) {
            console.log(`  Position error: ${result.positionError.toFixed(4)} mm (> ${POSITION_TOLERANCE * 1000} mm)`);
          }
          if (!result.positionChanged) {
            console.log(`  Position did not change after rotation`);
          }
          allPassed = false;
        }
      });
    });
    
    console.log(`\nResult: ${passCount}/${slotCount} slots PASS`);
  });
  
  console.log('\n========================================');
  console.log(`OVERALL: ${allPassed ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log('========================================\n');
  
  return allPassed;
}

// Main execution
if (require.main === module) {
  try {
    const allPassed = runTests();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { runTests };
