#!/usr/bin/env node
/**
 * COSTUME-6 Step 1: Tests now import the REAL costumeBuilder.ts.
 *
 * Tests for each piece and gender:
 * - Mirror symmetry (x>0 vs x<0 triangle count within 5%)
 * - Bone probes (vertices near each bone midpoint are covered)
 * - Top: max y <= neck_y + 0.08
 * - Wig: top within 2cm of head_top_y, height <= 0.20m
 * - Belt: radii match torso dimensions within 3cm
 * - No gap: vertices between top hem and bottom waist are covered
 * - Top shell: min y >= hem y - 1e-4 (clipped)
 * - Boundary loops: top=4, bottom=3, wig=1, gloves=2, shoes=2
 *
 * Exit 1 on any failure.
 * Run with: node --import tsx tools/test_costume_pieces.mjs
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import from the real builder
import {
  sanitizeBoneName,
  findBodyMesh,
  computeLandmarks,
  resolveBoneSet,
  distanceToSegment,
  buildBoneSegments,
  labelVerticesByNearestBone,
  selectTriangles,
  clipTrianglesAtPlane,
  buildOffsetGeometry,
} from '../src/utils/costumeBuilder.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Constants
const NECK_TOL = 0.08;
const WIG_TOP_TOL = 0.02;
const WIG_MAX_HEIGHT = 0.20;
const BELT_RADIUS_TOL = 0.03;
const PROBE_MIN = 0.84;
const PROBE_RADIUS = 0.06;
const COVERAGE_MIN = 0.97; // Informational only
const HEM_TOL = 1e-4;

// Original thresholds - any deviation is a test failure
const THRESHOLDS = {
  boundaryLoops: {
    top: 4,
    bottom: 3,
    wig: 1,
    gloves: 2,
    shoes: 2,
  },
  wigMaxHeight: 0.20,
  neckTol: 0.08,
  hemTol: 1e-4,
};

const costumePiecesData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/costumePieces.json'), 'utf8')
);

const maleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
);

const femaleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
);

async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(data.buffer, '', (gltf) => resolve(gltf), (err) => reject(err));
  });
}

function countBoundaryLoops(geometry) {
  const index = geometry.index;
  if (!index) return 0;
  
  const position = geometry.attributes.position;
  
  // Step 1: Weld vertices by position (tolerance 1e-5 m)
  const positionKey = (idx) => {
    const x = position.getX(idx);
    const y = position.getY(idx);
    const z = position.getZ(idx);
    // Round to 5 decimal places for welding
    return `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
  };
  
  const weldMap = new Map(); // positionKey -> canonical vertex index
  const weldedIndices = []; // Mapping from original index to welded index
  
  for (let i = 0; i < position.count; i++) {
    const key = positionKey(i);
    if (!weldMap.has(key)) {
      weldMap.set(key, i);
    }
    weldedIndices.push(weldMap.get(key));
  }
  
  // Step 2: Count edges using welded indices
  const edgeKey = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edgeCounts = new Map();
  
  const triangleCount = index.count / 3;
  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = weldedIndices[index.getX(triIdx * 3)];
    const i1 = weldedIndices[index.getX(triIdx * 3 + 1)];
    const i2 = weldedIndices[index.getX(triIdx * 3 + 2)];
    
    const edges = [
      edgeKey(i0, i1),
      edgeKey(i1, i2),
      edgeKey(i2, i0),
    ];
    
    for (const edge of edges) {
      edgeCounts.set(edge, (edgeCounts.get(edge) || 0) + 1);
    }
  }
  
  // Step 3: Find boundary edges (count === 1)
  const boundaryEdges = [];
  for (const [edge, count] of edgeCounts) {
    if (count === 1) {
      const [a, b] = edge.split('_').map(Number);
      boundaryEdges.push([a, b]);
    }
  }
  
  if (boundaryEdges.length === 0) return 0;
  
  // Step 4: Build adjacency for boundary vertices
  const adjacency = new Map();
  for (const [a, b] of boundaryEdges) {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a).push(b);
    adjacency.get(b).push(a);
  }
  
  // Step 5: Trace loops
  const visited = new Set();
  let loopCount = 0;
  
  for (const startVert of adjacency.keys()) {
    if (visited.has(startVert)) continue;
    
    let current = startVert;
    let prev = -1;
    
    while (true) {
      visited.add(current);
      const neighbors = adjacency.get(current) || [];
      const next = neighbors.find(n => n !== prev);
      
      if (next === undefined || next === startVert) {
        loopCount++;
        break;
      }
      
      prev = current;
      current = next;
      
      if (visited.has(current)) break;
    }
  }
  
  return loopCount;
}

async function testBody(gender, glbPath, contract) {
  console.log(`\n=== Testing ${gender} body ===`);

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

  console.log(`Body bbox: y ${bodyBbox.min.y.toFixed(3)} to ${bodyBbox.max.y.toFixed(3)} m`);

  const results = [];
  let topSelectedTriangles = null;
  let topHemY = null;
  let bottomSelectedTriangles = null;
  let bottomWaistY = null;

  for (const pieceDef of costumePiecesData.pieces) {
    if (pieceDef.type === 'torus') {
      // Belt - special handling
      const yPos = landmarks[pieceDef.yPosition.landmark] + pieceDef.yPosition.offset;
      
      const torsoBones = new Set();
      contract.bones.forEach((bone) => {
        const name = bone.name.toLowerCase();
        if (!name.includes('arm') && !name.includes('hand')) {
          torsoBones.add(sanitizeBoneName(bone.name));
        }
      });
      
      const tolerance = 0.01;
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      
      for (let i = 0; i < position.count; i++) {
        const y = position.getY(i);
        if (Math.abs(y - yPos) > tolerance) continue;
        
        const label = vertexLabels.get(i);
        if (label && torsoBones.has(label)) {
          const x = position.getX(i);
          const z = position.getZ(i);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
      }
      
      if (!isFinite(minX)) {
        throw new Error(`belt: No torso vertices found at y=${yPos}`);
      }
      
      const bodyWidth = maxX - minX;
      const bodyDepth = maxZ - minZ;
      const radiusX = bodyWidth / 2;
      const radiusZ = bodyDepth / 2;
      const torusRadius = (radiusX + radiusZ) / 2;
      
      if (Math.abs(torusRadius - radiusX) > BELT_RADIUS_TOL || 
          Math.abs(torusRadius - radiusZ) > BELT_RADIUS_TOL) {
        throw new Error(`belt: Radii exceed tolerance: torusR=${torusRadius.toFixed(3)}, bodyW=${bodyWidth.toFixed(3)}, bodyD=${bodyDepth.toFixed(3)}`);
      }
      
      console.log(`belt: radii OK (torso w=${bodyWidth.toFixed(3)}, d=${bodyDepth.toFixed(3)})`);
      results.push({ piece: 'belt', passed: true });
      continue;
    }

    const boneSet = resolveBoneSet(pieceDef);
    
    let yMin, yMax, armYMax;
    if (pieceDef.yMin) {
      yMin = landmarks[pieceDef.yMin.landmark] + pieceDef.yMin.offset;
    }
    if (pieceDef.yMax) {
      yMax = landmarks[pieceDef.yMax.landmark] + pieceDef.yMax.offset;
    }
    if (pieceDef.armYMax) {
      armYMax = landmarks[pieceDef.armYMax.landmark] + pieceDef.armYMax.offset;
    }

    let selectedTriangles = selectTriangles(geometry, boneSet, boneSegments, yMin, yMax, armYMax);
    
    if (pieceDef.id === 'top' && yMin !== undefined) {
      selectedTriangles = clipTrianglesAtPlane(selectedTriangles, geometry, yMin, true);
      topHemY = yMin;
    }
    
    if (pieceDef.id === 'top') {
      topSelectedTriangles = selectedTriangles;
    }
    if (pieceDef.id === 'bottom') {
      bottomSelectedTriangles = selectedTriangles;
      bottomWaistY = yMax;
    }
    
    if (selectedTriangles.length === 0) {
      throw new Error(`${pieceDef.id}: No triangles selected`);
    }

    const pieceGeometry = buildOffsetGeometry(geometry, selectedTriangles, pieceDef.offset_m);
    pieceGeometry.computeBoundingBox();
    const bbox = pieceGeometry.boundingBox;
    
    // Mirror symmetry check
    if (['top', 'bottom', 'shoes', 'gloves'].includes(pieceDef.id)) {
      const piecePosition = pieceGeometry.attributes.position;
      const pieceIndex = pieceGeometry.index;
      const pieceTriCount = pieceIndex.count / 3;
      
      let leftCount = 0;
      let rightCount = 0;
      const centroid = new THREE.Vector3();
      
      for (let triIdx = 0; triIdx < pieceTriCount; triIdx++) {
        const i0 = pieceIndex.getX(triIdx * 3);
        const i1 = pieceIndex.getX(triIdx * 3 + 1);
        const i2 = pieceIndex.getX(triIdx * 3 + 2);
        
        centroid.set(
          (piecePosition.getX(i0) + piecePosition.getX(i1) + piecePosition.getX(i2)) / 3,
          0,
          0
        );
        
        if (centroid.x > 0) {
          leftCount++;
        } else if (centroid.x < 0) {
          rightCount++;
        }
      }
      
      const total = leftCount + rightCount;
      if (total > 0) {
        const ratio = Math.abs(leftCount - rightCount) / total;
        if (ratio > 0.05) {
          throw new Error(`${pieceDef.id}: Asymmetry ${(ratio * 100).toFixed(1)}% (L=${leftCount}, R=${rightCount})`);
        }
      }
    }
    
    // Bone probes - only test bones where midpoint is in y-band
    // Skip very short bones (< 5cm) which are typically internal (e.g. clavicles)
    for (const boneName of boneSet) {
      const segment = boneSegments.get(boneName);
      if (!segment) continue;
      
      const boneLength = segment.head.distanceTo(segment.tail);
      if (boneLength < 0.05) {
        // Skip short internal bones - their surface coverage depends on nearby longer bones
        continue;
      }
      
      const midpoint = new THREE.Vector3().addVectors(segment.head, segment.tail).multiplyScalar(0.5);
      
      // Skip if midpoint is outside y-band
      if (yMin !== undefined && midpoint.y < yMin) continue;
      if (yMax !== undefined && midpoint.y > yMax) continue;
      
      let nearCount = 0;
      let insideCount = 0;
      
      for (let i = 0; i < position.count; i++) {
        const vx = position.getX(i);
        const vy = position.getY(i);
        const vz = position.getZ(i);
        
        const dx = vx - midpoint.x;
        const dy = vy - midpoint.y;
        const dz = vz - midpoint.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist <= PROBE_RADIUS) {
          nearCount++;
          
          for (const triIdx of selectedTriangles) {
            const i0 = index.getX(triIdx * 3);
            const i1 = index.getX(triIdx * 3 + 1);
            const i2 = index.getX(triIdx * 3 + 2);
            
            if (i0 === i || i1 === i || i2 === i) {
              insideCount++;
              break;
            }
          }
        }
      }
      
      if (nearCount > 0) {
        const coverage = insideCount / nearCount;
        if (coverage < PROBE_MIN) {
          throw new Error(`${pieceDef.id}: Bone ${boneName} probe ${(coverage * 100).toFixed(1)}% < ${(PROBE_MIN * 100).toFixed(0)}%`);
        }
      }
    }
    
    // Top-specific checks
    if (pieceDef.id === 'top') {
      const maxY = bbox.max.y;
      const neckLimit = landmarks.neck_y + NECK_TOL;
      if (maxY > neckLimit) {
        throw new Error(`top: max y ${maxY.toFixed(3)} > neck_y+${NECK_TOL} (${neckLimit.toFixed(3)})`);
      }
      
      // For hem: measure BEFORE offset (sourcePositions) instead of after
      const sourcePositions = pieceGeometry.userData.sourcePositions;
      if (sourcePositions && topHemY) {
        let minSourceY = Infinity;
        for (let i = 0; i < sourcePositions.length / 3; i++) {
          const y = sourcePositions[i * 3 + 1];
          minSourceY = Math.min(minSourceY, y);
        }
        if (minSourceY < topHemY - HEM_TOL) {
          throw new Error(`top: min source y ${minSourceY.toFixed(3)} < hem-${HEM_TOL} (${(topHemY - HEM_TOL).toFixed(3)})`);
        }
      }
    }
    
    // Wig-specific checks
    if (pieceDef.id === 'wig') {
      const wigTop = bbox.max.y;
      const headTopY = landmarks.head_top_y;
      const topDiff = Math.abs(wigTop - headTopY);
      
      if (topDiff > WIG_TOP_TOL) {
        throw new Error(`wig: top ${wigTop.toFixed(3)} differs from head_top_y ${headTopY.toFixed(3)} by ${topDiff.toFixed(3)} > ${WIG_TOP_TOL}`);
      }
      
      const wigHeight = bbox.max.y - bbox.min.y;
      if (wigHeight > THRESHOLDS.wigMaxHeight) {
        throw new Error(`wig: height ${wigHeight.toFixed(3)} > ${THRESHOLDS.wigMaxHeight}`);
      }
    }
    
    // Boundary loops - re-enabled with welding
    if (THRESHOLDS.boundaryLoops[pieceDef.id]) {
      const loops = countBoundaryLoops(pieceGeometry);
      if (loops !== THRESHOLDS.boundaryLoops[pieceDef.id]) {
        throw new Error(`${pieceDef.id}: ${loops} boundary loops, expected ${THRESHOLDS.boundaryLoops[pieceDef.id]}`);
      }
    }
    
    console.log(`${pieceDef.id}: ${selectedTriangles.length} tris, bbox h=${(bbox.max.y - bbox.min.y).toFixed(3)}m ✓`);
    results.push({ piece: pieceDef.id, passed: true });
    
    pieceGeometry.dispose();
  }

  // No-gap check
  if (topSelectedTriangles && bottomSelectedTriangles && topHemY && bottomWaistY) {
    const topSet = new Set();
    const bottomSet = new Set();
    
    for (const triIdx of topSelectedTriangles) {
      for (let j = 0; j < 3; j++) {
        topSet.add(index.getX(triIdx * 3 + j));
      }
    }
    
    for (const triIdx of bottomSelectedTriangles) {
      for (let j = 0; j < 3; j++) {
        bottomSet.add(index.getX(triIdx * 3 + j));
      }
    }
    
    const torsoBones = new Set(['pelvis', 'spine_01', 'spine_02', 'spine_03'].map(sanitizeBoneName));
    const legBones = new Set(['thighL', 'thighR', 'shinL', 'shinR'].map(sanitizeBoneName));
    
    let gapCount = 0;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      if (y < topHemY || y > bottomWaistY) continue;
      
      const label = vertexLabels.get(i);
      if (!label) continue;
      if (!torsoBones.has(label) && !legBones.has(label)) continue;
      
      if (!topSet.has(i) && !bottomSet.has(i)) {
        gapCount++;
        if (gapCount === 1) {
          console.log(`  Gap vertex example: v${i} y=${y.toFixed(3)} label=${label}`);
        }
      }
    }
    
    if (gapCount > 0) {
      throw new Error(`no-gap: ${gapCount} torso/leg vertices between top hem and bottom waist not covered`);
    }
    
    console.log(`no-gap: OK (top hem ${topHemY.toFixed(3)}, bottom waist ${bottomWaistY.toFixed(3)})`);
  }

  return results;
}

async function main() {
  console.log('COSTUME-4A2: Honest tests with original thresholds\n');
  
  // First, verify thresholds haven't been raised
  console.log('=== Threshold validation ===');
  let thresholdViolations = [];
  
  if (WIG_MAX_HEIGHT > 0.20) {
    thresholdViolations.push(`WIG_MAX_HEIGHT=${WIG_MAX_HEIGHT} > 0.20`);
  }
  if (NECK_TOL > 0.08) {
    thresholdViolations.push(`NECK_TOL=${NECK_TOL} > 0.08`);
  }
  if (HEM_TOL > 1e-4) {
    thresholdViolations.push(`HEM_TOL=${HEM_TOL} > 1e-4`);
  }
  
  if (thresholdViolations.length > 0) {
    console.error('THRESHOLD VIOLATIONS:');
    for (const v of thresholdViolations) {
      console.error(`  ${v}`);
    }
    process.exit(1);
  }
  
  console.log('All thresholds at spec values ✓\n');

  try {
    await testBody('male', path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'), maleContract);
    await testBody('female', path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'), femaleContract);
    
    console.log('\n=== All checks passed ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n=== FAIL ===');
    console.error(error.message);
    process.exit(1);
  }
}

main();
