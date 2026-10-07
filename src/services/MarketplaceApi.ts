/**
 * ForgeMind Marketplace API Service
 *
 * Handles all marketplace listing operations with the backend server.
 * Uses the same patterns as AuthService for error handling and authorization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/api';
import { fetchWithTimeout, isNetworkError } from './http';
import { logApiIssue } from '../utils/debugLog';

const STORAGE_KEYS = {
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

export interface CreateListingRequest {
  post_type: 'sell' | 'trade' | 'commission';
  title: string;
  description: string;
  category: string;
  condition?: string;
  price?: number;
  rate?: number;
  trade_offered_item?: string;
  trade_wanted_item?: string;
}

export interface Listing {
  id: string;
  post_type: 'sell' | 'trade' | 'commission';
  title: string;
  description: string;
  category: string;
  condition: string;
  price?: number;
  rate?: number;
  trade_offered_item?: string;
  trade_wanted_item?: string;
  status: 'active' | 'blocked' | 'cancelled' | 'sold';
  screening_result?: 'passed' | 'blocked';
  screening_reason?: string | null;
  appeal_status?: 'none' | 'pending' | 'approved' | 'rejected';
  seller_user_id?: string;
  seller_name?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
  locked_until?: string;
  next_penalty?: 'lock_10m' | 'lock_7d' | 'ban';
  action?: 'none' | 'lock' | 'ban';
}

class MarketplaceApi {
  /** GET /marketplace/listings - Browse active marketplace listings */
  static async getListings(limit = 50, offset = 0): Promise<ApiResponse<Listing[]>> {
    try {
      const url = `${API_BASE_URL}/marketplace/listings?limit=${limit}&offset=${offset}`;
      const response = await this.apiFetch(url, { method: 'GET' });

      if (!response.ok) {
        return { success: false, error: await this.errorMessage(response) };
      }

      const data = (await response.json()) as { listings: Listing[] };
      return { success: true, data: data.listings };
    } catch (error) {
      return { success: false, error: this.transportErrorMessage(error) };
    }
  }

  /** GET /marketplace/listings/mine - Get current user's listings (all states) */
  static async getMyListings(): Promise<ApiResponse<Listing[]>> {
    try {
      const url = `${API_BASE_URL}/marketplace/listings/mine`;
      const response = await this.apiFetch(url, { method: 'GET' });

      if (!response.ok) {
        return { success: false, error: await this.errorMessage(response) };
      }

      const data = (await response.json()) as { listings: Listing[] };
      return { success: true, data: data.listings };
    } catch (error) {
      return { success: false, error: this.transportErrorMessage(error) };
    }
  }

  /** POST /marketplace/listings - Create a new listing */
  static async createListing(listing: CreateListingRequest): Promise<ApiResponse<Listing>> {
    try {
      const url = `${API_BASE_URL}/marketplace/listings`;
      const response = await this.apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(listing),
      });

      if (!response.ok) {
        // Handle specific error cases
        const data = await response.json().catch(() => ({}));
        
        // 423 posting_locked
        if (response.status === 423 && data.error === 'posting_locked') {
          return {
            success: false,
            error: data.message || 'Posting is paused for now',
            locked_until: typeof data.locked_until === 'string' ? data.locked_until : undefined,
          };
        }
        
        // 403 account_banned
        if (response.status === 403 && data.error === 'account_banned') {
          return {
            success: false,
            error: 'account_banned',
          };
        }
        
        // 422 listing_quality - return field errors
        if (response.status === 422 && data.error === 'listing_quality' && data.fields) {
          return {
            success: false,
            error: data.message || 'Please check your input and try again.',
            fieldErrors: data.fields,
          };
        }
        
        // 409 duplicate_listing - return plain message
        if (response.status === 409 && data.error === 'duplicate_listing') {
          return {
            success: false,
            error: data.message || 'You already have this listing on the marketplace.',
          };
        }
        
        // 422 content_rejected (moderation) - include strike info
        if (response.status === 422 && data.error === 'content_rejected') {
          return {
            success: false,
            error: 'This listing could not be posted. Please review the content and try again.',
            next_penalty: data.next_penalty,
            action: data.action,
            locked_until: typeof data.locked_until === 'string' ? data.locked_until : undefined,
          };
        }
        
        return { success: false, error: await this.errorMessage(response) };
      }

      const data = (await response.json()) as { listing: Listing };
      return { success: true, data: data.listing };
    } catch (error) {
      return { success: false, error: this.transportErrorMessage(error) };
    }
  }

  /** POST /marketplace/listings/:id/remove - Mark listing as cancelled */
  static async removeListing(listingId: string, reason?: string): Promise<ApiResponse<void>> {
    try {
      const url = `${API_BASE_URL}/marketplace/listings/${listingId}/remove`;
      const body = reason ? JSON.stringify({ removed_reason: reason }) : '{}';
      const response = await this.apiFetch(url, {
        method: 'POST',
        body,
      });

      if (!response.ok) {
        return { success: false, error: await this.errorMessage(response) };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: this.transportErrorMessage(error) };
    }
  }

  /** DELETE /marketplace/listings/:id - Permanently delete a listing (removed/blocked only) */
  static async deleteListingPermanently(listingId: string): Promise<ApiResponse<void>> {
    try {
      const url = `${API_BASE_URL}/marketplace/listings/${listingId}`;
      const response = await this.apiFetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        return { success: false, error: await this.errorMessage(response) };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: this.transportErrorMessage(error) };
    }
  }

  /** POST /marketplace/listings/:id/appeal - Appeal a blocked listing */
  static async appealListing(listingId: string, message: string): Promise<ApiResponse<void>> {
    try {
      const url = `${API_BASE_URL}/marketplace/listings/${listingId}/appeal`;
      const response = await this.apiFetch(url, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        return { success: false, error: await this.errorMessage(response) };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: this.transportErrorMessage(error) };
    }
  }

  /** Fetch with authorization header and timeout */
  private static async apiFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      const sessionToken = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> ?? {}),
      };

      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      } else {
        // Signed out: every marketplace endpoint requires a live session, so
        // answer 401 locally instead of spending a network round-trip (and
        // logging a warning) on a request the server is guaranteed to reject.
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          url,
          json: async () => ({
            error: 'invalid_session',
            message: 'You must be signed in to access the marketplace.',
          }),
        } as unknown as Response;
      }

      return await fetchWithTimeout(url, { ...init, headers }, REQUEST_TIMEOUT_MS);
    } finally {
      // timeouts and reachability are owned by fetchWithTimeout
    }
  }

  /**
   * Maps HTTP status + error body to actionable user messages
   * Following AuthService pattern
   */
  private static async errorMessage(response: Response): Promise<string> {
    const statusDefaults: Record<number, string> = {
      401: 'You must be signed in to access the marketplace.',
      403: 'You do not have permission to perform this action.',
      400: 'Please check your information and try again.',
      409: 'This action cannot be performed in the listing\'s current state.',
      404: 'This listing could not be found.',
      503: 'The marketplace is temporarily unavailable. Please try again later.',
      500: 'The server encountered an error. Please try again.',
    };

    let message = statusDefaults[response.status] ?? 'Something went wrong. Please try again.';

    try {
      const data = await response.json();

      if (response.status === 503 && data.error === 'db_unavailable') {
        message = statusDefaults[503];
      } else if (response.status === 400 && data.message) {
        message = data.message;
      } else if (data && typeof data.message === 'string' && data.message.trim() !== '') {
        message = data.message;
      } else if (data && typeof data.error === 'string' && data.error.trim() !== '') {
        message = data.error;
      }
    } catch {
      // Non-JSON error: use status default
    }

    if (__DEV__) {
      // Only a 5xx means the server itself is broken; lower statuses are
      // expected, user-visible outcomes (signed-out, validation, permissions,
      // conflicts) so they are logged quietly. The URL is included so any
      // remaining warning pinpoints the exact endpoint.
      const target = response.url ? ` for ${response.url}` : '';
      const line = `server replied ${response.status}${target}: ${message}`;
      if (response.status >= 500) {
        console.warn(`[MarketplaceApi] ${line}`);
      } else {
        console.log(`[MarketplaceApi] ${line}`);
      }
    }

    return message;
  }

  /**
   * Network error handling
   * Following AuthService pattern
   */
  private static transportErrorMessage(error: unknown): string {
    if (isNetworkError(error)) {
      logApiIssue('MarketplaceApi', 'network', 'unreachable');
      return 'Can\'t reach the server. Check your connection and try again.';
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return 'The request took too long. Please check your connection and try again.';
    }
    return 'Network error. Please check your connection and try again.';
  }

  /** GET /marketplace/me/status - Get current user's posting status */
  static async getMyStatus(): Promise<ApiResponse<{ posting_locked_until: string | null; banned: boolean; next_penalty: 'lock_10m' | 'lock_7d' | 'ban' }>> {
    try {
      const url = `${API_BASE_URL}/marketplace/me/status`;
      const response = await this.apiFetch(url, { method: 'GET' });

      if (!response.ok) {
        // Failure is ignored per requirements - never blank the screen
        return { success: false, error: await this.errorMessage(response) };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      // Failure is ignored per requirements
      return { success: false, error: this.transportErrorMessage(error) };
    }
  }
}

export default MarketplaceApi;
