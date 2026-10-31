import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildCostumePiece, findBodyMesh, computeLandmarks, disposeCachedPieces, selectPieceTriangles, resolveBoneSet, buildBoneSegments } from '../src/utils/costumeBuilder.ts';

const data = JSON.parse(readFileSync(new URL('../src/data/costumePieces.json', import.meta.url)));
const results = [];
for (const body of ['Male', 'Female']) {
  const bytes = readFileSync(new URL(`../assets/models/3D_Model_${body}_V2_rigged.glb`, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const contract = JSON.parse(readFileSync(new URL(`../assets/models/3D_Model_${body}_V2_contract.json`, import.meta.url)));
  gltf.scene.updateMatrixWorld(true);
  const mesh = findBodyMesh(gltf.scene);
  mesh.geometry.computeBoundingBox();
  mesh.skeleton.update();
  const bounds = new THREE.Box3().setFromObject(mesh);
  const result = {
    body, rawBounds: mesh.geometry.boundingBox, worldBounds: bounds,
    meshMatrix: mesh.matrixWorld.elements, rootMatrix: gltf.scene.matrixWorld.elements,
    headBone: contract.bones.find(b => b.name === 'head'),
    landmarks: computeLandmarks(contract, bounds), pieces: {},
  };
  const covered = new Set();
  for (const definition of data.pieces.filter(piece => ['top', 'bottom'].includes(piece.id))) {
    for (const triangle of selectPieceTriangles(mesh.geometry, definition, resolveBoneSet(definition, data), buildBoneSegments(contract), result.landmarks)) covered.add(triangle);
  }
  let waistTriangles = 0, uncoveredWaistTriangles = 0;
  const position = mesh.geometry.attributes.position, index = mesh.geometry.index;
  for (let triangle = 0; triangle < index.count / 3; triangle++) {
    const ids = [0, 1, 2].map(offset => index.getX(triangle * 3 + offset));
    const x = ids.reduce((sum, id) => sum + position.getX(id), 0) / 3;
    const y = ids.reduce((sum, id) => sum + position.getY(id), 0) / 3;
    if (Math.abs(x) < 0.28 && y > result.landmarks.hip_y + 0.03 && y < result.landmarks.hip_y + 0.12) {
      waistTriangles++; if (!covered.has(triangle)) uncoveredWaistTriangles++;
    }
  }
  result.coverage = { waistTriangles, uncoveredWaistTriangles };
  assert.equal(uncoveredWaistTriangles, 0, `${body}: top/bottom must cover the waist band without holes`);
  for (const definition of data.pieces.filter(piece => piece.id !== 'belt')) {
    try {
      const piece = buildCostumePiece(gltf.scene, contract, definition, data, '#FF0000');
      gltf.scene.add(piece);
      gltf.scene.updateMatrixWorld(true);
      result.pieces[definition.id] = {
        triangles: piece.geometry.index ? piece.geometry.index.count / 3 : piece.geometry.attributes.position.count / 3,
        bounds: new THREE.Box3().setFromObject(piece), matrix: piece.matrixWorld.elements,
      };
      gltf.scene.remove(piece);
    } catch (error) { result.pieces[definition.id] = { error: error.message }; }
  }
  disposeCachedPieces(gltf.scene);
  for (const slot of ['top', 'bottom', 'shoes', 'gloves', 'wig']) {
    assert.ok(result.pieces[slot].triangles > 0, `${body} ${slot} must have geometry`);
  }
  assert.ok(result.pieces.wig.bounds.min.y > result.landmarks.shoulder_y + 0.1, `${body} wig must be above shoulders`);
  assert.ok(result.pieces.wig.bounds.max.y > result.landmarks.head_top_y, `${body} wig must enclose crown`);
  assert.ok(result.pieces.top.bounds.min.x < -0.3 && result.pieces.top.bounds.max.x > 0.3, `${body} top covers both arms`);
  assert.ok(result.pieces.bottom.bounds.max.y > result.landmarks.hip_y, `${body} pants reach above hips`);
  results.push(result);
}
const output = process.argv[2] ?? 'wearing-geometry.json';
writeFileSync(output, JSON.stringify(results, null, 2));
for (const result of results) console.log(`${result.body}: all five pieces have geometry; wig y=${result.pieces.wig.bounds.min.y.toFixed(3)}..${result.pieces.wig.bounds.max.y.toFixed(3)}, shoulder y=${result.landmarks.shoulder_y}; top triangles=${result.pieces.top.triangles}; waist coverage ${result.coverage.waistTriangles - result.coverage.uncoveredWaistTriangles}/${result.coverage.waistTriangles}. Assertions passed.`);
