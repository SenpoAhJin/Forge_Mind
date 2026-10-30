#!/usr/bin/env node
/**
 * COSTUME-7A Step 1: Wig diagnostic - why are there dots on the back of the head?
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  findBodyMesh,
  computeLandmarks,
  buildBoneSegments,
  labelVerticesByNearestBone,
  resolveBoneSet,
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

function analyzeWig(gender, gltf, contract) {
  const skinnedMesh = findBodyMesh(gltf.scene);
  if (!skinnedMesh) throw new Error(`No SkinnedMesh found for ${gender}`);

  const geometry = skinnedMesh.geometry;
  const meshBounds = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(contract, meshBounds);
  const boneSegments = buildBoneSegments(contract);

  const wigDef = costumePiecesData.pieces.find(p => p.id === 'wig');
  if (!wigDef) throw new Error('wig not found in data');

  const boneSet = resolveBoneSet(wigDef, costumePiecesData);
  const position = geometry.attributes.position;
  const index = geometry.index;

  // Wig band region
  const yMin = landmarks[wigDef.yMin.landmark] + wigDef.yMin.offset;
  const yMax = landmarks[wigDef.yMax.landmark] + wigDef.yMax.offset;
  const hairlineY = landmarks.head_top_y - wigDef.hairlineDrop;

  // Find head bone z
  const headBone = contract.bones.find(b => b.name === 'head');
  const headZ = headBone ? headBone.head[2] : 0;

  console.log(`\n=== ${gender.toUpperCase()} WIG ===`);
  console.log(`Wig band: y in [${yMin.toFixed(3)}, ${yMax.toFixed(3)}]`);
  console.log(`hairlineY = ${hairlineY.toFixed(3)}`);
  console.log(`head bone z = ${headZ.toFixed(3)}`);

  // Label vertices
  const vertexLabels = labelVerticesByNearestBone(geometry, boneSegments);

  // Triangle analysis
  const triangleCount = index.count / 3;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const centroid = new THREE.Vector3();

  // Split by back vs front
  const backTotal = [];  // triangles with centroid z < headZ (back half)
  const frontTotal = []; // triangles with centroid z >= headZ (front half)

  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);

    position.getX(i0), position.getY(i0), position.getZ(i0);
    v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);

    // Only wig region triangles
    if (centroid.y < yMin || centroid.y > yMax) continue;

    // Check bone labels
    const label0 = vertexLabels.get(i0);
    const label1 = vertexLabels.get(i1);
    const label2 = vertexLabels.get(i2);

    const labelCount = [label0, label1, label2].filter(l => l && boneSet.has(l)).length;
    if (labelCount < 2) continue; // Not a wig bone triangle

    if (centroid.z < headZ) {
      backTotal.push({ triIdx, centroid: centroid.clone(), labels: [label0, label1, label2] });
    } else {
      frontTotal.push({ triIdx, centroid: centroid.clone(), labels: [label0, label1, label2] });
    }
  }

  // Now count drops by reason
  function countDrops(triangles, half) {
    let faceRule = 0;
    let closure = 0;
    let other = 0;

    const initialSelected = new Set();
    for (const { triIdx, centroid } of triangles) {
      // Face rule: centroid.z < -0.05 AND centroid.y < hairlineY
      if (centroid.z < -0.05 && centroid.y < hairlineY) {
        faceRule++;
        continue;
      }
      initialSelected.add(triIdx);
    }

    // Closure: triangles added by the neighbor rule
    // Build edge adjacency
    const edgeKey = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const edgeToTriangles = new Map();

    for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
      const i0 = index.getX(triIdx * 3);
      const i1 = index.getX(triIdx * 3 + 1);
      const i2 = index.getX(triIdx * 3 + 2);
      const edges = [edgeKey(i0, i1), edgeKey(i1, i2), edgeKey(i2, i0)];
      for (const edge of edges) {
        if (!edgeToTriangles.has(edge)) edgeToTriangles.set(edge, []);
        edgeToTriangles.get(edge).push(triIdx);
      }
    }

    // Closure loop
    const finalSelected = new Set(initialSelected);
    let added = true;
    while (added) {
      added = false;
      for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
        if (finalSelected.has(triIdx)) continue;

        const i0 = index.getX(triIdx * 3);
        const i1 = index.getX(triIdx * 3 + 1);
        const i2 = index.getX(triIdx * 3 + 2);
        const edges = [edgeKey(i0, i1), edgeKey(i1, i2), edgeKey(i2, i0)];

        let selectedNeighbors = 0;
        for (const edge of edges) {
          const neighbors = edgeToTriangles.get(edge) || [];
          for (const neighborIdx of neighbors) {
            if (neighborIdx !== triIdx && finalSelected.has(neighborIdx)) {
              selectedNeighbors++;
              break;
            }
          }
        }

        if (selectedNeighbors >= 2) {
          finalSelected.add(triIdx);
          added = true;
        }
      }
    }

    // Count closure additions (triangles added by closure, not in initial)
    for (const triIdx of finalSelected) {
      if (!initialSelected.has(triIdx)) {
        // Check if this triangle is in our region
        const found = triangles.find(t => t.triIdx === triIdx);
        if (found) closure++;
      }
    }

    // Other: in region, passed face rule, not selected finally
    for (const { triIdx } of triangles) {
      if (!finalSelected.has(triIdx)) {
        const wasFace = (triangles.find(t => t.triIdx === triIdx).centroid.z < -0.05 &&
                          triangles.find(t => t.triIdx === triIdx).centroid.y < hairlineY);
        if (!wasFace) other++;
      }
    }

    console.log(`  ${half}: total ${triangles.length}, dropped by face rule ${faceRule}, dropped by closure ${closure}, dropped other ${other}`);
    return { total: triangles.length, faceRule, closure, other, finalSelected: finalSelected.size };
  }

  const backStats = countDrops(backTotal, 'Back (z < head z)');
  const frontStats = countDrops(frontTotal, 'Front (z >= head z)');

  // Connected components
  // Use the actual selected triangles from the builder
  const selectedTriangles = selectWigTriangles(geometry, wigDef, boneSet, boneSegments, landmarks, hairlineY);
  
  const components = findConnectedComponents(geometry, selectedTriangles);
  console.log(`\nConnected components: ${components.length}`);
  if (components.length <= 10) {
    components.forEach((comp, i) => {
      console.log(`  Component ${i + 1}: ${comp.size} triangles`);
    });
  } else {
    console.log(`  (${components.length} components, sizes: ${components.map(c => c.size).join(', ')})`);
  }
}

// Helper to select wig triangles (copied from costumeBuilder logic)
function selectWigTriangles(geometry, wigDef, boneSet, boneSegments, landmarks, hairlineY) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const triangleCount = index.count / 3;

  const yMin = landmarks[wigDef.yMin.landmark] + wigDef.yMin.offset;
  const yMax = landmarks[wigDef.yMax.landmark] + wigDef.yMax.offset;

  const vertexLabels = labelVerticesByNearestBone(geometry, boneSegments);
  
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const centroid = new THREE.Vector3();

  const initialSelection = new Set();

  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);

    const label0 = vertexLabels.get(i0);
    const label1 = vertexLabels.get(i1);
    const label2 = vertexLabels.get(i2);
    const labelCount = [label0, label1, label2].filter(l => l && boneSet.has(l)).length;
    if (labelCount < 2) continue;

    v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);

    if (centroid.y < yMin || centroid.y > yMax) continue;

    // Face exclusion
    if (centroid.z < -0.05 && centroid.y < hairlineY) continue;

    initialSelection.add(triIdx);
  }

  // Closure
  const edgeKey = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edgeToTriangles = new Map();

  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    const edges = [edgeKey(i0, i1), edgeKey(i1, i2), edgeKey(i2, i0)];
    for (const edge of edges) {
      if (!edgeToTriangles.has(edge)) edgeToTriangles.set(edge, []);
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
      const edges = [edgeKey(i0, i1), edgeKey(i1, i2), edgeKey(i2, i0)];
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

// Find connected components
function findConnectedComponents(geometry, selectedTriangles) {
  const index = geometry.index;
  const triSet = new Set(selectedTriangles);
  
  const edgeKey = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edgeToTriangles = new Map();

  for (const triIdx of selectedTriangles) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    const edges = [edgeKey(i0, i1), edgeKey(i1, i2), edgeKey(i2, i0)];
    for (const edge of edges) {
      if (!edgeToTriangles.has(edge)) edgeToTriangles.set(edge, []);
      edgeToTriangles.get(edge).push(triIdx);
    }
  }

  const visited = new Set();
  const components = [];

  for (const startTri of selectedTriangles) {
    if (visited.has(startTri)) continue;

    const component = new Set();
    const queue = [startTri];
    
    while (queue.length > 0) {
      const triIdx = queue.shift();
      if (visited.has(triIdx)) continue;
      visited.add(triIdx);
      component.add(triIdx);

      const i0 = index.getX(triIdx * 3);
      const i1 = index.getX(triIdx * 3 + 1);
      const i2 = index.getX(triIdx * 3 + 2);
      const edges = [edgeKey(i0, i1), edgeKey(i1, i2), edgeKey(i2, i0)];

      for (const edge of edges) {
        const neighbors = edgeToTriangles.get(edge) || [];
        for (const neighborIdx of neighbors) {
          if (triSet.has(neighborIdx) && !visited.has(neighborIdx)) {
            queue.push(neighborIdx);
          }
        }
      }
    }

    components.push(component);
  }

  return components.sort((a, b) => b.size - a.size);
}

async function main() {
  const maleContract = JSON.parse(
    await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
  );
  const femaleContract = JSON.parse(
    await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
  );

  const maleGltf = await loadGLB(path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'));
  const femaleGltf = await loadGLB(path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'));

  analyzeWig('male', maleGltf, maleContract);
  analyzeWig('female', femaleGltf, femaleContract);

  console.log('\n=== WHAT ARE THE DOTS? ===');
  console.log('Lines 108-120 in src/components/V2CostumeDemo.tsx:');
  console.log('Debug mode renders missing/uncovered vertices as red THREE.Points (size 0.005).');
  console.log('These are eligible vertices (right bone label, in y-band) NOT inside selected triangles.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
