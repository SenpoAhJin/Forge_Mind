/**
 * GLB Inspector with Contract Validation
 * Validates rigged body GLBs against contract specifications
 * Dependency-free Node.js script
 * 
 * Usage: node tools/glb_inspect.js <glb_path> <contract_path> [tolerance]
 * 
 * @ts-nocheck
 */

const fs = require('fs');
const path = require('path');

// Tolerances (named constants)
const DEFAULT_TOLERANCE = 0.01; // Positional check tolerance (meters)
const BIND_POSE_TRANSLATION_TOLERANCE = 1e-4; // Bind-pose translation error (meters)
const BIND_POSE_ROTATION_TOLERANCE = 0.01; // Bind-pose rotation error (degrees)
const BONE_LENGTH_TOLERANCE = 0.001; // Bone length error (meters)

function readGLB(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // Read GLB header (12 bytes)
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  if (magic !== 0x46546C67) { // 'glTF' in ASCII
    throw new Error('Not a valid GLB file (bad magic number)');
  }
  
  // Read first chunk (JSON)
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  
  if (jsonChunkType !== 0x4E4F534A) { // 'JSON' in ASCII
    throw new Error('Expected JSON chunk');
  }
  
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
  const gltf = JSON.parse(jsonString);
  
  return { buffer, gltf, fileSize: buffer.length };
}

function analyzeMesh(gltf, meshIndex) {
  const mesh = gltf.meshes[meshIndex];
  let triangleCount = 0;
  
  mesh.primitives.forEach(prim => {
    if (prim.indices !== undefined) {
      const accessor = gltf.accessors[prim.indices];
      triangleCount += accessor.count / 3;
    }
  });
  
  return { name: mesh.name || `Mesh_${meshIndex}`, triangleCount };
}

function countMorphTargets(gltf) {
  if (!gltf.meshes) return 0;
  
  let totalMorphs = 0;
  gltf.meshes.forEach(mesh => {
    mesh.primitives.forEach(prim => {
      if (prim.targets) {
        totalMorphs += prim.targets.length;
      }
    });
  });
  
  return totalMorphs;
}

/**
 * Convert Blender coordinates (Z up) to glTF (Y up)
 * Blender: (x, y, z) → glTF: (x, z, -y)
 */
function blenderToGltf(blenderPos) {
  return [
    blenderPos[0],
    blenderPos[2],
    -blenderPos[1]
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
 * Quaternion to rotation matrix (column-major 4x4)
 */
function quaternionToMatrix(q) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  
  return [
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    0, 0, 0, 1
  ];
}

/**
 * Build local 4x4 matrix from TRS
 */
function buildLocalMatrix(node) {
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1]; // quaternion [x,y,z,w]
  const s = node.scale || [1, 1, 1];
  
  const R = quaternionToMatrix(r);
  
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
 * Column-major means: m[0..3] = first column, m[4..7] = second column, etc.
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
 * Invert a 4x4 affine transformation matrix
 */
function invertMatrix(m) {
  // Extract rotation/scale part (upper-left 3x3)
  const a00 = m[0], a01 = m[4], a02 = m[8];
  const a10 = m[1], a11 = m[5], a12 = m[9];
  const a20 = m[2], a21 = m[6], a22 = m[10];
  
  const det = a00 * (a11 * a22 - a12 * a21) -
              a01 * (a10 * a22 - a12 * a20) +
              a02 * (a10 * a21 - a11 * a20);
  
  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is not invertible');
  }
  
  const invDet = 1.0 / det;
  
  // Inverse of upper-left 3x3
  const inv = new Array(16).fill(0);
  inv[0] = (a11 * a22 - a12 * a21) * invDet;
  inv[1] = (a02 * a21 - a01 * a22) * invDet;
  inv[2] = (a01 * a12 - a02 * a11) * invDet;
  
  inv[4] = (a12 * a20 - a10 * a22) * invDet;
  inv[5] = (a00 * a22 - a02 * a20) * invDet;
  inv[6] = (a02 * a10 - a00 * a12) * invDet;
  
  inv[8] = (a10 * a21 - a11 * a20) * invDet;
  inv[9] = (a01 * a20 - a00 * a21) * invDet;
  inv[10] = (a00 * a11 - a01 * a10) * invDet;
  
  // Translation part: -R^-1 * t
  const tx = m[12], ty = m[13], tz = m[14];
  inv[12] = -(inv[0] * tx + inv[4] * ty + inv[8] * tz);
  inv[13] = -(inv[1] * tx + inv[5] * ty + inv[9] * tz);
  inv[14] = -(inv[2] * tx + inv[6] * ty + inv[10] * tz);
  
  inv[3] = 0; inv[7] = 0; inv[11] = 0; inv[15] = 1;
  
  return inv;
}

/**
 * Extract translation from matrix
 */
function getTranslation(m) {
  return [m[12], m[13], m[14]];
}

/**
 * Extract rotation angle (degrees) from matrix
 * For bind-pose check, the result matrix should be identity
 */
function getRotationAngle(m) {
  // For a rotation matrix, trace = 1 + 2*cos(angle)
  // Extract upper 3x3 rotation part
  const trace = m[0] + m[5] + m[10];
  
  // Clamp to avoid numerical errors in acos
  const cosAngle = Math.max(-1, Math.min(1, (trace - 1) / 2));
  const angle = Math.acos(cosAngle);
  
  return angle * 180 / Math.PI;
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
    // Root node
    cache[nodeIndex] = localMatrix;
    return localMatrix;
  }
  
  // Recursively get parent world matrix
  const parentWorldMatrix = getNodeWorldMatrix(gltf, parentIndex, parentLookup, cache);
  
  // World = Parent * Local
  const worldMatrix = multiplyMatrices(parentWorldMatrix, localMatrix);
  
  cache[nodeIndex] = worldMatrix;
  return worldMatrix;
}

/**
 * Calculate world position from world matrix
 */
function getNodeWorldPosition(gltf, nodeIndex, parentLookup, cache = {}) {
  const worldMatrix = getNodeWorldMatrix(gltf, nodeIndex, parentLookup, cache);
  return getTranslation(worldMatrix);
}

/**
 * Read accessor data from buffer
 */
function readAccessor(gltf, buffer, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  
  // GLB has header (12 bytes) + JSON chunk header (8 bytes) + JSON + BIN chunk header (8 bytes)
  // The buffer parameter we have is the full GLB buffer, so we need the BIN chunk offset
  const jsonChunkLength = buffer.readUInt32LE(12);
  const binChunkOffset = 12 + 8 + jsonChunkLength + 8; // GLB header + JSON chunk header + JSON + BIN chunk header
  
  const byteOffset = binChunkOffset + (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const count = accessor.count;
  
  // Determine component type and size
  const componentTypes = {
    5126: { name: 'FLOAT', size: 4, reader: 'readFloatLE' },
    5123: { name: 'UNSIGNED_SHORT', size: 2, reader: 'readUInt16LE' },
    5125: { name: 'UNSIGNED_INT', size: 4, reader: 'readUInt32LE' }
  };
  
  const componentType = componentTypes[accessor.componentType];
  if (!componentType) {
    throw new Error(`Unsupported component type: ${accessor.componentType}`);
  }
  
  const typeSizes = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT4': 16
  };
  
  const componentsPerElement = typeSizes[accessor.type];
  if (!componentsPerElement) {
    throw new Error(`Unsupported accessor type: ${accessor.type}`);
  }
  
  const data = [];
  let offset = byteOffset;
  
  for (let i = 0; i < count; i++) {
    const element = [];
    for (let j = 0; j < componentsPerElement; j++) {
      const value = buffer[componentType.reader](offset);
      element.push(value);
      offset += componentType.size;
    }
    data.push(componentsPerElement === 1 ? element[0] : element);
  }
  
  return data;
}

/**
 * Get inverse bind matrices from skin
 */
function getInverseBindMatrices(gltf, buffer, skin) {
  if (skin.inverseBindMatrices === undefined) {
    // Identity matrices
    const identity = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    return skin.joints.map(() => identity);
  }
  
  const matrices = readAccessor(gltf, buffer, skin.inverseBindMatrices);
  // readAccessor returns array of arrays for MAT4, so matrices is already correct
  return matrices;
}

/**
 * Calculate distance between two 3D points
 */
function distance3D(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check bind pose: inverse(meshWorld) * jointWorld * inverseBindMatrix should be identity
 */
function checkBindPose(gltf, buffer, skin, meshNodeIndex, parentLookup) {
  const inverseBindMatrices = getInverseBindMatrices(gltf, buffer, skin);
  
  const meshWorldMatrix = getNodeWorldMatrix(gltf, meshNodeIndex, parentLookup);
  const meshWorldInverse = invertMatrix(meshWorldMatrix);
  
  let maxTranslationError = 0;
  let maxRotationError = 0;
  const failures = [];
  
  skin.joints.forEach((jointIndex, i) => {
    const jointWorldMatrix = getNodeWorldMatrix(gltf, jointIndex, parentLookup);
    const inverseBindMatrix = inverseBindMatrices[i];
    
    // Calculate: meshWorldInverse * jointWorld * inverseBindMatrix
    const temp = multiplyMatrices(meshWorldInverse, jointWorldMatrix);
    const result = multiplyMatrices(temp, inverseBindMatrix);
    
    // Extract translation and rotation errors
    const translation = getTranslation(result);
    const translationError = Math.sqrt(
      translation[0] * translation[0] +
      translation[1] * translation[1] +
      translation[2] * translation[2]
    );
    
    // For rotation, check deviation from identity in the upper 3x3
    // Identity has diagonal [1,1,1] and off-diagonal zeros
    const r00 = result[0] - 1, r01 = result[4], r02 = result[8];
    const r10 = result[1], r11 = result[5] - 1, r12 = result[9];
    const r20 = result[2], r21 = result[6], r22 = result[10] - 1;
    
    const frobeniusNorm = Math.sqrt(
      r00*r00 + r01*r01 + r02*r02 +
      r10*r10 + r11*r11 + r12*r12 +
      r20*r20 + r21*r21 + r22*r22
    );
    
    // For small rotations, Frobenius norm ≈ sqrt(2) * angle_in_radians
    // So angle ≈ frobeniusNorm / sqrt(2)
    const rotationAngleDeg = (frobeniusNorm / Math.sqrt(2)) * 180 / Math.PI;
    
    maxTranslationError = Math.max(maxTranslationError, translationError);
    maxRotationError = Math.max(maxRotationError, rotationAngleDeg);
    
    if (translationError > BIND_POSE_TRANSLATION_TOLERANCE || 
        rotationAngleDeg > BIND_POSE_ROTATION_TOLERANCE) {
      failures.push({
        joint: gltf.nodes[jointIndex].name,
        translationError,
        rotationError: rotationAngleDeg
      });
    }
  });
  
  return { maxTranslationError, maxRotationError, failures };
}

/**
 * Check bone lengths against contract
 */
function checkBoneLengths(gltf, skin, contract, parentLookup) {
  const jointNameToIndex = {};
  skin.joints.forEach(jointIndex => {
    const node = gltf.nodes[jointIndex];
    if (node && node.name) {
      jointNameToIndex[node.name] = jointIndex;
    }
  });
  
  let maxDifference = 0;
  const failures = [];
  
  contract.bones.forEach(bone => {
    if (!bone.parent) return; // Skip root
    
    const childIndex = jointNameToIndex[bone.name];
    const parentBone = contract.bones.find(b => b.name === bone.parent);
    const parentIndex = jointNameToIndex[bone.parent];
    
    if (childIndex === undefined || parentIndex === undefined || !parentBone) {
      return;
    }
    
    // GLB: distance between joint world positions
    const childWorldPos = getNodeWorldPosition(gltf, childIndex, parentLookup);
    const parentWorldPos = getNodeWorldPosition(gltf, parentIndex, parentLookup);
    const glbBoneLength = distance3D(parentWorldPos, childWorldPos);
    
    // Contract: distance between head positions (Blender space)
    const contractBoneLength = distance3D(parentBone.head, bone.head);
    
    const difference = Math.abs(glbBoneLength - contractBoneLength);
    maxDifference = Math.max(maxDifference, difference);
    
    if (difference > BONE_LENGTH_TOLERANCE) {
      failures.push({
        bone: `${bone.parent} -> ${bone.name}`,
        contractLength: contractBoneLength,
        glbLength: glbBoneLength,
        difference
      });
    }
  });
  
  return { maxDifference, failures };
}
/**
 * Get joint world positions from glTF nodes
 */
function getJointWorldPositions(gltf, skin, parentLookup) {
  const jointPositions = {};
  const cache = {};
  
  skin.joints.forEach(jointIndex => {
    const node = gltf.nodes[jointIndex];
    if (node && node.name) {
      const worldPos = getNodeWorldPosition(gltf, jointIndex, parentLookup, cache);
      jointPositions[node.name] = worldPos;
    }
  });
  
  return jointPositions;
}

/**
 * Check if two positions match within tolerance
 */
function positionsMatch(pos1, pos2, tolerance) {
  const dx = Math.abs(pos1[0] - pos2[0]);
  const dy = Math.abs(pos1[1] - pos2[1]);
  const dz = Math.abs(pos1[2] - pos2[2]);
  
  return dx <= tolerance && dy <= tolerance && dz <= tolerance;
}

/**
 * Check left/right symmetry for paired bones
 */
function checkSymmetry(jointPositions, tolerance) {
  const pairs = [
    ['clavicle.L', 'clavicle.R'],
    ['upperarm.L', 'upperarm.R'],
    ['forearm.L', 'forearm.R'],
    ['hand.L', 'hand.R'],
    ['thigh.L', 'thigh.R'],
    ['shin.L', 'shin.R'],
    ['foot.L', 'foot.R'],
    ['toe.L', 'toe.R']
  ];
  
  const failures = [];
  
  pairs.forEach(([left, right]) => {
    const leftPos = jointPositions[left];
    const rightPos = jointPositions[right];
    
    if (leftPos && rightPos) {
      // Check that X is mirrored, Y and Z match
      const xSymmetric = Math.abs(Math.abs(leftPos[0]) - Math.abs(rightPos[0])) <= tolerance;
      const yMatch = Math.abs(leftPos[1] - rightPos[1]) <= tolerance;
      const zMatch = Math.abs(leftPos[2] - rightPos[2]) <= tolerance;
      
      if (!xSymmetric || !yMatch || !zMatch) {
        failures.push({
          pair: `${left} / ${right}`,
          leftPos,
          rightPos
        });
      }
    }
  });
  
  return failures;
}

/**
 * Main inspection function
 */
function inspectWithContract(glbPath, contractPath, tolerance = DEFAULT_TOLERANCE) {
  console.log(`\n========================================`);
  console.log(`GLB: ${path.basename(glbPath)}`);
  console.log(`Contract: ${path.basename(contractPath)}`);
  console.log(`Tolerance: ${tolerance} m`);
  console.log(`========================================\n`);
  
  // Load files
  const { buffer, gltf, fileSize } = readGLB(glbPath);
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  const results = {
    checks: [],
    pass: true
  };
  
  function addCheck(name, target, actual, pass, details = '') {
    results.checks.push({ name, target, actual, pass, details });
    if (!pass) results.pass = false;
  }
  
  // Check 1: Joint count
  const skinCount = gltf.skins?.length || 0;
  const jointCount = skinCount > 0 ? gltf.skins[0].joints.length : 0;
  const expectedJointCount = contract.bones.length;
  addCheck(
    'Joint count',
    expectedJointCount,
    jointCount,
    jointCount === expectedJointCount
  );
  
  // Check 2: Joint names
  if (skinCount > 0) {
    const skin = gltf.skins[0];
    const actualJointNames = skin.joints.map(idx => gltf.nodes[idx].name);
    const expectedJointNames = contract.bones.map(b => b.name);
    
    const missing = expectedJointNames.filter(n => !actualJointNames.includes(n));
    const extra = actualJointNames.filter(n => !expectedJointNames.includes(n));
    
    const jointNamesMatch = missing.length === 0 && extra.length === 0;
    addCheck(
      'Joint names',
      'all match',
      jointNamesMatch ? 'all match' : `missing: [${missing.join(', ')}], extra: [${extra.join(', ')}]`,
      jointNamesMatch,
      jointNamesMatch ? '' : `Missing: [${missing.join(', ')}] Extra: [${extra.join(', ')}]`
    );
  } else {
    addCheck('Joint names', 'N/A', 'N/A (no skin)', false);
  }
  
  // Check 3: Skin count
  addCheck('Skin count', 1, skinCount, skinCount === 1);
  
  // Check 4: Triangle count
  let totalTriangles = 0;
  if (gltf.meshes) {
    gltf.meshes.forEach((mesh, i) => {
      const analysis = analyzeMesh(gltf, i);
      totalTriangles += analysis.triangleCount;
    });
  }
  const triangleLimit = contract.triangles || 20000;
  addCheck(
    'Triangle count',
    `<= ${triangleLimit}`,
    Math.floor(totalTriangles),
    totalTriangles <= triangleLimit
  );
  
  // Check 5: Morph targets
  const morphCount = countMorphTargets(gltf);
  addCheck('Morph targets', 0, morphCount, morphCount === 0);
  
  // Check 6: File size (report only)
  addCheck(
    'File size',
    'report',
    `${(fileSize / 1024).toFixed(2)} KB`,
    true
  );
  
  // NEW: Check 7a: Bind-pose check (translation)
  // NEW: Check 7b: Bind-pose check (rotation)
  // NEW: Check 7c: Bone-length check
  if (skinCount > 0) {
    const skin = gltf.skins[0];
    const parentLookup = buildParentLookup(gltf);
    
    // Find mesh node (the node that has the skinned mesh)
    let meshNodeIndex = null;
    gltf.nodes.forEach((node, idx) => {
      if (node.skin === 0 && node.mesh !== undefined) {
        meshNodeIndex = idx;
      }
    });
    
    if (meshNodeIndex !== null) {
      // Check 7a & 7b: Bind-pose verification
      const bindPoseResult = checkBindPose(gltf, buffer, skin, meshNodeIndex, parentLookup);
      
      addCheck(
        'Bind-pose (trans)',
        `< ${BIND_POSE_TRANSLATION_TOLERANCE} m`,
        `${(bindPoseResult.maxTranslationError * 1000).toFixed(4)} mm`,
        bindPoseResult.maxTranslationError < BIND_POSE_TRANSLATION_TOLERANCE,
        bindPoseResult.failures.length > 0 ? 
          bindPoseResult.failures.slice(0, 2).map(f => 
            `${f.joint}: ${(f.translationError * 1000).toFixed(4)} mm`
          ).join('; ') : ''
      );
      
      addCheck(
        'Bind-pose (rot)',
        `< ${BIND_POSE_ROTATION_TOLERANCE} deg`,
        `${bindPoseResult.maxRotationError.toFixed(4)} deg`,
        bindPoseResult.maxRotationError < BIND_POSE_ROTATION_TOLERANCE,
        bindPoseResult.failures.length > 0 ? 
          bindPoseResult.failures.slice(0, 2).map(f => 
            `${f.joint}: ${f.rotationError.toFixed(4)} deg`
          ).join('; ') : ''
      );
      
      // Check 7c: Bone-length check
      const boneLengthResult = checkBoneLengths(gltf, skin, contract, parentLookup);
      
      addCheck(
        'Bone lengths',
        `< ${BONE_LENGTH_TOLERANCE * 1000} mm`,
        `${(boneLengthResult.maxDifference * 1000).toFixed(3)} mm`,
        boneLengthResult.maxDifference < BONE_LENGTH_TOLERANCE,
        boneLengthResult.failures.length > 0 ? 
          boneLengthResult.failures.slice(0, 2).map(f => 
            `${f.bone}: ${(f.difference * 1000).toFixed(3)} mm`
          ).join('; ') : ''
      );
    } else {
      addCheck('Bind-pose (trans)', 'N/A', 'N/A (no mesh node)', false);
      addCheck('Bind-pose (rot)', 'N/A', 'N/A (no mesh node)', false);
      addCheck('Bone lengths', 'N/A', 'N/A (no mesh node)', false);
    }
    
    // Check 8: Positional check (informational)
    const jointPositions = getJointWorldPositions(gltf, skin, parentLookup);
    let maxDelta = 0;
    let meanDelta = 0;
    let count = 0;
    let offsetX = null, offsetY = null, offsetZ = null;
    
    contract.bones.forEach(bone => {
      const actualPos = jointPositions[bone.name];
      if (actualPos) {
        const expectedPos = blenderToGltf(bone.head);
        const delta = distance3D(actualPos, expectedPos);
        maxDelta = Math.max(maxDelta, delta);
        meanDelta += delta;
        count++;
        
        if (offsetX === null) {
          offsetX = actualPos[0] - expectedPos[0];
          offsetY = actualPos[1] - expectedPos[1];
          offsetZ = actualPos[2] - expectedPos[2];
        }
      }
    });
    
    meanDelta = count > 0 ? meanDelta / count : 0;
    const offsetInfo = offsetX !== null ? 
      ` (constant offset: [${offsetX.toFixed(3)}, ${offsetY.toFixed(3)}, ${offsetZ.toFixed(3)}])` : '';
    
    addCheck(
      'Positional (info)',
      'report',
      `max: ${(maxDelta * 1000).toFixed(2)} mm, mean: ${(meanDelta * 1000).toFixed(2)} mm${offsetInfo}`,
      true // Informational only
    );
  } else {
    addCheck('Bind-pose (trans)', 'N/A', 'N/A (no skin)', false);
    addCheck('Bind-pose (rot)', 'N/A', 'N/A (no skin)', false);
    addCheck('Bone lengths', 'N/A', 'N/A (no skin)', false);
    addCheck('Positional (info)', 'N/A', 'N/A (no skin)', true);
  }
  
  // Check 9: Left/right symmetry
  if (skinCount > 0) {
    const skin = gltf.skins[0];
    const parentLookup = buildParentLookup(gltf);
    const jointPositions = getJointWorldPositions(gltf, skin, parentLookup);
    const symmetryFailures = checkSymmetry(jointPositions, tolerance);
    
    addCheck(
      'L/R symmetry',
      'symmetric',
      symmetryFailures.length === 0 ? 'symmetric' : `${symmetryFailures.length} asymmetric`,
      symmetryFailures.length === 0,
      symmetryFailures.length > 0 ? symmetryFailures.slice(0, 2).map(f => f.pair).join(', ') : ''
    );
  } else {
    addCheck('L/R symmetry', 'N/A', 'N/A (no skin)', false);
  }
  
  return results;
}

/**
 * Print results table
 */
function printResults(results) {
  console.log(`\nRESULTS:\n`);
  console.log(`| Check              | Target           | Actual           | Result |`);
  console.log(`|--------------------|------------------|------------------|--------|`);
  
  results.checks.forEach(check => {
    const name = check.name.padEnd(18);
    const target = String(check.target).padEnd(16);
    const actual = String(check.actual).padEnd(16);
    const result = check.pass ? 'PASS' : 'FAIL';
    console.log(`| ${name} | ${target} | ${actual} | ${result} |`);
    
    if (check.details) {
      console.log(`  └─ ${check.details}`);
    }
  });
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`OVERALL: ${results.pass ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`${'='.repeat(70)}\n`);
  
  return results.pass;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node tools/glb_inspect.js <glb_path> <contract_path> [tolerance]');
    process.exit(1);
  }
  
  const glbPath = args[0];
  const contractPath = args[1];
  const tolerance = args[2] ? parseFloat(args[2]) : DEFAULT_TOLERANCE;
  
  if (!fs.existsSync(glbPath)) {
    console.error(`Error: GLB file not found: ${glbPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(contractPath)) {
    console.error(`Error: Contract file not found: ${contractPath}`);
    process.exit(1);
  }
  
  try {
    const results = inspectWithContract(glbPath, contractPath, tolerance);
    const passed = printResults(results);
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { inspectWithContract, readGLB };
