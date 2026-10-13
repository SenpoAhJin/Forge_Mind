/**
 * Chat API Service
 *
 * Calls marketplace chat endpoints on forgemind-backend server.
 * Server screens messages at send-time with rule-based word filter (no AI).
 * Chat content is not stored for analysis.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/api';
import { fetchWithTimeout, isNetworkError } from './http';

const STORAGE_KEYS = {
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
}

/** Thread object from server */
export interface ServerThread {
  thread_id: string;
  listing_id: string;
  listing_title: string;
  seller_user_id: string;
  seller_display_name: string;
  buyer_user_id: string;
  buyer_display_name: string;
  status: 'open' | 'closed';
  closed_reason: 'closed_by_participant' | 'listing_unavailable' | null;
  closed_at: string | null;
  created_at: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  has_unread?: boolean; // Only in GET /threads
}

/** Message object from server */
export interface ServerMessage {
  message_id: string;
  thread_id: string;
  sender_user_id: string;
  sender_display_name: string;
  body: string;
  created_at: string;
}

/** Map error response to user-friendly message */
function mapErrorMessage(status: number, error: any): string {
  // Only show network message for REAL transport failures
  if (status === 0 && isNetworkError(error)) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  switch (status) {
    case 401:
      return 'Please log in again to continue.';
    case 403:
      const msg = error?.error;
      if (msg === 'marketplace_verification_required') {
        return 'You must be verified to use chat. Please complete marketplace verification.';
      }
      if (msg === 'cannot_message_own_listing') {
        return 'You cannot start a chat on your own listing.';
      }
      return 'You do not have permission to perform this action.';
    case 404:
      return error?.error === 'thread_not_found'
        ? 'Conversation not found.'
        : 'Listing not found. It may have been removed.';
    case 400:
      const err = error?.error;
      if (err === 'listing_not_active') {
        return 'This listing is no longer accepting messages.';
      }
      if (err === 'thread_closed') {
        return 'This conversation is closed.';
      }
      if (err === 'listing_unavailable') {
        return 'This listing is no longer available.';
      }
      if (err === 'body_empty') {
        return 'Message cannot be empty.';
      }
      if (err === 'body_too_long') {
        return 'Message is too long (max 1000 characters).';
      }
      if (err === 'thread_already_closed') {
        return 'This conversation is already closed.';
      }
      // Use server's message when present
      const message = error?.message || error?.error;
      if (typeof message === 'string' && message.length > 0 && message.length < 200) {
        return message;
      }
      return 'Invalid request. Please check your input and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * POST /marketplace/chat/threads
 * Create or get thread for buyer on listing
 */
export async function createThread(
  listing_id: string
): Promise<{ success: true; thread: ServerThread } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to start a conversation.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/chat/threads`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listing_id }),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    const thread = await response.json();
    return { success: true, thread };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * GET /marketplace/chat/threads
 * Get caller's threads with at least one message
 */
export async function getThreads(): Promise<
  { success: true; threads: ServerThread[] } | { success: false; error: string }
> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to view conversations.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/chat/threads`,
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
    return { success: true, threads: data.threads || [] };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * GET /marketplace/chat/threads/:id
 * Get thread with all messages
 */
export async function getThread(
  thread_id: string
): Promise<
  { success: true; thread: ServerThread; messages: ServerMessage[] } | { success: false; error: string }
> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to view this conversation.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/chat/threads/${thread_id}`,
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
    return { success: true, thread: data.thread, messages: data.messages || [] };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * POST /marketplace/chat/threads/:id/messages
 * Send message (with send-time screening)
 */
export async function sendMessage(
  thread_id: string,
  body: string
): Promise<
  | { success: true; message: ServerMessage }
  | { success: false; error: string; blocked?: boolean; blockMessage?: string }
> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to send a message.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/chat/threads/${thread_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      
      // 422 message_blocked: return typed result with server's message
      if (response.status === 422 && error?.error === 'message_blocked') {
        return {
          success: false,
          error: error.message || "This message can't be sent. Please rephrase it.",
          blocked: true,
          blockMessage: error.message || "This message can't be sent. Please rephrase it.",
        };
      }
      
      return { success: false, error: mapErrorMessage(response.status, error) };
    }

    const message = await response.json();
    return { success: true, message };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}

/**
 * POST /marketplace/chat/threads/:id/close
 * Close thread manually
 */
export async function closeThread(
  thread_id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in to close a conversation.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/chat/threads/${thread_id}/close`,
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
 * POST /marketplace/chat/threads/:id/read
 * Mark thread as read
 */
export async function markThreadRead(
  thread_id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/chat/threads/${thread_id}/read`,
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
 * GET /marketplace/chat/unread-count
 * Get total unread thread count
 */
export async function getUnreadCount(): Promise<
  { success: true; unread_count: number } | { success: false; error: string }
> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'You must be logged in.' };
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/marketplace/chat/unread-count`,
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
    return { success: true, unread_count: data.unread_count || 0 };
  } catch (error) {
    return { success: false, error: mapErrorMessage(0, error) };
  }
}
