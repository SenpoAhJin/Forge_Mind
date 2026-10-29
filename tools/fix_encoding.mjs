#!/usr/bin/env node
/**
 * GARMENT-3b-R: Convert files to UTF-8 without BOM
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const files = [
  'docs/reports/SYSTEM_STATE_REPORT.md',
  'scripts/flask_test_response.json',
  'scripts-backup/flask_test_response.json',
  'scripts-backup/scripts/flask_test_response.json'
];

let fixed = 0;

for (const file of files) {
  const fullPath = path.join(rootDir, file);
  
  try {
    const buffer = fs.readFileSync(fullPath);
    let content = buffer;
    
    // Remove UTF-8 BOM if present
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      content = buffer.slice(3);
      console.log(`✓ Removed UTF-8 BOM from ${file}`);
      fixed++;
    }
    
    // Write back without BOM
    fs.writeFileSync(fullPath, content, 'utf8');
  } catch (err) {
    console.error(`✗ Failed to fix ${file}: ${err.message}`);
    process.exit(1);
  }
}

console.log(`\nFixed ${fixed} file(s)`);
