// C0 BEFORE SNAPSHOT
// For each gender and piece: count, bbox, hash of sorted triangle indices

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  sanitizeBoneName,
  findBodyMesh,
  computeLandmarks,
  resolveBoneSet,
  buildBoneSegments,
  labelVerticesByNearestBone,
  selectTriangles,
  clipTrianglesAtPlane,
  buildOffsetGeometry,
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

async function captureBaseline(bodyPath, contractPath) {
  const contract = JSON.parse(await fs.readFile(contractPath, 'utf8'));
  const gltf = await loadGLB(bodyPath);
  const skinnedMesh = findBodyMesh(gltf.scene);
  if (!skinnedMesh) throw new Error(`No SkinnedMesh found`);
  
  const geometry = skinnedMesh.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  
  const bodyBbox = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(contract, bodyBbox);
  const boneSegments = buildBoneSegments(contract);
  const vertexLabels = labelVerticesByNearestBone(geometry, boneSegments);
  
  const results = [];
  const pieces = ['top', 'bottom', 'shoes', 'gloves', 'wig'];
  
  for (const pieceName of pieces) {
    const pieceDef = costumePiecesData.pieces.find(p => p.id === pieceName);
    if (!pieceDef) {
      results.push({ piece: pieceName, error: 'No data' });
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
    
    // Apply clipping (matches test logic)
    if (pieceName === 'top' && yMin !== undefined) {
      selectedTriangles = clipTrianglesAtPlane(selectedTriangles, geometry, yMin, true);
    }
    if (pieceName === 'bottom' && yMax !== undefined) {
      selectedTriangles = clipTrianglesAtPlane(selectedTriangles, geometry, yMax, false);
    }
    if (pieceName === 'bottom' && yMin !== undefined) {
      selectedTriangles = clipTrianglesAtPlane(selectedTriangles, geometry, yMin, true);
    }
    if (pieceName === 'shoes' && yMax !== undefined) {
      selectedTriangles = clipTrianglesAtPlane(selectedTriangles, geometry, yMax, false);
    }
    if (pieceName === 'shoes' && yMin !== undefined) {
      selectedTriangles = clipTrianglesAtPlane(selectedTriangles, geometry, yMin, true);
    }
    if (pieceName === 'wig' && pieceDef.hairlineDrop) {
      const headTop = landmarks.head_top_y;
      const hairlineY = headTop - pieceDef.hairlineDrop;
      selectedTriangles = clipTrianglesAtPlane(selectedTriangles, geometry, hairlineY, false);
    }
    
    const triCount = selectedTriangles.length;
    
    // Compute bounding box from selected triangle vertices
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const triIdx of selectedTriangles) {
      for (let j = 0; j < 3; j++) {
        const vIdx = index.getX(triIdx * 3 + j);
        const x = position.getX(vIdx);
        const y = position.getY(vIdx);
        const z = position.getZ(vIdx);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
    }
    
    // Hash of sorted triangle indices
    const sortedIndices = [...selectedTriangles].sort((a, b) => a - b);
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(sortedIndices))
      .digest('hex')
      .slice(0, 8);
    
    results.push({
      piece: pieceName,
      triCount,
      bbox: {
        minX: minX.toFixed(6),
        minY: minY.toFixed(6),
        minZ: minZ.toFixed(6),
        maxX: maxX.toFixed(6),
        maxY: maxY.toFixed(6),
        maxZ: maxZ.toFixed(6)
      },
      hash
    });
  }
  
  return results;
}

async function main() {
  console.log('C0 BEFORE SNAPSHOT\n');
  
  console.log('=== MALE ===');
  const maleResults = await captureBaseline(
    path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'),
    path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json')
  );
  for (const r of maleResults) {
    if (r.error) {
      console.log(`${r.piece}: ${r.error}`);
    } else {
      console.log(`${r.piece}: ${r.triCount} tris, bbox [${r.bbox.minX},${r.bbox.minY},${r.bbox.minZ}] to [${r.bbox.maxX},${r.bbox.maxY},${r.bbox.maxZ}], hash ${r.hash}`);
    }
  }
  
  console.log('\n=== FEMALE ===');
  const femaleResults = await captureBaseline(
    path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'),
    path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json')
  );
  for (const r of femaleResults) {
    if (r.error) {
      console.log(`${r.piece}: ${r.error}`);
    } else {
      console.log(`${r.piece}: ${r.triCount} tris, bbox [${r.bbox.minX},${r.bbox.minY},${r.bbox.minZ}] to [${r.bbox.maxX},${r.bbox.maxY},${r.bbox.maxZ}], hash ${r.hash}`);
    }
  }
}

main().catch(console.error);
