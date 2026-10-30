#!/usr/bin/env node
/**
 * COSTUME-6 Step 1: Check that no tools/*.mjs file duplicates functions from costumeBuilder.ts.
 * 
 * Exit 1 if any function defined in costumeBuilder.ts is also defined in a tools/*.mjs file.
 * 
 * EXCEPTION: diag_coverage.mjs uses skin weights (different logic), not the label-based builder.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Function names from costumeBuilder.ts (from read_code output)
const BUILDER_FUNCTIONS = [
  'sanitizeBoneName',
  'findBodyMesh',
  'computeLandmarks',
  'buildVertexBoneMap',
  'resolveBoneSet',
  'distanceToSegment',
  'buildBoneSegments',
  'labelVerticesByNearestBone',
  'selectTriangles',
  'clipTrianglesAtPlane',
  'buildOffsetGeometry',
  'buildBeltGeometry',
  'computePieceDebugInfo',
  'buildCostumePiece',
  'setPieceColor',
  'disposeCachedPieces',
  'clearAllCaches',
];

// Files exempt from the check (diagnostic tools with different logic)
const EXEMPT_FILES = ['diag_coverage.mjs'];

async function main() {
  const toolsDir = path.join(ROOT, 'tools');
  const files = await fs.readdir(toolsDir);
  const mjsFiles = files.filter(f => f.endsWith('.mjs') && !EXEMPT_FILES.includes(f));
  
  let duplicatesFound = false;
  
  for (const file of mjsFiles) {
    const filepath = path.join(toolsDir, file);
    const content = await fs.readFile(filepath, 'utf8');
    
    for (const funcName of BUILDER_FUNCTIONS) {
      // Match function declarations: function funcName( or const/let funcName = 
      const regex1 = new RegExp(`\\bfunction\\s+${funcName}\\s*\\(`, 'g');
      const regex2 = new RegExp(`\\b(?:const|let|var)\\s+${funcName}\\s*=`, 'g');
      
      if (regex1.test(content) || regex2.test(content)) {
        console.error(`ERROR: ${file} duplicates function '${funcName}' from costumeBuilder.ts`);
        duplicatesFound = true;
      }
    }
  }
  
  if (duplicatesFound) {
    console.error('\nFAIL: tools/*.mjs files must import from costumeBuilder.ts, not duplicate functions.');
    process.exit(1);
  }
  
  console.log(`✓ No duplicate builder functions found in ${mjsFiles.length} tools/*.mjs files (${EXEMPT_FILES.length} exempt)`);
  process.exit(0);
}

main();
