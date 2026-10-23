#!/usr/bin/env node
/**
 * Check Matcher Slugs
 * 
 * Validates that every mapped Flask ID in matcherSlugs.ts has a corresponding
 * JSON file in forgemind-ai/chracters_datasets/cosplay_matches
 */

const fs = require('fs');
const path = require('path');

// Read mapping from TypeScript file
const mappingFilePath = path.join(__dirname, '../src/data/matcherSlugs.ts');
const mappingContent = fs.readFileSync(mappingFilePath, 'utf8');

// Extract mapping object (simple regex, fragile but sufficient for generated file)
const mapMatch = mappingContent.match(/MATCHER_SLUG_MAP[^{]*\{([^}]+)\}/s);
if (!mapMatch) {
  console.error('ERROR: Could not parse MATCHER_SLUG_MAP');
  process.exit(1);
}

const mapping = {};
const lines = mapMatch[1].split('\n').filter(line => line.includes(':'));
lines.forEach(line => {
  const match = line.match(/'([^']+)':\s*'([^']+)'/);
  if (match) {
    mapping[match[1]] = match[2];
  }
});

// Count mobile variants
const variantsPath = path.join(__dirname, '../src/data/variants.json');
const mobileVariants = JSON.parse(fs.readFileSync(variantsPath, 'utf8'));

// Find Flask files
const flaskRoot = path.join(__dirname, '../../forgemind-ai/chracters_datasets/cosplay_matches');
const flaskFiles = [];

if (fs.existsSync(flaskRoot)) {
  fs.readdirSync(flaskRoot).forEach(charDir => {
    const charPath = path.join(flaskRoot, charDir);
    if (fs.statSync(charPath).isDirectory()) {
      fs.readdirSync(charPath).forEach(file => {
        if (file.endsWith('.json')) {
          flaskFiles.push(file.replace('.json', ''));
        }
      });
    }
  });
}

// Validate mapping
console.log('=== Matcher Slug Validation ===\n');

const mapped = Object.values(mapping);
const missing = [];

mapped.forEach(flaskId => {
  if (!flaskFiles.includes(flaskId)) {
    missing.push(flaskId);
  }
});

if (missing.length > 0) {
  console.log('❌ MISSING FILES:');
  missing.forEach(id => console.log(`  - ${id}`));
  console.log();
}

console.log('Mapped variants:', mapped.length);
console.log('Mobile variants (total):', mobileVariants.length);
console.log('Flask files (total):', flaskFiles.length);
console.log();

if (missing.length === 0) {
  console.log('✅ All mapped IDs have corresponding Flask files');
  process.exit(0);
} else {
  console.log('❌ Some mapped IDs are missing Flask files');
  process.exit(1);
}
