#!/usr/bin/env node
/**
 * Generate wiring matrix from actual code
 * Scans navigators, screens, and contexts to build the feature matrix
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function readFile(relativePath) {
  try {
    return fs.readFileSync(path.join(rootDir, relativePath), 'utf-8');
  } catch {
    return null;
  }
}

function findInFile(relativePath, pattern) {
  const content = readFile(relativePath);
  if (!content) return [];
  const matches = [];
  const regex = new RegExp(pattern, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const lines = content.substring(0, match.index).split('\n');
    matches.push({
      line: lines.length,
      text: match[0],
      context: lines[lines.length - 1].trim(),
    });
  }
  return matches;
}

function extractRoutes() {
  const navigators = [
    'src/navigation/ProfileStackNavigator.tsx',
    'src/navigation/EventsStackNavigator.tsx',
    'src/navigation/LogisticsStackNavigator.tsx',
    'src/navigation/MarketplaceStackNavigator.tsx',
  ];

  const routes = [];
  for (const nav of navigators) {
    const content = readFile(nav);
    if (!content) continue;

    // Find Stack.Screen declarations
    const screenPattern = /<Stack\.Screen\s+name="([^"]+)"\s+component=\{([^}]+)\}/g;
    let match;
    while ((match = screenPattern.exec(content)) !== null) {
      routes.push({
        route: match[1],
        component: match[2],
        navigator: nav,
      });
    }
  }
  return routes;
}

function extractStorageKeys() {
  const contexts = fs.readdirSync(path.join(rootDir, 'src/contexts'))
    .filter(f => f.endsWith('.tsx'));
  
  const keys = {};
  for (const file of contexts) {
    const content = readFile(`src/contexts/${file}`);
    if (!content) continue;

    // Find AsyncStorage keys
    const keyPattern = /@forgemind:[a-z_]+/g;
    const matches = content.match(keyPattern);
    if (matches) {
      keys[file] = [...new Set(matches)];
    }
  }
  return keys;
}

function findAuthServiceCalls() {
  const srcDir = path.join(rootDir, 'src');
  const files = [];

  function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.')) {
        walk(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }

  walk(srcDir);

  const calls = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');

    // Find AuthService.getAccounts() calls
    const getAccountsMatches = findInFile(relativePath, /AuthService\.getAccounts\(\)/);
    if (getAccountsMatches.length > 0) {
      calls.push({
        file: relativePath,
        method: 'getAccounts',
        lines: getAccountsMatches.map(m => m.line),
      });
    }
  }

  return calls;
}

function generateMatrix() {
  console.log(colors.blue + '\n=== WIRING MATRIX GENERATOR ===' + colors.reset);
  console.log('Generated:', new Date().toISOString());
  console.log();

  const routes = extractRoutes();
  console.log(colors.green + `Found ${routes.length} registered routes` + colors.reset);

  const storageKeys = extractStorageKeys();
  console.log(colors.green + `Found ${Object.keys(storageKeys).length} contexts with AsyncStorage` + colors.reset);

  const authCalls = findAuthServiceCalls();
  console.log(colors.yellow + `Found ${authCalls.length} files calling AuthService.getAccounts()` + colors.reset);

  console.log('\n' + colors.blue + '--- AuthService.getAccounts() CALLS ---' + colors.reset);
  for (const call of authCalls) {
    console.log(`${call.file}:${call.lines.join(',')}`);
  }

  console.log('\n' + colors.blue + '--- ASYNC STORAGE KEYS BY CONTEXT ---' + colors.reset);
  for (const [file, keys] of Object.entries(storageKeys)) {
    console.log(`${file}: ${keys.join(', ')}`);
  }

  console.log('\n' + colors.blue + '--- REGISTERED ROUTES ---' + colors.reset);
  for (const route of routes) {
    console.log(`${route.route} -> ${route.component} (in ${route.navigator})`);
  }

  console.log('\n' + colors.green + 'Matrix generation complete' + colors.reset);
}

generateMatrix();
