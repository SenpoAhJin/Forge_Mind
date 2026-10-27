/**
 * Photo Utilities for Owned Items
 * 
 * Helper to convert stored photo_urls into usable image sources across platforms.
 */

import { API_BASE_URL } from '../config/api';

/**
 * Convert a stored photo_urls[0] value into a display-ready URI.
 * 
 * - Server paths (/uploads/...) -> full URL built from API_BASE_URL
 * - data: URIs -> use as-is
 * - http(s): URLs -> use as-is
 * - blob:/ file:/ or empty/null -> return null (no photo available)
 * 
 * NEVER store localhost or LAN IPs in database. Always store relative server paths.
 * Build full URLs at display time so they work across devices.
 */
export function getOwnedItemPhotoUri(photoUrl: string | null | undefined): string | null {
  if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
    return null;
  }

  const trimmed = photoUrl.trim();

  // data: URIs (inline base64) - use as-is
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Full http(s) URLs - use as-is (for compatibility with old data)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Server relative path - build full URL from API_BASE_URL
  if (trimmed.startsWith('/uploads/')) {
    const baseUrl = API_BASE_URL.replace(/\/+$/, ''); // Remove trailing slash
    return `${baseUrl}${trimmed}`;
  }

  // blob: or file: URIs are dead after app restart/refresh - treat as missing
  if (trimmed.startsWith('blob:') || trimmed.startsWith('file:')) {
    return null;
  }

  // Unknown format - treat as missing
  return null;
}

/**
 * Check if an item has a usable photo.
 */
export function hasUsablePhoto(photoUrls: (string | null)[] | null | undefined): boolean {
  if (!photoUrls || photoUrls.length === 0) return false;
  return getOwnedItemPhotoUri(photoUrls[0]) !== null;
}
