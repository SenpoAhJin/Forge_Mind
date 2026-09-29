/**
 * Backend API configuration.
 *
 * The base URL is NOT hardcoded: it comes from the EXPO_PUBLIC_API_URL
 * environment variable, which Expo CLI inlines at bundle time from `.env` /
 * `.env.local`. See `.env.example` in the repo root.
 *
 * The value MUST be referenced as a static `process.env.EXPO_PUBLIC_API_URL`
 * property access — Expo's inlining only works with dot notation, so
 * `process.env['EXPO_PUBLIC_API_URL']` or destructuring would silently resolve
 * to undefined.
 *
 * Where to change the URL:
 *   - local machine : forgemind-mobile/.env.local   (gitignored)
 *   - shared default: forgemind-mobile/.env.example (committed)
 */

/** Development fallback only. Any EXPO_PUBLIC_API_URL value overrides it. */
const DEFAULT_DEV_API_URL = 'http://localhost:3000';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = (
  configuredBaseUrl && configuredBaseUrl.trim() !== ''
    ? configuredBaseUrl.trim()
    : DEFAULT_DEV_API_URL
).replace(/\/+$/, '');

/** True when EXPO_PUBLIC_API_URL was actually supplied. */
export const IS_API_URL_CONFIGURED =
  !!configuredBaseUrl && configuredBaseUrl.trim() !== '';

/** Joins a path onto the base URL, e.g. authUrl('/login') -> 'http://.../auth/login'. */
export function authUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}/auth${suffix}`;
}
