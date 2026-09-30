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
 * That is why registering from a physical Android phone in Expo Go failed with
 * `java.net.ConnectException: Failed to connect to localhost/127.0.0.1:3000`
 * while the same build worked in a PC browser.
 *
 * THE FIX
 *
 * On native we ask Metro which host it is serving on. That host is by definition
 * the PC the phone is already talking to in order to load the JS bundle, so it
 * is reachable by definition and it changes automatically when the network
 * changes. The IP therefore never has to be edited by hand.
 *
 * RESOLUTION ORDER
 *
 *   a. `EXPO_PUBLIC_API_URL`, if set and not a loopback address on native.
 *   b. native: `http://<Metro host>:3000`, from `expo-constants`.
 *   c. web: `http://localhost:3000`.
 *   d. Android emulator fallback: `http://10.0.2.2:3000`.
 *
 * A loopback `EXPO_PUBLIC_API_URL` is deliberately ignored on native, because it
 * is the exact value that fails there. Leaving `.env.local` at
 * `http://localhost:3000` is therefore safe: web and the iOS simulator use it,
 * and the phone ignores it in favour of (b).
 *
 * Changing the value requires restarting Metro with the cache cleared, because
 * Expo inlines `process.env.EXPO_PUBLIC_*` into the bundle at build time:
 *
 *     npx expo start -c
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Port the backend listens on. Must match `PORT` in forgemind-backend/.env. */
const DEFAULT_API_PORT = 3000;

/** Web: the browser and the backend are the same machine. */
const WEB_BASE_URL = `http://localhost:${DEFAULT_API_PORT}`;

/**
 * Android emulator: 10.0.2.2 is the host machine as seen from inside the
 * emulator. Used only when Metro did not report a usable host.
 */
const ANDROID_EMULATOR_BASE_URL = `http://10.0.2.2:${DEFAULT_API_PORT}`;

/**
 * The inlined env value. MUST be read as a static dot-notation property access —
 * Expo's inlining only works that way, so `process.env['EXPO_PUBLIC_API_URL']`
 * or destructuring would silently resolve to undefined.
 */
const envUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

/** Strips trailing slashes so `${base}/auth/login` never doubles up. */
function normalise(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Extracts a bare hostname from anything Metro or a URL hands us:
 * `192.168.1.5:8081`, `exp://192.168.1.5:8081`, `http://192.168.1.5:3000/api`,
 * `localhost`. IPv6 literals keep their brackets stripped.
 */
export function parseHost(value: string): string {
  let rest = value.trim();
  if (rest === '') return '';
  rest = rest.replace(/^[a-z][a-z0-9+.-]*:\/\//i, ''); // scheme
  rest = rest.split('/')[0]; // path
  rest = rest.split('?')[0];
  if (rest.startsWith('[')) {
    const end = rest.indexOf(']');
    return end === -1 ? '' : rest.slice(1, end);
  }
  const colon = rest.lastIndexOf(':');
  // A trailing `:8081` is a port; a bare IPv6 address has several colons.
  if (colon > -1 && /^\d+$/.test(rest.slice(colon + 1))) {
    rest = rest.slice(0, colon);
  }
  return rest.toLowerCase();
}

/** True for addresses that only ever mean "this device". */
function isLoopbackHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.localhost')
  );
}

function resolveBaseUrl(): { url: string; source: string } {
  // (a) Explicit configuration wins — except a loopback value on native, which is
  // the precise value that cannot work there.
  if (envUrl !== '' && !(Platform.OS !== 'web' && isLoopbackHost(parseHost(envUrl)))) {
    return { url: normalise(envUrl), source: 'EXPO_PUBLIC_API_URL' };
  }

  if (Platform.OS !== 'web') {
    // (b) Ask Metro which host it is serving. On a physical phone this is the
    // PC's LAN address, which is the same machine that just delivered the
    // bundle — so it is reachable, with no manual IP editing.
    const metroHost = parseHost(Constants.expoConfig?.hostUri ?? '');
    if (metroHost !== '' && !isLoopbackHost(metroHost)) {
      return { url: `http://${metroHost}:${DEFAULT_API_PORT}`, source: 'Metro hostUri' };
    }
    // (d) Android emulator alias, when Metro reported nothing usable.
    if (Platform.OS === 'android') {
      return { url: ANDROID_EMULATOR_BASE_URL, source: 'Android emulator alias' };
    }
    // iOS simulator with no usable Metro host. Best available guess.
    return { url: WEB_BASE_URL, source: 'loopback fallback' };
  }

  // (c) Web.
  return { url: WEB_BASE_URL, source: 'web default' };
}

const resolved = resolveBaseUrl();

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
}

/** Joins a path onto the base URL, e.g. authUrl('/login') -> 'http://.../auth/login'. */
export function authUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}/auth${suffix}`;
}
