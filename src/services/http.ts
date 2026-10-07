/**
 * Shared HTTP request helper.
 *
 * One place owns the timeout and the reachable/unreachable bookkeeping:
 * any HTTP response marks the server reachable; any network failure (throw,
 * abort, connect exception, timeout) marks it unreachable. Every service uses
 * this instead of calling fetch() directly.
 */

import { REQUEST_TIMEOUT_MS } from '../config/api';
import { markReachable, markUnreachable } from './serverStatus';

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, ...init });
    // Any status code proves the server answered: 401, 409, 500, whatever.
    markReachable();
    return response;
  } catch (error) {
    markUnreachable();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * True when a thrown error came from the network (refused, dropped, timeout,
 * abort, "Failed to fetch", a connect exception). False for programming errors
 * thrown by our own code before or after fetch.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    const message = error.message.toLowerCase();
    if (message.includes('network request failed')) return true;
    if (message.includes('failed to fetch')) return true;
    if (message.includes('failed to connect')) return true;
    if (message.includes('connectexception')) return true;
    if (message.includes('connection refused')) return true;
    if (message.includes('network error')) return true;
    if (message.includes('timed out')) return true;
    if (message.includes('enotfound')) return true;
    if (message.includes('econnrefused')) return true;
    if (message.includes('econnreset')) return true;
    if (message.includes('fetch failed')) return true;
  }
  return false;
}