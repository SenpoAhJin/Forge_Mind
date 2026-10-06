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
