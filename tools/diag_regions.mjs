#!/usr/bin/env node
/**
 * COSTUME-6C PART 2: C2 EVIDENCE
 * 
 * Diagnostic regions for wig and top using CURRENT selectPieceTriangles.
 * Forward = +Z (measured in CONTINUATION 1).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  findBodyMesh,
  computeLandmarks,
  resolveBoneSet,
  buildBoneSegments,
  labelVerticesByNearestBone,
  selectPieceTriangles,
  distanceToSegment,
} from '../src/utils/costumeBuilder.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const costumePiecesData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/costumePieces.json'), 'utf8')
);

async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(data.buffer, '', (gltf) => resolve(gltf), (err) => reject(err));
  });
}

async function diagnose(gender, glbPath, contract) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${gender.toUpperCase()} - CURRENT PIPELINE`);
  console.log('='.repeat(70));
  
  const gltf = await loadGLB(glbPath);
  const skinnedMesh = findBodyMesh(gltf.scene);
  if (!skinnedMesh) throw new Error(`No SkinnedMesh found`);

  const geometry = skinnedMesh.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const bodyBbox = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(contract, bodyBbox);
  const boneSegments = buildBoneSegments(contract);
  const vertexLabels = labelVerticesByNearestBone(geometry, boneSegments);
  
  // Get head bone position
  const headBone = contract.bones.find(b => b.name === 'head');
  if (!headBone) throw new Error('head bone not found');
  // Blender (x, y, z) -> glTF (x, z, -y)
  const headX = headBone.head[0];
  const headY = headBone.head[2];
  const headZ = -headBone.head[1];
  
  console.log(`\nHead bone position: (${headX.toFixed(3)}, ${headY.toFixed(3)}, ${headZ.toFixed(3)})`);
  console.log(`Forward direction: +Z (measured in CONTINUATION 1)`);
  console.log(`  Front: z > ${headZ.toFixed(3)}`);
  console.log(`  Back:  z < ${headZ.toFixed(3)}`);
  
  // WIG
  console.log(`\n--- WIG REGIONS ---`);
  
  const wigDef = costumePiecesData.pieces.find(p => p.id === 'wig');
  if (!wigDef) throw new Error('wig not found in data');
  
  const wigBoneSet = resolveBoneSet(wigDef);
  const wigSelected = selectPieceTriangles(
    geometry,
    wigDef,
    wigBoneSet,
    boneSegments,
    landmarks
  );
  const wigSelectedSet = new Set(wigSelected);
  
  // Wig region: y >= head_top_y - 0.18
  const wigYMin = landmarks.head_top_y - 0.18;
  console.log(`Wig region: y >= ${wigYMin.toFixed(3)} (head_top_y - 0.18)`);
  console.log(`head_top_y = ${landmarks.head_top_y.toFixed(3)}`);
  
  // Quadrants
  const quadrants = {
    frontLeft: { name: 'Front-Left (+z, -x)', vertices: [], covered: 0 },
    frontRight: { name: 'Front-Right (+z, +x)', vertices: [], covered: 0 },
    backLeft: { name: 'Back-Left (-z, -x)', vertices: [], covered: 0 },
    backRight: { name: 'Back-Right (-z, +x)', vertices: [], covered: 0 },
  };
  
  // Collect region vertices
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (y < wigYMin) continue;
    
    const x = position.getX(i);
    const z = position.getZ(i);
    
    let quad = null;
    if (z >= headZ && x < headX) quad = quadrants.frontLeft;
    else if (z >= headZ && x >= headX) quad = quadrants.frontRight;
    else if (z < headZ && x < headX) quad = quadrants.backLeft;
    else if (z < headZ && x >= headX) quad = quadrants.backRight;
    
    if (quad) {
      quad.vertices.push(i);
    }
  }
  
  // Check coverage
  for (const triIdx of wigSelected) {
    for (let j = 0; j < 3; j++) {
      const vIdx = index.getX(triIdx * 3 + j);
      const y = position.getY(vIdx);
      if (y < wigYMin) continue;
      
      const x = position.getX(vIdx);
      const z = position.getZ(vIdx);
      
      if (z >= headZ && x < headX && quadrants.frontLeft.vertices.includes(vIdx)) {
        quadrants.frontLeft.covered++;
      } else if (z >= headZ && x >= headX && quadrants.frontRight.vertices.includes(vIdx)) {
        quadrants.frontRight.covered++;
      } else if (z < headZ && x < headX && quadrants.backLeft.vertices.includes(vIdx)) {
        quadrants.backLeft.covered++;
      } else if (z < headZ && x >= headX && quadrants.backRight.vertices.includes(vIdx)) {
        quadrants.backRight.covered++;
      }
    }
  }
  
  console.log(`\nQuadrant coverage:`);
  for (const [key, quad] of Object.entries(quadrants)) {
    const pct = quad.vertices.length > 0 ? (quad.covered / quad.vertices.length * 100).toFixed(1) : '0.0';
    console.log(`  ${quad.name}: ${quad.covered} / ${quad.vertices.length} vertices (${pct}%)`);
  }
  
  // Back quadrant analysis
  const backVertices = [...quadrants.backLeft.vertices, ...quadrants.backRight.vertices];
  const backUncovered = backVertices.filter(vIdx => {
    // Check if this vertex appears in any selected triangle
    for (const triIdx of wigSelected) {
      for (let j = 0; j < 3; j++) {
        if (index.getX(triIdx * 3 + j) === vIdx) return false;
      }
    }
    return true;
  });
  
  console.log(`\nBack quadrants (combined): ${backVertices.length} vertices, ${backUncovered.length} uncovered`);
  
  if (backUncovered.length > 0) {
    // Count by label
    const labelCounts = new Map();
    for (const vIdx of backUncovered) {
      const label = vertexLabels.get(vIdx) || 'unknown';
      labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    }
    
    console.log(`  Uncovered back vertices by label:`);
    for (const [label, count] of [...labelCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${label}: ${count}`);
    }
    
    // Sample: nearest/second-nearest gap for first 5
    console.log(`  Sample (first 5 uncovered back vertices):`);
    for (let i = 0; i < Math.min(5, backUncovered.length); i++) {
      const vIdx = backUncovered[i];
      const point = new THREE.Vector3(
        position.getX(vIdx),
        position.getY(vIdx),
        position.getZ(vIdx)
      );
      
      const distances = [];
      for (const [boneName, segment] of boneSegments) {
        const dist = distanceToSegment(point, segment.head, segment.tail);
        distances.push({ bone: boneName, dist });
      }
      distances.sort((a, b) => a.dist - b.dist);
      
      const nearest = distances[0];
      const secondNearest = distances[1];
      const gap = secondNearest.dist - nearest.dist;
      const tie = gap < 1e-4;
      
      console.log(`    v${vIdx}: nearest=${nearest.bone} (${nearest.dist.toFixed(4)}m), 2nd=${secondNearest.bone} (${secondNearest.dist.toFixed(4)}m), gap=${gap.toFixed(4)}m ${tie ? '(TIE)' : ''}`);
    }
    
    // Reason analysis: why dropped?
    console.log(`  Reason dropped (first 5):`);
    for (let i = 0; i < Math.min(5, backUncovered.length); i++) {
      const vIdx = backUncovered[i];
      const label = vertexLabels.get(vIdx) || 'unknown';
      const y = position.getY(vIdx);
      
      let reason = '';
      if (!wigBoneSet.has(label)) {
        reason = 'label not in wig bone group';
      } else if (y < wigYMin) {
        reason = 'outside y band (below wigYMin)';
      } else {
        reason = 'unknown (closure, or other)';
      }
      
      console.log(`    v${vIdx} (${label}): ${reason}`);
    }
  }
  
  // Check triangles with z < -0.05 and y < hairlineY (if wig had a face rule)
  // hairlineY = head_top_y - hairlineDrop
  const hairlineDrop = wigDef.hairlineDrop || 0;
  const hairlineY = landmarks.head_top_y - hairlineDrop;
  console.log(`\nhairlineY = ${hairlineY.toFixed(3)} (head_top_y - hairlineDrop ${hairlineDrop})`);
  console.log(`hairlineDrop from data: ${wigDef.hairlineDrop}`);
  
  let faceTris = 0;
  let backQuadTris = 0;
  const centroid = new THREE.Vector3();
  for (let triIdx = 0; triIdx < index.count / 3; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    const v0 = new THREE.Vector3(position.getX(i0), position.getY(i0), position.getZ(i0));
    const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
    const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1/3);
    
    if (centroid.y >= wigYMin && centroid.z < -0.05 && centroid.y < hairlineY) {
      faceTris++;
    }
    if (centroid.y >= wigYMin && centroid.z < headZ) {
      backQuadTris++;
    }
  }
  
  console.log(`Triangles in wig region with z < -0.05 AND y < hairlineY: ${faceTris}`);
  console.log(`Triangles in back quadrants (z < ${headZ.toFixed(3)}): ${backQuadTris}`);
  if (backQuadTris > 0) {
    const facePct = (faceTris / backQuadTris * 100).toFixed(1);
    console.log(`  Face-zone triangles as % of back-quadrant triangles: ${facePct}%`);
  }
  
  // TOP
  console.log(`\n--- TOP REGIONS ---`);
  
  const topDef = costumePiecesData.pieces.find(p => p.id === 'top');
  if (!topDef) throw new Error('top not found in data');
  
  const topBoneSet = resolveBoneSet(topDef);
  const topSelected = selectPieceTriangles(
    geometry,
    topDef,
    topBoneSet,
    boneSegments,
    landmarks
  );
  const topSelectedSet = new Set(topSelected);
  
  // Shoulder cap regions
  const upperarmL = contract.bones.find(b => b.name === 'upperarm.L');
  const upperarmR = contract.bones.find(b => b.name === 'upperarm.R');
  if (!upperarmL || !upperarmR) throw new Error('upperarm bones not found');
  
  const shoulderLPos = new THREE.Vector3(upperarmL.head[0], upperarmL.head[2], -upperarmL.head[1]);
  const shoulderRPos = new THREE.Vector3(upperarmR.head[0], upperarmR.head[2], -upperarmR.head[1]);
  
  const shoulderCapRadius = 0.06;
  const shoulderCapL = [];
  const shoulderCapR = [];
  
  for (let i = 0; i < position.count; i++) {
    const p = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
    if (p.distanceTo(shoulderLPos) <= shoulderCapRadius) shoulderCapL.push(i);
    if (p.distanceTo(shoulderRPos) <= shoulderCapRadius) shoulderCapR.push(i);
  }
  
  // Upper back region
  const shoulder_y = landmarks.shoulder_y;
  const neck_y = landmarks.neck_y;
  const spine03 = contract.bones.find(b => b.name === 'spine_03');
  if (!spine03) throw new Error('spine_03 not found');
  const spine03Z = -spine03.head[1]; // Blender -> glTF
  
  const upperBack = [];
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const z = position.getZ(i);
    if (y >= shoulder_y - 0.15 && y <= neck_y + 0.06 && z < spine03Z) {
      upperBack.push(i);
    }
  }
  
  // Coverage
  function checkCoverage(vertices) {
    let covered = 0;
    for (const triIdx of topSelected) {
      for (let j = 0; j < 3; j++) {
        const vIdx = index.getX(triIdx * 3 + j);
        if (vertices.includes(vIdx)) covered++;
      }
    }
    return covered;
  }
  
  const shoulderLCovered = checkCoverage(shoulderCapL);
  const shoulderRCovered = checkCoverage(shoulderCapR);
  const upperBackCovered = checkCoverage(upperBack);
  
  const shoulderLPct = shoulderCapL.length > 0 ? (shoulderLCovered / shoulderCapL.length * 100).toFixed(1) : '0.0';
  const shoulderRPct = shoulderCapR.length > 0 ? (shoulderRCovered / shoulderCapR.length * 100).toFixed(1) : '0.0';
  const upperBackPct = upperBack.length > 0 ? (upperBackCovered / upperBack.length * 100).toFixed(1) : '0.0';
  
  console.log(`Shoulder cap LEFT (within ${shoulderCapRadius}m of upperarm.L head):`);
  console.log(`  ${shoulderLCovered} / ${shoulderCapL.length} vertices (${shoulderLPct}%)`);
  
  console.log(`Shoulder cap RIGHT (within ${shoulderCapRadius}m of upperarm.R head):`);
  console.log(`  ${shoulderRCovered} / ${shoulderCapR.length} vertices (${shoulderRPct}%)`);
  
  console.log(`Upper back (y ∈ [${(shoulder_y - 0.15).toFixed(3)}, ${(neck_y + 0.06).toFixed(3)}], z < ${spine03Z.toFixed(3)}):`);
  console.log(`  ${upperBackCovered} / ${upperBack.length} vertices (${upperBackPct}%)`);
  
  // Uncovered analysis
  const shoulderLUncovered = shoulderCapL.filter(vIdx => {
    for (const triIdx of topSelected) {
      for (let j = 0; j < 3; j++) {
        if (index.getX(triIdx * 3 + j) === vIdx) return false;
      }
    }
    return true;
  });
  
  const shoulderRUncovered = shoulderCapR.filter(vIdx => {
    for (const triIdx of topSelected) {
      for (let j = 0; j < 3; j++) {
        if (index.getX(triIdx * 3 + j) === vIdx) return false;
      }
    }
    return true;
  });
  
  const upperBackUncovered = upperBack.filter(vIdx => {
    for (const triIdx of topSelected) {
      for (let j = 0; j < 3; j++) {
        if (index.getX(triIdx * 3 + j) === vIdx) return false;
      }
    }
    return true;
  });
  
  console.log(`\nUncovered vertices by label:`);
  
  function analyzeLabelCounts(vertices, name) {
    if (vertices.length === 0) return;
    
    const labelCounts = new Map();
    for (const vIdx of vertices) {
      const label = vertexLabels.get(vIdx) || 'unknown';
      labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    }
    
    console.log(`  ${name}:`);
    for (const [label, count] of [...labelCounts.entries()].sort((a, b) => b[1] - a[1])) {
      const inSet = topBoneSet.has(label) ? 'in group' : 'NOT in group';
      console.log(`    ${label}: ${count} (${inSet})`);
    }
  }
  
  analyzeLabelCounts(shoulderLUncovered, 'Shoulder cap L');
  analyzeLabelCounts(shoulderRUncovered, 'Shoulder cap R');
  analyzeLabelCounts(upperBackUncovered, 'Upper back');
  
  // Hypotheses
  console.log(`\n--- HYPOTHESES ---`);
  
  console.log(`\nH1: Nearest-bone labeling gives back-of-skull vertices a label other than "head"`);
  const backHeadNonHead = backUncovered.filter(vIdx => {
    const label = vertexLabels.get(vIdx) || '';
    return label !== 'head';
  }).length;
  console.log(`  Back uncovered vertices with label != "head": ${backHeadNonHead} / ${backUncovered.length}`);
  if (backHeadNonHead > backUncovered.length * 0.5) {
    console.log(`  H1: CONFIRMED (majority of back uncovered vertices have non-head labels)`);
  } else {
    console.log(`  H1: REJECTED (most back uncovered vertices ARE labeled "head")`);
  }
  
  console.log(`\nH2: The wig face rule removes the back (or wrong side) of the head`);
  console.log(`  Current code has NO face-exclusion rule (no isWig parameter, no z < -0.05 check)`);
  console.log(`  H2: REJECTED (face rule does not exist in current pipeline)`);
  
  console.log(`\nH3: Top shoulder/upper-back holes are vertices labeled with bones NOT in top's groups`);
  const shoulderNonGroup = [...shoulderLUncovered, ...shoulderRUncovered].filter(vIdx => {
    const label = vertexLabels.get(vIdx) || '';
    return !topBoneSet.has(label);
  }).length;
  const upperBackNonGroup = upperBackUncovered.filter(vIdx => {
    const label = vertexLabels.get(vIdx) || '';
    return !topBoneSet.has(label);
  }).length;
  const totalUncovered = shoulderLUncovered.length + shoulderRUncovered.length + upperBackUncovered.length;
  const totalNonGroup = shoulderNonGroup + upperBackNonGroup;
  console.log(`  Shoulder caps: ${shoulderNonGroup} / ${shoulderLUncovered.length + shoulderRUncovered.length} uncovered have labels NOT in top's group`);
  console.log(`  Upper back: ${upperBackNonGroup} / ${upperBackUncovered.length} uncovered have labels NOT in top's group`);
  console.log(`  Total: ${totalNonGroup} / ${totalUncovered} uncovered have non-group labels`);
  if (totalNonGroup > totalUncovered * 0.5) {
    console.log(`  H3: CONFIRMED (majority of uncovered vertices have labels outside top's bone groups)`);
  } else {
    console.log(`  H3: REJECTED (most uncovered vertices ARE in top's bone groups)`);
  }
}

const maleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
);

const femaleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
);

await diagnose('male', path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'), maleContract);
await diagnose('female', path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'), femaleContract);

console.log('\n' + '='.repeat(70));
console.log('C2 EVIDENCE COMPLETE');
console.log('='.repeat(70));
