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
import costumeStyles from '../data/costumeStyles.json' with { type: 'json' };

// Tolerances
const OFFSET_TOLERANCE = 1e-6; // metres

export interface LandmarkDef {
  landmark: string;
  offset: number;
}

export interface ClipDef {
  groups: string[]; // ["*"] means all groups
  landmark: string;
  offset: number;
  slope_z?: number; // Optional slant: y(z) = landmark + offset + slope_z*(z - z_ref)
  z_ref?: string; // "head_bone" etc, bone name whose head.z is the reference
  keep: "above" | "below";
}

export interface PieceDefinition {
  id: string;
  slot: string;
  selection?: "band" | undefined; // "band" = all triangles in region, no bone labels/closure
  groups?: string[];
  groupDetails?: Record<string, string[]>;
  yMin?: LandmarkDef; // Legacy, superseded by clips
  yMax?: LandmarkDef; // Legacy, superseded by clips
  armYMax?: LandmarkDef; // Legacy, superseded by clips
  clips?: ClipDef[];
  hairlineDrop?: number; // For wig: distance below head_top_y for front hairline
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

export interface PieceStyle {
  style?: Record<string, string>;
  colorTip?: string;
}

// Memoization cache: bodyUUID -> cacheKey -> CachedPiece
// cacheKey = pieceId + JSON.stringify(style)
const pieceCache = new Map<string, Map<string, CachedPiece>>();

function getCacheKey(pieceId: string, style?: Record<string, string>): string {
  if (!style || Object.keys(style).length === 0) {
    return pieceId;
  }
  return `${pieceId}:${JSON.stringify(style)}`;
}

/**
 * Sanitize bone name to match three.js GLTFLoader behavior.
 * Dots are removed: "foot.L" becomes "footL"
 */
export function sanitizeBoneName(name: string): string {
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
export function resolveBoneSet(
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
 * Unified piece selection pipeline.
 * This is the ONE pipeline used by both the app (buildCostumePiece) and tests.
 * 
 * Steps:
 * 1. Convert clips to yMin/yMax (or use legacy yMin/yMax)
 * 2. Apply style modifications (sleeve length, neckline, bottom length/shape)
 * 3. selectTriangles with bone labels and y-band filtering
 * 4. clipTrianglesAtPlane for specific pieces (e.g., top hem)
 * 5. Return selected triangle indices
 */
export function selectPieceTriangles(
  geometry: THREE.BufferGeometry,
  pieceDef: PieceDefinition,
  boneSet: Set<string>,
  boneSegments: Map<string, { head: THREE.Vector3; tail: THREE.Vector3 }>,
  landmarks: Landmarks,
  style?: Record<string, string>
): number[] {
  let yMin: number | undefined;
  let yMax: number | undefined;
  let armYMax: number | undefined;

  // Support both clips and legacy yMin/yMax
  if (pieceDef.clips && pieceDef.clips.length > 0) {
    // Convert clips to yMin/yMax
    for (const clip of pieceDef.clips) {
      if (clip.groups.includes("*")) {
        const clipY = landmarks[clip.landmark as keyof Landmarks] + clip.offset;
        if (clip.keep === "above" && (yMin === undefined || clipY > yMin)) {
          yMin = clipY;
        } else if (clip.keep === "below" && (yMax === undefined || clipY < yMax)) {
          yMax = clipY;
        }
      }
    }
  } else {
    // Legacy path
    if (pieceDef.yMin) {
      yMin = landmarks[pieceDef.yMin.landmark as keyof Landmarks] + pieceDef.yMin.offset;
    }
    if (pieceDef.yMax) {
      yMax = landmarks[pieceDef.yMax.landmark as keyof Landmarks] + pieceDef.yMax.offset;
    }
  }
  
  if (pieceDef.armYMax) {
    armYMax = landmarks[pieceDef.armYMax.landmark as keyof Landmarks] + pieceDef.armYMax.offset;
  }

  // Apply style modifications
  const config = (costumeStyles as any).config;
  if (style && pieceDef.id === 'top') {
    // Sleeve style
    if (style.sleeve === 'none') {
      // No sleeves: remove arm bones from selection
      boneSet = new Set(Array.from(boneSet).filter(b => !b.includes('arm')));
    } else if (style.sleeve === 'short') {
      // Short sleeves: limit arm yMax to elbow
      armYMax = landmarks.elbow_y + 0.02;
    }
    // sleeve === 'long' is default, no change
    
    // Neckline style
    if (style.neckline === 'off_shoulder') {
      // Off-shoulder requires region-based exclusion after initial selection
      // (implemented as post-processing below)
    }
  } else if (style && pieceDef.id === 'bottom') {
    // Length style affects the hem (yMin), not the waist (yMax)
    if (style.length === 'shorts') {
      yMin = config && config.shortsHemY 
        ? landmarks[config.shortsHemY.landmark as keyof Landmarks] + config.shortsHemY.offset
        : landmarks.knee_y + 0.08; // Above knee
    } else if (style.length === 'knee') {
      yMin = config && config.kneeHemY
        ? landmarks[config.kneeHemY.landmark as keyof Landmarks] + config.kneeHemY.offset
        : landmarks.knee_y + 0.02; // At knee
    }
    // length === 'ankle' is default (uses pieceDef.yMin)
    
    // Shape handled separately (skirt requires procedural geometry, not implemented yet)
  }

  // Select triangles based on selection method
  let selectedTriangles: number[];
  
  if (pieceDef.selection === 'band') {
    // Band selection: all triangles in y-band, no bone labels, no closure
    selectedTriangles = selectTrianglesInBand(geometry, yMin, yMax, landmarks, pieceDef, boneSegments);
  } else {
    // Default: bone-labeled selection with closure
    selectedTriangles = selectTriangles(
      geometry,
      boneSet,
      boneSegments,
      yMin,
      yMax,
      armYMax
    );
  }

  // Special clipping for top piece hem
  if (pieceDef.id === 'top') {
    let hemClipY: number | undefined;
    if (pieceDef.clips) {
      for (const clip of pieceDef.clips) {
        if (clip.groups.includes("torso") && !clip.groups.includes("*") && clip.keep === "above") {
          hemClipY = landmarks[clip.landmark as keyof Landmarks] + clip.offset;
          break;
        }
      }
    }
    
    if (hemClipY === undefined && yMin !== undefined) {
      hemClipY = yMin;
    }
    
    if (hemClipY !== undefined) {
      selectedTriangles = clipTrianglesAtPlane(
        selectedTriangles,
        geometry,
        hemClipY,
        true // keep above hem
      );
    }
    
    // Off-shoulder post-processing
    if (style && style.neckline === 'off_shoulder') {
      selectedTriangles = applyOffShoulderCut(
        selectedTriangles,
        geometry,
        boneSegments,
        landmarks,
        config
      );
    }
  }

  return selectedTriangles;
}

/**
 * COSTUME-9A: Off-shoulder cut
 * Excludes shoulder cap and clavicle triangles above a cutoff,
 * while keeping chest and arm sleeves below the cutoff.
 */
function applyOffShoulderCut(
  selectedTriangles: number[],
  geometry: THREE.BufferGeometry,
  boneSegments: Map<string, { head: THREE.Vector3; tail: THREE.Vector3 }>,
  landmarks: Landmarks,
  config: any
): number[] {
  const position = geometry.attributes.position;
  const index = geometry.index;
  
  if (!index) return selectedTriangles;
  
  // Configuration
  const shoulderCutoffY = config && config.offShoulderCutoffY 
    ? landmarks[config.offShoulderCutoffY.landmark as keyof Landmarks] + config.offShoulderCutoffY.offset
    : landmarks.neck_y - 0.05; // Default: 5cm below neck
  
  const shoulderBones = config && config.offShoulderBones 
    ? new Set(config.offShoulderBones.map((b: string) => sanitizeBoneName(b)))
    : new Set([
        sanitizeBoneName('clavicle.L'),
        sanitizeBoneName('clavicle.R'),
        // Upper arm top is debatable - include if wanted
      ]);
  
  const centroid = new THREE.Vector3();
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  
  const filtered: number[] = [];
  
  for (const triIdx of selectedTriangles) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    
    // Find nearest bone to centroid
    let nearestBone = '';
    let nearestDist = Infinity;
    
    for (const [boneName, segment] of boneSegments) {
      const dist = distanceToSegment(centroid, segment.head, segment.tail);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBone = boneName;
      }
    }
    
    // Exclude if: labeled as shoulder bone AND above cutoff
    if (shoulderBones.has(nearestBone) && centroid.y > shoulderCutoffY) {
      continue; // Exclude this triangle (bare shoulder)
    }
    
    filtered.push(triIdx);
  }
  
  return filtered;
}

/**
 * Compute distance from point to line segment.
 */
export function distanceToSegment(
  point: THREE.Vector3,
  segmentStart: THREE.Vector3,
  segmentEnd: THREE.Vector3
): number {
  const segment = new THREE.Vector3().subVectors(segmentEnd, segmentStart);
  const toPoint = new THREE.Vector3().subVectors(point, segmentStart);
  
  const segmentLengthSq = segment.lengthSq();
  if (segmentLengthSq === 0) {
    // Degenerate segment (point)
    return point.distanceTo(segmentStart);
  }
  
  // Project toPoint onto segment
  const t = Math.max(0, Math.min(1, toPoint.dot(segment) / segmentLengthSq));
  const projection = new THREE.Vector3().copy(segmentStart).addScaledVector(segment, t);
  
  return point.distanceTo(projection);
}

/**
 * Build bone segment endpoints from contract.
 * Each bone becomes a segment from head to tail.
 */
export function buildBoneSegments(contract: any): Map<string, { head: THREE.Vector3; tail: THREE.Vector3 }> {
  const bones = contract.bones as Array<{ 
    name: string; 
    head: [number, number, number];
    tail: [number, number, number];
  }>;
  
  const segments = new Map<string, { head: THREE.Vector3; tail: THREE.Vector3 }>();
  
  for (const bone of bones) {
    if (bone.name === 'root') continue;
    
    // Blender (x, y, z) -> glTF (x, z, -y)
    const head = new THREE.Vector3(bone.head[0], bone.head[2], -bone.head[1]);
    const tail = new THREE.Vector3(bone.tail[0], bone.tail[2], -bone.tail[1]);
    
    segments.set(sanitizeBoneName(bone.name), { head, tail });
  }
  
  return segments;
}

/**
 * Label each vertex with its nearest bone segment.
 * Returns a map from vertex index to sanitized bone name.
 */
export function labelVerticesByNearestBone(
  geometry: THREE.BufferGeometry,
  boneSegments: Map<string, { head: THREE.Vector3; tail: THREE.Vector3 }>
): Map<number, string> {
  const position = geometry.attributes.position;
  const vertexLabels = new Map<number, string>();
  const point = new THREE.Vector3();
  
  for (let i = 0; i < position.count; i++) {
    point.set(
      position.getX(i),
      position.getY(i),
      position.getZ(i)
    );
    
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

/**
 * Band selection: Select ALL triangles with centroids in the y-band.
 * No bone labels, no closure. Used for wig and shoes.
 * Applies slanted clips if defined in the piece.
 */
function selectTrianglesInBand(
  geometry: THREE.BufferGeometry,
  yMin: number | undefined,
  yMax: number | undefined,
  landmarks: Landmarks,
  pieceDef: PieceDefinition,
  boneSegments: Map<string, { head: THREE.Vector3; tail: THREE.Vector3 }>
): number[] {
  const position = geometry.attributes.position;
  const index = geometry.index;
  
  if (!index) {
    throw new Error('Geometry must have index');
  }

  const triangleCount = index.count / 3;
  const centroid = new THREE.Vector3();
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  
  const selected: number[] = [];
  
  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    
    // Check y-band
    if (yMin !== undefined && centroid.y < yMin) continue;
    if (yMax !== undefined && centroid.y > yMax) continue;
    
    // Check slanted clips
    if (pieceDef.clips) {
      let clipsFailed = false;
      for (const clip of pieceDef.clips) {
        if (!clip.slope_z) continue; // Not a slanted clip
        
        // Get z_ref
        let zRef = 0;
        if (clip.z_ref === 'head_bone') {
          // Find head bone
          const headSeg = boneSegments.get('head');
          if (headSeg) zRef = headSeg.head.z;
        }
        
        // Slanted plane: y(z) = landmark + offset + slope_z * (z - zRef)
        const landmarkY = landmarks[clip.landmark as keyof Landmarks];
        const planeY = landmarkY + clip.offset + clip.slope_z * (centroid.z - zRef);
        
        if (clip.keep === 'above' && centroid.y < planeY) {
          clipsFailed = true;
          break;
        } else if (clip.keep === 'below' && centroid.y > planeY) {
          clipsFailed = true;
          break;
        }
      }
      if (clipsFailed) continue;
    }
    
    selected.push(triIdx);
  }
  
  return selected;
}

/**
 * Select triangles using nearest-bone-segment labeling with neighbor closure.
 * 1. Label each vertex with nearest bone segment
 * 2. Label each triangle by centroid's nearest bone
 * 3. Select triangles whose label is in boneSet and centroid is in y-band
 * 4. Close gaps: include unselected triangles with >=2 selected edge neighbors
 * 5. For wig pieces: exclude front face region (z < -0.05, below hairline)
 */
export function selectTriangles(
  geometry: THREE.BufferGeometry,
  boneSet: Set<string>,
  boneSegments: Map<string, { head: THREE.Vector3; tail: THREE.Vector3 }>,
  yMin: number | undefined,
  yMax: number | undefined,
  armYMax?: number | undefined
): number[] {
  const position = geometry.attributes.position;
  const index = geometry.index;
  
  if (!index) {
    throw new Error('Geometry must have index');
  }

  const triangleCount = index.count / 3;
  const centroid = new THREE.Vector3();
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  
  // Label each triangle by its centroid's nearest bone
  const triangleLabels = new Map<number, string>();
  
  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    v0.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    v1.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    v2.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    
    centroid.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    
    // Find nearest bone to centroid
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
  
  // Select triangles: label in boneSet AND centroid in y-band AND (for wig) not in face zone
  const initialSelection = new Set<number>();
  
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
    
    // Check y-band
    if (yMin !== undefined && centroid.y < yMin) continue;
    if (yMax !== undefined && centroid.y > yMax) continue;
    
    // COSTUME-9A: Apply armYMax for arm bones (short sleeves)
    // armYMax is the LOWEST point (hem) for arm bones, so exclude triangles BELOW it
    if (armYMax !== undefined && label.includes('arm') && centroid.y < armYMax) {
      continue;
    }
    
    initialSelection.add(triIdx);
  }
  
  // Build edge-to-triangle adjacency
  const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edgeToTriangles = new Map<string, number[]>();
  
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
      edgeToTriangles.get(edge)!.push(triIdx);
    }
  }
  
  // Neighbor closure: add unselected triangles with >=2 selected edge neighbors
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

export function clipTrianglesAtPlane(
  selectedTriangles: number[],
  geometry: THREE.BufferGeometry,
  clipY: number,
  keepAbove: boolean
): number[] {
  const position = geometry.attributes.position;
  const index = geometry.index!;
  const result: number[] = [];
  const tolerance = 0; // Strict clipping for exact hem
  
  for (const triIdx of selectedTriangles) {
    const i0 = index.getX(triIdx * 3);
    const i1 = index.getX(triIdx * 3 + 1);
    const i2 = index.getX(triIdx * 3 + 2);
    
    const y0 = position.getY(i0);
    const y1 = position.getY(i1);
    const y2 = position.getY(i2);
    
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    
    if (keepAbove) {
      // Keep triangle if ALL vertices are >= clipY
      if (minY >= clipY - tolerance) {
        result.push(triIdx);
      }
    } else {
      // Keep triangle if ALL vertices are <= clipY
      if (maxY <= clipY + tolerance) {
        result.push(triIdx);
      }
    }
  }
  
  return result;
}

/**
 * Build offset geometry from selected triangles.
 * Offsets each vertex along its normal by offset_m.
 */
export function buildOffsetGeometry(
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
 * Radii measured from torso vertices only (exclude arms/hands) at that height.
 */
export function buildBeltGeometry(
  skinnedMesh: THREE.SkinnedMesh,
  contract: any,
  yPosition: number,
  tubeRadius: number
): THREE.BufferGeometry {
  const geometry = skinnedMesh.geometry;
  const position = geometry.attributes.position;
  const skinIndex = geometry.attributes.skinIndex;
  const skinWeight = geometry.attributes.skinWeight;

  if (!skinIndex || !skinWeight) {
    throw new Error('SkinnedMesh missing skinIndex or skinWeight');
  }

  const bones = contract.bones as Array<{ name: string }>;
  
  // Build set of torso bone indices (exclude arms and hands)
  const torsoBoneIndices = new Set<number>();
  bones.forEach((bone, idx) => {
    const name = bone.name.toLowerCase();
    if (!name.includes('arm') && !name.includes('hand')) {
      torsoBoneIndices.add(idx);
    }
  });

  // Find vertices near yPosition that are primarily torso-weighted
  const tolerance = 0.01; // 1 cm
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (Math.abs(y - yPosition) > tolerance) continue;

    // Check if vertex is primarily torso (sum torso weights > 0.5)
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

  // Validate belt radii are within 3 cm of body dimensions
  const bodyWidth = maxX - minX;
  const bodyDepth = maxZ - minZ;
  const tolerance3cm = 0.03;
  
  if (Math.abs(radiusX * 2 - bodyWidth) > tolerance3cm || 
      Math.abs(radiusZ * 2 - bodyDepth) > tolerance3cm) {
    console.warn(`Belt radii validation: width=${bodyWidth.toFixed(3)}m, depth=${bodyDepth.toFixed(3)}m`);
  }

  // Create torus with elliptical cross-section approximation
  // Use average radius for now (proper ellipse would need custom geometry)
  const radius = (radiusX + radiusZ) / 2;

  const torusGeometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 32);
  
  // Rotate to horizontal plane and position at yPosition
  torusGeometry.rotateX(Math.PI / 2);
  torusGeometry.translate(0, yPosition, 0);

  return torusGeometry;
}

export interface PieceDebugInfo {
  triangleCount: number;
  vertexCoverage: number; // 0-1: eligible vertices inside triangles / all eligible vertices
  boneSet: Set<string>;
  eligibleVertexCount: number;
  coveredVertexCount: number;
  missingVertexPositions?: Float32Array; // Positions of missing vertices for debug visualization
  missingVertexInfo?: Array<{ index: number; dominantBone: string; reason: string }>; // Details about why each vertex was missing
}

/**
 * Compute debug info for a piece without building the mesh.
 * Uses nearest-bone labeling for coverage calculation.
 */
export function computePieceDebugInfo(
  bodyScene: THREE.Object3D,
  contract: any,
  pieceDef: PieceDefinition,
  data: CostumePiecesData
): PieceDebugInfo | null {
  const skinnedMesh = findBodyMesh(bodyScene);
  if (!skinnedMesh) return null;

  if (pieceDef.type === 'torus') {
    // Belt has no vertex coverage concept
    return {
      triangleCount: 0,
      vertexCoverage: 1.0,
      boneSet: new Set(),
      eligibleVertexCount: 0,
      coveredVertexCount: 0,
    };
  }

  const meshBounds = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(contract, meshBounds);
  const boneSet = resolveBoneSet(pieceDef, data);
  const boneSegments = buildBoneSegments(contract);

  let yMin: number | undefined;
  let yMax: number | undefined;

  if (pieceDef.yMin) {
    yMin = landmarks[pieceDef.yMin.landmark as keyof Landmarks] + pieceDef.yMin.offset;
  }
  if (pieceDef.yMax) {
    yMax = landmarks[pieceDef.yMax.landmark as keyof Landmarks] + pieceDef.yMax.offset;
  }

  // Label vertices by nearest bone
  const geometry = skinnedMesh.geometry;
  const position = geometry.attributes.position;
  const vertexLabels = labelVerticesByNearestBone(geometry, boneSegments);

  // Find eligible vertices (label in boneSet, y in band)
  const eligibleVertices = new Set<number>();
  for (let i = 0; i < position.count; i++) {
    const label = vertexLabels.get(i);
    if (!label || !boneSet.has(label)) continue;
    
    const y = position.getY(i);
    if (yMin !== undefined && y < yMin) continue;
    if (yMax !== undefined && y > yMax) continue;
    
    eligibleVertices.add(i);
  }

  // Select triangles
  const selectedTriangles = selectPieceTriangles(
    geometry,
    pieceDef,
    boneSet,
    boneSegments,
    landmarks
  );

  // Find covered vertices
  const coveredVertices = new Set<number>();
  const index = geometry.index!;
  for (const triIdx of selectedTriangles) {
    for (let j = 0; j < 3; j++) {
      const vIdx = index.getX(triIdx * 3 + j);
      if (eligibleVertices.has(vIdx)) {
        coveredVertices.add(vIdx);
      }
    }
  }

  // Find missing vertices
  const missingVertices = new Set<number>();
  const missingVertexInfo: Array<{ index: number; dominantBone: string; reason: string }> = [];
  
  for (const vIdx of eligibleVertices) {
    if (!coveredVertices.has(vIdx)) {
      missingVertices.add(vIdx);
      const label = vertexLabels.get(vIdx) || 'unknown';
      missingVertexInfo.push({
        index: vIdx,
        dominantBone: label,
        reason: 'eligible but not in selected triangles',
      });
    }
  }

  // Extract positions of missing vertices
  const missingPositions = new Float32Array(missingVertices.size * 3);
  let posIdx = 0;
  for (const vIdx of missingVertices) {
    missingPositions[posIdx++] = position.getX(vIdx);
    missingPositions[posIdx++] = position.getY(vIdx);
    missingPositions[posIdx++] = position.getZ(vIdx);
  }

  const coverage = eligibleVertices.size > 0 ? coveredVertices.size / eligibleVertices.size : 0;

  return {
    triangleCount: selectedTriangles.length,
    vertexCoverage: coverage,
    boneSet,
    eligibleVertexCount: eligibleVertices.size,
    coveredVertexCount: coveredVertices.size,
    missingVertexPositions: missingPositions,
    missingVertexInfo,
  };
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
  color?: string,
  pieceStyle?: PieceStyle
): THREE.Mesh {
  const skinnedMesh = findBodyMesh(bodyScene);
  if (!skinnedMesh) {
    throw new Error('No SkinnedMesh found in body scene');
  }

  const bodyUUID = skinnedMesh.uuid;
  const pieceId = pieceDef.id;
  const cacheKey = getCacheKey(pieceId, pieceStyle?.style);

  // Check cache
  if (!pieceCache.has(bodyUUID)) {
    pieceCache.set(bodyUUID, new Map());
  }
  const bodyCache = pieceCache.get(bodyUUID)!;

  if (bodyCache.has(cacheKey)) {
    const cached = bodyCache.get(cacheKey)!;
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
    geometry = buildBeltGeometry(skinnedMesh, contract, yPos, pieceDef.tubeRadius);
  } else {
    // Derive piece using nearest-bone labeling with style support
    const meshBounds = new THREE.Box3().setFromObject(skinnedMesh);
    const landmarks = computeLandmarks(contract, meshBounds);
    const boneSet = resolveBoneSet(pieceDef, data);
    const boneSegments = buildBoneSegments(contract);

    // Use unified pipeline with style
    const selectedTriangles = selectPieceTriangles(
      skinnedMesh.geometry,
      pieceDef,
      boneSet,
      boneSegments,
      landmarks,
      pieceStyle?.style
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
  bodyCache.set(cacheKey, { mesh, geometry, material });

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
