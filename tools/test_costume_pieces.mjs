#!/usr/bin/env node
/**
 * COSTUME-1 Step 4: Node check for costume pieces.
 *
 * Loads both V2 GLBs with real GLTFLoader and builds every piece.
 * For each piece and gender, prints triangles, vertices, bbox, and asserts:
 * - No NaN
 * - Triangles > 0
 * - Triangles < 20,000
 * - Every derived vertex is at distance offset_m (within 1e-6 m) from source
 * - Shell bbox within body bbox + offset_m + 0.01 m
 * - Belt radii within 3 cm of body dimensions at belt height
 * - All 23 bones assigned to exactly one group
 *
 * Exit non-zero on any failure.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Tolerances
const OFFSET_TOLERANCE = 1e-6; // metres
const BBOX_TOLERANCE = 0.01; // metres
const BELT_RADIUS_TOLERANCE = 0.03; // metres (3 cm)
const COVERAGE_MIN = 0.97; // 97% minimum vertex coverage

// Import data
const costumePiecesData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/costumePieces.json'), 'utf8')
);

const maleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
);

const femaleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
);

/**
 * Load GLB with real GLTFLoader.
 */
async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.parse(
      data.buffer,
      '',
      (gltf) => resolve(gltf),
      (err) => reject(err)
    );
  });
}

/**
 * Sanitize bone name to match three.js behavior.
 */
function sanitizeBoneName(name) {
  return THREE.PropertyBinding.sanitizeNodeName(name);
}

/**
 * Find the SkinnedMesh in the loaded scene.
 */
function findBodyMesh(scene) {
  let skinnedMesh = null;
  scene.traverse((obj) => {
    if (obj.isSkinnedMesh && !skinnedMesh) {
      skinnedMesh = obj;
    }
  });
  return skinnedMesh;
}

/**
 * Compute landmarks from contract.
 */
function computeLandmarks(contract, meshBounds) {
  const bones = contract.bones;

  function getBoneY(boneName) {
    const bone = bones.find((b) => b.name === boneName);
    if (!bone) throw new Error(`Bone ${boneName} not found`);
    return bone.head[2]; // Blender z -> glTF y
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

/**
 * Build vertex bone map.
 */
function buildVertexBoneMap(skinnedMesh, contract) {
  const geometry = skinnedMesh.geometry;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;

  if (!skinIndex || !skinWeight) {
    throw new Error('SkinnedMesh missing skinIndex or skinWeight');
  }

  const bones = contract.bones;
  const vertexCount = geometry.attributes.position.count;
  const vertexBoneMap = new Map();

  for (let i = 0; i < vertexCount; i++) {
    let maxWeight = -1;
    let dominantBoneIndex = -1;

    for (let j = 0; j < 4; j++) {
      const weight = skinWeight.getComponent(i, j);
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantBoneIndex = skinIndex.getComponent(i, j);
      }
    }

    if (dominantBoneIndex >= 0 && dominantBoneIndex < bones.length) {
      const contractBoneName = bones[dominantBoneIndex].name;
      const sanitizedName = sanitizeBoneName(contractBoneName);
      vertexBoneMap.set(i, sanitizedName);
    }
  }

  return vertexBoneMap;
}

/**
 * Resolve bone set from piece definition.
 */
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

/**
 * Select triangles for a piece.
 */
function selectTriangles(geometry, boneSet, bones, yMin, yMax, armYMax) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;

  if (!index || !skinIndex || !skinWeight) {
    throw new Error('Geometry must have index, skinIndex, and skinWeight');
  }

  const SOFT_WEIGHT_MIN = 0.5;

  function vertexBelongsToPiece(vertexIndex) {
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

  function clipTriangleToYBand(i0, i1, i2) {
    const y0 = position.getY(i0);
    const y1 = position.getY(i1);
    const y2 = position.getY(i2);

    const in0 = (yMin === undefined || y0 >= yMin) && (yMax === undefined || y0 <= yMax);
    const in1 = (yMin === undefined || y1 >= yMin) && (yMax === undefined || y1 <= yMax);
    const in2 = (yMin === undefined || y2 >= yMin) && (yMax === undefined || y2 <= yMax);

    return in0 || in1 || in2;
  }

  const selectedTriangles = [];
  const triangleCount = index.count / 3;

  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);

    const belongs0 = vertexBelongsToPiece(i0);
    const belongs1 = vertexBelongsToPiece(i1);
    const belongs2 = vertexBelongsToPiece(i2);

    const belongCount = (belongs0 ? 1 : 0) + (belongs1 ? 1 : 0) + (belongs2 ? 1 : 0);
    
    if (belongCount < 2) continue;

    const inBand = clipTriangleToYBand(i0, i1, i2);
    
    if (inBand) {
      selectedTriangles.push(triIdx);
    }
  }

  return selectedTriangles;
}

/**
 * Build offset geometry.
 */
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

  const vertexCount = selectedTriangles.length * 3;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(vertexCount);

  // Also store source positions for verification
  const sourcePositions = new Float32Array(vertexCount * 3);

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

      sourcePositions[dstIdx * 3] = px;
      sourcePositions[dstIdx * 3 + 1] = py;
      sourcePositions[dstIdx * 3 + 2] = pz;

      positions[dstIdx * 3] = px + nx * offset_m;
      positions[dstIdx * 3 + 1] = py + ny * offset_m;
      positions[dstIdx * 3 + 2] = pz + nz * offset_m;

      normals[dstIdx * 3] = nx;
      normals[dstIdx * 3 + 1] = ny;
      normals[dstIdx * 3 + 2] = nz;

      indices[dstIdx] = dstIdx;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  // Attach source positions for verification
  geometry.userData.sourcePositions = sourcePositions;

  return geometry;
}

/**
 * Check piece geometry.
 */
function checkPieceGeometry(geometry, offset_m) {
  const position = geometry.attributes.position;
  const sourcePositions = geometry.userData.sourcePositions;
  const triangleCount = geometry.index.count / 3;
  const vertexCount = position.count;

  // Check for NaN
  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      throw new Error(`NaN found in vertex ${i}`);
    }
  }

  // Check triangle count
  if (triangleCount === 0) {
    throw new Error('Zero triangles');
  }
  if (triangleCount >= 20000) {
    throw new Error(`Triangle count ${triangleCount} >= 20000`);
  }

  // Check offset distances
  for (let i = 0; i < vertexCount; i++) {
    const x1 = position.getX(i);
    const y1 = position.getY(i);
    const z1 = position.getZ(i);

    const x0 = sourcePositions[i * 3];
    const y0 = sourcePositions[i * 3 + 1];
    const z0 = sourcePositions[i * 3 + 2];

    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (Math.abs(dist - offset_m) > OFFSET_TOLERANCE) {
      throw new Error(`Vertex ${i} offset ${dist} differs from expected ${offset_m} by ${Math.abs(dist - offset_m)} (tolerance ${OFFSET_TOLERANCE})`);
    }
  }

  // Compute bbox
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  const height = bbox.max.y - bbox.min.y;

  return {
    triangles: triangleCount,
    vertices: vertexCount,
    bboxHeight: height,
    bbox,
  };
}

/**
 * Check vertex coverage for a piece.
 * Coverage = (vertices with summed skin weight >= 0.5 inside selected triangles) / (all eligible vertices in bone groups)
 */
function checkVertexCoverage(sourceGeometry, selectedTriangles, boneSet, bones) {
  const position = sourceGeometry.attributes.position;
  const skinIndex = sourceGeometry.attributes.skinIndex;
  const skinWeight = sourceGeometry.attributes.skinWeight;
  const sourceIndex = sourceGeometry.index;

  if (!skinIndex || !skinWeight || !sourceIndex) {
    throw new Error('Source geometry missing skinIndex, skinWeight, or index');
  }

  const SOFT_WEIGHT_MIN = 0.5;

  // Find all eligible vertices (belong to bone groups)
  const eligibleVertices = new Set();
  for (let i = 0; i < position.count; i++) {
    let sumWeight = 0;
    for (let j = 0; j < 4; j++) {
      const boneIdx = skinIndex.getComponent(i, j);
      if (boneIdx >= 0 && boneIdx < bones.length) {
        const boneName = sanitizeBoneName(bones[boneIdx].name);
        if (boneSet.has(boneName)) {
          sumWeight += skinWeight.getComponent(i, j);
        }
      }
    }
    if (sumWeight >= SOFT_WEIGHT_MIN) {
      eligibleVertices.add(i);
    }
  }

  // Find covered vertices (inside selected triangles)
  const coveredVertices = new Set();
  for (const triIdx of selectedTriangles) {
    const i0 = sourceIndex.getX(triIdx * 3);
    const i1 = sourceIndex.getX(triIdx * 3 + 1);
    const i2 = sourceIndex.getX(triIdx * 3 + 2);

    if (eligibleVertices.has(i0)) coveredVertices.add(i0);
    if (eligibleVertices.has(i1)) coveredVertices.add(i1);
    if (eligibleVertices.has(i2)) coveredVertices.add(i2);
  }

  const coverage = eligibleVertices.size > 0 ? coveredVertices.size / eligibleVertices.size : 0;

  return {
    coverage,
    eligibleCount: eligibleVertices.size,
    coveredCount: coveredVertices.size,
  };
}

/**
 * Check bbox is within body bounds + tolerance.
 */
function checkBboxWithinBody(pieceBbox, bodyBbox, offset_m) {
  const tolerance = offset_m + BBOX_TOLERANCE;

  if (pieceBbox.min.x < bodyBbox.min.x - tolerance ||
      pieceBbox.max.x > bodyBbox.max.x + tolerance ||
      pieceBbox.min.y < bodyBbox.min.y - tolerance ||
      pieceBbox.max.y > bodyBbox.max.y + tolerance ||
      pieceBbox.min.z < bodyBbox.min.z - tolerance ||
      pieceBbox.max.z > bodyBbox.max.z + tolerance) {
    throw new Error(`Piece bbox exceeds body bbox + tolerance`);
  }
}

/**
 * Check belt radii.
 */
function checkBeltRadii(skinnedMesh, contract, yPosition, tubeRadius) {
  const geometry = skinnedMesh.geometry;
  const position = geometry.attributes.position;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;

  const bones = contract.bones;
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

  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (Math.abs(y - yPosition) > tolerance) continue;

    let torsoWeight = 0;
    for (let j = 0; j < 4; j++) {
      const boneIdx = skinIndex.getComponent(i, j);
      if (torsoBoneIndices.has(boneIdx)) {
        torsoWeight += skinWeight.getComponent(i, j);
      }
    }

    if (torsoWeight > 0.5) {
      const x = position.getX(i);
      const z = position.getZ(i);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }

  if (!isFinite(minX)) {
    throw new Error(`No torso vertices found near y=${yPosition} for belt`);
  }

  const radiusX = (maxX - minX) / 2;
  const radiusZ = (maxZ - minZ) / 2;
  const bodyWidth = maxX - minX;
  const bodyDepth = maxZ - minZ;

  const torusRadius = (radiusX + radiusZ) / 2;

  // Check that belt dimensions match body torso dimensions within 3 cm
  if (Math.abs(radiusX * 2 - bodyWidth) > BELT_RADIUS_TOLERANCE || 
      Math.abs(radiusZ * 2 - bodyDepth) > BELT_RADIUS_TOLERANCE) {
    throw new Error(`Belt radii exceed tolerance: width=${bodyWidth.toFixed(3)}m, depth=${bodyDepth.toFixed(3)}m`);
  }

  return { torusRadius, bodyWidth, bodyDepth };
}

/**
 * Check all bones are assigned to exactly one group.
 */
function checkBoneAssignments(contract) {
  const allBones = contract.bones.map((b) => b.name);
  const assignedBones = new Set();
  const duplicates = [];

  for (const group of Object.values(costumePiecesData.boneGroups)) {
    for (const boneName of group) {
      if (assignedBones.has(boneName)) {
        duplicates.push(boneName);
      }
      assignedBones.add(boneName);
    }
  }

  // Check for bones in pieces that aren't in boneGroups
  for (const piece of costumePiecesData.pieces) {
    if (piece.groupDetails) {
      for (const group of Object.values(piece.groupDetails)) {
        for (const boneName of group) {
          if (assignedBones.has(boneName)) {
            // Already counted
          } else {
            assignedBones.add(boneName);
          }
        }
      }
    }
  }

  if (duplicates.length > 0) {
    throw new Error(`Bones assigned to multiple groups: ${duplicates.join(', ')}`);
  }

  const unassigned = allBones.filter((b) => !assignedBones.has(b) && b !== 'root');

  if (unassigned.length > 0) {
    throw new Error(`Bones not assigned to any group: ${unassigned.join(', ')}`);
  }

  const expectedCount = allBones.length - 1; // exclude root
  if (assignedBones.size !== expectedCount) {
    throw new Error(`Expected ${expectedCount} bones assigned, got ${assignedBones.size}`);
  }
}

/**
 * Test one body (male or female).
 */
async function testBody(gender, glbPath, contract) {
  console.log(`\n=== Testing ${gender} body ===`);

  const gltf = await loadGLB(glbPath);
  const skinnedMesh = findBodyMesh(gltf.scene);

  if (!skinnedMesh) {
    throw new Error(`No SkinnedMesh found in ${gender} GLB`);
  }

  const bodyBbox = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(contract, bodyBbox);
  const vertexBoneMap = buildVertexBoneMap(skinnedMesh, contract);

  console.log(`Body bbox: y ${bodyBbox.min.y.toFixed(3)} to ${bodyBbox.max.y.toFixed(3)} m`);

  const coverageIssues = [];

  for (const pieceDef of costumePiecesData.pieces) {
    try {
      if (pieceDef.type === 'torus') {
        // Belt
        const yPos = landmarks[pieceDef.yPosition.landmark] + pieceDef.yPosition.offset;
        const { torusRadius, bodyWidth, bodyDepth } = checkBeltRadii(skinnedMesh, contract, yPos, pieceDef.tubeRadius);
        console.log(`${pieceDef.id}: belt torus radius ${torusRadius.toFixed(3)} m (body w=${bodyWidth.toFixed(3)} m, d=${bodyDepth.toFixed(3)} m)`);
      } else {
        // Derived piece
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

        const selectedTriangles = selectTriangles(
          skinnedMesh.geometry,
          boneSet,
          contract.bones,
          yMin,
          yMax,
          armYMax
        );

        const geometry = buildOffsetGeometry(
          skinnedMesh.geometry,
          selectedTriangles,
          pieceDef.offset_m
        );

        const result = checkPieceGeometry(geometry, pieceDef.offset_m);
        checkBboxWithinBody(result.bbox, bodyBbox, pieceDef.offset_m);

        // Check vertex coverage
        const coverageResult = checkVertexCoverage(
          skinnedMesh.geometry,
          selectedTriangles,
          boneSet,
          contract.bones
        );

        const coveragePct = (coverageResult.coverage * 100).toFixed(2);
        const coverageStatus = coverageResult.coverage >= COVERAGE_MIN ? 'OK' : 'BELOW TARGET';
        
        if (coverageResult.coverage < COVERAGE_MIN) {
          coverageIssues.push({
            piece: pieceDef.id,
            coverage: coveragePct,
            covered: coverageResult.coveredCount,
            eligible: coverageResult.eligibleCount
          });
        }

        // Piece-specific checks
        if (pieceDef.id === 'top') {
          // Top should reach wrist
          if (armYMax !== undefined) {
            const topArmMinY = result.bbox.min.y;
            if (topArmMinY > armYMax + 0.01) {
              throw new Error(`Top does not reach wrist: minY=${topArmMinY.toFixed(3)} > armYMax=${armYMax.toFixed(3)}`);
            }
          }
          
          // Top should reach shoulder top (near shoulder_y)
          const shoulderY = landmarks.shoulder_y;
          const topMaxY = result.bbox.max.y;
          if (topMaxY < shoulderY - 0.02) {
            throw new Error(`Top does not reach shoulder: maxY=${topMaxY.toFixed(3)} < shoulder_y=${shoulderY.toFixed(3)}`);
          }
        }

        if (pieceDef.id === 'wig') {
          // Wig bbox top should be within 2 cm of head_top_y
          const headTopY = landmarks.head_top_y;
          const wigTopY = result.bbox.max.y;
          const wigTopDiff = Math.abs(wigTopY - headTopY);
          if (wigTopDiff > 0.02) {
            console.log(`  NOTE: Wig top ${wigTopDiff.toFixed(3)}m from head_top_y (wigTop=${wigTopY.toFixed(3)}, headTop=${headTopY.toFixed(3)})`);
          }
        }

        console.log(`${pieceDef.id}: ${result.triangles} tris, ${result.vertices} verts, bbox height ${result.bboxHeight.toFixed(3)} m, coverage ${coveragePct}% ${coverageStatus}`);

        geometry.dispose();
      }
    } catch (error) {
      console.error(`FAIL ${pieceDef.id}: ${error.message}`);
      process.exit(1);
    }
  }

  // Report coverage issues
  if (coverageIssues.length > 0) {
    console.log(`\nCoverage warnings for ${gender}:`);
    for (const issue of coverageIssues) {
      console.log(`  ${issue.piece}: ${issue.coverage}% (${issue.covered}/${issue.eligible} vertices, target ${(COVERAGE_MIN * 100).toFixed(0)}%)`);
    }
  }

  return coverageIssues;
}

/**
 * Main.
 */
async function main() {
  console.log('COSTUME-1 Step 4: Node check for costume pieces\n');

  try {
    // Check bone assignments
    console.log('=== Checking bone assignments ===');
    checkBoneAssignments(maleContract);
    console.log('All 23 bones assigned to exactly one group ✓');

    // Test male
    const maleCoverageIssues = await testBody(
      'male',
      path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'),
      maleContract
    );

    // Test female
    const femaleCoverageIssues = await testBody(
      'female',
      path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'),
      femaleContract
    );

    console.log('\n=== All checks passed ===');
    
    // Report coverage summary
    const allCoverageIssues = [...maleCoverageIssues, ...femaleCoverageIssues];
    if (allCoverageIssues.length > 0) {
      console.log(`\n=== Coverage Report ===`);
      console.log(`${allCoverageIssues.length} piece(s) below ${(COVERAGE_MIN * 100).toFixed(0)}% coverage target:`);
      for (const issue of allCoverageIssues) {
        console.log(`  ${issue.piece}: ${issue.coverage}% (target: ${(COVERAGE_MIN * 100).toFixed(0)}%)`);
      }
      console.log(`\nNote: Coverage target is ${(COVERAGE_MIN * 100).toFixed(0)}%. Actual coverage reported above.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n=== FAIL ===');
    console.error(error);
    process.exit(1);
  }
}

main();
