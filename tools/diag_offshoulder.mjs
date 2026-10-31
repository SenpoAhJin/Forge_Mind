#!/usr/bin/env node
/**
 * COSTUME-9B Part B: Off-shoulder diagnostic
 * 
 * Analyzes off-shoulder cut for both genders:
 * - Shoulder landmark measurements
 * - Triangle counts crew vs off_shoulder
 * - Removed triangles by bone label
 * - Arm-side max Y positions
 * - ASCII occupancy grid of shoulder region
 * 
 * Run with: node --import tsx tools/diag_offshoulder.mjs
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  findBodyMesh,
  computeLandmarks,
  selectPieceTriangles,
} from '../src/utils/costumeBuilder.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const costumePiecesData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/costumePieces.json'), 'utf8')
);

const costumeStyles = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/costumeStyles.json'), 'utf8')
);

const bodyProfileData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/bodyProfile.generated.json'), 'utf8')
);

async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(data.buffer, '', (gltf) => resolve(gltf), (err) => reject(err));
  });
}

function sanitizeBoneName(name) {
  return name.replace(/\./g, '_');
}

function resolveBoneSet(pieceDef) {
  const boneSet = new Set();
  if (pieceDef.groupDetails) {
    for (const boneList of Object.values(pieceDef.groupDetails)) {
      for (const bone of boneList) {
        boneSet.add(sanitizeBoneName(bone));
      }
    }
  }
  return boneSet;
}

function distanceToSegment(point, segmentStart, segmentEnd) {
  const segment = new THREE.Vector3().subVectors(segmentEnd, segmentStart);
  const toPoint = new THREE.Vector3().subVectors(point, segmentStart);
  
  const t = Math.max(0, Math.min(1, toPoint.dot(segment) / segment.dot(segment)));
  const projection = new THREE.Vector3().copy(segmentStart).add(segment.multiplyScalar(t));
  
  return point.distanceTo(projection);
}

async function diagnoseGender(gender, glbPath, contractPath) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`GENDER: ${gender.toUpperCase()}`);
  console.log('='.repeat(60));

  const gltf = await loadGLB(glbPath);
  const skinnedMesh = findBodyMesh(gltf.scene);
  const geometry = skinnedMesh.geometry;
  const skeleton = skinnedMesh.skeleton;
  
  const contract = JSON.parse(await fs.readFile(contractPath, 'utf8'));
  
  geometry.computeBoundingBox();
  const meshBounds = geometry.boundingBox;
  
  const landmarks = computeLandmarks(contract, meshBounds);

  const topPiece = costumePiecesData.pieces.find(p => p.id === 'top');
  if (!topPiece) throw new Error('top piece not found');
  
  // Build bone set from piece groupDetails
  const boneSet = resolveBoneSet(topPiece);
  
  // Build bone segments map
  const boneSegments = new Map();
  for (const bone of skeleton.bones) {
    const sanitized = sanitizeBoneName(bone.name);
    const head = new THREE.Vector3();
    const tail = new THREE.Vector3();
    bone.getWorldPosition(head);
    
    if (bone.children.length > 0) {
      bone.children[0].getWorldPosition(tail);
    } else {
      tail.copy(head).add(new THREE.Vector3(0, 0.05, 0));
    }
    
    boneSegments.set(sanitized, { head, tail });
  }

  // Get landmarks
  const shoulder_y = landmarks.shoulder_y;
  const neck_y = landmarks.neck_y;
  const config = costumeStyles.config;
  const cutoffY = landmarks[config.offShoulderCutoffY.landmark] + config.offShoulderCutoffY.offset;
  
  console.log(`\nLANDMARKS:`);
  console.log(`  shoulder_y: ${shoulder_y.toFixed(4)} m`);
  console.log(`  neck_y:     ${neck_y.toFixed(4)} m`);
  console.log(`  configured cutoff: neck_y + ${config.offShoulderCutoffY.offset} = ${cutoffY.toFixed(4)} m`);
  
  // Select triangles for both styles
  const crewTris = selectPieceTriangles(
    geometry,
    topPiece,
    boneSet,
    boneSegments,
    landmarks,
    { sleeve: 'long', neckline: 'crew' }
  );
  
  const offShoulderTris = selectPieceTriangles(
    geometry,
    topPiece,
    boneSet,
    boneSegments,
    landmarks,
    { sleeve: 'long', neckline: 'off_shoulder' }
  );
  
  console.log(`\nTRIANGLE COUNTS:`);
  console.log(`  crew:        ${crewTris.length} triangles`);
  console.log(`  off_shoulder: ${offShoulderTris.length} triangles`);
  console.log(`  removed:     ${crewTris.length - offShoulderTris.length} triangles (${((crewTris.length - offShoulderTris.length) / crewTris.length * 100).toFixed(2)}%)`);
  
  // Analyze removed triangles by bone label
  const position = geometry.attributes.position;
  const index = geometry.index;
  
  const crewSet = new Set(crewTris);
  const offShoulderSet = new Set(offShoulderTris);
  const removedTris = Array.from(crewSet).filter(t => !offShoulderSet.has(t));
  
  const removedByBone = new Map();
  const centroid = new THREE.Vector3();
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  
  for (const triIdx of removedTris) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    
    // Find nearest bone
    let nearestBone = '';
    let nearestDist = Infinity;
    
    for (const [boneName, segment] of boneSegments) {
      const dist = distanceToSegment(centroid, segment.head, segment.tail);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBone = boneName;
      }
    }
    
    removedByBone.set(nearestBone, (removedByBone.get(nearestBone) || 0) + 1);
  }
  
  console.log(`\nREMOVED TRIANGLES BY BONE LABEL:`);
  const sortedBones = Array.from(removedByBone.entries()).sort((a, b) => b[1] - a[1]);
  for (const [bone, count] of sortedBones) {
    console.log(`  ${bone.padEnd(20)}: ${count.toString().padStart(3)} triangles`);
  }
  
  // Get chest half-width for arm-side detection - use torso slice at shoulder height
  const profile = bodyProfileData.profiles[gender];
  const shoulderSlice = profile.torsoSlices.reduce((prev, curr) => 
    Math.abs(curr.y - shoulder_y) < Math.abs(prev.y - shoulder_y) ? curr : prev
  );
  const chestHalfWidth = (shoulderSlice.maxX - shoulderSlice.minX) / 2 * 0.5; // 50% to capture arm-side
  
  console.log(`\nCHEST DIMENSIONS AT SHOULDER HEIGHT:`);
  console.log(`  slice Y: ${shoulderSlice.y.toFixed(4)} m (nearest to shoulder_y=${shoulder_y.toFixed(4)})`);
  console.log(`  width: ${(shoulderSlice.maxX - shoulderSlice.minX).toFixed(4)} m`);
  console.log(`  chest half-width threshold: ${chestHalfWidth.toFixed(4)} m`);
  console.log(`\nARM-SIDE TRIANGLES (|x| > ${chestHalfWidth.toFixed(3)} m):`);
  
  // Compute max Y for arm-side triangles in both styles
  function getArmSideMaxY(tris) {
    let maxY = -Infinity;
    let count = 0;
    
    for (const triIdx of tris) {
      const i0 = index.getX(triIdx * 3);
      const i1 = index.getX(triIdx * 3 + 1);
      const i2 = index.getX(triIdx * 3 + 2);
      
      v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
      v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
      v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
      
      centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
      
      if (Math.abs(centroid.x) > chestHalfWidth) {
        maxY = Math.max(maxY, v0.y, v1.y, v2.y);
        count++;
      }
    }
    
    return { maxY, count };
  }
  
  const crewArmSide = getArmSideMaxY(crewTris);
  const offShoulderArmSide = getArmSideMaxY(offShoulderTris);
  
  console.log(`  crew arm-side max Y:        ${crewArmSide.maxY.toFixed(4)} m (${crewArmSide.count} triangles)`);
  console.log(`  off_shoulder arm-side max Y: ${offShoulderArmSide.maxY.toFixed(4)} m (${offShoulderArmSide.count} triangles)`);
  console.log(`  cutoff Y:                   ${cutoffY.toFixed(4)} m`);
  
  if (offShoulderArmSide.maxY > cutoffY) {
    console.log(`  ⚠️  OFF-SHOULDER ARM-SIDE EXTENDS ABOVE CUTOFF BY ${((offShoulderArmSide.maxY - cutoffY) * 1000).toFixed(1)} mm`);
  } else {
    console.log(`  ✓ Off-shoulder arm-side stays at or below cutoff`);
  }
  
  // ASCII occupancy grid (shoulder region front view)
  console.log(`\nASCII OCCUPANCY GRID (shoulder region, front view):`);
  
  const gridWidth = 40;
  const gridHeight = 25;
  const yMin = cutoffY - 0.05;
  const yMax = neck_y + 0.15;
  const xMin = -0.25;
  const xMax = 0.25;
  
  function makeGrid(tris, label) {
    const grid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(' '));
    
    for (const triIdx of tris) {
      const i0 = index.getX(triIdx * 3);
      const i1 = index.getX(triIdx * 3 + 1);
      const i2 = index.getX(triIdx * 3 + 2);
      
      for (const i of [i0, i1, i2]) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        
        // Only front-facing vertices (z > 0)
        if (z <= 0) continue;
        
        if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
          const col = Math.floor((x - xMin) / (xMax - xMin) * gridWidth);
          const row = gridHeight - 1 - Math.floor((y - yMin) / (yMax - yMin) * gridHeight);
          
          if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
            grid[row][col] = '█';
          }
        }
      }
    }
    
    console.log(`\n  ${label}:`);
    console.log(`  Y=${yMax.toFixed(3)}`);
    console.log('  ' + '─'.repeat(gridWidth + 2));
    for (const row of grid) {
      console.log('  │' + row.join('') + '│');
    }
    console.log('  ' + '─'.repeat(gridWidth + 2));
    console.log(`  Y=${yMin.toFixed(3)}`);
    console.log(`    X=${xMin.toFixed(2)}${' '.repeat(gridWidth - 13)}X=${xMax.toFixed(2)}`);
    console.log(`    Cutoff Y=${cutoffY.toFixed(3)} should show bare shoulders`);
  }
  
  makeGrid(crewTris, 'CREW (baseline)');
  makeGrid(offShoulderTris, 'OFF_SHOULDER (should have bare shoulder caps)');
  
  gltf.scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
}

async function main() {
  console.log('COSTUME-9B Part B: Off-shoulder Diagnostic');
  console.log('='.repeat(60));
  
  await diagnoseGender(
    'male',
    path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'),
    path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json')
  );
  
  await diagnoseGender(
    'female',
    path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'),
    path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json')
  );
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
