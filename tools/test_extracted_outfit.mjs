/**
 * Test ExtractedOutfit type validation and closed vocabulary enforcement.
 */

import { loadAndValidateOutfit } from '../src/types/extractedOutfit.ts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load data files
const paletteJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/outfitPalette.json'), 'utf-8'));
const keywordsJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/outfitKeywords.json'), 'utf-8'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`❌ ${name}: ${err.message}`);
  }
}

console.log('=== Valid Outfit ===');
test('Valid empty outfit', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: false, color: null, keywords: [], confidence: 'low' },
      bottom: { present: false, color: null, keywords: [], confidence: 'low' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: false, color: null, keywords: [], confidence: 'low' },
    },
    unmapped: [],
  };
  
  const validated = loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
  if (validated.version !== '1.0.0') throw new Error('version mismatch');
  if (validated.slots.top.present !== false) throw new Error('top.present mismatch');
});

test('Valid outfit with detected slots', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: true, color: 'red', keywords: ['shirt', 'short-sleeve'], confidence: 'high' },
      bottom: { present: true, color: 'blue', keywords: ['pants', 'jeans'], confidence: 'medium' },
      shoes: { present: true, color: 'black', keywords: ['boots', 'combat-boots'], confidence: 'medium' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: true, color: 'yellow', keywords: ['long', 'straight', 'bangs'], confidence: 'high' },
    },
    unmapped: [],
  };
  
  loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
});

console.log('=== Invalid Structure ===');
test('Missing version', () => {
  const outfit = {
    slots: {
      top: { present: false, color: null, keywords: [], confidence: 'low' },
      bottom: { present: false, color: null, keywords: [], confidence: 'low' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: false, color: null, keywords: [], confidence: 'low' },
    },
    unmapped: [],
  };
  
  try {
    loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
    throw new Error('Should have thrown');
  } catch (err) {
    if (!err.message.includes('version')) throw new Error('Wrong error');
  }
});

test('Missing slot (wig)', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: false, color: null, keywords: [], confidence: 'low' },
      bottom: { present: false, color: null, keywords: [], confidence: 'low' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
    },
    unmapped: [],
  };
  
  try {
    loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
    throw new Error('Should have thrown');
  } catch (err) {
    if (!err.message.includes('5 keys') && !err.message.includes('wig')) throw new Error('Wrong error');
  }
});

test('Extra slot', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: false, color: null, keywords: [], confidence: 'low' },
      bottom: { present: false, color: null, keywords: [], confidence: 'low' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: false, color: null, keywords: [], confidence: 'low' },
      extra: { present: false, color: null, keywords: [], confidence: 'low' },
    },
    unmapped: [],
  };
  
  try {
    loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
    throw new Error('Should have thrown');
  } catch (err) {
    if (!err.message.includes('5 keys')) throw new Error('Wrong error');
  }
});

console.log('=== Out of Vocabulary ===');
test('Invalid color id', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: true, color: 'rainbow', keywords: ['shirt'], confidence: 'high' },
      bottom: { present: false, color: null, keywords: [], confidence: 'low' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: false, color: null, keywords: [], confidence: 'low' },
    },
    unmapped: [],
  };
  
  try {
    loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
    throw new Error('Should have thrown');
  } catch (err) {
    if (!err.message.includes('rainbow') || !err.message.includes('palette')) throw new Error('Wrong error');
  }
});

test('Invalid keyword for top', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: true, color: 'red', keywords: ['pants'], confidence: 'high' },
      bottom: { present: false, color: null, keywords: [], confidence: 'low' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: false, color: null, keywords: [], confidence: 'low' },
    },
    unmapped: [],
  };
  
  try {
    loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
    throw new Error('Should have thrown');
  } catch (err) {
    if (!err.message.includes('invalid keyword')) throw new Error('Wrong error');
  }
});

test('Invalid confidence', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: true, color: 'red', keywords: ['shirt'], confidence: 'very-high' },
      bottom: { present: false, color: null, keywords: [], confidence: 'low' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: false, color: null, keywords: [], confidence: 'low' },
    },
    unmapped: [],
  };
  
  try {
    loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
    throw new Error('Should have thrown');
  } catch (err) {
    if (!err.message.includes('confidence')) throw new Error('Wrong error');
  }
});

console.log('=== Determinism (deep equal on repeated validation) ===');
test('Same input, same output', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: true, color: 'red', keywords: ['shirt', 'long-sleeve'], confidence: 'high' },
      bottom: { present: true, color: 'black', keywords: ['pants'], confidence: 'medium' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: true, color: 'brown', keywords: ['short', 'spiky'], confidence: 'medium' },
    },
    unmapped: ['cape'],
  };
  
  const v1 = loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
  const v2 = loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
  
  const json1 = JSON.stringify(v1);
  const json2 = JSON.stringify(v2);
  
  if (json1 !== json2) throw new Error('Not deterministic');
});

console.log('=== Malformed Input ===');
test('Null outfit', () => {
  try {
    loadAndValidateOutfit(null, paletteJson, keywordsJson);
    throw new Error('Should have thrown');
  } catch (err) {
    if (!err.message.includes('object')) throw new Error('Wrong error');
  }
});

test('Non-array keywords', () => {
  const outfit = {
    version: '1.0.0',
    slots: {
      top: { present: true, color: 'red', keywords: 'shirt', confidence: 'high' },
      bottom: { present: false, color: null, keywords: [], confidence: 'low' },
      shoes: { present: false, color: null, keywords: [], confidence: 'low' },
      gloves: { present: false, color: null, keywords: [], confidence: 'low' },
      wig: { present: false, color: null, keywords: [], confidence: 'low' },
    },
    unmapped: [],
  };
  
  try {
    loadAndValidateOutfit(outfit, paletteJson, keywordsJson);
    throw new Error('Should have thrown');
  } catch (err) {
    if (!err.message.includes('array')) throw new Error('Wrong error');
  }
});

console.log('=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log(`${failed} TEST(S) FAILED`);
  process.exit(1);
}
