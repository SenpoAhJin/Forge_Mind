/**
 * Development-only logging utility
 * 
 * Logs to console in __DEV__ mode, silent in production.
 * 
 * Usage:
 *   import { debugLog } from '../utils/debugLog';
 *   debugLog('MarketplaceApi', 'Failed to fetch listings', error);
 */

export function debugLog(tag: string, message: string, data?: unknown): void {
  if (__DEV__) {
    if (data !== undefined) {
      console.warn(`[${tag}] ${message}`, data);
    } else {
      console.warn(`[${tag}] ${message}`);
    }
  }
}

/**
 * Quiet, throttled logging for EXPECTED failures (a server that is just not
 * reachable). One console.log line per tag per 30 seconds, in __DEV__ only.
 * Never logs listing text, request bodies, tokens or credentials — only the
 * tag, the issue kind and a code.
 */
const LAST_API_ISSUE_MS: Record<string, number> = {};

export function logApiIssue(
  tag: string,
  issue: 'network' | 'http',
  code: number | string,
): void {
  if (!__DEV__) return;
  const now = Date.now();
  const key = `${tag}:${issue}`;
  if (LAST_API_ISSUE_MS[key] !== undefined && now - LAST_API_ISSUE_MS[key] < 30000) return;
  LAST_API_ISSUE_MS[key] = now;
  console.log(`[${tag}] ${issue} ${code}`);
}