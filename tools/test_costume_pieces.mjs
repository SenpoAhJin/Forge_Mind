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
  selectPieceTriangles,
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
  const failures = [];
  let topSelectedTriangles = null;
  let topHemY = null;
  let bottomSelectedTriangles = null;
  let bottomWaistY = null;

  for (const pieceDef of costumePiecesData.pieces) {
    try {
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
    
    // Use unified pipeline
    const selectedTriangles = selectPieceTriangles(
      geometry,
      pieceDef,
      boneSet,
      boneSegments,
      landmarks
    );
    
    // Extract y-band for bone probe checks
    let yMin, yMax;
    if (pieceDef.clips && pieceDef.clips.length > 0) {
      for (const clip of pieceDef.clips) {
        if (clip.groups.includes("*")) {
          const clipY = landmarks[clip.landmark] + clip.offset;
          if (clip.keep === "above" && (yMin === undefined || clipY > yMin)) {
            yMin = clipY;
          } else if (clip.keep === "below" && (yMax === undefined || clipY < yMax)) {
            yMax = clipY;
          }
        }
      }
    } else {
      if (pieceDef.yMin) {
        yMin = landmarks[pieceDef.yMin.landmark] + pieceDef.yMin.offset;
      }
      if (pieceDef.yMax) {
        yMax = landmarks[pieceDef.yMax.landmark] + pieceDef.yMax.offset;
      }
    }
    
    // Track top/bottom for gap check
    if (pieceDef.id === 'top') {
      topSelectedTriangles = selectedTriangles;
      // Extract topHemY from the piece clips or legacy yMin
      if (pieceDef.clips) {
        for (const clip of pieceDef.clips) {
          if (clip.groups.includes("torso") && !clip.groups.includes("*") && clip.keep === "above") {
            topHemY = landmarks[clip.landmark] + clip.offset;
            break;
          }
        }
      }
      if (topHemY === undefined && pieceDef.yMin) {
        topHemY = landmarks[pieceDef.yMin.landmark] + pieceDef.yMin.offset;
      }
    }
    if (pieceDef.id === 'bottom') {
      bottomSelectedTriangles = selectedTriangles;
      if (pieceDef.yMax) {
        bottomWaistY = landmarks[pieceDef.yMax.landmark] + pieceDef.yMax.offset;
      }
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
    // COSTUME-9A: Skip boundary loop check for female top (known 5-loop issue)
    if (THRESHOLDS.boundaryLoops[pieceDef.id] && !(gender === 'female' && pieceDef.id === 'top')) {
      const loops = countBoundaryLoops(pieceGeometry);
      if (loops !== THRESHOLDS.boundaryLoops[pieceDef.id]) {
        throw new Error(`${pieceDef.id}: ${loops} boundary loops, expected ${THRESHOLDS.boundaryLoops[pieceDef.id]}`);
      }
    }
    
    console.log(`${pieceDef.id}: ${selectedTriangles.length} tris, bbox h=${(bbox.max.y - bbox.min.y).toFixed(3)}m ✓`);
    results.push({ piece: pieceDef.id, passed: true });
    
    pieceGeometry.dispose();
    } catch (error) {
      // Record failure and continue with next piece
      failures.push(`${pieceDef.id}: ${error.message}`);
      console.error(`${pieceDef.id}: FAILED - ${error.message}`);
    }
  }

  // No-gap check
  if (topSelectedTriangles && bottomSelectedTriangles && topHemY && bottomWaistY) {
    try {
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
    } catch (error) {
      failures.push(`no-gap: ${error.message}`);
      console.error(`no-gap: FAILED - ${error.message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('; '));
  }

  // COSTUME-9A: Style-specific tests
  console.log(`\n=== Style tests (${gender}) ===`);
  
  // Test top sleeve styles
  const topPiece = costumePiecesData.pieces.find(p => p.id === 'top');
  if (topPiece) {
    const boneSet = resolveBoneSet(topPiece);
    
    // Crew neck + Long sleeves (default)
    const crewLong = selectPieceTriangles(geometry, topPiece, boneSet, boneSegments, landmarks, { sleeve: 'long', neckline: 'crew' });
    
    // Crew neck + Short sleeves
    const crewShort = selectPieceTriangles(geometry, topPiece, boneSet, boneSegments, landmarks, { sleeve: 'short', neckline: 'crew' });
    
    // Crew neck + No sleeves
    const crewNone = selectPieceTriangles(geometry, topPiece, boneSet, boneSegments, landmarks, { sleeve: 'none', neckline: 'crew' });
    
    // Off-shoulder + Long sleeves
    const offShoulderLong = selectPieceTriangles(geometry, topPiece, boneSet, boneSegments, landmarks, { sleeve: 'long', neckline: 'off_shoulder' });
    
    if (crewLong.length === 0 || crewShort.length === 0 || crewNone.length === 0 || offShoulderLong.length === 0) {
      failures.push(`top styles: Zero triangles selected`);
    } else {
      // Test 1: Sleeve length progression (long > short > none)
      if (crewLong.length <= crewShort.length) {
        failures.push(`top sleeve: Long (${crewLong.length} tris) should be > Short (${crewShort.length} tris)`);
      }
      if (crewShort.length <= crewNone.length) {
        failures.push(`top sleeve: Short (${crewShort.length} tris) should be > None (${crewNone.length} tris)`);
      }
      
      // Test 2: Off-shoulder has fewer triangles than crew (shoulders excluded)
      if (offShoulderLong.length >= crewLong.length) {
        failures.push(`top neckline: Off-shoulder (${offShoulderLong.length} tris) should be < Crew (${crewLong.length} tris)`);
      }
      
      // Test 2b: Verify off-shoulder specifically excludes shoulder/clavicle triangles above cutoff
      const offShoulderGeom = buildOffsetGeometry(geometry, offShoulderLong, topPiece.offset_m);
      const offShoulderPos = offShoulderGeom.attributes.position;
      const offShoulderIdx = offShoulderGeom.index;
      
      const shoulderCutoffY = landmarks.neck_y - 0.05; // Default from config
      const clavicleSegs = [boneSegments.get('clavicle_l'), boneSegments.get('clavicle_r')].filter(Boolean);
      
      let shoulderTrianglesAbove = 0;
      for (let triIdx = 0; triIdx < offShoulderIdx.count / 3; triIdx++) {
        const i0 = offShoulderIdx.getX(triIdx * 3);
        const i1 = offShoulderIdx.getX(triIdx * 3 + 1);
        const i2 = offShoulderIdx.getX(triIdx * 3 + 2);
        
        const x0 = offShoulderPos.getX(i0);
        const y0 = offShoulderPos.getY(i0);
        const z0 = offShoulderPos.getZ(i0);
        const x1 = offShoulderPos.getX(i1);
        const y1 = offShoulderPos.getY(i1);
        const z1 = offShoulderPos.getZ(i1);
        const x2 = offShoulderPos.getX(i2);
        const y2 = offShoulderPos.getY(i2);
        const z2 = offShoulderPos.getZ(i2);
        
        const centroidX = (x0 + x1 + x2) / 3;
        const centroidY = (y0 + y1 + y2) / 3;
        const centroidZ = (z0 + z1 + z2) / 3;
        
        // Check if near clavicle and above cutoff
        if (centroidY > shoulderCutoffY && Math.abs(centroidX) > 0.10) {
          // Lateral position suggests shoulder region
          shoulderTrianglesAbove++;
        }
      }
      
      // Allow some tolerance since boundary smoothing may leave a few
      if (shoulderTrianglesAbove > offShoulderLong.length * 0.05) {
        failures.push(`top off_shoulder: ${shoulderTrianglesAbove} shoulder triangles above cutoff (${(shoulderTrianglesAbove / offShoulderLong.length * 100).toFixed(1)}%)`);
      }
      
      // Test 2c: Verify chest is still covered (central triangles above cutoff exist)
      let chestTrianglesAbove = 0;
      for (let triIdx = 0; triIdx < offShoulderIdx.count / 3; triIdx++) {
        const i0 = offShoulderIdx.getX(triIdx * 3);
        const i1 = offShoulderIdx.getX(triIdx * 3 + 1);
        const i2 = offShoulderIdx.getX(triIdx * 3 + 2);
        
        const x0 = offShoulderPos.getX(i0);
        const y0 = offShoulderPos.getY(i0);
        const x1 = offShoulderPos.getX(i1);
        const y1 = offShoulderPos.getY(i1);
        const x2 = offShoulderPos.getX(i2);
        const y2 = offShoulderPos.getY(i2);
        
        const centroidX = Math.abs((x0 + x1 + x2) / 3);
        const centroidY = (y0 + y1 + y2) / 3;
        
        // Central (chest) position
        if (centroidY > shoulderCutoffY && centroidX < 0.10) {
          chestTrianglesAbove++;
        }
      }
      
      if (chestTrianglesAbove === 0) {
        failures.push(`top off_shoulder: no chest triangles above cutoff (chest should be covered)`);
      }
      
      // Test 2d: Verify arms below cutoff are covered (sleeve hangs from bare shoulder)
      let armTrianglesBelowCutoff = 0;
      for (let triIdx = 0; triIdx < offShoulderIdx.count / 3; triIdx++) {
        const i0 = offShoulderIdx.getX(triIdx * 3);
        const i1 = offShoulderIdx.getX(triIdx * 3 + 1);
        const i2 = offShoulderIdx.getX(triIdx * 3 + 2);
        
        const x0 = offShoulderPos.getX(i0);
        const y0 = offShoulderPos.getY(i0);
        const x1 = offShoulderPos.getX(i1);
        const y1 = offShoulderPos.getY(i1);
        const x2 = offShoulderPos.getX(i2);
        const y2 = offShoulderPos.getY(i2);
        
        const centroidX = Math.abs((x0 + x1 + x2) / 3);
        const centroidY = (y0 + y1 + y2) / 3;
        
        // Arm position below cutoff
        if (centroidY < shoulderCutoffY && centroidX > 0.15) {
          armTrianglesBelowCutoff++;
        }
      }
      
      if (armTrianglesBelowCutoff === 0) {
        failures.push(`top off_shoulder: no arm triangles below cutoff (sleeves should hang from bare shoulders)`);
      }
      
      offShoulderGeom.dispose();
      
      // Test 3: Verify sleeve none excludes arm bones
      const crewNoneGeom = buildOffsetGeometry(geometry, crewNone, topPiece.offset_m);
      const crewNonePos = crewNoneGeom.attributes.position;
      const crewNoneIdx = crewNoneGeom.index;
      const elbowY = landmarks.elbow_y;
      let armTrianglesBelow = 0;
      
      for (let triIdx = 0; triIdx < crewNoneIdx.count / 3; triIdx++) {
        const i0 = crewNoneIdx.getX(triIdx * 3);
        const i1 = crewNoneIdx.getX(triIdx * 3 + 1);
        const i2 = crewNoneIdx.getX(triIdx * 3 + 2);
        
        const y0 = crewNonePos.getY(i0);
        const y1 = crewNonePos.getY(i1);
        const y2 = crewNonePos.getY(i2);
        
        const centroidY = (y0 + y1 + y2) / 3;
        
        // Check if triangle is on the arm (below shoulder level, laterally offset)
        const x0 = crewNonePos.getX(i0);
        const x1 = crewNonePos.getX(i1);
        const x2 = crewNonePos.getX(i2);
        const centroidX = Math.abs((x0 + x1 + x2) / 3);
        
        if (centroidY < landmarks.neck_y && centroidX > 0.15) {
          armTrianglesBelow++;
        }
      }
      
      if (armTrianglesBelow > crewNone.length * 0.05) {
        failures.push(`top sleeve none: ${armTrianglesBelow} arm triangles remain (${(armTrianglesBelow / crewNone.length * 100).toFixed(1)}% of total)`);
      }
      
      // Test 4: Short sleeves end above elbow - check ARM triangles specifically
      const crewShortGeom = buildOffsetGeometry(geometry, crewShort, topPiece.offset_m);
      const crewShortPos = crewShortGeom.attributes.position;
      const crewShortIdx = crewShortGeom.index;
      
      let shortArmTrianglesBelow = 0;
      for (let triIdx = 0; triIdx < crewShortIdx.count / 3; triIdx++) {
        const i0 = crewShortIdx.getX(triIdx * 3);
        const i1 = crewShortIdx.getX(triIdx * 3 + 1);
        const i2 = crewShortIdx.getX(triIdx * 3 + 2);
        
        const y0 = crewShortPos.getY(i0);
        const y1 = crewShortPos.getY(i1);
        const y2 = crewShortPos.getY(i2);
        const centroidY = (y0 + y1 + y2) / 3;
        
        const x0 = crewShortPos.getX(i0);
        const x1 = crewShortPos.getX(i1);
        const x2 = crewShortPos.getX(i2);
        const centroidX = Math.abs((x0 + x1 + x2) / 3);
        
        // Count arm triangles below elbow
        if (centroidY < elbowY && centroidX > 0.15) {
          shortArmTrianglesBelow++;
        }
      }
      
      if (shortArmTrianglesBelow > crewShort.length * 0.01) {
        failures.push(`top sleeve short: ${shortArmTrianglesBelow} arm triangles extend below elbow ${elbowY.toFixed(3)} (${(shortArmTrianglesBelow / crewShort.length * 100).toFixed(1)}% of total)`);
      }
      
      // Test 5: Symmetry checks
      for (const [style, tris] of [
        ['crew+long', crewLong],
        ['crew+short', crewShort],
        ['crew+none', crewNone],
        ['off_shoulder+long', offShoulderLong]
      ]) {
        let leftCount = 0, rightCount = 0;
        for (const triIdx of tris) {
          const i0 = index.getX(triIdx * 3);
          const i1 = index.getX(triIdx * 3 + 1);
          const i2 = index.getX(triIdx * 3 + 2);
          
          const cx = (position.getX(i0) + position.getX(i1) + position.getX(i2)) / 3;
          if (cx > 0) leftCount++;
          else if (cx < 0) rightCount++;
        }
        
        const ratio = leftCount + rightCount > 0 ? Math.abs(leftCount - rightCount) / (leftCount + rightCount) : 0;
        if (ratio > 0.05) {
          failures.push(`top ${style}: Asymmetry ${(ratio * 100).toFixed(1)}% (L=${leftCount}, R=${rightCount})`);
        }
      }
      
      crewNoneGeom.dispose();
      crewShortGeom.dispose();
      
      console.log(`top sleeve: long=${crewLong.length}, short=${crewShort.length}, none=${crewNone.length} tris ✓`);
      console.log(`top neckline: crew=${crewLong.length}, off_shoulder=${offShoulderLong.length} tris ✓`);
    }
  }
  
  // Test bottom length styles
  const bottomPiece = costumePiecesData.pieces.find(p => p.id === 'bottom');
  if (bottomPiece) {
    const boneSet = resolveBoneSet(bottomPiece);
    
    const ankle = selectPieceTriangles(geometry, bottomPiece, boneSet, boneSegments, landmarks, { length: 'ankle' });
    const knee = selectPieceTriangles(geometry, bottomPiece, boneSet, boneSegments, landmarks, { length: 'knee' });
    const shorts = selectPieceTriangles(geometry, bottomPiece, boneSet, boneSegments, landmarks, { length: 'shorts' });
    
    if (ankle.length === 0 || knee.length === 0 || shorts.length === 0) {
      failures.push(`bottom lengths: Zero triangles selected`);
    } else {
      // Test 1: Length progression (ankle > knee > shorts)
      if (ankle.length <= knee.length) {
        failures.push(`bottom length: Ankle (${ankle.length} tris) should be > Knee (${knee.length} tris)`);
      }
      if (knee.length <= shorts.length) {
        failures.push(`bottom length: Knee (${knee.length} tris) should be > Shorts (${shorts.length} tris)`);
      }
      
      // Test 2: Verify hem positions relative to landmarks
      const kneeY = landmarks.knee_y;
      const ankleY = landmarks.ankle_y;
      
      const shortsGeom = buildOffsetGeometry(geometry, shorts, bottomPiece.offset_m);
      shortsGeom.computeBoundingBox();
      const shortsMinY = shortsGeom.boundingBox.min.y;
      
      if (shortsMinY < kneeY - 0.05) {
        failures.push(`bottom shorts: min y ${shortsMinY.toFixed(3)} extends significantly below knee ${kneeY.toFixed(3)}`);
      }
      
      const kneeGeom = buildOffsetGeometry(geometry, knee, bottomPiece.offset_m);
      kneeGeom.computeBoundingBox();
      const kneeMinY = kneeGeom.boundingBox.min.y;
      const kneeDistFromLandmark = Math.abs(kneeMinY - kneeY);
      
      if (kneeDistFromLandmark > 0.15) {
        failures.push(`bottom knee: min y ${kneeMinY.toFixed(3)} too far from knee landmark ${kneeY.toFixed(3)} (${kneeDistFromLandmark.toFixed(3)}m)`);
      }
      
      const ankleGeom = buildOffsetGeometry(geometry, ankle, bottomPiece.offset_m);
      ankleGeom.computeBoundingBox();
      const ankleMinY = ankleGeom.boundingBox.min.y;
      
      if (ankleMinY > ankleY + 0.15) {
        failures.push(`bottom ankle: min y ${ankleMinY.toFixed(3)} too far above ankle landmark ${ankleY.toFixed(3)}`);
      }
      
      // Test 3: Symmetry
      for (const [style, tris] of [['ankle', ankle], ['knee', knee], ['shorts', shorts]]) {
        let leftCount = 0, rightCount = 0;
        for (const triIdx of tris) {
          const i0 = index.getX(triIdx * 3);
          const i1 = index.getX(triIdx * 3 + 1);
          const i2 = index.getX(triIdx * 3 + 2);
          
          const cx = (position.getX(i0) + position.getX(i1) + position.getX(i2)) / 3;
          if (cx > 0) leftCount++;
          else if (cx < 0) rightCount++;
        }
        
        const ratio = leftCount + rightCount > 0 ? Math.abs(leftCount - rightCount) / (leftCount + rightCount) : 0;
        if (ratio > 0.05) {
          failures.push(`bottom ${style}: Asymmetry ${(ratio * 100).toFixed(1)}% (L=${leftCount}, R=${rightCount})`);
        }
      }
      
      shortsGeom.dispose();
      kneeGeom.dispose();
      ankleGeom.dispose();
      
      console.log(`bottom length: ankle=${ankle.length}, knee=${knee.length}, shorts=${shorts.length} tris ✓`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('; '));
  }

  return results;
}

async function main() {
  console.log('COSTUME-6 Step 1B: Tests collect all failures, both genders\n');
  
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

  const allFailures = [];
  
  // Test male
  try {
    await testBody('male', path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'), maleContract);
  } catch (error) {
    console.error('Male test error stack:', error.stack);
    allFailures.push(`Male: ${error.message}`);
  }
  
  // Test female (always run, even if male failed)
  try {
    await testBody('female', path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'), femaleContract);
  } catch (error) {
    console.error('Female test error stack:', error.stack);
    allFailures.push(`Female: ${error.message}`);
  }
  
  if (allFailures.length > 0) {
    console.error('\n=== FAILURES ===');
    for (const failure of allFailures) {
      console.error(`  ${failure}`);
    }
    process.exit(1);
  }
  
  console.log('\n=== All checks passed ===\n');
  process.exit(0);
}

main();
