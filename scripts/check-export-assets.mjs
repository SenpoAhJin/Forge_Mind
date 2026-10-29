#!/usr/bin/env node
/**
 * GARMENT-3b-R: Check export assets
 * After expo export, verify all required GLB files are present with correct sizes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Parse bodyAssets.ts to extract required GLB paths
function extractRequiredGLBs() {
  const bodyAssetsPath = path.join(rootDir, 'src/config/bodyAssets.ts');
  const content = fs.readFileSync(bodyAssetsPath, 'utf-8');
  
  const glbs = [];
  const requireRegex = /require\(['"](.*?\.glb)['"]\)/g;
  let match;
  
  while ((match = requireRegex.exec(content)) !== null) {
    // Resolve relative paths from src/config/
    const relativePath = match[1];
    const configDir = path.join(rootDir, 'src/config');
    const resolved = path.resolve(configDir, relativePath);
    glbs.push(resolved);
  }
  
  return glbs;
}

// Find exported file recursively
function findExportedFile(exportDir, baseName) {
  function* walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.glb')) {
        yield fullPath;
      }
    }
  }
  
  const searchName = path.basename(baseName, '.glb');
  
  for (const file of walk(exportDir)) {
    const fileName = path.basename(file);
    // Match <name>.<hash>.glb or <name>.glb
    if (fileName.startsWith(searchName) && fileName.endsWith('.glb')) {
      return file;
    }
  }
  
  return null;
}

const exportDir = path.join(rootDir, '.expo-output-web');

if (!fs.existsSync(exportDir)) {
  console.error(`✗ Export directory not found: ${exportDir}`);
  process.exit(1);
}

console.log('Checking exported GLB assets...\n');

const requiredGLBs = extractRequiredGLBs();
console.log(`Found ${requiredGLBs.length} required GLBs in bodyAssets.ts:\n`);

let missingCount = 0;
let mismatchCount = 0;

for (const sourcePath of requiredGLBs) {
  const baseName = path.basename(sourcePath);
  const relSource = path.relative(rootDir, sourcePath);
  
  console.log(`Checking: ${relSource}`);
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`  ✗ Source file not found`);
    missingCount++;
    continue;
  }
  
  const sourceSize = fs.statSync(sourcePath).size;
  const exportedPath = findExportedFile(exportDir, baseName);
  
  if (!exportedPath) {
    console.log(`  ✗ Not found in export`);
    missingCount++;
  } else {
    const exportedSize = fs.statSync(exportedPath).size;
    const relPath = path.relative(rootDir, exportedPath);
    
    if (sourceSize === exportedSize) {
      console.log(`  ✓ Found: ${relPath} (${sourceSize} bytes)`);
    } else {
      console.log(`  ✗ Size mismatch: ${relPath}`);
      console.log(`    Source: ${sourceSize} bytes, Exported: ${exportedSize} bytes`);
      mismatchCount++;
    }
  }
}

console.log();

if (missingCount + mismatchCount === 0) {
  console.log('✓ All GLB assets present and correct');
  process.exit(0);
} else {
  console.log(`✗ Issues found: ${missingCount} missing, ${mismatchCount} size mismatches`);
  process.exit(1);
}
