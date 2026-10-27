/**
 * Photo Upload Service for Owned Items
 *
 * Handles photo upload and URL construction for owned attire items.
 * Photos are uploaded to /inventory/photos and stored with full server URLs.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/api';
import { fetchWithTimeout, isNetworkError } from './http';
import { logApiIssue } from '../utils/debugLog';

const STORAGE_KEYS = {
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface OwnedItemPhotoUploadResult {
  success: boolean;
  photo_id?: string;
  url?: string;
  error?: string;
  errorCode?: 'unsupported_type' | 'photo_too_large' | 'no_file' | 'auth' | 'network' | 'server';
}

class OwnedItemPhotoService {
  /**
   * Upload a single photo to the owned items photos endpoint.
   * Returns photo_id and full URL on success.
   */
  static async uploadPhoto(uri: string, filename?: string, mimeType?: string): Promise<OwnedItemPhotoUploadResult> {
    try {
      const sessionToken = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      if (!sessionToken) {
        return {
          success: false,
          error: 'You must be signed in to upload photos.',
          errorCode: 'auth',
        };
      }

      // Create FormData
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // Web: fetch the blob URI and convert to File
        try {
          console.log('[OwnedItemPhotoService] Fetching blob for web upload:', uri.substring(0, 80));
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.status}`);
          }
          const blob = await response.blob();
          console.log('[OwnedItemPhotoService] Blob fetched, size:', blob.size, 'type:', blob.type);
          const file = new File([blob], filename || 'photo.jpg', { type: mimeType || blob.type });
          formData.append('photo', file);
        } catch (error) {
          console.error('[OwnedItemPhotoService] Failed to read blob:', error);
          return {
            success: false,
            error: 'Failed to read photo file. Please try again.',
            errorCode: 'network',
          };
        }
      } else {
        // Native: append { uri, name, type }
        formData.append('photo', {
          uri,
          name: filename || 'photo.jpg',
          type: mimeType || 'image/jpeg',
        } as any);
      }

      // DO NOT set Content-Type header - let fetch/XMLHttpRequest set it with boundary
      console.log('[OwnedItemPhotoService] Uploading to:', `${API_BASE_URL}/inventory/photos`);
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/inventory/photos`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            // No Content-Type - FormData sets it automatically with boundary
          },
          body: formData,
        },
        REQUEST_TIMEOUT_MS,
      );

      console.log('[OwnedItemPhotoService] Upload response status:', response.status);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error('[OwnedItemPhotoService] Upload failed:', response.status, data);
        return this.handleUploadError(response.status, data);
      }

      const data = await response.json();
      console.log('[OwnedItemPhotoService] Upload success:', data);
      if (!data.photo_id || !data.url) {
        return {
          success: false,
          error: 'Unexpected response from server.',
          errorCode: 'server',
        };
      }

      // Server returns full URL already, use it directly
      return {
        success: true,
        photo_id: data.photo_id,
        url: data.url,
      };
    } catch (error) {
      if (isNetworkError(error)) {
        logApiIssue('OwnedItemPhotoService', 'network', 'unreachable');
        return {
          success: false,
          error: "Can't reach the server. Check your connection and try again.",
          errorCode: 'network',
        };
      }
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Upload took too long. Please check your connection and try again.',
          errorCode: 'network',
        };
      }
      return {
        success: false,
        error: 'Failed to upload photo. Please try again.',
        errorCode: 'server',
      };
    }
  }

  /**
   * Validate photo before upload (client-side checks).
   * Returns error message if invalid, null if valid.
   */
  static validatePhoto(uri: string, fileSize?: number, mimeType?: string): string | null {
    // Check MIME type if available
    if (mimeType && !ALLOWED_TYPES.includes(mimeType.toLowerCase())) {
      return 'Only JPEG, PNG, and WebP images are supported.';
    }

    // Check file size if available
    if (fileSize !== undefined && fileSize > MAX_PHOTO_SIZE_BYTES) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      return `Photo is too large (${sizeMB} MB). Maximum size is 5 MB.`;
    }

    return null;
  }

  /**
   * Handle upload error responses with specific error codes.
   */
  private static handleUploadError(status: number, data: any): OwnedItemPhotoUploadResult {
    const message = typeof data.message === 'string' ? data.message : '';
    const error = typeof data.error === 'string' ? data.error : '';

    if (status === 400) {
      if (error === 'unsupported_type') {
        return {
          success: false,
          error: message || 'Only JPEG, PNG, and WebP images are supported.',
          errorCode: 'unsupported_type',
        };
      }
      if (error === 'no_file') {
        return {
          success: false,
          error: message || 'No photo file provided.',
          errorCode: 'no_file',
        };
      }
      return {
        success: false,
        error: message || 'Invalid photo file.',
        errorCode: 'server',
      };
    }

    if (status === 401) {
      return {
        success: false,
        error: message || 'Your session expired. Please log in again.',
        errorCode: 'auth',
      };
    }

    if (status === 413) {
      return {
        success: false,
        error: message || 'Photo is too large. Maximum size is 5 MB.',
        errorCode: 'photo_too_large',
      };
    }

    return {
      success: false,
      error: message || `Upload failed (HTTP ${status})`,
      errorCode: 'server',
    };
  }
}

export default OwnedItemPhotoService;
