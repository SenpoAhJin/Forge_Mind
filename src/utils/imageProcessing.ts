/**
 * Deterministic image decoding and resizing.
 * Pure TypeScript box filter resize, no external dependencies for resize logic.
 * Shared by backend and tests.
 */

/**
 * Resize RGBA buffer using box filter (average pooling).
 * Preserves aspect ratio: fit longest side to targetSize, no letterboxing.
 * Deterministic: integer arithmetic, fixed rounding (truncate toward zero).
 * 
 * Rounding rule: All divisions use Math.floor() for consistency.
 */
export function resizeRgba(
  srcWidth: number,
  srcHeight: number,
  srcRgba: Buffer,
  targetSize: number
): { width: number; height: number; rgba: Buffer } {
  // Determine new dimensions (preserve aspect ratio, fit longest side)
  const longestSide = Math.max(srcWidth, srcHeight);
  if (longestSide <= targetSize) {
    // No resize needed
    return { width: srcWidth, height: srcHeight, rgba: srcRgba };
  }
  
  const scale = targetSize / longestSide;
  const dstWidth = Math.floor(srcWidth * scale);
  const dstHeight = Math.floor(srcHeight * scale);
  
  if (dstWidth === 0 || dstHeight === 0) {
    throw new Error('Resize produced zero dimension');
  }
  
  const dstRgba = Buffer.alloc(dstWidth * dstHeight * 4);
  
  // Box filter: for each destination pixel, average all source pixels that map to it
  for (let dstY = 0; dstY < dstHeight; dstY++) {
    for (let dstX = 0; dstX < dstWidth; dstX++) {
      // Determine source pixel range for this destination pixel
      const srcX0 = Math.floor(dstX / scale);
      const srcX1 = Math.min(Math.floor((dstX + 1) / scale), srcWidth);
      const srcY0 = Math.floor(dstY / scale);
      const srcY1 = Math.min(Math.floor((dstY + 1) / scale), srcHeight);
      
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      let count = 0;
      
      for (let srcY = srcY0; srcY < srcY1; srcY++) {
        for (let srcX = srcX0; srcX < srcX1; srcX++) {
          const srcOffset = (srcY * srcWidth + srcX) * 4;
          sumR += srcRgba[srcOffset];
          sumG += srcRgba[srcOffset + 1];
          sumB += srcRgba[srcOffset + 2];
          sumA += srcRgba[srcOffset + 3];
          count++;
        }
      }
      
      const dstOffset = (dstY * dstWidth + dstX) * 4;
      if (count > 0) {
        dstRgba[dstOffset] = Math.floor(sumR / count);
        dstRgba[dstOffset + 1] = Math.floor(sumG / count);
        dstRgba[dstOffset + 2] = Math.floor(sumB / count);
        dstRgba[dstOffset + 3] = Math.floor(sumA / count);
      } else {
        // Should not happen, but default to black transparent
        dstRgba[dstOffset] = 0;
        dstRgba[dstOffset + 1] = 0;
        dstRgba[dstOffset + 2] = 0;
        dstRgba[dstOffset + 3] = 0;
      }
    }
  }
  
  return { width: dstWidth, height: dstHeight, rgba: dstRgba };
}

/**
 * Read image dimensions from JPEG buffer without full decode.
 * Returns [width, height] or null on error.
 */
export function readJpegDimensions(buffer: Buffer): [number, number] | null {
  try {
    if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return null; // Not JPEG
    }
    
    let offset = 2;
    
    while (offset + 3 < buffer.length) {
      const marker = (buffer[offset] << 8) | buffer[offset + 1];
      offset += 2;
      
      if ((marker & 0xFF00) !== 0xFF00) {
        return null; // Invalid marker
      }
      
      // SOF0-SOF15 markers (except DHT, JPG, DAC, RST)
      const sofMarkers = [0xFFC0, 0xFFC1, 0xFFC2, 0xFFC3, 0xFFC5, 0xFFC6, 0xFFC7,
                          0xFFC9, 0xFFCA, 0xFFCB, 0xFFCD, 0xFFCE, 0xFFCF];
      
      if (sofMarkers.includes(marker)) {
        // Found SOF marker
        if (offset + 5 > buffer.length) return null;
        offset += 3; // Skip length and precision
        const height = (buffer[offset] << 8) | buffer[offset + 1];
        const width = (buffer[offset + 2] << 8) | buffer[offset + 3];
        return [width, height];
      }
      
      // Read segment length and skip
      const segmentLength = (buffer[offset] << 8) | buffer[offset + 1];
      if (segmentLength < 2 || offset + segmentLength > buffer.length) {
        return null;
      }
      offset += segmentLength;
    }
    
    return null; // No SOF found
  } catch (err) {
    return null;
  }
}

/**
 * Read image dimensions from PNG buffer without full decode.
 * Returns [width, height] or null on error.
 */
export function readPngDimensions(buffer: Buffer): [number, number] | null {
  try {
    // Check PNG signature
    if (buffer.length < 24 ||
        buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47 ||
        buffer[4] !== 0x0D || buffer[5] !== 0x0A || buffer[6] !== 0x1A || buffer[7] !== 0x0A) {
      return null;
    }
    
    // Read IHDR chunk (first chunk after signature, offset 8)
    // IHDR contains: width (4 bytes), height (4 bytes), ...
    const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
    const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
    
    return [width, height];
  } catch (err) {
    return null;
  }
}
