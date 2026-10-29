#!/usr/bin/env node
/**
 * GARMENT-3b-R: Test BOM export theory
 * Tests whether converting cameraFraming.ts to UTF-16LE with BOM causes export to fail
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const targetFile = path.join(rootDir, 'src/utils/cameraFraming.ts');
const backupFile = targetFile + '.backup';

console.log('GARMENT-3b-R: BOM Export Test\n');

// Step 1: Backup and get SHA-256
console.log('1. Backing up cameraFraming.ts...');
const originalContent = fs.readFileSync(targetFile);
fs.writeFileSync(backupFile, originalContent);

const originalHash = crypto.createHash('sha256').update(originalContent).digest('hex').toUpperCase();
console.log(`   Original SHA-256: ${originalHash}\n`);

try {
  // Step 2: Convert to UTF-16LE with BOM
  console.log('2. Converting to UTF-16LE with BOM...');
  const utf16Buffer = Buffer.concat([
    Buffer.from([0xFF, 0xFE]), // UTF-16 LE BOM
    Buffer.from(originalContent.toString(), 'utf16le')
  ]);
  fs.writeFileSync(targetFile, utf16Buffer);
  console.log('   Converted.\n');

  // Step 3: Run expo export
  console.log('3. Running npx expo export --platform web...');
  console.log('   (This may take a few minutes)\n');
  
  try {
    execSync('npx expo export --platform web', {
      cwd: rootDir,
      stdio: 'inherit',
      timeout: 300000 // 5 minutes
    });
    console.log('\n   Export completed.\n');
  } catch (err) {
    console.log(`\n   Export failed with exit code: ${err.status}\n`);
  }

  // Step 4: Check for V2 GLBs
  console.log('4. Checking for V2 GLBs...');
  const exportDir = path.join(rootDir, '.expo-output-web');
  
  if (!fs.existsSync(exportDir)) {
    console.log('   ✗ Export directory not found\n');
  } else {
    const v2Files = [
      '3D_Model_Male_V2_rigged',
      '3D_Model_Female_V2_rigged'
    ];
    
    for (const baseName of v2Files) {
      const found = findFile(exportDir, baseName);
      if (found) {
        const relPath = path.relative(rootDir, found);
        const size = fs.statSync(found).size;
        console.log(`   ✓ Found: ${relPath} (${size} bytes)`);
      } else {
        console.log(`   ✗ Missing: ${baseName}`);
      }
    }
  }

} finally {
  // Step 5: Restore from backup
  console.log('\n5. Restoring from backup...');
  fs.copyFileSync(backupFile, targetFile);
  fs.unlinkSync(backupFile);
  
  // Verify SHA-256
  const restoredContent = fs.readFileSync(targetFile);
  const restoredHash = crypto.createHash('sha256').update(restoredContent).digest('hex').toUpperCase();
  
  if (restoredHash === originalHash) {
    console.log(`   ✓ Verified: SHA-256 matches (${restoredHash})\n`);
  } else {
    console.log(`   ✗ MISMATCH: ${restoredHash} != ${originalHash}\n`);
    process.exit(1);
  }
}

console.log('Test complete.');

function findFile(dir, baseName) {
  function* walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        yield* walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.glb')) {
        yield fullPath;
      }
    }
  }
  
  for (const file of walk(dir)) {
    if (path.basename(file).includes(baseName)) {
      return file;
    }
  }
  return null;
}
