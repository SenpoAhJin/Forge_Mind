#!/usr/bin/env node
/**
 * compute_body_profile.mjs
 * 
 * Reads V2 body GLBs and contracts, computes comprehensive body profiles
 * for garment generation. Outputs to src/data/bodyProfile.generated.json.
 * 
 * Usage: node tools/compute_body_profile.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets', 'models');
const OUTPUT = join(ROOT, 'src', 'data', 'bodyProfile.generated.json');
const V1_BOUNDS_PATH = join(ROOT, 'src', 'data', 'bodyBounds.generated.json');

const BODIES = [
  { gender: 'male', glb: '3D_Model_Male_V2_rigged.glb', contract: '3D_Model_Male_V2_contract.json' },
  { gender: 'female', glb: '3D_Model_Female_V2_rigged.glb', contract: '3D_Model_Female_V2_contract.json' },
];

/**
 * Read GLB and extract JSON + binary buffer
 */
function readGLB(filePath) {
  const buffer = readFileSync(filePath);
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546C67) throw new Error(`Not a GLB: ${filePath}`);
  
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
  const gltf = JSON.parse(jsonString);
  
  const binChunkStart = jsonEnd + 8;
  const binBuffer = buffer.slice(binChunkStart);
  
  return { gltf, binBuffer };
}

/**
 * Extract POSITION accessor data from GLB
 */
function getPositions(gltf, binBuffer, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  if (accessor.type !== 'VEC3' || accessor.componentType !== 5126) {
    throw new Error('Expected VEC3 FLOAT accessor');
  }
  
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const count = accessor.count;
  const positions = [];
  
  for (let i = 0; i < count; i++) {
    const idx = offset + i * 12; // 3 floats × 4 bytes
    // DO NOT negate X - skinning is correct relative to mesh positions as-is
    positions.push([
      binBuffer.readFloatLE(idx),
      binBuffer.readFloatLE(idx + 4),
      binBuffer.readFloatLE(idx + 8),
    ]);
  }
  
  return positions;
}

/**
 * Apply node transform matrix to position
 */
function applyTransform(pos, matrix) {
  if (!matrix) return pos;
  const [x, y, z] = pos;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

/**
 * Get all mesh positions, applying transforms and inverse bind matrices for skinned meshes
 */
function getAllPositions(gltf, binBuffer) {
  const positions = [];
  
  // Find body mesh node
  const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
  if (!bodyNode) throw new Error('No mesh node found');
  
  const mesh = gltf.meshes[bodyNode.mesh];
  mesh.primitives.forEach(prim => {
    if (prim.attributes.POSITION !== undefined) {
      const pos = getPositions(gltf, binBuffer, prim.attributes.POSITION);
      
      // If skinned, positions are in bind pose; apply node transform
      const nodeTransform = bodyNode.matrix;
      pos.forEach(p => {
        const transformed = applyTransform(p, nodeTransform);
        positions.push(transformed);
      });
    }
  });
  
  return positions;
}

/**
 * Compute bounding box from positions
 */
function computeBounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  
  positions.forEach(([x, y, z]) => {
    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    min[2] = Math.min(min[2], z);
    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
    max[2] = Math.max(max[2], z);
  });
  
  return {
    min: { x: min[0], y: min[1], z: min[2] },
    max: { x: max[0], y: max[1], z: max[2] },
    size: { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] },
  };
}

/**
 * Determine front axis from mesh geometry
 * Strategy: find max protrusion in each axis, identify which is forward
 */
function determineFrontAxis(positions, bounds) {
  // Compute centroid
  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;
  const cz = (bounds.min.z + bounds.max.z) / 2;
  
  // Find vertices in head region (top 15% of height)
  const headThreshold = bounds.max.y - bounds.size.y * 0.15;
  const headVerts = positions.filter(([, y]) => y >= headThreshold);
  
  if (headVerts.length === 0) throw new Error('No head vertices found');
  
  // Compute average offset from center for head vertices
  let sumX = 0, sumZ = 0;
  headVerts.forEach(([x, , z]) => {
    sumX += x - cx;
    sumZ += z - cz;
  });
  const avgX = sumX / headVerts.length;
  const avgZ = sumZ / headVerts.length;
  
  // Determine which axis has larger protrusion
  const absX = Math.abs(avgX);
  const absZ = Math.abs(avgZ);
  
  let axis, evidence;
  if (absZ > absX && absZ > 0.01) {
    axis = avgZ < 0 ? [0, 0, -1] : [0, 0, 1];
    evidence = `Head protrusion: Z offset ${avgZ.toFixed(4)} (${headVerts.length} verts)`;
  } else if (absX > 0.01) {
    axis = avgX < 0 ? [-1, 0, 0] : [1, 0, 0];
    evidence = `Head protrusion: X offset ${avgX.toFixed(4)} (${headVerts.length} verts)`;
  } else {
    // Fallback: assume -Y (common GLB convention body faces -Y in Blender export)
    axis = [0, 0, -1];
    evidence = `ASSUMED: No clear protrusion, using -Z (Blender convention)`;
  }
  
  return { axis, evidence };
}

/**
 * Extract landmark heights from contract bones
 * Contract bone heads are [x, y, z] in glTF Y-up coordinates
 */
function extractLandmarks(contract, bounds) {
  const boneMap = {};
  contract.bones.forEach(b => {
    // Contract bone heads are already in glTF Y-up coordinates [x, y, z]
    // where z is forward/back, y is height. Blender's Z (height) → glTF's Y.
    // Contract format is [Blender_X, Blender_Y, Blender_Z]
    // glTF format is [X, Y, Z] where Y=height
    // So: glTF_X = Blender_X, glTF_Y = Blender_Z, glTF_Z = Blender_Y
    boneMap[b.name] = [b.head[0], b.head[2], b.head[1]];
  });
  
  const get = (name) => {
    const head = boneMap[name];
    if (!head) throw new Error(`Bone ${name} not found in contract`);
    return head[1]; // head[1] is Y (height) after conversion
  };
  
  return {
    pelvis: get('pelvis'),
    thighL: get('thigh.L'),
    shinL: get('shin.L'),
    ankleL: get('foot.L'), // foot bone head = ankle
    ballOfFootL: get('toe.L'),
    shoulderL: get('clavicle.L'),
    neck: get('neck'),
    headTop: bounds.max.y,
    headCenterX: (bounds.min.x + bounds.max.x) / 2,
    headCenterZ: (bounds.min.z + bounds.max.z) / 2,
  };
}

/**
 * Get vertices associated with specific bone (by dominant joint from JOINTS_0)
 */
function getVerticesByBone(gltf, binBuffer, boneName) {
  const skin = gltf.skins[0];
  const boneIndex = skin.joints.findIndex(nodeIdx => {
    const node = gltf.nodes[nodeIdx];
    return node.name === boneName;
  });
  
  if (boneIndex < 0) return [];
  
  const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
  const mesh = gltf.meshes[bodyNode.mesh];
  const prim = mesh.primitives[0]; // Assume single primitive
  
  const positions = getPositions(gltf, binBuffer, prim.attributes.POSITION);
  
  // Read JOINTS_0 and WEIGHTS_0
  const jointsAccessor = gltf.accessors[prim.attributes.JOINTS_0];
  const weightsAccessor = gltf.accessors[prim.attributes.WEIGHTS_0];
  
  const jointsView = gltf.bufferViews[jointsAccessor.bufferView];
  const weightsView = gltf.bufferViews[weightsAccessor.bufferView];
  
  const verts = [];
  for (let i = 0; i < positions.length; i++) {
    const jOffset = (jointsView.byteOffset || 0) + i * 4; // 4 × UNSIGNED_BYTE
    const wOffset = (weightsView.byteOffset || 0) + i * 16; // 4 × FLOAT
    
    const joints = [
      binBuffer.readUInt8(jOffset),
      binBuffer.readUInt8(jOffset + 1),
      binBuffer.readUInt8(jOffset + 2),
      binBuffer.readUInt8(jOffset + 3),
    ];
    const weights = [
      binBuffer.readFloatLE(wOffset),
      binBuffer.readFloatLE(wOffset + 4),
      binBuffer.readFloatLE(wOffset + 8),
      binBuffer.readFloatLE(wOffset + 12),
    ];
    
    // Find dominant joint
    let maxWeight = -1;
    let dominantJoint = -1;
    for (let k = 0; k < 4; k++) {
      if (weights[k] > maxWeight) {
        maxWeight = weights[k];
        dominantJoint = joints[k];
      }
    }
    
    if (dominantJoint === boneIndex) {
      const nodeTransform = bodyNode.matrix;
      const transformed = applyTransform(positions[i], nodeTransform);
      verts.push(transformed);
    }
  }
  
  return verts;
}

/**
 * Compute torso slices (exclude arms/hands)
 */
function computeTorsoSlices(gltf, binBuffer, contract, bounds, numSlices = 50) {
  const armHandBones = [
    'clavicle.L', 'clavicle.R',
    'upperarm.L', 'upperarm.R',
    'forearm.L', 'forearm.R',
    'hand.L', 'hand.R',
  ];
  
  // Get all vertices NOT dominated by arm/hand bones
  const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
  const mesh = gltf.meshes[bodyNode.mesh];
  const prim = mesh.primitives[0];
  const positions = getPositions(gltf, binBuffer, prim.attributes.POSITION);
  
  const jointsAccessor = gltf.accessors[prim.attributes.JOINTS_0];
  const weightsAccessor = gltf.accessors[prim.attributes.WEIGHTS_0];
  const jointsView = gltf.bufferViews[jointsAccessor.bufferView];
  const weightsView = gltf.bufferViews[weightsAccessor.bufferView];
  
  const skin = gltf.skins[0];
  const armHandIndices = armHandBones.map(name => {
    return skin.joints.findIndex(nodeIdx => gltf.nodes[nodeIdx].name === name);
  }).filter(idx => idx >= 0);
  
  const torsoVerts = [];
  for (let i = 0; i < positions.length; i++) {
    const jOffset = (jointsView.byteOffset || 0) + i * 4; // 4 × UNSIGNED_BYTE
    const wOffset = (weightsView.byteOffset || 0) + i * 16; // 4 × FLOAT
    
    const joints = [
      binBuffer.readUInt8(jOffset),
      binBuffer.readUInt8(jOffset + 1),
      binBuffer.readUInt8(jOffset + 2),
      binBuffer.readUInt8(jOffset + 3),
    ];
    const weights = [
      binBuffer.readFloatLE(wOffset),
      binBuffer.readFloatLE(wOffset + 4),
      binBuffer.readFloatLE(wOffset + 8),
      binBuffer.readFloatLE(wOffset + 12),
    ];
    
    let maxWeight = -1;
    let dominantJoint = -1;
    for (let k = 0; k < 4; k++) {
      if (weights[k] > maxWeight) {
        maxWeight = weights[k];
        dominantJoint = joints[k];
      }
    }
    
    if (!armHandIndices.includes(dominantJoint)) {
      const nodeTransform = bodyNode.matrix;
      const transformed = applyTransform(positions[i], nodeTransform);
      torsoVerts.push(transformed);
    }
  }
  
  // Slice by height
  const minY = bounds.min.y;
  const maxY = bounds.max.y;
  const step = (maxY - minY) / numSlices;
  
  const slices = [];
  for (let i = 0; i <= numSlices; i++) {
    const y = minY + i * step;
    const inSlice = torsoVerts.filter(([, vy]) => Math.abs(vy - y) < step / 2);
    
    if (inSlice.length > 0) {
      const xVals = inSlice.map(([x]) => x);
      const zVals = inSlice.map(([, , z]) => z);
      slices.push({
        y: y,
        minX: Math.min(...xVals),
        maxX: Math.max(...xVals),
        minZ: Math.min(...zVals),
        maxZ: Math.max(...zVals),
      });
    } else {
      slices.push({ y: y, minX: null, maxX: null, minZ: null, maxZ: null });
    }
  }
  
  return slices;
}

/**
 * Compute limb slice outlines
 */
function computeLimbSlices(gltf, binBuffer, limbBones, numSlices = 20) {
  const allVerts = [];
  limbBones.forEach(boneName => {
    const verts = getVerticesByBone(gltf, binBuffer, boneName);
    allVerts.push(...verts);
  });
  
  if (allVerts.length === 0) return [];
  
  const minY = Math.min(...allVerts.map(([, y]) => y));
  const maxY = Math.max(...allVerts.map(([, y]) => y));
  const step = (maxY - minY) / numSlices;
  
  const slices = [];
  for (let i = 0; i <= numSlices; i++) {
    const y = minY + i * step;
    const inSlice = allVerts.filter(([, vy]) => Math.abs(vy - y) < step / 2);
    
    if (inSlice.length > 0) {
      const xVals = inSlice.map(([x]) => x);
      const zVals = inSlice.map(([, , z]) => z);
      slices.push({
        y: y,
        minX: Math.min(...xVals),
        maxX: Math.max(...xVals),
        minZ: Math.min(...zVals),
        maxZ: Math.max(...zVals),
        centerX: (Math.min(...xVals) + Math.max(...xVals)) / 2,
        centerZ: (Math.min(...zVals) + Math.max(...zVals)) / 2,
      });
    }
  }
  
  return slices;
}

/**
 * Process one body
 */
function processBody(config) {
  const glbPath = join(ASSETS, config.glb);
  const contractPath = join(ASSETS, config.contract);
  
  console.log(`\nProcessing ${config.gender}...`);
  
  const { gltf, binBuffer } = readGLB(glbPath);
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  
  const positions = getAllPositions(gltf, binBuffer);
  const bounds = computeBounds(positions);
  const frontAxis = determineFrontAxis(positions, bounds);
  const landmarks = extractLandmarks(contract, bounds);
  const torsoSlices = computeTorsoSlices(gltf, binBuffer, contract, bounds, 50);
  
  const leftArm = computeLimbSlices(gltf, binBuffer, ['upperarm.L', 'forearm.L', 'hand.L'], 20);
  const rightArm = computeLimbSlices(gltf, binBuffer, ['upperarm.R', 'forearm.R', 'hand.R'], 20);
  const leftLeg = computeLimbSlices(gltf, binBuffer, ['thigh.L', 'shin.L', 'foot.L'], 20);
  const rightLeg = computeLimbSlices(gltf, binBuffer, ['thigh.R', 'shin.R', 'foot.R'], 20);
  
  console.log(`  Bounds: Y ∈ [${bounds.min.y.toFixed(3)}, ${bounds.max.y.toFixed(3)}]`);
  console.log(`  Front axis: [${frontAxis.axis}] - ${frontAxis.evidence}`);
  console.log(`  Landmarks: head=${landmarks.headTop.toFixed(3)} neck=${landmarks.neck.toFixed(3)} shoulder=${landmarks.shoulderL.toFixed(3)}`);
  
  return {
    bounds,
    frontAxis: { axis: frontAxis.axis, evidence: frontAxis.evidence },
    landmarks,
    torsoSlices,
    limbs: {
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    },
  };
}

/**
 * Compute V1 vs V2 comparison
 */
function computeComparison(v1Bounds, v2Profile) {
  const v1 = v1Bounds.v1;
  const v2 = v2Profile;
  
  const comparison = {};
  ['male', 'female'].forEach(gender => {
    const v1b = v1[gender];
    const v2b = v2[gender].bounds;
    
    comparison[gender] = {
      height: { v1: v1b.height, v2: v2b.size.y, delta: v2b.size.y - v1b.height },
      width: { v1: v1b.maxX - v1b.minX, v2: v2b.size.x, delta: v2b.size.x - (v1b.maxX - v1b.minX) },
      depth: { v1: v1b.maxZ - v1b.minZ, v2: v2b.size.z, delta: v2b.size.z - (v1b.maxZ - v1b.minZ) },
      headTopAboveFeet: { v1: v1b.maxY, v2: v2b.max.y, delta: v2b.max.y - v1b.maxY },
    };
  });
  
  return comparison;
}

/**
 * Main
 */
function main() {
  console.log('Computing V2 body profiles...\n');
  
  const profiles = {};
  BODIES.forEach(config => {
    profiles[config.gender] = processBody(config);
  });
  
  const v1Bounds = JSON.parse(readFileSync(V1_BOUNDS_PATH, 'utf8'));
  const comparison = computeComparison(v1Bounds, profiles);
  
  const output = {
    v2: profiles,
    comparison,
  };
  
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nWrote ${OUTPUT}`);
  
  // Print comparison table
  console.log('\n=== V1 vs V2 Comparison ===\n');
  ['male', 'female'].forEach(gender => {
    console.log(`${gender.toUpperCase()}:`);
    const c = comparison[gender];
    console.log(`  Height:          V1=${c.height.v1.toFixed(3)} V2=${c.height.v2.toFixed(3)} Δ=${c.height.delta.toFixed(3)}`);
    console.log(`  Width:           V1=${c.width.v1.toFixed(3)} V2=${c.width.v2.toFixed(3)} Δ=${c.width.delta.toFixed(3)}`);
    console.log(`  Depth:           V1=${c.depth.v1.toFixed(3)} V2=${c.depth.v2.toFixed(3)} Δ=${c.depth.delta.toFixed(3)}`);
    console.log(`  Head top (Y):    V1=${c.headTopAboveFeet.v1.toFixed(3)} V2=${c.headTopAboveFeet.v2.toFixed(3)} Δ=${c.headTopAboveFeet.delta.toFixed(3)}`);
    console.log('');
  });
}

main();
