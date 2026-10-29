#!/usr/bin/env node
/**
 * COSTUME-4A Step 1: Coverage diagnosis tool.
 * 
 * Prints diagnostic data to understand coverage failures:
 * a. All 23 bones: vertex counts, group assignments, L/R symmetry
 * b. Top: y-range, why head vertices are included
 * c. Bare left arm: dominant bones and weights of unselected vertices
 * d. Wig: y-range, vertex counts, bone analysis
 * e. Belt: torso width/depth measurement
 * f. Landmarks: all landmark values with sources
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SOFT_WEIGHT_MIN = 0.5;

// Load data
const costumePiecesData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/costumePieces.json'), 'utf8')
);

const maleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
);

const femaleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
);

function sanitizeBoneName(name) {
  return THREE.PropertyBinding.sanitizeNodeName(name);
}

async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(data.buffer, '', (gltf) => resolve(gltf), (err) => reject(err));
  });
}

function findBodyMesh(scene) {
  let skinnedMesh = null;
  scene.traverse((obj) => {
    if (obj.isSkinnedMesh && !skinnedMesh) {
      skinnedMesh = obj;
    }
  });
  return skinnedMesh;
}

function computeLandmarks(contract, meshBounds) {
  const bones = contract.bones;
  function getBoneY(boneName) {
    const bone = bones.find((b) => b.name === boneName);
    if (!bone) throw new Error(`Bone ${boneName} not found`);
    return bone.head[2];
  }

  return {
    floor: { value: 0, source: 'constant' },
    hip_y: { value: getBoneY('thigh.L'), source: 'bone:thigh.L' },
    knee_y: { value: getBoneY('shin.L'), source: 'bone:shin.L' },
    ankle_y: { value: getBoneY('foot.L'), source: 'bone:foot.L' },
    shoulder_y: { value: getBoneY('upperarm.L'), source: 'bone:upperarm.L' },
    elbow_y: { value: getBoneY('forearm.L'), source: 'bone:forearm.L' },
    wrist_y: { value: getBoneY('hand.L'), source: 'bone:hand.L' },
    neck_y: { value: getBoneY('neck'), source: 'bone:neck' },
    head_top_y: { value: meshBounds.max.y, source: 'mesh_bounds.max.y' },
  };
}

function resolveBoneSet(pieceDef) {
  const boneSet = new Set();
  if (pieceDef.groupDetails) {
    for (const group of Object.values(pieceDef.groupDetails)) {
      for (const boneName of group) {
        boneSet.add(sanitizeBoneName(boneName));
      }
    }
  }
  return boneSet;
}

function buildGroupMap(bones) {
  const groupMap = new Map();
  
  for (const [groupName, boneList] of Object.entries(costumePiecesData.boneGroups)) {
    for (const boneName of boneList) {
      const sanitized = sanitizeBoneName(boneName);
      groupMap.set(sanitized, groupName);
    }
  }
  
  // Also check piece groupDetails
  for (const piece of costumePiecesData.pieces) {
    if (piece.groupDetails) {
      for (const [groupName, boneList] of Object.entries(piece.groupDetails)) {
        for (const boneName of boneList) {
          const sanitized = sanitizeBoneName(boneName);
          if (!groupMap.has(sanitized)) {
            groupMap.set(sanitized, `${piece.id}:${groupName}`);
          }
        }
      }
    }
  }
  
  return groupMap;
}

function vertexBelongsToPiece(vertexIndex, boneSet, skinIndex, skinWeight, bones) {
  let sumWeight = 0;
  for (let j = 0; j < 4; j++) {
    const boneIdx = skinIndex.getComponent(vertexIndex, j);
    if (boneIdx >= 0 && boneIdx < bones.length) {
      const boneName = sanitizeBoneName(bones[boneIdx].name);
      if (boneSet.has(boneName)) {
        sumWeight += skinWeight.getComponent(vertexIndex, j);
      }
    }
  }
  return sumWeight >= SOFT_WEIGHT_MIN;
}

function selectTriangles(geometry, boneSet, bones, yMin, yMax, armYMax, isWig, hairlineY) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;
  
  if (!index || !skinIndex || !skinWeight) {
    throw new Error('Geometry missing index, skinIndex, or skinWeight');
  }

  const selectedTriangles = [];
  const triangleCount = index.count / 3;

  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);

    const belongs0 = vertexBelongsToPiece(i0, boneSet, skinIndex, skinWeight, bones);
    const belongs1 = vertexBelongsToPiece(i1, boneSet, skinIndex, skinWeight, bones);
    const belongs2 = vertexBelongsToPiece(i2, boneSet, skinIndex, skinWeight, bones);

    const belongCount = (belongs0 ? 1 : 0) + (belongs1 ? 1 : 0) + (belongs2 ? 1 : 0);
    if (belongCount < 2) continue;

    const y0 = position.getY(i0);
    const y1 = position.getY(i1);
    const y2 = position.getY(i2);

    const in0 = (yMin === undefined || y0 >= yMin) && (yMax === undefined || y0 <= yMax);
    const in1 = (yMin === undefined || y1 >= yMin) && (yMax === undefined || y1 <= yMax);
    const in2 = (yMin === undefined || y2 >= yMin) && (yMax === undefined || y2 <= yMax);

    if (in0 || in1 || in2) {
      selectedTriangles.push(triIdx);
    }
  }

  return selectedTriangles;
}

async function diagnoseBody(gender, glbPath, contract) {
  console.log(`\n=== ${gender.toUpperCase()} BODY ===\n`);

  const gltf = await loadGLB(glbPath);
  const skinnedMesh = findBodyMesh(gltf.scene);
  if (!skinnedMesh) throw new Error(`No SkinnedMesh found`);

  const geometry = skinnedMesh.geometry;
  const position = geometry.attributes.position;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;
  const index = geometry.index;
  
  const bones = contract.bones;
  const bodyBbox = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(contract, bodyBbox);

  console.log('f. LANDMARKS');
  for (const [name, data] of Object.entries(landmarks)) {
    console.log(`   ${name}: ${data.value.toFixed(4)} m (${data.source})`);
  }

  // a. All 23 bones analysis
  console.log('\na. BONE VERTEX ANALYSIS');
  const groupMap = buildGroupMap(bones);
  const boneCounts = new Map();
  
  // Count dominant bone for each vertex
  for (let i = 0; i < position.count; i++) {
    let maxWeight = -1;
    let dominantBoneIdx = -1;
    for (let j = 0; j < 4; j++) {
      const weight = skinWeight.getComponent(i, j);
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantBoneIdx = skinIndex.getComponent(i, j);
      }
    }
    if (dominantBoneIdx >= 0 && dominantBoneIdx < bones.length) {
      const boneName = sanitizeBoneName(bones[dominantBoneIdx].name);
      boneCounts.set(boneName, (boneCounts.get(boneName) || 0) + 1);
    }
  }
  
  // Print L/R pairs side by side
  const processed = new Set();
  for (const bone of bones) {
    if (bone.name === 'root') continue;
    const sanitized = sanitizeBoneName(bone.name);
    if (processed.has(sanitized)) continue;
    
    const group = groupMap.get(sanitized) || 'UNASSIGNED';
    const count = boneCounts.get(sanitized) || 0;
    
    // Check for R counterpart
    if (bone.name.endsWith('.L')) {
      const baseName = bone.name.slice(0, -2);
      const rightName = baseName + '.R';
      const rightSanitized = sanitizeBoneName(rightName);
      const rightGroup = groupMap.get(rightSanitized) || 'UNASSIGNED';
      const rightCount = boneCounts.get(rightSanitized) || 0;
      
      const diff = count > 0 ? Math.abs(count - rightCount) / count : 0;
      const flag = diff > 0.10 ? ' ⚠️ ASYMMETRIC' : '';
      
      console.log(`   ${sanitized.padEnd(15)} ${String(count).padStart(5)} verts (${group.padEnd(20)})  |  ${rightSanitized.padEnd(15)} ${String(rightCount).padStart(5)} verts (${rightGroup.padEnd(20)})${flag}`);
      
      processed.add(sanitized);
      processed.add(rightSanitized);
    } else if (!bone.name.endsWith('.R')) {
      // Center bone
      console.log(`   ${sanitized.padEnd(15)} ${String(count).padStart(5)} verts (${group})`);
      processed.add(sanitized);
    }
  }

  // b. Top piece diagnosis
  console.log('\nb. TOP PIECE DIAGNOSIS');
  const topDef = costumePiecesData.pieces.find(p => p.id === 'top');
  const topBoneSet = resolveBoneSet(topDef);
  const topYMin = landmarks[topDef.yMin.landmark].value + topDef.yMin.offset;
  const topYMax = landmarks[topDef.yMax.landmark].value + topDef.yMax.offset;
  const topArmYMax = landmarks[topDef.armYMax.landmark].value + topDef.armYMax.offset;
  
  console.log(`   y-band: [${topYMin.toFixed(4)}, ${topYMax.toFixed(4)}]`);
  console.log(`   neck_y: ${landmarks.neck_y.value.toFixed(4)}, head_top_y: ${landmarks.head_top_y.value.toFixed(4)}`);
  console.log(`   bone groups: ${Array.from(topBoneSet).join(', ')}`);
  
  const selectedTopTriangles = selectTriangles(geometry, topBoneSet, bones, topYMin, topYMax, topArmYMax, false, undefined);
  
  // Find vertices in selected triangles
  const selectedVertices = new Set();
  for (const triIdx of selectedTopTriangles) {
    for (let j = 0; j < 3; j++) {
      selectedVertices.add(index.getX(triIdx * 3 + j));
    }
  }
  
  // Analyze selected vertices above neck_y
  const neckY = landmarks.neck_y.value;
  let aboveNeckCount = 0;
  const aboveNeckBones = new Map();
  
  for (const vIdx of selectedVertices) {
    const y = position.getY(vIdx);
    if (y > neckY) {
      aboveNeckCount++;
      let maxWeight = -1;
      let dominantBoneIdx = -1;
      for (let j = 0; j < 4; j++) {
        const weight = skinWeight.getComponent(vIdx, j);
        if (weight > maxWeight) {
          maxWeight = weight;
          dominantBoneIdx = skinIndex.getComponent(vIdx, j);
        }
      }
      if (dominantBoneIdx >= 0 && dominantBoneIdx < bones.length) {
        const boneName = sanitizeBoneName(bones[dominantBoneIdx].name);
        aboveNeckBones.set(boneName, (aboveNeckBones.get(boneName) || 0) + 1);
      }
    }
  }
  
  console.log(`   Selected triangles: ${selectedTopTriangles.length}`);
  console.log(`   Vertices above neck_y (${neckY.toFixed(4)}): ${aboveNeckCount}`);
  if (aboveNeckCount > 0) {
    console.log(`   Dominant bones above neck_y:`);
    for (const [bone, count] of [...aboveNeckBones.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`      ${bone}: ${count} verts`);
    }
  }

  // c. Bare left upper arm diagnosis
  console.log('\nc. BARE LEFT UPPER ARM DIAGNOSIS');
  // Find unselected vertices in +X upper arm region
  const shoulderY = landmarks.shoulder_y.value;
  const elbowY = landmarks.elbow_y.value;
  const leftArmRegion = [];
  
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    
    // +X (left) upper arm: x > 0.1, y between elbow and shoulder
    if (x > 0.1 && y >= elbowY && y <= shoulderY && !selectedVertices.has(i)) {
      // Get dominant bone and summed top weight
      let maxWeight = -1;
      let dominantBoneIdx = -1;
      let topSumWeight = 0;
      
      for (let j = 0; j < 4; j++) {
        const weight = skinWeight.getComponent(i, j);
        const boneIdx = skinIndex.getComponent(i, j);
        
        if (weight > maxWeight) {
          maxWeight = weight;
          dominantBoneIdx = boneIdx;
        }
        
        if (boneIdx >= 0 && boneIdx < bones.length) {
          const boneName = sanitizeBoneName(bones[boneIdx].name);
          if (topBoneSet.has(boneName)) {
            topSumWeight += weight;
          }
        }
      }
      
      const dominantBoneName = dominantBoneIdx >= 0 && dominantBoneIdx < bones.length
        ? sanitizeBoneName(bones[dominantBoneIdx].name)
        : 'unknown';
      
      leftArmRegion.push({
        index: i,
        x, y,
        dominantBone: dominantBoneName,
        dominantWeight: maxWeight,
        topSumWeight,
      });
    }
  }
  
  console.log(`   Unselected vertices in +X upper arm (x>0.1, y∈[${elbowY.toFixed(3)}, ${shoulderY.toFixed(3)}]): ${leftArmRegion.length}`);
  if (leftArmRegion.length > 0) {
    const sample = leftArmRegion.slice(0, 30);
    console.log(`   Sample of first 30:`);
    const boneSummary = new Map();
    for (const v of sample) {
      boneSummary.set(v.dominantBone, (boneSummary.get(v.dominantBone) || 0) + 1);
    }
    for (const [bone, count] of [...boneSummary.entries()].sort((a, b) => b[1] - a[1])) {
      const avgTopWeight = sample.filter(v => v.dominantBone === bone)
        .reduce((sum, v) => sum + v.topSumWeight, 0) / count;
      console.log(`      ${bone}: ${count} verts, avg top sum weight: ${avgTopWeight.toFixed(3)}`);
    }
  }

  // d. Wig diagnosis
  console.log('\nd. WIG DIAGNOSIS');
  const wigDef = costumePiecesData.pieces.find(p => p.id === 'wig');
  const wigBoneSet = resolveBoneSet(wigDef);
  const wigYMin = landmarks[wigDef.yMin.landmark].value + wigDef.yMin.offset;
  const wigYMax = landmarks[wigDef.yMax.landmark].value + wigDef.yMax.offset;
  
  console.log(`   y-band: [${wigYMin.toFixed(4)}, ${wigYMax.toFixed(4)}]`);
  console.log(`   bone groups: ${Array.from(wigBoneSet).join(', ')}`);
  
  // Find vertices with head group weight >= SOFT_WEIGHT_MIN
  const headVertices = [];
  for (let i = 0; i < position.count; i++) {
    let headWeight = 0;
    for (let j = 0; j < 4; j++) {
      const boneIdx = skinIndex.getComponent(i, j);
      if (boneIdx >= 0 && boneIdx < bones.length) {
        const boneName = sanitizeBoneName(bones[boneIdx].name);
        if (wigBoneSet.has(boneName)) {
          headWeight += skinWeight.getComponent(i, j);
        }
      }
    }
    if (headWeight >= SOFT_WEIGHT_MIN) {
      headVertices.push({
        index: i,
        y: position.getY(i),
        headWeight,
      });
    }
  }
  
  const aboveNeckWig = headVertices.filter(v => v.y > neckY).length;
  const currentWigTop = wigDef.yMax ? landmarks[wigDef.yMax.landmark].value + wigDef.yMax.offset : Infinity;
  const aboveWigTop = headVertices.filter(v => v.y > currentWigTop).length;
  
  headVertices.sort((a, b) => b.y - a.y);
  const top20 = headVertices.slice(0, 20);
  
  console.log(`   Vertices with head weight >= ${SOFT_WEIGHT_MIN}: ${headVertices.length}`);
  console.log(`   Count above neck_y (${neckY.toFixed(4)}): ${aboveNeckWig}`);
  console.log(`   Count above current wig yMax (${currentWigTop.toFixed(4)}): ${aboveWigTop}`);
  console.log(`   Top 20 highest head vertices:`);
  for (const v of top20) {
    let maxWeight = -1;
    let dominantBoneIdx = -1;
    for (let j = 0; j < 4; j++) {
      const weight = skinWeight.getComponent(v.index, j);
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantBoneIdx = skinIndex.getComponent(v.index, j);
      }
    }
    const dominantBone = dominantBoneIdx >= 0 && dominantBoneIdx < bones.length
      ? sanitizeBoneName(bones[dominantBoneIdx].name)
      : 'unknown';
    console.log(`      y=${v.y.toFixed(4)}, headWeight=${v.headWeight.toFixed(3)}, dominant=${dominantBone}`);
  }
  
  // Check wig selected triangles
  const selectedWigTriangles = selectTriangles(geometry, wigBoneSet, bones, wigYMin, wigYMax, undefined, true, undefined);
  const selectedWigVertices = new Set();
  let wigMinY = Infinity, wigMaxY = -Infinity;
  for (const triIdx of selectedWigTriangles) {
    for (let j = 0; j < 3; j++) {
      const vIdx = index.getX(triIdx * 3 + j);
      selectedWigVertices.add(vIdx);
      const y = position.getY(vIdx);
      wigMinY = Math.min(wigMinY, y);
      wigMaxY = Math.max(wigMaxY, y);
    }
  }
  console.log(`   Selected wig triangles: ${selectedWigTriangles.length}, verts: ${selectedWigVertices.size}`);
  console.log(`   Selected wig y-range: [${wigMinY.toFixed(4)}, ${wigMaxY.toFixed(4)}]`);
  console.log(`   Distance from head_top_y: ${(landmarks.head_top_y.value - wigMaxY).toFixed(4)} m`);

  // e. Belt diagnosis
  console.log('\ne. BELT RADIUS DIAGNOSIS');
  const beltDef = costumePiecesData.pieces.find(p => p.id === 'belt');
  const beltY = landmarks[beltDef.yPosition.landmark].value + beltDef.yPosition.offset;
  
  const torsoBoneIndices = new Set();
  bones.forEach((bone, idx) => {
    const name = bone.name.toLowerCase();
    if (!name.includes('arm') && !name.includes('hand')) {
      torsoBoneIndices.add(idx);
    }
  });
  
  const tolerance = 0.01;
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let torsoVertCount = 0;
  
  // Also track arm vertices at same height
  let armMinX = Infinity, armMaxX = -Infinity;
  let armVertCount = 0;
  
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (Math.abs(y - beltY) > tolerance) continue;
    
    let torsoWeight = 0;
    for (let j = 0; j < 4; j++) {
      const boneIdx = skinIndex.getComponent(i, j);
      if (torsoBoneIndices.has(boneIdx)) {
        torsoWeight += skinWeight.getComponent(i, j);
      }
    }
    
    const x = position.getX(i);
    const z = position.getZ(i);
    
    if (torsoWeight > 0.5) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
      torsoVertCount++;
    } else {
      // Likely arm vertex
      armMinX = Math.min(armMinX, x);
      armMaxX = Math.max(armMaxX, x);
      armVertCount++;
    }
  }
  
  console.log(`   Belt y-position: ${beltY.toFixed(4)} m`);
  console.log(`   Torso vertices at belt height: ${torsoVertCount}`);
  console.log(`   Torso x-range: [${minX.toFixed(4)}, ${maxX.toFixed(4)}] (width: ${(maxX - minX).toFixed(4)} m)`);
  console.log(`   Torso z-range: [${minZ.toFixed(4)}, ${maxZ.toFixed(4)}] (depth: ${(maxZ - minZ).toFixed(4)} m)`);
  console.log(`   Arm vertices at belt height: ${armVertCount}`);
  if (isFinite(armMinX)) {
    console.log(`   Arm x-range: [${armMinX.toFixed(4)}, ${armMaxX.toFixed(4)}]`);
  }
}

async function main() {
  console.log('COSTUME-4A Step 1: Coverage Diagnosis\n');

  try {
    await diagnoseBody('male', path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'), maleContract);
    await diagnoseBody('female', path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'), femaleContract);
    
    console.log('\n=== Diagnosis complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
    process.exit(1);
  }
}

main();
