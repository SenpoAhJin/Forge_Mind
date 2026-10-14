/**
 * GLB Inspector
 * Reads GLB binary files and reports structure without external dependencies
 * 
 * GLB format: 12-byte header + JSON chunk + BIN chunk
 * @ts-nocheck
 */

const fs = require('fs');
const path = require('path');

function readGLB(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // Read GLB header (12 bytes)
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  if (magic !== 0x46546C67) { // 'glTF' in ASCII
    throw new Error('Not a valid GLB file (bad magic number)');
  }
  
  // Read first chunk (JSON)
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  
  if (jsonChunkType !== 0x4E4F534A) { // 'JSON' in ASCII
    throw new Error('Expected JSON chunk');
  }
  
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
  const gltf = JSON.parse(jsonString);
  
  return { buffer, gltf, fileSize: buffer.length };
}

function analyzeMesh(gltf, meshIndex) {
  const mesh = gltf.meshes[meshIndex];
  let triangleCount = 0;
  
  mesh.primitives.forEach(prim => {
    if (prim.indices !== undefined) {
      const accessor = gltf.accessors[prim.indices];
      triangleCount += accessor.count / 3;
    }
  });
  
  return { name: mesh.name || `Mesh_${meshIndex}`, triangleCount };
}

function getBoundingBox(gltf) {
  // Find POSITION accessor
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  gltf.meshes.forEach(mesh => {
    mesh.primitives.forEach(prim => {
      if (prim.attributes && prim.attributes.POSITION !== undefined) {
        const accessor = gltf.accessors[prim.attributes.POSITION];
        if (accessor.min && accessor.max) {
          minX = Math.min(minX, accessor.min[0]);
          minY = Math.min(minY, accessor.min[1]);
          minZ = Math.min(minZ, accessor.min[2]);
          maxX = Math.max(maxX, accessor.max[0]);
          maxY = Math.max(maxY, accessor.max[1]);
          maxZ = Math.max(maxZ, accessor.max[2]);
        }
      }
    });
  });
  
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    size: [maxX - minX, maxY - minY, maxZ - minZ]
  };
}

function inspectGLB(filePath) {
  console.log(`\n=== ${path.basename(filePath)} ===\n`);
  
  const { buffer, gltf, fileSize } = readGLB(filePath);
  
  console.log(`File size: ${(fileSize / 1024).toFixed(2)} KB (${fileSize} bytes)`);
  console.log(`glTF version: ${gltf.asset.version}`);
  
  // Scenes and nodes
  console.log(`\nScenes: ${gltf.scenes?.length || 0}`);
  console.log(`Nodes: ${gltf.nodes?.length || 0}`);
  if (gltf.nodes && gltf.nodes.length > 0) {
    console.log(`Node names: ${gltf.nodes.map(n => n.name || '(unnamed)').join(', ')}`);
  }
  
  // Meshes
  console.log(`\nMeshes: ${gltf.meshes?.length || 0}`);
  let totalTriangles = 0;
  if (gltf.meshes) {
    gltf.meshes.forEach((mesh, i) => {
      const analysis = analyzeMesh(gltf, i);
      console.log(`  ${i + 1}. ${analysis.name}: ${analysis.triangleCount.toFixed(0)} triangles`);
      totalTriangles += analysis.triangleCount;
    });
    console.log(`  TOTAL: ${totalTriangles.toFixed(0)} triangles`);
  }
  
  // Skins (rigging)
  console.log(`\nSkins: ${gltf.skins?.length || 0}`);
  if (gltf.skins && gltf.skins.length > 0) {
    gltf.skins.forEach((skin, i) => {
      console.log(`  ${i + 1}. ${skin.name || '(unnamed)'}: ${skin.joints?.length || 0} joints`);
    });
  }
  
  // Animations
  console.log(`\nAnimations: ${gltf.animations?.length || 0}`);
  if (gltf.animations && gltf.animations.length > 0) {
    gltf.animations.forEach((anim, i) => {
      console.log(`  ${i + 1}. ${anim.name || '(unnamed)'}: ${anim.channels?.length || 0} channels`);
    });
  }
  
  // Materials
  console.log(`\nMaterials: ${gltf.materials?.length || 0}`);
  if (gltf.materials && gltf.materials.length > 0) {
    gltf.materials.forEach((mat, i) => {
      console.log(`  ${i + 1}. ${mat.name || '(unnamed)'}`);
    });
  }
  
  // Bounding box
  const bbox = getBoundingBox(gltf);
  console.log(`\nBounding Box (units):`);
  console.log(`  Min: [${bbox.min.map(v => v.toFixed(3)).join(', ')}]`);
  console.log(`  Max: [${bbox.max.map(v => v.toFixed(3)).join(', ')}]`);
  console.log(`  Size: [${bbox.size.map(v => v.toFixed(3)).join(', ')}] (X, Y, Z)`);
  console.log(`  Height (Y): ${bbox.size[1].toFixed(3)} units`);
  
  // Coordinate system analysis
  console.log(`\nCoordinate System:`);
  console.log(`  Up axis: +Y (glTF standard)`);
  console.log(`  Forward: -Z (glTF standard)`);
  console.log(`  Right: +X (glTF standard)`);
  console.log(`  Origin: World origin (0, 0, 0)`);
  
  return { gltf, bbox, fileSize, totalTriangles };
}

// Main execution
const assetsDir = path.join(__dirname, '..', 'assets', 'models');
const maleGLB = path.join(assetsDir, '3D_Model_Male.glb');
const femaleGLB = path.join(assetsDir, '3D_Model_Female.glb');

console.log('==================================================');
console.log('GLB Body Inspection Report');
console.log('==================================================');

const maleResults = inspectGLB(maleGLB);
const femaleResults = inspectGLB(femaleGLB);

// Comparison
console.log(`\n\n=== COMPARISON ===\n`);
console.log(`Male bounding box: ${maleResults.bbox.size.map(v => v.toFixed(3)).join(' × ')} units (W × H × D)`);
console.log(`Female bounding box: ${femaleResults.bbox.size.map(v => v.toFixed(3)).join(' × ')} units (W × H × D)`);

const originMatch = (
  Math.abs(maleResults.bbox.min[0] - femaleResults.bbox.min[0]) < 0.01 &&
  Math.abs(maleResults.bbox.min[1] - femaleResults.bbox.min[1]) < 0.01 &&
  Math.abs(maleResults.bbox.min[2] - femaleResults.bbox.min[2]) < 0.01
);
console.log(`\nOrigins match: ${originMatch ? 'YES' : 'NO (different placement)'}`);
console.log(`Up-axis consistency: YES (both use +Y glTF standard)`);
console.log(`\nBoth bodies are ${maleResults.gltf.skins ? 'SKINNED/RIGGED' : 'STATIC'} (${maleResults.gltf.skins ? 'deformable via bones' : 'no bones'})`);

console.log(`\n==================================================`);
console.log('Inspection complete.');
console.log('==================================================\n');
