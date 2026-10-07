/**
 * ONE backend base URL for every platform.
 *
 * Pure logic only: no react-native, no expo imports, so a plain tsx script can
 * exercise it with mocked inputs. The app wires real values in ./api.ts and web
 * can never reach Metro's hostUri.
 *
 * Order:
 *   a. EXPO_PUBLIC_API_URL, if set (web and native) — except a loopback value
 *      on native, which can only ever mean the phone itself.
 *   b. web: window.location.hostname with port 3000 (localhost:8081 ->
 *      localhost:3000; a LAN-opened page -> the LAN host:3000). Never Metro.
 *   c. native: the host of Expo's dev server (hostUri) with port 3000.
 *   d. fallbacks: Android emulator alias 10.0.2.2, then localhost.
 */

export const DEFAULT_API_PORT = 3000;

/** Health ping: must never block a render. 4 s is enough for a LAN or localhost. */
export const HEALTH_PING_TIMEOUT_MS = 4000;

/** Every real request: auth, users, marketplace. */
export const REQUEST_TIMEOUT_MS = 10000;

/** Strips trailing slashes so `${base}/auth/login` never doubles up. */
export function normalise(url: string): string {
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
export function isLoopbackHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.localhost')
  );
}

export interface ApiBaseUrlOptions {
  platform?: 'web' | 'android' | 'ios' | 'windows' | 'macos';
  /** Constants.expoConfig?.hostUri on native, e.g. '192.168.1.5:8081'. */
  hostUri?: string;
  /** window.location.hostname on web. */
  windowLocationHost?: string;
  /** process.env.EXPO_PUBLIC_API_URL, trimmed. */
  envUrl?: string;
}

export function getApiBaseUrl(opts: ApiBaseUrlOptions = {}): { url: string; source: string } {
  const {
    platform = 'web',
    hostUri = '',
    windowLocationHost = '',
    envUrl = '',
  } = opts;
  const env = envUrl.trim();

  // (a) Explicit configuration wins — except a loopback value on native, which is
  // the precise value that cannot work there.
  if (env !== '' && !(platform !== 'web' && isLoopbackHost(parseHost(env)))) {
    return { url: normalise(env), source: 'EXPO_PUBLIC_API_URL' };
  }

  if (platform !== 'web') {
    // (c) Ask Metro which host it is serving. On a physical phone this is the
    // PC's LAN address, which is the same machine that just delivered the
    // bundle — so it is reachable, with no manual IP editing.
    const metroHost = parseHost(hostUri);
    if (metroHost !== '' && !isLoopbackHost(metroHost)) {
      return { url: `http://${metroHost}:${DEFAULT_API_PORT}`, source: 'Metro hostUri' };
    }
    // (d) Android emulator alias, when Metro reported nothing usable.
    if (platform === 'android') {
      return { url: `http://10.0.2.2:${DEFAULT_API_PORT}`, source: 'Android emulator alias' };
    }
    // iOS simulator with no usable Metro host. Best available guess.
    return { url: `http://localhost:${DEFAULT_API_PORT}`, source: 'loopback fallback' };
  }

  // (b) Web. The browser's own host: localhost:8081 -> localhost:3000, and a
  // page opened on the LAN -> that LAN host:3000. Never Metro's hostUri.
  const host = windowLocationHost !== '' ? windowLocationHost : 'localhost';
  return { url: `http://${host}:${DEFAULT_API_PORT}`, source: 'window location' };
}