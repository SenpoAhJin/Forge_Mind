/**
 * Offers API Service
 *
 * Calls the marketplace offers endpoints on the forgemind-backend server.
 * Maps server errors to user-friendly messages that match existing app patterns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/api';
import { fetchWithTimeout, isNetworkError } from './http';
import { Offer, CreateOfferInput, OfferType, OfferStatus } from '../types/offers';

const STORAGE_KEYS = {
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
}

interface ServerOffer {
  offer_id: string;
  listing_id: string;
  proposer_user_id: string;
  seller_user_id?: string; // Only included in some endpoints (getOne, accept, decline, withdraw)
  offer_type: OfferType;
  status: OfferStatus;
  offered_price: number | null;
  trade_offered_item: string | null;
  trade_offered_condition: string | null;
  trade_offered_est_value: number | null;
  commission_description: string | null;
  timeline_days: number | null;
  offer_notes: string | null;
  listing_title: string | null;
  listing_price: number | null;
  proposer_display_name: string | null;
  seller_display_name: string | null;
  created_at: string;
  responded_at: string | null;
  updated_at: string;
}

/**
 * Map server offer to app Offer type.
 * Server does not include emails (privacy rule B1).
 * For received offers, seller_user_id can be inferred from context (current user).
 * For sent offers, seller_user_id is not available.
 */
function mapServerOffer(serverOffer: ServerOffer, options: { isReceived?: boolean; currentUserId?: string } = {}): Offer {
  return {
    id: serverOffer.offer_id,
    listing_id: serverOffer.listing_id,
    listing_title: serverOffer.listing_title || 'Untitled Listing',
    listing_price: serverOffer.listing_price || 0,
    listing_seller_email: '', // Server never returns emails
    listing_seller_user_id: serverOffer.seller_user_id || (options.isReceived ? options.currentUserId : null),
    seller_display_name: serverOffer.seller_display_name || 'Unknown Seller',
    proposer_user_id: serverOffer.proposer_user_id,
    proposer_email: '', // Server never returns emails
    proposer_display_name: serverOffer.proposer_display_name || 'Unknown User',
    offer_type: serverOffer.offer_type,
    status: serverOffer.status,
    offered_price: serverOffer.offered_price ?? undefined,
    trade_offered_item: serverOffer.trade_offered_item ?? undefined,
    trade_offered_condition: serverOffer.trade_offered_condition as any,
    trade_offered_est_value: serverOffer.trade_offered_est_value ?? undefined,
    commission_description: serverOffer.commission_description ?? undefined,
    timeline_days: serverOffer.timeline_days ?? undefined,
    created_at: serverOffer.created_at,
    responded_at: serverOffer.responded_at ?? undefined,
  };
}

/**
 * Map error response to user-friendly message
 */
function mapErrorMessage(status: number, error: any): string {
  // Only show network message for REAL transport failures
  if (status === 0 && isNetworkError(error)) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  switch (status) {
    case 401:
      return 'Please log in again to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'Listing not found. It may have been removed.';
    case 409:
    case 400:
      // Use server's own message when present
      const message = error?.message || error?.error;
      if (typeof message === 'string' && message.length > 0 && message.length < 200) {
        return message;
      }
      return status === 409
        ? 'This action cannot be completed. You may already have a pending offer.'
        : 'Invalid request. Please check your input and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * POST /marketplace/offers
 * Create a new offer on a listing
 */
export async function createOffer(
  input: CreateOfferInput
): Promise<{ success: true; offer: Offer } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to create an offer.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/offers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    const data = await response.json();
    // Newly created offer - current user is the proposer
    const offer = mapServerOffer(data, {});
    return { success: true, offer };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * GET /marketplace/offers/sent
 * Get offers sent by the current user
 */
export async function getSentOffers(currentUserId: string): Promise<{ success: true; offers: Offer[] } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to view your offers.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/offers/sent`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    const data = await response.json();
    const offers = (data.offers || []).map((o: ServerOffer) => mapServerOffer(o, {}));
    return { success: true, offers };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * GET /marketplace/offers/received
 * Get offers received by the current user (as seller)
 */
export async function getReceivedOffers(currentUserId: string): Promise<{ success: true; offers: Offer[] } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to view your offers.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/offers/received`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    const data = await response.json();
    const offers = (data.offers || []).map((o: ServerOffer) => mapServerOffer(o, { isReceived: true, currentUserId }));
    return { success: true, offers };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * GET /marketplace/offers/:id
 * Get a single offer by ID
 */
export async function getOffer(
  offerId: string
): Promise<{ success: true; offer: Offer } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to view this offer.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/offers/${offerId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    const data = await response.json();
    const offer = mapServerOffer(data, {});
    return { success: true, offer };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * POST /marketplace/offers/:id/accept
 * Accept an offer (seller only)
 */
export async function acceptOffer(
  offerId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to accept an offer.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/offers/${offerId}/accept`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * POST /marketplace/offers/:id/decline
 * Decline an offer (seller only)
 */
export async function declineOffer(
  offerId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to decline an offer.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/offers/${offerId}/decline`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * POST /marketplace/offers/:id/withdraw
 * Withdraw an offer (proposer only)
 */
export async function withdrawOffer(
  offerId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to withdraw an offer.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/offers/${offerId}/withdraw`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}
