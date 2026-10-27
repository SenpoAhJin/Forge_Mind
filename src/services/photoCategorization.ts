/**
 * Photo Categorization Service
 * Calls backend proxy /api/ai/categorize-photo endpoint (which proxies to Flask)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { AttireCategory } from '../types/owned-attire';

const STORAGE_KEYS = {
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

export interface PhotoCategorizationResult {
  category: AttireCategory;
  slot: string;
  dominant_colors: string[];
  style_tags: string[];
  confidence: number;
  source: 'openai_vision' | 'baseline' | 'error';
}

export async function categorizePhoto(
  photoUri: string
): Promise<PhotoCategorizationResult | null> {
  try {
    const sessionToken = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (!sessionToken) {
      console.error('[PhotoCategorization] No session token');
      return null;
    }

    // Create form data
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Web: fetch the URI as a Blob
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: blob.type });
      formData.append('photo', file);
    } else {
      // Native: append { uri, name, type }
      formData.append('photo', {
        uri: photoUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);
    }
    
    // Call backend proxy endpoint (which forwards to Flask with session token)
    const response = await fetch(`${API_BASE_URL}/api/ai/categorize-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        // No Content-Type - FormData sets it automatically with boundary
      },
      body: formData,
    });
    
    if (!response.ok) {
      console.error('[PhotoCategorization] API error:', response.status, await response.text());
      return null;
    }
    
    const result = await response.json();
    console.log('[PhotoCategorization] Result:', result);
    
    return result as PhotoCategorizationResult;
  } catch (error) {
    console.error('[PhotoCategorization] Error:', error);
    return null;
  }
}
