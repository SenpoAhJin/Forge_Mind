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
import { readPositions, readJoints, readWeights } from './lib/gltf_read.mjs';

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
 * Bone groups that PARTITION the skeleton.
 * Every joint must belong to exactly one group.
 */
const BONE_GROUPS = {
  torso: ['root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'clavicle.L', 'clavicle.R'],
  head: ['neck', 'head'],
  armL: ['upperarm.L', 'forearm.L', 'hand.L'],
  armR: ['upperarm.R', 'forearm.R', 'hand.R'],
  legL: ['thigh.L', 'shin.L', 'foot.L', 'toe.L'],
  legR: ['thigh.R', 'shin.R', 'foot.R', 'toe.R'],
};

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
 * Get all mesh positions, applying transforms
 */
function getAllPositions(gltf, binBuffer) {
  const positions = [];
  
  // Find body mesh node
  const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
  if (!bodyNode) throw new Error('No mesh node found');
  
  const mesh = gltf.meshes[bodyNode.mesh];
  mesh.primitives.forEach(prim => {
    if (prim.attributes.POSITION !== undefined) {
      const pos = readPositions(gltf, binBuffer, prim.attributes.POSITION);
      
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
 * Build bone group mapping and validate partition.
 * Returns: { groupMap: {boneName: groupName}, jointGroups: {groupName: [jointIndices]} }
 */
function buildBoneGroups(gltf, contract) {
  const skin = gltf.skins[0];
  if (!skin) throw new Error('No skin found');
  
  // Map bone names to joint indices
  const boneToJoint = {};
  contract.bones.forEach(bone => {
    const jointIdx = skin.joints.findIndex(nodeIdx => gltf.nodes[nodeIdx].name === bone.name);
    if (jointIdx < 0) {
      throw new Error(`Contract bone "${bone.name}" not found in skin.joints`);
    }
    boneToJoint[bone.name] = jointIdx;
  });
  
  // Build groupMap and jointGroups
  const groupMap = {};
  const jointGroups = {};
  
  for (const [groupName, boneNames] of Object.entries(BONE_GROUPS)) {
    jointGroups[groupName] = [];
    for (const boneName of boneNames) {
      if (groupMap[boneName]) {
        throw new Error(`Bone "${boneName}" appears in multiple groups`);
      }
      groupMap[boneName] = groupName;
      jointGroups[groupName].push(boneToJoint[boneName]);
    }
  }
  
  // Verify all contract bones are assigned
  for (const bone of contract.bones) {
    if (!groupMap[bone.name]) {
      throw new Error(`Bone "${bone.name}" not assigned to any group`);
    }
  }
  
  return { groupMap, jointGroups, boneToJoint };
}

/**
 * Compute dominant joint stats per vertex
 * Returns: array of { jointIdx, weight, position } for each vertex
 */
function getDominantJoints(gltf, binBuffer) {
  const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
  const mesh = gltf.meshes[bodyNode.mesh];
  const prim = mesh.primitives[0];
  
  const positions = readPositions(gltf, binBuffer, prim.attributes.POSITION);
  const joints = readJoints(gltf, binBuffer, prim.attributes.JOINTS_0);
  const weights = readWeights(gltf, binBuffer, prim.attributes.WEIGHTS_0);
  
  const nodeTransform = bodyNode.matrix;
  const dominant = [];
  
  for (let i = 0; i < positions.length; i++) {
    let maxWeight = -1;
    let dominantJoint = -1;
    
    for (let k = 0; k < 4; k++) {
      if (weights[i][k] > maxWeight) {
        maxWeight = weights[i][k];
        dominantJoint = joints[i][k];
      }
    }
    
    dominant.push({
      jointIdx: dominantJoint,
      weight: maxWeight,
      position: applyTransform(positions[i], nodeTransform),
    });
  }
  
  return dominant;
}

/**
 * Compute diagnostic attribution table per gender
 */
function computeAttributionStats(gltf, binBuffer, contract, boneGroups) {
  const { groupMap, jointGroups, boneToJoint } = boneGroups;
  const dominant = getDominantJoints(gltf, binBuffer);
  const skin = gltf.skins[0];
  
  // Per-joint stats
  const jointStats = {};
  for (const bone of contract.bones) {
    const jointIdx = boneToJoint[bone.name];
    jointStats[jointIdx] = {
      nodeName: gltf.nodes[skin.joints[jointIdx]].name,
      contractName: bone.name,
      side: bone.name.endsWith('.L') ? 'L' : bone.name.endsWith('.R') ? 'R' : 'center',
      count: 0,
      sumX: 0,
      minX: Infinity,
      maxX: -Infinity,
    };
  }
  
  // Accumulate
  for (const vert of dominant) {
    const stats = jointStats[vert.jointIdx];
    if (!stats) continue;
    stats.count++;
    stats.sumX += vert.position[0];
    stats.minX = Math.min(stats.minX, vert.position[0]);
    stats.maxX = Math.max(stats.maxX, vert.position[0]);
  }
  
  // Finalize means
  for (const stats of Object.values(jointStats)) {
    stats.meanX = stats.count > 0 ? stats.sumX / stats.count : 0;
  }
  
  // Group vertex counts
  const groupCounts = {};
  for (const [groupName, jointIndices] of Object.entries(jointGroups)) {
    groupCounts[groupName] = jointIndices.reduce((sum, ji) => sum + (jointStats[ji]?.count || 0), 0);
  }
  
  return { jointStats, groupCounts, totalVertices: dominant.length };
}

/**
 * Convert contract bone position (Blender coords) to glTF coords.
 * Standard Blender glTF export: (x, y, z)_Blender → (x, z, -y)_glTF
 */
function contractToGLTF(blenderPos, useStandard = true) {
  const [bx, by, bz] = blenderPos;
  return useStandard ? [bx, bz, -by] : [bx, bz, by];
}

/**
 * Determine front axis using measured geometry methods.
 * Contract format: bone head [x, y, z] in Blender coords (Z up, -Y forward, +X left)
 * Standard Blender glTF export: (x, y, z)_Blender → (x, z, -y)_glTF
 * 
 * Returns: { axis: [x,y,z], methods: {a, b, c} }
 */
function determineFrontAxis(gltf, binBuffer, contract, bounds) {
  const skin = gltf.skins[0];
  const methods = {};
  const dominant = getDominantJoints(gltf, binBuffer);
  
  // Method (a): Conversion sign test using vertex-derived bone positions
  // For each test bone, find its dominant vertices and compute their centroid
  const testBones = [
    { name: 'foot.L', desc: 'ankle.L' },
    { name: 'toe.L', desc: 'toe.L' },
    { name: 'shin.L', desc: 'shin.L' },
    { name: 'thigh.L', desc: 'thigh.L' },
  ];
  
  const conversions = [];
  for (const { name, desc } of testBones) {
    const contractBone = contract.bones.find(b => b.name === name);
    if (!contractBone) throw new Error(`Contract bone "${name}" not found`);
    
    // Find dominant vertices for this bone
    const jointIdx = skin.joints.findIndex(nodeIdx => gltf.nodes[nodeIdx].name === name);
    if (jointIdx < 0) throw new Error(`Bone "${name}" not in skin`);
    
    const boneVerts = dominant.filter(v => v.jointIdx === jointIdx);
    if (boneVerts.length === 0) {
      throw new Error(`No vertices dominated by bone "${name}"`);
    }
    
    // Compute centroid of bone's vertices (approximate bone position)
    const sumPos = boneVerts.reduce((acc, v) => [
      acc[0] + v.position[0],
      acc[1] + v.position[1],
      acc[2] + v.position[2],
    ], [0, 0, 0]);
    const centroid = sumPos.map(s => s / boneVerts.length);
    
    // Try both conversions
    const conv1 = contractToGLTF(contractBone.head, true);  // Standard
    const conv2 = contractToGLTF(contractBone.head, false); // Alternate
    
    const resid1 = Math.hypot(centroid[0] - conv1[0], centroid[1] - conv1[1], centroid[2] - conv1[2]);
    const resid2 = Math.hypot(centroid[0] - conv2[0], centroid[1] - conv2[1], centroid[2] - conv2[2]);
    
    conversions.push({
      bone: desc,
      standard_mm: (resid1 * 1000).toFixed(1),
      alternate_mm: (resid2 * 1000).toFixed(1),
      match: resid1 < resid2 ? 'standard' : 'alternate',
      vertCount: boneVerts.length,
    });
  }
  
  const matchStandard = conversions.every(c => c.match === 'standard');
  const matchAlternate = conversions.every(c => c.match === 'alternate');
  
  if (!matchStandard && !matchAlternate) {
    methods.a = { match: 'CONFLICT', conversions };
    throw new Error(`Conversion sign test conflicts: ${JSON.stringify(conversions)}`);
  }
  
  methods.a = {
    match: matchStandard ? 'standard (x, z, -y)' : 'alternate (x, z, +y)',
    conversions,
  };
  
  // Method (b): Foot geometry using contract positions
  const ankleContract = contract.bones.find(b => b.name === 'foot.L');
  const toeContract = contract.bones.find(b => b.name === 'toe.L');
  const useStandard = matchStandard;
  
  const anklePos = contractToGLTF(ankleContract.head, useStandard);
  const toePos = contractToGLTF(toeContract.head, useStandard);
  const footZExtent = toePos[2] - anklePos[2];
  
  // Get foot+toe dominant vertices
  const footBones = ['foot.L', 'foot.R', 'toe.L', 'toe.R'];
  const footJoints = footBones.map(name => {
    return skin.joints.findIndex(nodeIdx => gltf.nodes[nodeIdx].name === name);
  }).filter(idx => idx >= 0);
  
  const footVerts = dominant.filter(v => footJoints.includes(v.jointIdx));
  const footZs = footVerts.map(v => v.position[2]);
  const footZMin = Math.min(...footZs);
  const footZMax = Math.max(...footZs);
  const footExtentAhead = footZMax - anklePos[2];
  const footExtentBehind = anklePos[2] - footZMin;
  
  methods.b = {
    toeZ_minus_ankleZ: (footZExtent * 1000).toFixed(1) + ' mm',
    vertexExtent_ahead: (footExtentAhead * 1000).toFixed(1) + ' mm',
    vertexExtent_behind: (footExtentBehind * 1000).toFixed(1) + ' mm',
    direction: footZExtent > 0 ? '+Z' : '-Z',
  };
  
  // Method (c): Head protrusion (supporting only)
  const headThreshold = bounds.max.y - bounds.size.y * 0.1;
  const headVerts = dominant.filter(v => v.position[1] >= headThreshold);
  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cz = (bounds.min.z + bounds.max.z) / 2;
  
  let sumX = 0, sumZ = 0;
  headVerts.forEach(v => {
    sumX += v.position[0] - cx;
    sumZ += v.position[2] - cz;
  });
  const avgX = sumX / headVerts.length;
  const avgZ = sumZ / headVerts.length;
  
  methods.c = {
    headVertCount: headVerts.length,
    avgXOffset: (avgX * 1000).toFixed(1) + ' mm',
    avgZOffset: (avgZ * 1000).toFixed(1) + ' mm',
    maxDirection: Math.abs(avgZ) > Math.abs(avgX) ? (avgZ > 0 ? '+Z' : '-Z') : (avgX > 0 ? '+X' : '-X'),
  };
  
  // Determine frontAxis
  const dirB = methods.b.direction;
  if (methods.a.match.includes('standard') && dirB === '+Z') {
    return { axis: [0, 0, 1], methods };
  } else if (methods.a.match.includes('alternate') && dirB === '-Z') {
    return { axis: [0, 0, -1], methods };
  } else {
    throw new Error(`Methods (a) and (b) disagree: a=${methods.a.match}, b=${dirB}`);
  }
}

/**
 * Extract landmarks from contract and computed data.
 * Contract heads are [Blender_X, Blender_Y, Blender_Z].
 * glTF is [X, Y, Z] where (X, Y, Z)_glTF = (X, Z, -Y)_Blender for standard export.
 */
function extractLandmarks(gltf, binBuffer, contract, bounds) {
  const dominant = getDominantJoints(gltf, binBuffer);
  const skin = gltf.skins[0];
  
  // Head center: x/z center of head+neck-dominated vertices
  const headNeckBones = ['head', 'neck'];
  const headNeckJoints = headNeckBones.map(name => {
    return skin.joints.findIndex(nodeIdx => gltf.nodes[nodeIdx].name === name);
  }).filter(idx => idx >= 0);
  
  const headVerts = dominant.filter(v => headNeckJoints.includes(v.jointIdx));
  const headXs = headVerts.map(v => v.position[0]);
  const headZs = headVerts.map(v => v.position[2]);
  const headCenterX = headXs.reduce((a, b) => a + b, 0) / headXs.length;
  const headCenterZ = headZs.reduce((a, b) => a + b, 0) / headZs.length;
  
  // Get bone heights from contract (converted to glTF)
  const getLandmarkY = (boneName) => {
    const contractBone = contract.bones.find(b => b.name === boneName);
    if (!contractBone) throw new Error(`Landmark bone "${boneName}" not in contract`);
    return contractToGLTF(contractBone.head, true)[1]; // Y is height
  };
  
  return {
    pelvis: getLandmarkY('pelvis'),
    thighL: getLandmarkY('thigh.L'),
    shinL: getLandmarkY('shin.L'),
    ankleL: getLandmarkY('foot.L'),
    ballOfFootL: getLandmarkY('toe.L'),
    shoulderL: getLandmarkY('clavicle.L'),
    neck: getLandmarkY('neck'),
    headTop: bounds.max.y,
    headCenterX,
    headCenterZ,
    headCenterMethod: 'x/z center of head+neck-dominated vertices',
  };
}

/**
 * Compute torso slices: two sets.
 * "torsoSlices": excludes arms (upperarm, forearm, hand) but keeps clavicle.
 * "torsoSlicesNoClavicle": also excludes clavicle (old behavior).
 */
function computeTorsoSlices(gltf, binBuffer, boneGroups, bounds, numSlices = 50) {
  const { jointGroups } = boneGroups;
  const dominant = getDominantJoints(gltf, binBuffer);
  
  // Exclude arms for torsoSlices
  const armJoints = [...jointGroups.armL, ...jointGroups.armR];
  const torsoVerts = dominant.filter(v => !armJoints.includes(v.jointIdx));
  
  // Exclude arms + clavicles for torsoSlicesNoClavicle
  const skin = gltf.skins[0];
  const clavicleJoints = ['clavicle.L', 'clavicle.R'].map(name => {
    return skin.joints.findIndex(nodeIdx => gltf.nodes[nodeIdx].name === name);
  }).filter(idx => idx >= 0);
  const torsoVertsNoClavicle = dominant.filter(v => 
    !armJoints.includes(v.jointIdx) && !clavicleJoints.includes(v.jointIdx)
  );
  
  const makeSlices = (verts) => {
    const minY = bounds.min.y;
    const maxY = bounds.max.y;
    const step = (maxY - minY) / numSlices;
    
    const slices = [];
    for (let i = 0; i <= numSlices; i++) {
      const y = minY + i * step;
      const inSlice = verts.filter(v => Math.abs(v.position[1] - y) < step / 2);
      
      if (inSlice.length > 0) {
        const xVals = inSlice.map(v => v.position[0]);
        const zVals = inSlice.map(v => v.position[2]);
        slices.push({
          y: y,
          minX: Math.min(...xVals),
          maxX: Math.max(...xVals),
          minZ: Math.min(...zVals),
          maxZ: Math.max(...zVals),
        });
      }
    }
    return slices;
  };
  
  return {
    torsoSlices: makeSlices(torsoVerts),
    torsoSlicesNoClavicle: makeSlices(torsoVertsNoClavicle),
  };
}

/**
 * Compare V1 and V2 for regression check
 */
function compareWithV1(v2Profile) {
  let v1Data;
  try {
    v1Data = JSON.parse(readFileSync(V1_BOUNDS_PATH, 'utf8'));
  } catch (err) {
    return { available: false, note: 'V1 bounds file not found' };
  }
  
  const comparison = {};
  for (const gender of ['male', 'female']) {
    const v1 = v1Data[gender];
    const v2 = v2Profile[gender];
    if (!v1 || !v2) continue;
    
    const v1Height = v1.max?.y - v1.min?.y;
    const v2Height = v2.bounds.max.y - v2.bounds.min.y;
    
    comparison[gender] = {
      heightV1: v1Height,
      heightV2: v2Height,
      heightDiff_mm: ((v2Height - v1Height) * 1000).toFixed(1),
      match: Math.abs(v2Height - v1Height) < 0.005 ? 'OK' : 'MISMATCH',
    };
  }
  
  return { available: true, comparison };
}

/**
 * Main profile computation
 */
function computeProfile(bodySpec) {
  const glbPath = join(ASSETS, bodySpec.glb);
  const contractPath = join(ASSETS, bodySpec.contract);
  
  console.log(`\nProcessing ${bodySpec.gender}...`);
  
  const { gltf, binBuffer } = readGLB(glbPath);
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  
  const positions = getAllPositions(gltf, binBuffer);
  const bounds = computeBounds(positions);
  
  console.log(`  Bounds: x=[${bounds.min.x.toFixed(3)}, ${bounds.max.x.toFixed(3)}], y=[${bounds.min.y.toFixed(3)}, ${bounds.max.y.toFixed(3)}], z=[${bounds.min.z.toFixed(3)}, ${bounds.max.z.toFixed(3)}]`);
  
  // Build bone groups
  const boneGroups = buildBoneGroups(gltf, contract);
  console.log(`  Joint groups:`);
  for (const [groupName, jointIndices] of Object.entries(boneGroups.jointGroups)) {
    const names = jointIndices.map(ji => gltf.nodes[gltf.skins[0].joints[ji]].name).join(', ');
    console.log(`    ${groupName}: [${names}]`);
  }
  
  // Attribution stats
  const attrStats = computeAttributionStats(gltf, binBuffer, contract, boneGroups);
  console.log(`  Attribution: ${attrStats.totalVertices} total vertices`);
  console.log(`    Group counts:`, attrStats.groupCounts);
  
  // Diagnostic table
  console.log(`  Diagnostic table (joint, side, count, meanX, minX, maxX):`);
  for (const [jointIdx, stats] of Object.entries(attrStats.jointStats)) {
    if (stats.count > 0) {
      console.log(`    ${jointIdx.padStart(2)}: ${stats.contractName.padEnd(12)} ${stats.side.padEnd(6)} ${String(stats.count).padStart(5)} ${stats.meanX.toFixed(4)} ${stats.minX.toFixed(4)} ${stats.maxX.toFixed(4)}`);
    }
  }
  
  // Front axis
  const frontAxisResult = determineFrontAxis(gltf, binBuffer, contract, bounds);
  console.log(`  frontAxis:`, frontAxisResult.axis);
  console.log(`    Method (a):`, frontAxisResult.methods.a.match);
  frontAxisResult.methods.a.conversions.forEach(c => {
    console.log(`      ${c.bone}: standard=${c.standard_mm}mm, alternate=${c.alternate_mm}mm → ${c.match}`);
  });
  console.log(`    Method (b):`, frontAxisResult.methods.b);
  console.log(`    Method (c):`, frontAxisResult.methods.c);
  
  const landmarks = extractLandmarks(gltf, binBuffer, contract, bounds);
  const { torsoSlices, torsoSlicesNoClavicle } = computeTorsoSlices(gltf, binBuffer, boneGroups, bounds);
  
  // Shoulder height comparison
  const shoulderY = landmarks.shoulderL;
  const shoulderSlice = torsoSlices.find(s => Math.abs(s.y - shoulderY) < 0.05);
  const shoulderSliceNC = torsoSlicesNoClavicle.find(s => Math.abs(s.y - shoulderY) < 0.05);
  const shoulderWidth = shoulderSlice ? (shoulderSlice.maxX - shoulderSlice.minX) : 0;
  const shoulderWidthNC = shoulderSliceNC ? (shoulderSliceNC.maxX - shoulderSliceNC.minX) : 0;
  
  // Arm span approximation (hand.L to hand.R x extent)
  const handLContract = contract.bones.find(b => b.name === 'hand.L');
  const handRContract = contract.bones.find(b => b.name === 'hand.R');
  const handL = contractToGLTF(handLContract.head, true);
  const handR = contractToGLTF(handRContract.head, true);
  const armSpan = Math.abs(handL[0] - handR[0]);
  
  console.log(`  Shoulder width at y=${shoulderY.toFixed(3)}: torsoSlices=${shoulderWidth.toFixed(3)}, torsoSlicesNoClavicle=${shoulderWidthNC.toFixed(3)}, armSpan=${armSpan.toFixed(3)}`);
  
  return {
    gender: bodySpec.gender,
    version: 2,
    modelFile: bodySpec.glb,
    contractFile: bodySpec.contract,
    bounds,
    frontAxis: frontAxisResult.axis,
    frontAxisMethods: frontAxisResult.methods,
    landmarks,
    torsoSlices,
    torsoSlicesNoClavicle,
    shoulderComparison: {
      shoulderY,
      torsoSlicesWidth: shoulderWidth,
      torsoSlicesNoClavicleWidth: shoulderWidthNC,
      armSpan,
    },
    boneGroups: {
      groupMap: boneGroups.groupMap,
      jointCounts: attrStats.groupCounts,
    },
    diagnosticTable: attrStats.jointStats,
  };
}

/**
 * Main execution
 */
console.log('Computing body profiles from V2 GLBs...');

const profiles = {};
for (const bodySpec of BODIES) {
  profiles[bodySpec.gender] = computeProfile(bodySpec);
}

const v1Comparison = compareWithV1(profiles);

const output = {
  version: 2,
  generated: new Date().toISOString(),
  profiles,
  v1Comparison,
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');
console.log(`\nProfile written to ${OUTPUT}`);
console.log('Done.');
