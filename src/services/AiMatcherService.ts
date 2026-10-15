/**
 * AI Attire Matcher Service
 *
 * Calls backend AI matcher proxy to match owned attire against character variants.
 * Backend transforms request and proxies to Flask AI service.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/api';
import { fetchWithTimeout } from './http';
import type { OwnedAttire } from '../types/owned-attire';

export interface MatchRequest {
  character_variant_id: string;
  owned_attire: OwnedAttire[];
}

export interface MatchedItem {
  item_id: string;
  name: string;
  score: number;
  confidence: 'excellent' | 'good' | 'fair' | 'poor' | 'no-match';
  breakdown: {
    color: number;
    keywords: number;
    category: number;
  };
}

export interface MissingItem {
  category: string;
  requirements: Record<string, unknown>;
  keywords: string[];
}

export interface MatchQuality {
  overall_score: number;
  quality_label: 'excellent' | 'good' | 'acceptable' | 'incomplete' | 'no-data' | 'no-matches';
  completeness?: number;
  average_match_score?: number;
}

export interface MatchResult {
  character_variant_id: string;
  character_name: string;
  variant_name: string;
  suggested_outfit: Record<string, MatchedItem>;
  alternatives: Record<string, MatchedItem[]>;
  missing_items: MissingItem[];
  match_quality: MatchQuality;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Call AI matcher to find best attire matches for a character variant
 *
 * Requires authenticated session with verified marketplace account.
 *
 * @param request - Match request (character_variant_id, owned_attire, optional body settings)
 * @returns Match result with suggested outfit, alternatives, and missing items
 */
export async function matchAttire(request: MatchRequest): Promise<ApiResponse<MatchResult>> {
  try {
    const token = await AsyncStorage.getItem('@forgemind:session_token');
    if (!token) {
      return {
        success: false,
        error: 'not_authenticated',
        message: 'Session token not found. Please log in.',
      };
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/ai/match`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      // Parse error response
      let errorData: { error?: string; message?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // Fallback if response is not JSON
      }

      if (response.status === 401) {
        return {
          success: false,
          error: 'not_authenticated',
          message: 'Session expired. Please log in again.',
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'not_verified',
          message: errorData.message || 'Marketplace verification required.',
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          error: 'character_not_found',
          message: errorData.message || 'Character variant not found.',
        };
      }

      if (response.status === 502) {
        return {
          success: false,
          error: 'ai_service_unavailable',
          message: errorData.message || 'AI matching service is temporarily unavailable.',
        };
      }

      return {
        success: false,
        error: errorData.error || 'api_error',
        message: errorData.message || `API error: ${response.status}`,
      };
    }

    const result: MatchResult = await response.json();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[AiMatcherService] matchAttire error:', error);

    // Check if it's a network error
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'timeout',
          message: 'Request timed out. Please try again.',
        };
      }

      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        return {
          success: false,
          error: 'network_error',
          message: 'Network error. Check your connection and try again.',
        };
      }
    }

    return {
      success: false,
      error: 'unknown_error',
      message: 'An unexpected error occurred.',
    };
  }
}

/**
 * Test connection to AI matcher service (health check via backend)
 *
 * @returns true if service is reachable, false otherwise
 */
export async function testAiMatcherConnection(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('@forgemind:session_token');
    if (!token) return false;

    // Try a minimal match request with empty owned_attire
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/ai/match`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          character_variant_id: 'test-connection',
          owned_attire: [],
        }),
      },
      5000, // Short timeout for health check
    );

    // 404 character not found means backend and Flask are reachable
    // 400 validation error also means reachable
    return response.status === 404 || response.status === 400 || response.ok;
  } catch {
    return false;
  }
}
