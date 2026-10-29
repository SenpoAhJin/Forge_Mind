/**
 * Runtime costume piece builder.
 *
 * Builds garment pieces from the V2 body mesh at runtime by:
 * 1. Finding triangles whose vertices belong to specified bone groups and y-bands
 * 2. Offsetting vertices along their normals
 * 3. Creating a new mesh with the offset geometry
 *
 * NO ASSET PIPELINE. Pieces are derived on-demand from the loaded body geometry.
 */

import * as THREE from 'three';

// Tolerances
const OFFSET_TOLERANCE = 1e-6; // metres

export interface LandmarkDef {
  landmark: string;
  offset: number;
}

export interface PieceDefinition {
  id: string;
  slot: string;
  groups?: string[];
  groupDetails?: Record<string, string[]>;
  yMin?: LandmarkDef;
  yMax?: LandmarkDef;
  armYMax?: LandmarkDef;
  offset_m: number;
  defaultColor: string;
  defaultEnabled: boolean;
  type?: string;
  yPosition?: LandmarkDef;
  tubeRadius?: number;
}

export interface BoneGroupsDefinition {
  [groupName: string]: string[];
}

export interface CostumePiecesData {
  boneGroups: BoneGroupsDefinition;
  pieces: PieceDefinition[];
  colorPresets: string[];
}

export interface Landmarks {
  floor: number;
  hip_y: number;
  knee_y: number;
  ankle_y: number;
  shoulder_y: number;
  elbow_y: number;
  wrist_y: number;
  neck_y: number;
  head_top_y: number;
}

interface CachedPiece {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
}

// Memoization cache: bodyUUID -> pieceId -> CachedPiece
const pieceCache = new Map<string, Map<string, CachedPiece>>();

/**
 * Sanitize bone name to match three.js GLTFLoader behavior.
 * Dots are removed: "foot.L" becomes "footL"
 */
function sanitizeBoneName(name: string): string {
  return THREE.PropertyBinding.sanitizeNodeName(name);
}

/**
 * Find the SkinnedMesh in the loaded body scene.
 */
export function findBodyMesh(bodyScene: THREE.Object3D): THREE.SkinnedMesh | null {
  let skinnedMesh: THREE.SkinnedMesh | null = null;
  bodyScene.traverse((obj) => {
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh && !skinnedMesh) {
      skinnedMesh = obj as THREE.SkinnedMesh;
    }
  });
  return skinnedMesh;
}

/**
 * Compute landmarks from contract bone positions and mesh bounds.
 * Contract bones are in Blender coords (x, y, z), convert to glTF (x, z, -y).
 */
export function computeLandmarks(
  contract: any,
  meshBounds: THREE.Box3
): Landmarks {
  const bones = contract.bones as Array<{ name: string; head: [number, number, number] }>;
  
  function getBoneY(boneName: string): number {
    const bone = bones.find((b) => b.name === boneName);
    if (!bone) throw new Error(`Bone ${boneName} not found in contract`);
    // Blender (x, y, z) -> glTF (x, z, -y), so y_gltf = z_blender
    return bone.head[2];
  }

  return {
    floor: 0,
    hip_y: getBoneY('thigh.L'), // thigh head
    knee_y: getBoneY('shin.L'), // shin head
    ankle_y: getBoneY('foot.L'), // foot head
    shoulder_y: getBoneY('upperarm.L'), // upperarm head
    elbow_y: getBoneY('forearm.L'), // forearm head
    wrist_y: getBoneY('hand.L'), // hand head
    neck_y: getBoneY('neck'), // neck head
    head_top_y: meshBounds.max.y,
  };
}

/**
 * Build a map from vertex index to its dominant bone name (sanitized).
 */
export function buildVertexBoneMap(
  skinnedMesh: THREE.SkinnedMesh,
  contract: any
): Map<number, string> {
  const geometry = skinnedMesh.geometry;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;
  
  if (!skinIndex || !skinWeight) {
    throw new Error('SkinnedMesh missing skinIndex or skinWeight attributes');
  }

  const bones = contract.bones as Array<{ name: string }>;
  const vertexCount = geometry.attributes.position.count;
  const vertexBoneMap = new Map<number, string>();

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
 * Resolve bone groups into a Set of sanitized bone names.
 */
function resolveBoneSet(
  pieceDef: PieceDefinition,
  data: CostumePiecesData
): Set<string> {
  const boneSet = new Set<string>();
  
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
 * Select triangles whose three vertices all belong to the piece's bone groups
 * and fall within the y-band.
 */
function selectTriangles(
  geometry: THREE.BufferGeometry,
  vertexBoneMap: Map<number, string>,
  boneSet: Set<string>,
  yMin: number | undefined,
  yMax: number | undefined,
  armYMax?: number | undefined
): number[] {
  const position = geometry.attributes.position;
  const index = geometry.index;
  
  if (!index) {
    throw new Error('Geometry must have an index');
  }

  const selectedTriangles: number[] = [];
  const triangleCount = index.count / 3;

  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);

    const bone0 = vertexBoneMap.get(i0);
    const bone1 = vertexBoneMap.get(i1);
    const bone2 = vertexBoneMap.get(i2);

    // All three vertices must have bones in the set
    if (!bone0 || !bone1 || !bone2) continue;
    if (!boneSet.has(bone0) || !boneSet.has(bone1) || !boneSet.has(bone2)) continue;

    // Check y-band
    const y0 = position.getY(i0);
    const y1 = position.getY(i1);
    const y2 = position.getY(i2);

    let inBand = true;

    // Special handling for arms with armYMax
    const isArm = bone0.includes('arm') || bone1.includes('arm') || bone2.includes('arm');
    const isHand = bone0.includes('hand') || bone1.includes('hand') || bone2.includes('hand');
    
    if (isArm && !isHand && armYMax !== undefined) {
      // Arm vertices use armYMax instead of yMax
      if (yMin !== undefined && (y0 < yMin || y1 < yMin || y2 < yMin)) inBand = false;
      if (armYMax !== undefined && (y0 > armYMax || y1 > armYMax || y2 > armYMax)) inBand = false;
    } else {
      if (yMin !== undefined && (y0 < yMin || y1 < yMin || y2 < yMin)) inBand = false;
      if (yMax !== undefined && (y0 > yMax || y1 > yMax || y2 > yMax)) inBand = false;
    }

    if (inBand) {
      selectedTriangles.push(triIdx);
    }
  }

  return selectedTriangles;
}

/**
 * Build offset geometry from selected triangles.
 * Offsets each vertex along its normal by offset_m.
 */
function buildOffsetGeometry(
  sourceGeometry: THREE.BufferGeometry,
  selectedTriangles: number[],
  offset_m: number
): THREE.BufferGeometry {
  if (selectedTriangles.length === 0) {
    throw new Error('No triangles selected for piece');
  }

  const sourcePosition = sourceGeometry.attributes.position;
  const sourceIndex = sourceGeometry.index!;
  let sourceNormal = sourceGeometry.attributes.normal;

  // Compute normals if missing
  if (!sourceNormal) {
    sourceGeometry.computeVertexNormals();
    sourceNormal = sourceGeometry.attributes.normal;
  }

  // Build new geometry
  const vertexCount = selectedTriangles.length * 3;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(vertexCount);

  for (let i = 0; i < selectedTriangles.length; i++) {
    const triIdx = selectedTriangles[i];
    
    for (let j = 0; j < 3; j++) {
      const srcIdx = sourceIndex.getX(triIdx * 3 + j);
      const dstIdx = i * 3 + j;

      // Copy and offset position
      const px = sourcePosition.getX(srcIdx);
      const py = sourcePosition.getY(srcIdx);
      const pz = sourcePosition.getZ(srcIdx);

      const nx = sourceNormal.getX(srcIdx);
      const ny = sourceNormal.getY(srcIdx);
      const nz = sourceNormal.getZ(srcIdx);

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

  return geometry;
}

/**
 * Build a torus (belt) at the specified y position.
 * Radii measured from body vertices at that height.
 */
export function buildBeltGeometry(
  skinnedMesh: THREE.SkinnedMesh,
  yPosition: number,
  tubeRadius: number
): THREE.BufferGeometry {
  const geometry = skinnedMesh.geometry;
  const position = geometry.attributes.position;

  // Find vertices near yPosition
  const tolerance = 0.05; // metres
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (Math.abs(y - yPosition) < tolerance) {
      const x = position.getX(i);
      const z = position.getZ(i);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }

  if (!isFinite(minX)) {
    throw new Error(`No vertices found near y=${yPosition} for belt`);
  }

  const radiusX = (maxX - minX) / 2;
  const radiusZ = (maxZ - minZ) / 2;

  // Create torus with elliptical cross-section approximation
  // Use average radius for now (proper ellipse would need custom geometry)
  const radius = (radiusX + radiusZ) / 2;

  const torusGeometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 32);
  
  // Rotate to horizontal plane and position at yPosition
  torusGeometry.rotateX(Math.PI / 2);
  torusGeometry.translate(0, yPosition, 0);

  return torusGeometry;
}

/**
 * Build a costume piece mesh.
 * Returns a cached mesh if available, otherwise builds and caches it.
 */
export function buildCostumePiece(
  bodyScene: THREE.Object3D,
  contract: any,
  pieceDef: PieceDefinition,
  data: CostumePiecesData,
  color?: string
): THREE.Mesh {
  const skinnedMesh = findBodyMesh(bodyScene);
  if (!skinnedMesh) {
    throw new Error('No SkinnedMesh found in body scene');
  }

  const bodyUUID = skinnedMesh.uuid;
  const pieceId = pieceDef.id;

  // Check cache
  if (!pieceCache.has(bodyUUID)) {
    pieceCache.set(bodyUUID, new Map());
  }
  const bodyCache = pieceCache.get(bodyUUID)!;

  if (bodyCache.has(pieceId)) {
    const cached = bodyCache.get(pieceId)!;
    if (color) {
      cached.material.color.set(color);
    }
    return cached.mesh;
  }

  // Build new piece
  let geometry: THREE.BufferGeometry;

  if (pieceDef.type === 'torus' && pieceDef.yPosition && pieceDef.tubeRadius) {
    // Belt
    const landmarks = computeLandmarks(contract, new THREE.Box3().setFromObject(skinnedMesh));
    const yPos = landmarks[pieceDef.yPosition.landmark as keyof Landmarks] + pieceDef.yPosition.offset;
    geometry = buildBeltGeometry(skinnedMesh, yPos, pieceDef.tubeRadius);
  } else {
    // Derived piece
    const meshBounds = new THREE.Box3().setFromObject(skinnedMesh);
    const landmarks = computeLandmarks(contract, meshBounds);
    const vertexBoneMap = buildVertexBoneMap(skinnedMesh, contract);
    const boneSet = resolveBoneSet(pieceDef, data);

    let yMin: number | undefined;
    let yMax: number | undefined;
    let armYMax: number | undefined;

    if (pieceDef.yMin) {
      yMin = landmarks[pieceDef.yMin.landmark as keyof Landmarks] + pieceDef.yMin.offset;
    }
    if (pieceDef.yMax) {
      yMax = landmarks[pieceDef.yMax.landmark as keyof Landmarks] + pieceDef.yMax.offset;
    }
    if (pieceDef.armYMax) {
      armYMax = landmarks[pieceDef.armYMax.landmark as keyof Landmarks] + pieceDef.armYMax.offset;
    }

    const selectedTriangles = selectTriangles(
      skinnedMesh.geometry,
      vertexBoneMap,
      boneSet,
      yMin,
      yMax,
      armYMax
    );

    if (selectedTriangles.length === 0) {
      throw new Error(`Piece ${pieceId}: no triangles selected (groups: ${Array.from(boneSet).join(', ')})`);
    }

    geometry = buildOffsetGeometry(skinnedMesh.geometry, selectedTriangles, pieceDef.offset_m);
  }

  const material = new THREE.MeshStandardMaterial({
    color: color || pieceDef.defaultColor,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Cache
  bodyCache.set(pieceId, { mesh, geometry, material });

  return mesh;
}

/**
 * Change the color of a cached piece without rebuilding geometry.
 */
export function setPieceColor(
  bodyScene: THREE.Object3D,
  pieceId: string,
  color: string
): void {
  const skinnedMesh = findBodyMesh(bodyScene);
  if (!skinnedMesh) return;

  const bodyCache = pieceCache.get(skinnedMesh.uuid);
  if (!bodyCache) return;

  const cached = bodyCache.get(pieceId);
  if (cached) {
    cached.material.color.set(color);
  }
}

/**
 * Dispose all cached pieces for a body.
 */
export function disposeCachedPieces(bodyScene: THREE.Object3D): void {
  const skinnedMesh = findBodyMesh(bodyScene);
  if (!skinnedMesh) return;

  const bodyCache = pieceCache.get(skinnedMesh.uuid);
  if (bodyCache) {
    for (const cached of bodyCache.values()) {
      cached.geometry.dispose();
      cached.material.dispose();
    }
    pieceCache.delete(skinnedMesh.uuid);
  }
}

/**
 * Clear all caches (useful for testing).
 */
export function clearAllCaches(): void {
  for (const bodyCache of pieceCache.values()) {
    for (const cached of bodyCache.values()) {
      cached.geometry.dispose();
      cached.material.dispose();
    }
  }
  pieceCache.clear();
}
