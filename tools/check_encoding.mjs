#!/usr/bin/env node
/**
 * GARMENT-3b-R: Encoding audit
 * Scan source files for UTF-16 BOM, UTF-8 BOM, or NUL bytes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const PATTERNS = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx',
  'tools/**/*.mjs',
  'tools/**/*.js',
  'scripts/**/*.mjs',
  'scripts/**/*.js',
  'docs/**/*.md',
  'assets/models/**/*.json',
  '*.md',
  '*.json'
];

function checkFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const size = buffer.length;
    
    if (size === 0) return null;
    
    // Check for UTF-16 LE BOM (FF FE)
    if (size >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'UTF-16 LE BOM';
    }
    
    // Check for UTF-16 BE BOM (FE FF)
    if (size >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'UTF-16 BE BOM';
    }
    
    // Check for UTF-8 BOM (EF BB BF)
    if (size >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'UTF-8 BOM';
    }
    
    // Check for NUL bytes in text files (skip binary files like images)
    const ext = path.extname(filePath).toLowerCase();
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.md', '.json', '.txt'].includes(ext)) {
      if (buffer.includes(0x00)) {
        return 'NUL byte';
      }
    }
    
    return null;
  } catch (err) {
    // Ignore read errors (permissions, missing files)
    return null;
  }
}

function* walkDir(dir, pattern) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules, .git, .expo, dist, etc.
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.expo', 'dist', 'build', '.expo-output-web'].includes(entry.name)) {
        continue;
      }
      yield* walkDir(fullPath, pattern);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function matchesPattern(filePath, patterns) {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  
  for (const pattern of patterns) {
    if (pattern.includes('**')) {
      const parts = pattern.split('**');
      const prefix = parts[0];
      const suffix = parts[1] ? parts[1].replace(/^\//, '') : '';
      
      if (rel.startsWith(prefix) || prefix === '') {
        if (suffix === '' || rel.endsWith(suffix) || rel.includes(suffix)) {
          return true;
        }
      }
    } else if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\//g, '\\/') + '$');
      if (regex.test(rel)) {
        return true;
      }
    } else {
      if (rel === pattern || rel.endsWith('/' + pattern)) {
        return true;
      }
    }
  }
  
  return false;
}

const flagged = [];

// Walk all directories
for (const file of walkDir(rootDir)) {
  if (matchesPattern(file, PATTERNS)) {
    const issue = checkFile(file);
    if (issue) {
      const rel = path.relative(rootDir, file);
      flagged.push({ file: rel, issue });
    }
  }
}

// Report
if (flagged.length === 0) {
  console.log('✓ No encoding issues found');
  process.exit(0);
} else {
  console.log(`✗ Found ${flagged.length} file(s) with encoding issues:\n`);
  for (const { file, issue } of flagged) {
    console.log(`  ${file}: ${issue}`);
  }
  process.exit(1);
}
