/**
 * Test colorSpace.ts: conversions, deltaE, snap-to-palette, determinism.
 * Reference values from colormath.net and Bruce Lindbloom's calculator.
 */

import { hexToRgb, rgbToHex, hexToLab, labToHex, deltaE, snapToPalette } from '../src/utils/colorSpace.ts';

const TOLERANCE = 0.5; // LAB coordinate tolerance for reference values

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ ${message}`);
  }
}

function assertClose(actual, expected, tolerance, label) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
  } else {
    failed++;
    console.error(`❌ ${label}: expected ${expected} ±${tolerance}, got ${actual} (diff ${diff.toFixed(2)})`);
  }
}

console.log('=== Hex <-> RGB ===');
{
  const [r, g, b] = hexToRgb('#FFFFFF');
  assert(r === 255 && g === 255 && b === 255, 'hexToRgb white');
}
{
  const [r, g, b] = hexToRgb('#000000');
  assert(r === 0 && g === 0 && b === 0, 'hexToRgb black');
}
{
  const [r, g, b] = hexToRgb('#FF0000');
  assert(r === 255 && g === 0 && b === 0, 'hexToRgb red');
}
{
  const [r, g, b] = hexToRgb('#FFF');
  assert(r === 255 && g === 255 && b === 255, 'hexToRgb shorthand white');
}
{
  const [r, g, b] = hexToRgb('#F00');
  assert(r === 255 && g === 0 && b === 0, 'hexToRgb shorthand red');
}
{
  const hex = rgbToHex(255, 255, 255);
  assert(hex === '#FFFFFF', 'rgbToHex white');
}
{
  const hex = rgbToHex(255, 0, 0);
  assert(hex === '#FF0000', 'rgbToHex red');
}

console.log('=== Hex -> LAB (reference values) ===');
// Reference: white D65
{
  const [L, a, b] = hexToLab('#FFFFFF');
  assertClose(L, 100.0, TOLERANCE, 'white L');
  assertClose(a, 0.0, TOLERANCE, 'white a');
  assertClose(b, 0.0, TOLERANCE, 'white b');
}

// Reference: pure red D65 (from Bruce Lindbloom calculator)
// sRGB (255,0,0) -> XYZ (41.24, 21.26, 1.93) -> LAB (53.24, 80.09, 67.20)
{
  const [L, a, b] = hexToLab('#FF0000');
  assertClose(L, 53.24, TOLERANCE, 'red L');
  assertClose(a, 80.09, TOLERANCE, 'red a');
  assertClose(b, 67.20, TOLERANCE, 'red b');
}

// Reference: black
{
  const [L, a, b] = hexToLab('#000000');
  assertClose(L, 0.0, TOLERANCE, 'black L');
  assertClose(a, 0.0, TOLERANCE, 'black a');
  assertClose(b, 0.0, TOLERANCE, 'black b');
}

// Reference: pure green D65
// sRGB (0,255,0) -> XYZ (35.76, 71.52, 11.92) -> LAB (87.73, -86.18, 83.18)
{
  const [L, a, b] = hexToLab('#00FF00');
  assertClose(L, 87.73, TOLERANCE, 'green L');
  assertClose(a, -86.18, TOLERANCE, 'green a');
  assertClose(b, 83.18, TOLERANCE, 'green b');
}

// Reference: pure blue D65
// sRGB (0,0,255) -> XYZ (18.05, 7.22, 95.05) -> LAB (32.30, 79.19, -107.86)
{
  const [L, a, b] = hexToLab('#0000FF');
  assertClose(L, 32.30, TOLERANCE, 'blue L');
  assertClose(a, 79.19, TOLERANCE, 'blue a');
  assertClose(b, -107.86, TOLERANCE, 'blue b');
}

console.log('=== LAB -> Hex (round trip) ===');
{
  const lab = hexToLab('#FF5733');
  const hex = labToHex(lab[0], lab[1], lab[2]);
  // Allow small rounding differences
  const labRound = hexToLab(hex);
  const delta = deltaE(lab, labRound);
  assert(delta < 1.0, `LAB round trip #FF5733 (deltaE ${delta.toFixed(2)})`);
}
{
  const lab = hexToLab('#123456');
  const hex = labToHex(lab[0], lab[1], lab[2]);
  const labRound = hexToLab(hex);
  const delta = deltaE(lab, labRound);
  assert(delta < 1.0, `LAB round trip #123456 (deltaE ${delta.toFixed(2)})`);
}

console.log('=== DeltaE CIE76 ===');
{
  const white = hexToLab('#FFFFFF');
  const black = hexToLab('#000000');
  const delta = deltaE(white, black);
  // White to black is maximum distance: L=100 to L=0, a~0, b~0 -> deltaE = 100
  assertClose(delta, 100.0, 1.0, 'white-black deltaE');
}
{
  const red1 = hexToLab('#FF0000');
  const red2 = hexToLab('#FF0000');
  const delta = deltaE(red1, red2);
  assert(delta === 0.0, 'identical colors deltaE = 0');
}
{
  const red = hexToLab('#FF0000');
  const nearRed = hexToLab('#FE0000');
  const delta = deltaE(red, nearRed);
  assert(delta < 5.0, 'near-red deltaE < 5 (perceptually close)');
}

console.log('=== Snap to Palette ===');
const testPalette = [
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'red', name: 'Red', hex: '#FF0000' },
  { id: 'blue', name: 'Blue', hex: '#0000FF' },
];

{
  const snapped = snapToPalette('#FFFFFF', testPalette);
  assert(snapped.id === 'white', 'snap exact white');
}
{
  const snapped = snapToPalette('#FEFEFE', testPalette);
  assert(snapped.id === 'white', 'snap near-white');
}
{
  const snapped = snapToPalette('#FF0001', testPalette);
  assert(snapped.id === 'red', 'snap near-red');
}
{
  const snapped = snapToPalette('#000001', testPalette);
  assert(snapped.id === 'black', 'snap near-black');
}

console.log('=== Snap to Palette (tie-break by lowest id) ===');
const tiePalette = [
  { id: 'color-b', name: 'Color B', hex: '#FF0000' },
  { id: 'color-a', name: 'Color A', hex: '#FF0000' },
];
{
  const snapped = snapToPalette('#FF0000', tiePalette);
  assert(snapped.id === 'color-a', 'tie-break: lowest id wins');
}

console.log('=== Determinism (run twice, deep equal) ===');
{
  const hex = '#AB1234';
  const lab1 = hexToLab(hex);
  const lab2 = hexToLab(hex);
  assert(lab1[0] === lab2[0] && lab1[1] === lab2[1] && lab1[2] === lab2[2], 'hexToLab deterministic');
}
{
  const lab = [50, 20, -30];
  const hex1 = labToHex(lab[0], lab[1], lab[2]);
  const hex2 = labToHex(lab[0], lab[1], lab[2]);
  assert(hex1 === hex2, 'labToHex deterministic');
}
{
  const snapped1 = snapToPalette('#123456', testPalette);
  const snapped2 = snapToPalette('#123456', testPalette);
  assert(snapped1.id === snapped2.id, 'snapToPalette deterministic');
}

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
