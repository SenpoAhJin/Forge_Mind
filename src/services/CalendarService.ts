/**
 * Calendar API Service
 * Backend integration for public event listings
 */

import { API_BASE_URL } from '../config/api';
import {
  CalendarListing,
  CalendarListingStatus,
  CreateCalendarListingInput,
  UpdateCalendarListingInput,
  ReviewCalendarListingInput,
  CalendarListingsResponse,
  CalendarListingResponse,
} from '../types/api/calendar';

const CALENDAR_API_BASE = `${API_BASE_URL}/calendar`;
const REQUEST_TIMEOUT = 15000;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const SESSION_TOKEN_KEY = '@forgemind:session_token';

/** Get auth token from session storage */
async function getAuthToken(): Promise<string | null> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token;
  } catch {
    return null;
  }
}

/** Common fetch wrapper with auth + timeout */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Server error: ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error).name === 'AbortError') {
      return { success: false, error: 'Request timed out' };
    }
    return {
      success: false,
      error: "Can't reach the server. Check your connection.",
    };
  }
}

export class CalendarService {
  /**
   * GET /calendar
   * List all listings (filtered by role on server)
   */
  static async listListings(
    status?: CalendarListingStatus
  ): Promise<ApiResponse<CalendarListing[]>> {
    const query = status ? `?status=${status}` : '';
    const result = await apiFetch<CalendarListingsResponse>(`/${query}`);
    if (result.success && result.data) {
      return { success: true, data: result.data.listings };
    }
    return { success: false, error: result.error };
  }

  /**
   * GET /calendar/:id
   * Get one listing
   */
  static async getListing(id: string): Promise<ApiResponse<CalendarListing>> {
    const result = await apiFetch<CalendarListingResponse>(`/${id}`);
    if (result.success && result.data) {
      return { success: true, data: result.data.listing };
    }
    return { success: false, error: result.error };
  }

  /**
   * POST /calendar
   * Create new listing (server determines status based on role)
   */
  static async createListing(
    input: CreateCalendarListingInput
  ): Promise<ApiResponse<CalendarListing>> {
    const result = await apiFetch<CalendarListingResponse>('/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (result.success && result.data) {
      return { success: true, data: result.data.listing };
    }
    return { success: false, error: result.error };
  }

  /**
   * PUT /calendar/:id
   * Update listing (server enforces permissions)
   */
  static async updateListing(
    id: string,
    input: UpdateCalendarListingInput
  ): Promise<ApiResponse<CalendarListing>> {
    const result = await apiFetch<CalendarListingResponse>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    if (result.success && result.data) {
      return { success: true, data: result.data.listing };
    }
    return { success: false, error: result.error };
  }

  /**
   * PATCH /calendar/:id/review
   * Approve or reject listing (Head only)
   */
  static async reviewListing(
    id: string,
    input: ReviewCalendarListingInput
  ): Promise<ApiResponse<CalendarListing>> {
    const result = await apiFetch<CalendarListingResponse>(`/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    if (result.success && result.data) {
      return { success: true, data: result.data.listing };
    }
    return { success: false, error: result.error };
  }

  /**
   * DELETE /calendar/:id
   * Delete listing (server enforces permissions)
   */
  static async deleteListing(id: string): Promise<ApiResponse<void>> {
    const result = await apiFetch<{ success: boolean }>(`/${id}`, {
      method: 'DELETE',
    });
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  }
}
