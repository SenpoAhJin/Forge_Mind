#!/usr/bin/env node
/**
 * compute_body_bounds.mjs
 *
 * Reads the POSITION accessor min/max from each body GLB (V1 and V2, male and female)
 * and writes a data file with the bounds for each body set.
 *
 * USAGE: node scripts/compute_body_bounds.mjs
 *
 * OUTPUT: src/data/bodyBounds.generated.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const BODY_FILES = {
  v1: {
    male: 'assets/models/3D_Model_Male.glb',
    female: 'assets/models/3D_Model_Female.glb',
  },
  v2: {
    male: 'assets/models/3D_Model_Male_V2_rigged.glb',
    female: 'assets/models/3D_Model_Female_V2_rigged.glb',
  },
};

/**
 * Read a GLB file and extract the POSITION accessor min/max.
 * Returns {min: [x,y,z], max: [x,y,z]} or null if not found.
 */
async function extractPositionBounds(glbPath) {
  const absolutePath = path.resolve(repoRoot, glbPath);
  const buffer = await fs.readFile(absolutePath);

  // GLB structure: 12-byte header + JSON chunk + optional BIN chunk
  // Header: magic(4) + version(4) + length(4)
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    // 'glTF' in ASCII
    throw new Error(`${glbPath}: not a GLB file (bad magic)`);
  }

  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    throw new Error(`${glbPath}: unsupported GLB version ${version}`);
  }

  // JSON chunk: length(4) + type(4) + data
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  if (jsonChunkType !== 0x4e4f534a) {
    // 'JSON' in ASCII
    throw new Error(`${glbPath}: expected JSON chunk`);
  }

  const jsonData = buffer.subarray(20, 20 + jsonChunkLength).toString('utf8');
  const gltf = JSON.parse(jsonData);

  // BIN chunk starts after JSON chunk
  const binChunkStart = 20 + jsonChunkLength;
  const binChunkLength = buffer.readUInt32LE(binChunkStart);
  const binChunkType = buffer.readUInt32LE(binChunkStart + 4);
  if (binChunkType !== 0x004e4942) {
    // 'BIN\0' in ASCII
    throw new Error(`${glbPath}: expected BIN chunk`);
  }
  const binData = buffer.subarray(binChunkStart + 8, binChunkStart + 8 + binChunkLength);

  // Find the bounding box from all mesh POSITION accessors
  if (!gltf.meshes || gltf.meshes.length === 0) {
    throw new Error(`${glbPath}: no meshes found`);
  }

  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];
  let foundPosition = false;

  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      if (primitive.attributes && primitive.attributes.POSITION !== undefined) {
        const accessor = gltf.accessors[primitive.attributes.POSITION];
        if (accessor && accessor.min && accessor.max) {
          foundPosition = true;
          for (let i = 0; i < 3; i++) {
            globalMin[i] = Math.min(globalMin[i], accessor.min[i]);
            globalMax[i] = Math.max(globalMax[i], accessor.max[i]);
          }
        }
      }
    }
  }

  if (!foundPosition) {
    throw new Error(`${glbPath}: no POSITION attributes with min/max found`);
  }

  return {
    min: globalMin,
    max: globalMax,
  };
}

/**
 * Compute bounds from min/max arrays.
 * Returns {minX, maxX, minY, maxY, minZ, maxZ, centerY, height}.
 */
function computeBounds(min, max) {
  const [minX, minY, minZ] = min;
  const [maxX, maxY, maxZ] = max;
  const centerY = (minY + maxY) / 2;
  const height = maxY - minY;

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerY,
    height,
  };
}

async function main() {
  console.log('Computing body bounds from GLB files...\n');

  const result = {};

  for (const [setId, bodies] of Object.entries(BODY_FILES)) {
    result[setId] = {};

    for (const [gender, glbPath] of Object.entries(bodies)) {
      console.log(`Reading ${setId}/${gender}: ${glbPath}`);
      try {
        const { min, max } = await extractPositionBounds(glbPath);
        const bounds = computeBounds(min, max);
        result[setId][gender] = bounds;

        console.log(`  min: [${min.map((v) => v.toFixed(4)).join(', ')}]`);
        console.log(`  max: [${max.map((v) => v.toFixed(4)).join(', ')}]`);
        console.log(`  centerY: ${bounds.centerY.toFixed(4)}, height: ${bounds.height.toFixed(4)}`);
      } catch (error) {
        console.error(`  ERROR: ${error.message}`);
        process.exit(1);
      }
    }
    console.log();
  }

  const outputPath = path.resolve(repoRoot, 'src/data/bodyBounds.generated.json');
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2) + '\n');
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
