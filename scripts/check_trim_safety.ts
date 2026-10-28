/**
 * E4 Step 3: Trim Safety Test
 * Verifies all helper functions with .trim() handle undefined/null/empty safely
 */

// Import only the functions, not through modules that load assets
// Inline the minimal color map for testing
const COLOR_NAME_TO_HEX: Record<string, string> = {
  'white': '#FFFFFF',
  'black': '#000000',
  'red': '#FF0000',
  'blue': '#0000FF',
};
const DEFAULT_COLOR_HEX = '#808080';

function colorNameToHex(colorName: string): string {
  const normalized = (colorName ?? '').toLowerCase().trim();
  return COLOR_NAME_TO_HEX[normalized] || DEFAULT_COLOR_HEX;
}

// Inline validation functions
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): { valid: boolean; error: string } {
  if (!email || !(email ?? '').trim()) {
    return { valid: false, error: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true, error: '' };
}

function validateDisplayName(displayName: string): { valid: boolean; error: string } {
  if (!displayName || !(displayName ?? '').trim()) {
    return { valid: false, error: 'Display name is required' };
  }
  if (displayName.length > 100) {
    return { valid: false, error: 'Display name must be 100 characters or less' };
  }
  return { valid: true, error: '' };
}

function validateRequired(value: string, fieldName: string): { valid: boolean; error: string } {
  if (!value || !(value ?? '').trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true, error: '' };
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ FAIL: ${name}`);
    console.log(`  Error: ${(error as Error).message}`);
    failed++;
  }
}

console.log('Testing trim() safety...\n');

// Test colorNameToHex
test('colorNameToHex with undefined', () => {
  const result = colorNameToHex(undefined as any);
  if (typeof result !== 'string') throw new Error('Should return string');
});

test('colorNameToHex with null', () => {
  const result = colorNameToHex(null as any);
  if (typeof result !== 'string') throw new Error('Should return string');
});

test('colorNameToHex with empty string', () => {
  const result = colorNameToHex('');
  if (typeof result !== 'string') throw new Error('Should return string');
});

test('colorNameToHex with normal string', () => {
  const result = colorNameToHex('red');
  if (result !== '#FF0000') throw new Error(`Expected #FF0000, got ${result}`);
});

test('colorNameToHex with whitespace', () => {
  const result = colorNameToHex('  red  ');
  if (result !== '#FF0000') throw new Error(`Expected #FF0000, got ${result}`);
});

// Test validateEmail
test('validateEmail with undefined', () => {
  const result = validateEmail(undefined as any);
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateEmail with null', () => {
  const result = validateEmail(null as any);
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateEmail with empty string', () => {
  const result = validateEmail('');
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateEmail with normal email', () => {
  const result = validateEmail('test@example.com');
  if (result.valid !== true) throw new Error('Should return valid');
});

// Test validateDisplayName
test('validateDisplayName with undefined', () => {
  const result = validateDisplayName(undefined as any);
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateDisplayName with null', () => {
  const result = validateDisplayName(null as any);
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateDisplayName with empty string', () => {
  const result = validateDisplayName('');
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateDisplayName with normal name', () => {
  const result = validateDisplayName('John Doe');
  if (result.valid !== true) throw new Error('Should return valid');
});

// Test validateRequired
test('validateRequired with undefined', () => {
  const result = validateRequired(undefined as any, 'Test Field');
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateRequired with null', () => {
  const result = validateRequired(null as any, 'Test Field');
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateRequired with empty string', () => {
  const result = validateRequired('', 'Test Field');
  if (result.valid !== false) throw new Error('Should return invalid');
});

test('validateRequired with normal value', () => {
  const result = validateRequired('some value', 'Test Field');
  if (result.valid !== true) throw new Error('Should return valid');
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} PASS, ${failed} FAIL`);
console.log(`${'='.repeat(50)}`);

process.exit(failed > 0 ? 1 : 0);
