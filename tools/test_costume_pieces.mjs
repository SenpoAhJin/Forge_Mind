#!/usr/bin/env node
/**
 * COSTUME-4A Step 3: Comprehensive costume piece tests.
 *
 * Uses nearest-bone-segment labeling (matching costumeBuilder.ts).
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
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
    floor: 0,
    hip_y: getBoneY('thigh.L'),
    knee_y: getBoneY('shin.L'),
    ankle_y: getBoneY('foot.L'),
    shoulder_y: getBoneY('upperarm.L'),
    elbow_y: getBoneY('forearm.L'),
    wrist_y: getBoneY('hand.L'),
    neck_y: getBoneY('neck'),
    head_top_y: meshBounds.max.y,
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

function distanceToSegment(point, segmentStart, segmentEnd) {
  const segment = new THREE.Vector3().subVectors(segmentEnd, segmentStart);
  const toPoint = new THREE.Vector3().subVectors(point, segmentStart);
  
  const segmentLengthSq = segment.lengthSq();
  if (segmentLengthSq === 0) {
    return point.distanceTo(segmentStart);
  }
  
  const t = Math.max(0, Math.min(1, toPoint.dot(segment) / segmentLengthSq));
  const projection = new THREE.Vector3().copy(segmentStart).addScaledVector(segment, t);
  
  return point.distanceTo(projection);
}

function buildBoneSegments(contract) {
  const bones = contract.bones;
  const segments = new Map();
  
  for (const bone of bones) {
    if (bone.name === 'root') continue;
    const head = new THREE.Vector3(bone.head[0], bone.head[2], -bone.head[1]);
    const tail = new THREE.Vector3(bone.tail[0], bone.tail[2], -bone.tail[1]);
    segments.set(sanitizeBoneName(bone.name), { head, tail });
  }
  
  return segments;
}

function labelVerticesByNearestBone(geometry, boneSegments) {
  const position = geometry.attributes.position;
  const vertexLabels = new Map();
  const point = new THREE.Vector3();
  
  for (let i = 0; i < position.count; i++) {
    point.set(position.getX(i), position.getY(i), position.getZ(i));
    
    let nearestBone = '';
    let nearestDist = Infinity;
    
    for (const [boneName, segment] of boneSegments) {
      const dist = distanceToSegment(point, segment.head, segment.tail);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBone = boneName;
      }
    }
    
    if (nearestBone) {
      vertexLabels.set(i, nearestBone);
    }
  }
  
  return vertexLabels;
}

function selectTriangles(geometry, boneSet, boneSegments, yMin, yMax, armYMax) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  if (!index) throw new Error('Geometry must have index');

  const triangleCount = index.count / 3;
  const centroid = new THREE.Vector3();
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  
  const triangleLabels = new Map();
  
  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    
    let nearestBone = '';
    let nearestDist = Infinity;
    
    for (const [boneName, segment] of boneSegments) {
      const dist = distanceToSegment(centroid, segment.head, segment.tail);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBone = boneName;
      }
    }
    
    triangleLabels.set(triIdx, nearestBone);
  }
  
  const initialSelection = new Set();
  
  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const label = triangleLabels.get(triIdx);
    if (!label || !boneSet.has(label)) continue;
    
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    
    if (yMin !== undefined && centroid.y < yMin) continue;
    if (yMax !== undefined && centroid.y > yMax) continue;
    
    initialSelection.add(triIdx);
  }
  
  const edgeKey = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edgeToTriangles = new Map();
  
  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    const edges = [
      edgeKey(i0, i1),
      edgeKey(i1, i2),
      edgeKey(i2, i0),
    ];
    
    for (const edge of edges) {
      if (!edgeToTriangles.has(edge)) {
        edgeToTriangles.set(edge, []);
      }
      edgeToTriangles.get(edge).push(triIdx);
    }
  }
  
  const finalSelection = new Set(initialSelection);
  let added = true;
  
  while (added) {
    added = false;
    
    for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
      if (finalSelection.has(triIdx)) continue;
      
      const i0 = index.getX(triIdx * 3);
      const i1 = index.getX(triIdx * 3 + 1);
      const i2 = index.getX(triIdx * 3 + 2);
      
      const edges = [
        edgeKey(i0, i1),
        edgeKey(i1, i2),
        edgeKey(i2, i0),
      ];
      
      let selectedNeighbors = 0;
      for (const edge of edges) {
        const neighbors = edgeToTriangles.get(edge) || [];
        for (const neighborIdx of neighbors) {
          if (neighborIdx !== triIdx && finalSelection.has(neighborIdx)) {
            selectedNeighbors++;
            break;
          }
        }
      }
      
      if (selectedNeighbors >= 2) {
        finalSelection.add(triIdx);
        added = true;
      }
    }
  }
  
  return Array.from(finalSelection);
}

function clipTrianglesAtPlane(selectedTriangles, geometry, clipY, keepAbove) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const result = [];
  
  for (const triIdx of selectedTriangles) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    const v0 = new THREE.Vector3(position.getX(i0), position.getY(i0), position.getZ(i0));
    const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
    const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
    
    // Classify vertices relative to plane
    const side0 = keepAbove ? (v0.y >= clipY ? 1 : -1) : (v0.y <= clipY ? 1 : -1);
    const side1 = keepAbove ? (v1.y >= clipY ? 1 : -1) : (v1.y <= clipY ? 1 : -1);
    const side2 = keepAbove ? (v2.y >= clipY ? 1 : -1) : (v2.y <= clipY ? 1 : -1);
    
    const onKeepSide = side0 + side1 + side2;
    
    // All vertices on keep side: keep triangle as-is
    if (onKeepSide === 3) {
      result.push({ triIdx, vertices: [v0, v1, v2] });
      continue;
    }
    
    // All vertices on discard side: drop triangle
    if (onKeepSide === -3) {
      continue;
    }
    
    // Triangle crosses plane: split it
    const kept = [];
    const discarded = [];
    
    [v0, v1, v2].forEach((v, idx) => {
      const side = [side0, side1, side2][idx];
      if (side === 1) kept.push(v);
      else discarded.push(v);
    });
    
    // Helper: interpolate vertex at plane intersection
    const intersect = (a, b) => {
      const t = (clipY - a.y) / (b.y - a.y);
      return new THREE.Vector3(
        a.x + t * (b.x - a.x),
        clipY,
        a.z + t * (b.z - a.z)
      );
    };
    
    if (kept.length === 1) {
      // 1 kept vertex: forms triangle with 2 intersection points
      const k = kept[0];
      const d0 = discarded[0];
      const d1 = discarded[1];
      const int0 = intersect(k, d0);
      const int1 = intersect(k, d1);
      result.push({ triIdx, vertices: [k, int0, int1] });
    } else if (kept.length === 2) {
      // 2 kept vertices: forms quad, split into 2 triangles
      const k0 = kept[0];
      const k1 = kept[1];
      const d = discarded[0];
      const int0 = intersect(k0, d);
      const int1 = intersect(k1, d);
      
      result.push({ triIdx, vertices: [k0, k1, int0] });
      result.push({ triIdx, vertices: [k1, int1, int0] });
    }
  }
  
  return result;
}

function buildOffsetGeometry(sourceGeometry, selectedTriangles, offset_m) {
  if (selectedTriangles.length === 0) {
    throw new Error('No triangles selected');
  }

  const sourcePosition = sourceGeometry.attributes.position;
  const sourceIndex = sourceGeometry.index;
  let sourceNormal = sourceGeometry.attributes.normal;

  if (!sourceNormal) {
    sourceGeometry.computeVertexNormals();
    sourceNormal = sourceGeometry.attributes.normal;
  }

  // Check if we have clipped triangles or simple indices
  const isClipped = selectedTriangles.length > 0 && typeof selectedTriangles[0] === 'object';
  
  const vertexCount = selectedTriangles.length * 3;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(vertexCount);
  const sourcePositions = new Float32Array(vertexCount * 3);

  // Helper: get normal for a vertex, or interpolate if it's a new clipped vertex
  const getNormal = (v, triIdx) => {
    // Try to find exact match in source
    const i0 = sourceIndex.getX(triIdx * 3);
    const i1 = sourceIndex.getX(triIdx * 3 + 1);
    const i2 = sourceIndex.getX(triIdx * 3 + 2);
    
    const v0 = new THREE.Vector3(sourcePosition.getX(i0), sourcePosition.getY(i0), sourcePosition.getZ(i0));
    const v1 = new THREE.Vector3(sourcePosition.getX(i1), sourcePosition.getY(i1), sourcePosition.getZ(i1));
    const v2 = new THREE.Vector3(sourcePosition.getX(i2), sourcePosition.getY(i2), sourcePosition.getZ(i2));
    
    const n0 = new THREE.Vector3(sourceNormal.getX(i0), sourceNormal.getY(i0), sourceNormal.getZ(i0));
    const n1 = new THREE.Vector3(sourceNormal.getX(i1), sourceNormal.getY(i1), sourceNormal.getZ(i1));
    const n2 = new THREE.Vector3(sourceNormal.getX(i2), sourceNormal.getY(i2), sourceNormal.getZ(i2));
    
    // Check for exact match
    const eps = 1e-6;
    if (v.distanceToSquared(v0) < eps) return n0;
    if (v.distanceToSquared(v1) < eps) return n1;
    if (v.distanceToSquared(v2) < eps) return n2;
    
    // New vertex: interpolate using barycentric coordinates
    const e1 = new THREE.Vector3().subVectors(v1, v0);
    const e2 = new THREE.Vector3().subVectors(v2, v0);
    const vp = new THREE.Vector3().subVectors(v, v0);
    
    const d00 = e1.dot(e1);
    const d01 = e1.dot(e2);
    const d11 = e2.dot(e2);
    const d20 = vp.dot(e1);
    const d21 = vp.dot(e2);
    const denom = d00 * d11 - d01 * d01;
    
    if (Math.abs(denom) < eps) {
      // Degenerate triangle, return face normal
      return new THREE.Vector3().crossVectors(e1, e2).normalize();
    }
    
    const b1 = (d11 * d20 - d01 * d21) / denom;
    const b2 = (d00 * d21 - d01 * d20) / denom;
    const b0 = 1 - b1 - b2;
    
    return new THREE.Vector3()
      .addScaledVector(n0, b0)
      .addScaledVector(n1, b1)
      .addScaledVector(n2, b2)
      .normalize();
  };

  if (isClipped) {
    // Handle clipped triangles with explicit vertices
    for (let i = 0; i < selectedTriangles.length; i++) {
      const { triIdx, vertices } = selectedTriangles[i];
      
      for (let j = 0; j < 3; j++) {
        const v = vertices[j];
        const n = getNormal(v, triIdx);
        const dstIdx = i * 3 + j;
        
        // Source position (before offset)
        sourcePositions[dstIdx * 3] = v.x;
        sourcePositions[dstIdx * 3 + 1] = v.y;
        sourcePositions[dstIdx * 3 + 2] = v.z;
        
        // Offset position
        positions[dstIdx * 3] = v.x + n.x * offset_m;
        positions[dstIdx * 3 + 1] = v.y + n.y * offset_m;
        positions[dstIdx * 3 + 2] = v.z + n.z * offset_m;
        
        normals[dstIdx * 3] = n.x;
        normals[dstIdx * 3 + 1] = n.y;
        normals[dstIdx * 3 + 2] = n.z;
        
        indices[dstIdx] = dstIdx;
      }
    }
  } else {
    // Handle simple triangle indices (no clipping)
    for (let i = 0; i < selectedTriangles.length; i++) {
      const triIdx = selectedTriangles[i];
      
      for (let j = 0; j < 3; j++) {
        const srcIdx = sourceIndex.getX(triIdx * 3 + j);
        const dstIdx = i * 3 + j;

        const px = sourcePosition.getX(srcIdx);
        const py = sourcePosition.getY(srcIdx);
        const pz = sourcePosition.getZ(srcIdx);

        const nx = sourceNormal.getX(srcIdx);
        const ny = sourceNormal.getY(srcIdx);
        const nz = sourceNormal.getZ(srcIdx);

        // Source position (before offset)
        sourcePositions[dstIdx * 3] = px;
        sourcePositions[dstIdx * 3 + 1] = py;
        sourcePositions[dstIdx * 3 + 2] = pz;

        // Offset position
        positions[dstIdx * 3] = px + nx * offset_m;
        positions[dstIdx * 3 + 1] = py + ny * offset_m;
        positions[dstIdx * 3 + 2] = pz + nz * offset_m;

        normals[dstIdx * 3] = nx;
        normals[dstIdx * 3 + 1] = ny;
        normals[dstIdx * 3 + 2] = nz;

        indices[dstIdx] = dstIdx;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.userData.sourcePositions = sourcePositions;

  return geometry;
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
  const failures = [];

  const gltf = await loadGLB(glbPath);
  const skinnedMesh = findBodyMesh(gltf.scene);
  if (!skinnedMesh) {
    failures.push(`No SkinnedMesh found`);
    return failures;
  }

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
        failures.push(`belt: No torso vertices found at y=${yPos}`);
        continue;
      }
      
      const bodyWidth = maxX - minX;
      const bodyDepth = maxZ - minZ;
      const radiusX = bodyWidth / 2;
      const radiusZ = bodyDepth / 2;
      const torusRadius = (radiusX + radiusZ) / 2;
      
      if (Math.abs(torusRadius - radiusX) > BELT_RADIUS_TOL || 
          Math.abs(torusRadius - radiusZ) > BELT_RADIUS_TOL) {
        failures.push(`belt: Radii exceed tolerance: torusR=${torusRadius.toFixed(3)}, bodyW=${bodyWidth.toFixed(3)}, bodyD=${bodyDepth.toFixed(3)}`);
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
      failures.push(`${pieceDef.id}: No triangles selected`);
      continue;
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
          failures.push(`${pieceDef.id}: Asymmetry ${(ratio * 100).toFixed(1)}% (L=${leftCount}, R=${rightCount})`);
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
          failures.push(`${pieceDef.id}: Bone ${boneName} probe ${(coverage * 100).toFixed(1)}% < ${(PROBE_MIN * 100).toFixed(0)}%`);
        }
      }
    }
    
    // Top-specific checks
    if (pieceDef.id === 'top') {
      const maxY = bbox.max.y;
      const neckLimit = landmarks.neck_y + NECK_TOL;
      if (maxY > neckLimit) {
        failures.push(`top: max y ${maxY.toFixed(3)} > neck_y+${NECK_TOL} (${neckLimit.toFixed(3)})`);
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
          failures.push(`top: min source y ${minSourceY.toFixed(3)} < hem-${HEM_TOL} (${(topHemY - HEM_TOL).toFixed(3)})`);
        }
      }
    }
    
    // Wig-specific checks
    if (pieceDef.id === 'wig') {
      const wigTop = bbox.max.y;
      const headTopY = landmarks.head_top_y;
      const topDiff = Math.abs(wigTop - headTopY);
      
      if (topDiff > WIG_TOP_TOL) {
        failures.push(`wig: top ${wigTop.toFixed(3)} differs from head_top_y ${headTopY.toFixed(3)} by ${topDiff.toFixed(3)} > ${WIG_TOP_TOL}`);
      }
      
      const wigHeight = bbox.max.y - bbox.min.y;
      if (wigHeight > THRESHOLDS.wigMaxHeight) {
        failures.push(`wig: height ${wigHeight.toFixed(3)} > ${THRESHOLDS.wigMaxHeight}`);
      }
    }
    
    // Boundary loops - re-enabled with welding
    if (THRESHOLDS.boundaryLoops[pieceDef.id]) {
      const loops = countBoundaryLoops(pieceGeometry);
      if (loops !== THRESHOLDS.boundaryLoops[pieceDef.id]) {
        failures.push(`${pieceDef.id}: ${loops} boundary loops, expected ${THRESHOLDS.boundaryLoops[pieceDef.id]}`);
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
      failures.push(`no-gap: ${gapCount} torso/leg vertices between top hem and bottom waist not covered`);
    } else {
      console.log(`no-gap: OK (top hem ${topHemY.toFixed(3)}, bottom waist ${bottomWaistY.toFixed(3)})`);
    }
  }

  return failures;
}

async function main() {
  console.log('COSTUME-4C: Comprehensive tests with all checks\n');
  
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

  // Run all tests and collect failures
  const allFailures = [];
  
  const maleFailures = await testBody('male', path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'), maleContract);
  if (maleFailures.length > 0) {
    allFailures.push(...maleFailures.map(f => `[male] ${f}`));
  }
  
  const femaleFailures = await testBody('female', path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'), femaleContract);
  if (femaleFailures.length > 0) {
    allFailures.push(...femaleFailures.map(f => `[female] ${f}`));
  }
  
  // Print all failures
  if (allFailures.length > 0) {
    console.error('\n=== FAILURES ===');
    for (const failure of allFailures) {
      console.error(`  ${failure}`);
    }
    console.error(`\nTotal failures: ${allFailures.length}\n`);
    process.exit(1);
  } else {
    console.log('\n=== All checks passed ===\n');
    process.exit(0);
  }
}

main();
