/**
 * Photo Categorization Service
 * Calls Flask /api/ai/categorize-photo endpoint
 */

import { AttireCategory } from '../types/owned-attire';

const FLASK_URL = 'http://localhost:5000'; // Flask AI service

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
    // Convert data URI to blob if needed (web)
    let blob: Blob;
    
    if (photoUri.startsWith('data:')) {
      // Data URI - convert to blob
      const response = await fetch(photoUri);
      blob = await response.blob();
    } else {
      // File URI (native) - use fetch to get blob
      const response = await fetch(photoUri);
      blob = await response.blob();
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('photo', blob, 'photo.jpg');
    
    // Call Flask endpoint
    const response = await fetch(`${FLASK_URL}/api/ai/categorize-photo`, {
      method: 'POST',
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
