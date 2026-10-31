/**
 * Parse JPEG EXIF orientation tag (0x0112).
 * Reads APP1/Exif segment only. Returns 1-8 or 1 on any error.
 * Pure TypeScript, no dependencies.
 * 
 * EXIF orientation values:
 * 1 = normal (0°)
 * 2 = flip horizontal
 * 3 = rotate 180°
 * 4 = flip vertical
 * 5 = transpose (flip horizontal + rotate 90° CW)
 * 6 = rotate 90° CW
 * 7 = transverse (flip horizontal + rotate 270° CW)
 * 8 = rotate 270° CW (or 90° CCW)
 */

const JPEG_SOI = 0xFFD8; // Start of Image marker
const APP1_MARKER = 0xFFE1; // APP1 segment marker (EXIF)

const TIFF_LITTLE_ENDIAN = 0x4949; // "II"
const TIFF_BIG_ENDIAN = 0x4D4D; // "MM"

const ORIENTATION_TAG = 0x0112;

/**
 * Read uint16 from buffer at offset, respecting byte order.
 */
function readUint16(buffer: Buffer, offset: number, littleEndian: boolean): number {
  if (offset + 1 >= buffer.length) return 0;
  if (littleEndian) {
    return buffer[offset] | (buffer[offset + 1] << 8);
  } else {
    return (buffer[offset] << 8) | buffer[offset + 1];
  }
}

/**
 * Read uint32 from buffer at offset, respecting byte order.
 */
function readUint32(buffer: Buffer, offset: number, littleEndian: boolean): number {
  if (offset + 3 >= buffer.length) return 0;
  if (littleEndian) {
    return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24);
  } else {
    return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
  }
}

/**
 * Parse JPEG EXIF orientation tag from buffer.
 * Returns orientation value 1-8, or 1 if not found or malformed.
 * Never throws.
 */
export function parseJpegOrientation(buffer: Buffer): number {
  try {
    // Check JPEG SOI marker
    if (buffer.length < 2 || readUint16(buffer, 0, false) !== JPEG_SOI) {
      return 1; // Not a JPEG
    }
    
    let offset = 2;
    
    // Find APP1 segment
    while (offset + 3 < buffer.length) {
      const marker = readUint16(buffer, offset, false);
      offset += 2;
      
      if ((marker & 0xFF00) !== 0xFF00) {
        return 1; // Invalid marker
      }
      
      // Read segment length
      const segmentLength = readUint16(buffer, offset, false);
      if (segmentLength < 2 || offset + segmentLength > buffer.length) {
        return 1; // Invalid segment length
      }
      
      if (marker === APP1_MARKER) {
        // Found APP1, check for EXIF signature
        const exifStart = offset + 2;
        if (exifStart + 6 > buffer.length) return 1;
        
        // Check "Exif\0\0" signature
        if (buffer[exifStart] !== 0x45 || buffer[exifStart + 1] !== 0x78 ||
            buffer[exifStart + 2] !== 0x69 || buffer[exifStart + 3] !== 0x66 ||
            buffer[exifStart + 4] !== 0x00 || buffer[exifStart + 5] !== 0x00) {
          offset += segmentLength;
          continue; // Not EXIF APP1
        }
        
        // Parse TIFF header
        const tiffStart = exifStart + 6;
        if (tiffStart + 8 > buffer.length) return 1;
        
        const byteOrder = readUint16(buffer, tiffStart, false);
        const littleEndian = byteOrder === TIFF_LITTLE_ENDIAN;
        
        if (byteOrder !== TIFF_LITTLE_ENDIAN && byteOrder !== TIFF_BIG_ENDIAN) {
          return 1; // Invalid byte order
        }
        
        // Check TIFF magic number (42)
        const magic = readUint16(buffer, tiffStart + 2, littleEndian);
        if (magic !== 42) return 1;
        
        // Read IFD0 offset
        const ifd0Offset = readUint32(buffer, tiffStart + 4, littleEndian);
        if (ifd0Offset < 8 || tiffStart + ifd0Offset + 2 > buffer.length) return 1;
        
        // Read number of IFD0 entries
        const ifd0Start = tiffStart + ifd0Offset;
        const numEntries = readUint16(buffer, ifd0Start, littleEndian);
        if (numEntries > 200 || ifd0Start + 2 + numEntries * 12 > buffer.length) return 1;
        
        // Search for orientation tag
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = ifd0Start + 2 + i * 12;
          const tag = readUint16(buffer, entryOffset, littleEndian);
          
          if (tag === ORIENTATION_TAG) {
            // Found orientation tag
            const dataType = readUint16(buffer, entryOffset + 2, littleEndian);
            const dataCount = readUint32(buffer, entryOffset + 4, littleEndian);
            
            // Orientation should be SHORT (type 3), count 1
            if (dataType !== 3 || dataCount !== 1) return 1;
            
            const orientation = readUint16(buffer, entryOffset + 8, littleEndian);
            
            // Validate orientation value (1-8)
            if (orientation < 1 || orientation > 8) return 1;
            
            return orientation;
          }
        }
        
        // Orientation tag not found in this APP1
        return 1;
      }
      
      // Skip to next segment
      offset += segmentLength;
    }
    
    return 1; // No EXIF APP1 found
  } catch (err) {
    return 1; // Any error returns default orientation
  }
}

/**
 * Apply EXIF orientation to RGBA pixel buffer (in-place transform).
 * Input: width, height, orientation (1-8), rgba buffer.
 * Returns: new dimensions [width, height] and transformed rgba buffer.
 */
export function applyOrientation(
  width: number,
  height: number,
  orientation: number,
  rgba: Buffer
): { width: number; height: number; rgba: Buffer } {
  if (orientation < 1 || orientation > 8 || orientation === 1) {
    return { width, height, rgba }; // No transform needed
  }
  
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  
  switch (orientation) {
    case 2: {
      // Flip horizontal
      const result = Buffer.alloc(rgba.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcOffset = y * stride + x * bytesPerPixel;
          const dstOffset = y * stride + (width - 1 - x) * bytesPerPixel;
          rgba.copy(result, dstOffset, srcOffset, srcOffset + bytesPerPixel);
        }
      }
      return { width, height, rgba: result };
    }
    
    case 3: {
      // Rotate 180°
      const result = Buffer.alloc(rgba.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcOffset = y * stride + x * bytesPerPixel;
          const dstOffset = (height - 1 - y) * stride + (width - 1 - x) * bytesPerPixel;
          rgba.copy(result, dstOffset, srcOffset, srcOffset + bytesPerPixel);
        }
      }
      return { width, height, rgba: result };
    }
    
    case 4: {
      // Flip vertical
      const result = Buffer.alloc(rgba.length);
      for (let y = 0; y < height; y++) {
        const srcOffset = y * stride;
        const dstOffset = (height - 1 - y) * stride;
        rgba.copy(result, dstOffset, srcOffset, srcOffset + stride);
      }
      return { width, height, rgba: result };
    }
    
    case 5: {
      // Transpose (flip horizontal + rotate 90° CW)
      const result = Buffer.alloc(height * width * bytesPerPixel);
      const newStride = height * bytesPerPixel;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcOffset = y * stride + x * bytesPerPixel;
          const dstOffset = x * newStride + y * bytesPerPixel;
          rgba.copy(result, dstOffset, srcOffset, srcOffset + bytesPerPixel);
        }
      }
      return { width: height, height: width, rgba: result };
    }
    
    case 6: {
      // Rotate 90° CW
      const result = Buffer.alloc(height * width * bytesPerPixel);
      const newStride = height * bytesPerPixel;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcOffset = y * stride + x * bytesPerPixel;
          const dstOffset = x * newStride + (height - 1 - y) * bytesPerPixel;
          rgba.copy(result, dstOffset, srcOffset, srcOffset + bytesPerPixel);
        }
      }
      return { width: height, height: width, rgba: result };
    }
    
    case 7: {
      // Transverse (flip horizontal + rotate 270° CW)
      const result = Buffer.alloc(height * width * bytesPerPixel);
      const newStride = height * bytesPerPixel;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcOffset = y * stride + x * bytesPerPixel;
          const dstOffset = (width - 1 - x) * newStride + (height - 1 - y) * bytesPerPixel;
          rgba.copy(result, dstOffset, srcOffset, srcOffset + bytesPerPixel);
        }
      }
      return { width: height, height: width, rgba: result };
    }
    
    case 8: {
      // Rotate 270° CW (90° CCW)
      const result = Buffer.alloc(height * width * bytesPerPixel);
      const newStride = height * bytesPerPixel;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcOffset = y * stride + x * bytesPerPixel;
          const dstOffset = (width - 1 - x) * newStride + y * bytesPerPixel;
          rgba.copy(result, dstOffset, srcOffset, srcOffset + bytesPerPixel);
        }
      }
      return { width: height, height: width, rgba: result };
    }
    
    default:
      return { width, height, rgba };
  }
}
