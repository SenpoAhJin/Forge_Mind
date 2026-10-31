/**
 * Check that shared files are byte-identical between mobile and backend.
 * These files must be kept in sync manually (mobile is source of truth).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mobileRoot = path.join(__dirname, '..');
const backendRoot = path.join(__dirname, '../../forgemind-backend');

const sharedFiles = [
  'src/utils/colorSpace.ts',
  'src/data/outfitPalette.json',
  'src/data/outfitKeywords.json',
  'src/types/extractedOutfit.ts',
  'src/utils/imageProcessing.ts',
  'src/utils/exifOrientation.ts',
];

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

let allMatch = true;

console.log('=== Checking shared files ===');

for (const file of sharedFiles) {
  const mobilePath = path.join(mobileRoot, file);
  const backendPath = path.join(backendRoot, file);
  
  if (!fs.existsSync(mobilePath)) {
    console.error(`❌ Mobile file missing: ${file}`);
    allMatch = false;
    continue;
  }
  
  if (!fs.existsSync(backendPath)) {
    console.error(`❌ Backend file missing: ${file}`);
    allMatch = false;
    continue;
  }
  
  const mobileHash = sha256File(mobilePath);
  const backendHash = sha256File(backendPath);
  
  if (mobileHash === backendHash) {
    console.log(`✓ ${file} (${mobileHash.slice(0, 8)}...)`);
  } else {
    console.error(`❌ ${file} MISMATCH`);
    console.error(`  Mobile:  ${mobileHash}`);
    console.error(`  Backend: ${backendHash}`);
    allMatch = false;
  }
}

if (allMatch) {
  console.log('\nALL SHARED FILES MATCH');
  process.exit(0);
} else {
  console.error('\nSHARED FILES MISMATCH');
  process.exit(1);
}
