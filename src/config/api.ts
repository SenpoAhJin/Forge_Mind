/**
 * Backend API configuration.
 *
 * This file is the ONLY place a backend URL is built. `AuthService` and anything
 * added later must go through `authUrl()` / `API_BASE_URL` rather than assembling
 * a URL themselves.
 *
 * THE PROBLEM THIS SOLVES
 *
 * `localhost` means "the machine running this code". That is correct on the web
 * and on the iOS simulator, and wrong everywhere else:
 *
 *   - a physical phone   -> `localhost` is the PHONE. Nothing is listening there.
 *   - an Android emulator-> `localhost` is the emulator itself.
 *
 * The resolution order lives in `apiBaseUrl.ts` (pure, testable):
 *
 *   a. `EXPO_PUBLIC_API_URL`, if set (web and native).
 *   b. web: `window.location.hostname:3000` — never Metro's hostUri.
 *   c. native: `http://<Metro host>:3000`, from `expo-constants`.
 *   d. Android emulator fallback: `http://10.0.2.2:3000`.
 *
 * Changing the value requires restarting Metro with the cache cleared, because
 * Expo inlines `process.env.EXPO_PUBLIC_*` into the bundle at build time:
 *
 *     npx expo start -c
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  getApiBaseUrl,
  parseHost,
  isLoopbackHost,
  HEALTH_PING_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
} from './apiBaseUrl';

export { parseHost, isLoopbackHost, HEALTH_PING_TIMEOUT_MS, REQUEST_TIMEOUT_MS };

const resolved = getApiBaseUrl({
  platform: Platform.OS,
  hostUri: Platform.OS !== 'web' ? (Constants.expoConfig?.hostUri ?? '') : '',
  windowLocationHost:
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location
      ? window.location.hostname
      : '',
  envUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
});

/** The one base URL every backend call must use. */
export const API_BASE_URL = resolved.url;

/**
 * Where `API_BASE_URL` came from. Shown in the dev log and asserted in
 * `docs/TEST_MATRIX.md`, because "it picked the wrong source" is the first
 * thing to check when a phone cannot reach the backend.
 */
export const API_BASE_URL_SOURCE = resolved.source;

/** True when the resolved URL is a real address rather than a loopback one. */
export const IS_API_URL_LAN = !isLoopbackHost(parseHost(API_BASE_URL));

if (__DEV__) {
  console.log(
    `[api] backend base URL: ${API_BASE_URL} (source: ${API_BASE_URL_SOURCE}; ` +
      `platform: ${Platform.OS})`,
  );

  /**
   * Dev-only reachability probe.
   *
   * Resolving the URL correctly is not the same as reaching it: a wrong port, a
   * firewall block or a server that is not running all produce the same
   * "Fetch request has been canceled" on the device. One line at startup says
   * which of those it is, before the user types a password.
   *
   * Fire-and-forget: it never rejects, never throws and never blocks the bundle,
   * and it is bounded by HEALTH_PING_TIMEOUT_MS so the first render, the login
   * screen and the session restore are never held up by a dead backend.
   * A 500 still proves the phone reached the server, so the status is reported
   * alongside a readable result rather than treated as a failure.
   */
  void (async () => {
    const url = `${API_BASE_URL}/health`;
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_PING_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const ms = Date.now() - startedAt;
      const reachable = response.ok ? 'reachable' : `reachable (HTTP ${response.status})`;
      console.log(`[api] health ping ${url} -> ${reachable} in ${ms} ms`);
    } catch (error) {
      const ms = Date.now() - startedAt;
      const name = (error as { name?: string } | null)?.name ?? 'Error';
      console.log(
        `[api] health ping ${url} -> unreachable after ${ms} ms (${name})`,
      );
    } finally {
      clearTimeout(timer);
    }
  })();
}

/** Joins a path onto the base URL, e.g. authUrl('/login') -> 'http://.../auth/login'. */
export function authUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}/auth${suffix}`;
}