/**
 * Marketplace Registration Service
 *
 * The database is the source of truth. Before this existed the registration was
 * written to AsyncStorage only, so nothing reached the Head's Verify Cosplayers
 * queue and the "pending review" message was local fiction.
 *
 * Failures are returned as typed results rather than thrown, so a screen can
 * tell a 400 (show the message under the field) from a network failure (show a
 * retry) without parsing strings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import type {
  GetMyRegistrationResponse,
  MarketplaceRegistrationInput,
  SubmitRegistrationError,
  SubmitRegistrationResponse,
} from '../types/api/marketplace';

const STORAGE_KEYS = {
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";

async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Turns a response body into the error shape that matches its status code. */
function toError(status: number, body: unknown): SubmitRegistrationError {
  const record = isRecord(body) ? body : {};
  const message = typeof record.message === 'string' ? record.message : '';

  if (status === 400) {
    const fields: Record<string, string> = {};
    if (isRecord(record.fields)) {
      for (const [key, value] of Object.entries(record.fields)) {
        if (typeof value === 'string') fields[key] = value;
      }
    }
    return {
      kind: 'validation',
      fields,
      message: message || 'One or more fields are invalid',
    };
  }
  if (status === 401) {
    return { kind: 'auth', message: message || 'Your session expired. Please log in again.' };
  }
  if (status === 409) {
    return { kind: 'conflict', message: message || 'This registration cannot be changed right now.' };
  }
  return { kind: 'server', message: message || `Request failed (HTTP ${status})` };
}

/** Shared error for checkListing, excluding 409 which doesn't apply. */
function toCheckError(status: number, body: unknown): import('../types/api/marketplace').CheckListingError {
  const record = isRecord(body) ? body : {};
  const message = typeof record.message === 'string' ? record.message : '';

  if (status === 400) {
    const fields: Record<string, string> = {};
    if (isRecord(record.fields)) {
      for (const [key, value] of Object.entries(record.fields)) {
        if (typeof value === 'string') fields[key] = value;
      }
    }
    return {
      kind: 'validation',
      fields,
      message: message || 'One or more fields are invalid',
    };
  }
  if (status === 401) {
    return { kind: 'auth', message: message || 'Your session expired. Please log in again.' };
  }
  return { kind: 'server', message: message || `Request failed (HTTP ${status})` };
}

/**
 * POST /marketplace/registration
 * Upserts the caller's own registration. A rejected cosplayer resubmits through
 * this same call, which puts them back to pending server-side.
 */
export async function submitRegistration(
  input: MarketplaceRegistrationInput,
): Promise<{ ok: true; data: SubmitRegistrationResponse } | { ok: false; error: SubmitRegistrationError }> {
  const token = await getAuthToken();
  if (!token) {
    return { ok: false, error: { kind: 'auth', message: 'You are not signed in.' } };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/marketplace/registration`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: { kind: 'network', message: NETWORK_MESSAGE } };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, error: toError(response.status, body) };
  }
  if (!isRecord(body)) {
    return { ok: false, error: { kind: 'server', message: 'Unexpected response from the server.' } };
  }
  return { ok: true, data: body as unknown as SubmitRegistrationResponse };
}

/** GET /marketplace/registration/me. Returns null when nothing was submitted. */
export async function getMyRegistration(): Promise<{
  ok: boolean;
  data: GetMyRegistrationResponse | null;
  error: SubmitRegistrationError | null;
}> {
  const token = await getAuthToken();
  if (!token) {
    return {
      ok: false,
      data: null,
      error: { kind: 'auth', message: 'You are not signed in.' },
    };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/marketplace/registration/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, data: null, error: { kind: 'network', message: NETWORK_MESSAGE } };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, data: null, error: toError(response.status, body) };
  }
  if (!isRecord(body)) {
    return {
      ok: false,
      data: null,
      error: { kind: 'server', message: 'Unexpected response from the server.' },
    };
  }
  return { ok: true, data: body as unknown as GetMyRegistrationResponse, error: null };
}

/**
 * POST /marketplace/listings/check
 * Pre-publish moderation check for a listing. The screen calls this BEFORE saving
 * and blocks the save when allowed is false. Network failures or 5xx responses
 * also block the save (fail closed).
 */
export async function checkListing(
  input: import('../types/api/marketplace').CheckListingInput,
): Promise<
  | { ok: true; data: import('../types/api/marketplace').CheckListingResponse }
  | { ok: false; error: import('../types/api/marketplace').CheckListingError }
> {
  const token = await getAuthToken();
  if (!token) {
    return { ok: false, error: { kind: 'auth', message: 'You are not signed in.' } };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/marketplace/listings/check`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: { kind: 'network', message: NETWORK_MESSAGE } };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 429) {
      const message = isRecord(body) && typeof body.message === 'string' ? body.message : 'Too many requests. Please wait.';
      return { ok: false, error: { kind: 'rate_limit', message } };
    }
    return { ok: false, error: toCheckError(response.status, body) };
  }

  if (!isRecord(body) || typeof body.allowed !== 'boolean' || !Array.isArray(body.violations)) {
    return {
      ok: false,
      error: { kind: 'server', message: 'Unexpected response from the server.' },
    };
  }

  return { ok: true, data: body as unknown as import('../types/api/marketplace').CheckListingResponse };
}
