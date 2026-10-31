/**
 * Color space conversions and perceptual color matching.
 * Pure TypeScript, no dependencies. Shared by mobile, backend, and tests.
 * 
 * Pipeline: sRGB hex -> linear RGB -> XYZ -> CIELAB
 * Reference illuminant: D65 (standard daylight)
 * DeltaE: CIE76 (Euclidean distance in LAB space)
 */

// D65 standard illuminant reference white
const D65_X = 95.047;
const D65_Y = 100.000;
const D65_Z = 108.883;

/**
 * Parse hex color (3, 4, 6, or 8 digits) to RGB [0-255].
 * Examples: "#FFF", "#FFFF", "#FFFFFF", "#FFFFFFFF"
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, '');
  
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  
  if (clean.length === 4) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  
  if (clean.length === 6 || clean.length === 8) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
  }
  
  throw new Error(`Invalid hex color: ${hex}`);
}

/**
 * Convert RGB [0-255] to hex string (6 digits, uppercase, with #).
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const rHex = Math.round(r).toString(16).padStart(2, '0');
  const gHex = Math.round(g).toString(16).padStart(2, '0');
  const bHex = Math.round(b).toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * sRGB [0-255] to linear RGB [0-1].
 * sRGB uses gamma correction; we must linearize before converting to XYZ.
 */
function srgbToLinear(channel: number): number {
  const c = channel / 255.0;
  if (c <= 0.04045) {
    return c / 12.92;
  } else {
    return Math.pow((c + 0.055) / 1.055, 2.4);
  }
}

/**
 * Linear RGB [0-1] to XYZ (D65).
 * Standard sRGB to XYZ transformation matrix.
 */
function linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  return [x * 100, y * 100, z * 100]; // Scale to 0-100 range
}

/**
 * XYZ to CIELAB (D65).
 * L* ranges from 0 (black) to 100 (white).
 * a* and b* typically range from -128 to +127.
 */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // Normalize by D65 white point
  const xr = x / D65_X;
  const yr = y / D65_Y;
  const zr = z / D65_Z;
  
  // Apply LAB transformation function
  const f = (t: number): number => {
    if (t > 0.008856) {
      return Math.pow(t, 1.0 / 3.0);
    } else {
      return (7.787 * t) + (16.0 / 116.0);
    }
  };
  
  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);
  
  const L = (116.0 * fy) - 16.0;
  const a = 500.0 * (fx - fy);
  const b = 200.0 * (fy - fz);
  
  return [L, a, b];
}

/**
 * Convert hex color to CIELAB.
 */
export function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const rLinear = srgbToLinear(r);
  const gLinear = srgbToLinear(g);
  const bLinear = srgbToLinear(b);
  const [x, y, z] = linearRgbToXyz(rLinear, gLinear, bLinear);
  return xyzToLab(x, y, z);
}

/**
 * CIELAB to XYZ (D65).
 */
function labToXyz(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16.0) / 116.0;
  const fx = (a / 500.0) + fy;
  const fz = fy - (b / 200.0);
  
  const invF = (t: number): number => {
    const t3 = t * t * t;
    if (t3 > 0.008856) {
      return t3;
    } else {
      return (t - 16.0 / 116.0) / 7.787;
    }
  };
  
  const xr = invF(fx);
  const yr = invF(fy);
  const zr = invF(fz);
  
  return [xr * D65_X, yr * D65_Y, zr * D65_Z];
}

/**
 * XYZ to linear RGB.
 */
function xyzToLinearRgb(x: number, y: number, z: number): [number, number, number] {
  // Inverse of sRGB to XYZ matrix
  const xs = x / 100;
  const ys = y / 100;
  const zs = z / 100;
  
  const r =  xs * 3.2404542 + ys * -1.5371385 + zs * -0.4985314;
  const g =  xs * -0.9692660 + ys * 1.8760108 + zs * 0.0415560;
  const b =  xs * 0.0556434 + ys * -0.2040259 + zs * 1.0572252;
  
  return [r, g, b];
}

/**
 * Linear RGB [0-1] to sRGB [0-255].
 */
function linearToSrgb(channel: number): number {
  if (channel <= 0.0031308) {
    return channel * 12.92 * 255;
  } else {
    return (1.055 * Math.pow(channel, 1.0 / 2.4) - 0.055) * 255;
  }
}

/**
 * Convert CIELAB to hex color.
 * Clamps out-of-gamut colors to nearest representable sRGB value.
 */
export function labToHex(L: number, a: number, bLab: number): string {
  const [x, y, z] = labToXyz(L, a, bLab);
  const [rLinear, gLinear, bLinear] = xyzToLinearRgb(x, y, z);
  
  // Clamp to [0, 1] range for linear RGB
  const rClamped = Math.max(0, Math.min(1, rLinear));
  const gClamped = Math.max(0, Math.min(1, gLinear));
  const bClamped = Math.max(0, Math.min(1, bLinear));
  
  const r = linearToSrgb(rClamped);
  const g = linearToSrgb(gClamped);
  const bSrgb = linearToSrgb(bClamped);
  
  // Clamp to [0, 255] for sRGB
  return rgbToHex(
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, bSrgb))
  );
}

/**
 * CIE76 DeltaE: Euclidean distance in LAB space.
 * Values < 2.3 are generally imperceptible to human eye.
 */
export function deltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Palette entry with id, name, and hex color.
 */
export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
}

/**
 * Snap a hex color to the nearest palette color using perceptual distance (deltaE).
 * Tie-break rule: lowest palette id (lexicographic order).
 * Returns the palette color entry.
 */
export function snapToPalette(hex: string, palette: PaletteColor[]): PaletteColor {
  if (palette.length === 0) {
    throw new Error('Palette cannot be empty');
  }
  
  const targetLab = hexToLab(hex);
  
  let minDelta = Infinity;
  let bestColor = palette[0];
  
  for (const color of palette) {
    const colorLab = hexToLab(color.hex);
    const delta = deltaE(targetLab, colorLab);
    
    // Tie-break by lowest id (lexicographic)
    if (delta < minDelta || (delta === minDelta && color.id < bestColor.id)) {
      minDelta = delta;
      bestColor = color;
    }
  }
  
  return bestColor;
}
