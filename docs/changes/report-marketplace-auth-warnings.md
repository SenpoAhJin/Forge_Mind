# Report: `[MarketplaceApi] 401` x2 + `[AuthService] 400` console warnings on web build

Date: 2026-10-07
Affected repo: `forgemind-mobile` (Expo SDK 57, web export)

## 1. The reported console output

```
WARN  [MarketplaceApi] server replied 401: Missing, unknown, or expired session
WARN  [MarketplaceApi] server replied 401: Missing, unknown, or expired session
WARN  [AuthService] server replied 400 for http://192.168.254.168:3000: Please check the highlighted fields and try again.
```

## 2. Where each line was logged (before the fix)

| Line | Emitter | Location |
|---|---|---|
| MarketplaceApi WARN x2 | `MarketplaceApi.errorMessage()` | `forgemind-mobile/src/services/MarketplaceApi.ts` (old `debugLog` call at what was line ~272) |
| AuthService WARN | `AuthService.errorMessage()` | `forgemind-mobile/src/services/AuthService.ts` (old `console.warn` at what was line ~240-244) |

Both emitters fired for **any** non-2xx HTTP status in `__DEV__` mode. They did not know the request path, so the log line could not tell you which endpoint failed.

## 3. Root cause — the two MarketplaceApi 401s

### 3.1 Who made the requests

`MarketplaceProvider` (`forgemind-mobile/src/contexts/MarketplaceContext.tsx`) calls two fetches **unconditionally** on app mount:

- `loadListings()` -> `MarketplaceApi.getListings()` -> `GET {API_BASE_URL}/marketplace/listings?limit=50&offset=0`
- `loadMyListings()` -> `MarketplaceApi.getMyListings()` -> `GET {API_BASE_URL}/marketplace/listings/mine`

Those same two functions also run on a **30 s interval**, on every `AppState -> active` transition, on the web-server reconnect event, on browser tab `visibilitychange -> visible`, and on the browser `online` event (the "refresh while foreground" effect, lines ~145-188). So while signed out they repeat the two failed requests (and therefore the two warnings) roughly every 30 s and on every tab focus.

### 3.2 Why the server answered 401

Every marketplace route is protected by `requireSession` (`forgemind-backend/src/auth/session.ts`), which responds with:

```
{ error: 'invalid_session', message: 'Missing, unknown, or expired session' }
```

when there is no `Authorization` header, an unknown session id, or an expired session. Two facts combined to guarantee this:

1. `MarketplaceApi.apiFetch` only attached `Authorization: Bearer <token>` **if** a token was already in `AsyncStorage`. Signed-out (or signed-in-but-expired) requests went out without/bad authorization.
2. The provider mounted and kept refreshing regardless of whether a session exists.

The 401 is therefore **expected app behavior** (it is how the app learns "no session"), not a server fault — but it produced console WARN noise every time.

### 3.3 Why the URL did not appear in the log

The old log printed only `server replied {status}: {message}` with no URL. The 400 warning *did* print the base URL (`http://192.168.254.168:3000`) but **not the path**, so `/auth/login` vs `/auth/register` vs `/auth/organizer-fields` could not be told apart.

## 4. Root cause — the AuthService 400

`AuthService.errorMessage()` logs a WARN for any non-2xx auth response. A 400 means the backend validation layer rejected the request body. The message text comes from `forgemind-backend/src/auth/validation.ts`, which uses the single fail string:

> `Please check the highlighted fields and try again.`

at exactly three places:

- **line 114** inside `validateOrganizerFields()` -> used by `PATCH /auth/organizer-fields` (`src/auth/router.ts:435`)
- **line 247** inside `validateRegistrationInput()` -> used by `POST /auth/register` (`src/auth/router.ts:105`)
- **line 296** inside `validateLoginInput()` -> used by `POST /auth/login` (`src/auth/router.ts:183`)

So on the web session that produced the warning, one of those three endpoints was called and returned 400: most likely a login/register attempt that failed validation (bad/missing email, short password, missing display name, missing cosplayer/organizer flags, missing `base_body_selection`), or an organizer-fields save that failed validation. The UI already shows the per-field errors through `fieldErrors`; the console WARN was pure duplication with no debug value because it hid which endpoint failed.

The `http://192.168.254.168:3000` prefix confirms the request used the LAN base URL, i.e. the one loaded from `.env.local` (`EXPO_PUBLIC_API_URL`). `npx expo export` prints `env: load .env.local / env: export EXPO_PUBLIC_API_URL` when that is in effect.

## 5. The fix

### 5-A. Stop the doomed signed-out marketplace requests

`forgemind-mobile/src/services/MarketplaceApi.ts` — `apiFetch`:
when there is no session token, do **not** touch the network. Return a synchronous 401-shaped `Response` (`{ ok: false, status: 401, url, json: ... }`). Result: zero network traffic, zero logs, identical app behavior (the browse/mine fall-backs already handle 401).

`forgemind-mobile/src/contexts/MarketplaceContext.tsx` — session gates in all four fetch entry points:

- `loadListings()`: if `!AuthService.getActiveSession()` -> apply the cached copy (if any) and stop loading, do not call the API.
- `loadMyListings()`: if `!session` -> return (per-account "my listings" cache is empty without an account).
- `refreshListings()`: if `!session` -> return.
- `refreshMyListings()`: if `!session` -> return.

This removes the mount-time 401 pair and the repeated 30 s / tab-focus / online 401s while signed out.

### 5-B. Only WARN on server-side (5xx) failures; quiet-log expected 4xx

`MarketplaceApi.errorMessage()` and `AuthService.errorMessage()` now:

- `console.warn(...)` only when `response.status >= 500` (the backend itself is broken).
- `console.log(...)` for 4xx (expected, user-visible outcomes: validation 400, wrong-password 401, duplicate email 409, missing session 401, permissions 403, conflicts 409/422/423).
- Every line now includes the **full response.url** (which contains the exact endpoint path), e.g.:
  - `[MarketplaceApi] server replied 401 for http://192.168.254.168:3000/marketplace/listings/mine: ...`
  - `[AuthService] server replied 400 for http://192.168.254.168:3000/auth/login: ...`

so any future warning is self-diagnosing. `AuthService` keeps ` for {API_BASE_URL}` as a fallback when `response.url` is empty.

## 6. What you should see after the fix (web export, __DEV__)

- Signed-out fresh load: **no** MarketplaceApi 401 lines at all, and no repeat of them on tab focus / 30 s ticks.
- Failed login/register submission: a quiet `console.log` line like
  `[AuthService] server replied 400 for http://192.168.254.168:3000/auth/login: Please check the highlighted fields and try again.`
  (WARN disappears; the login screen still shows the real per-field errors).
- A genuinely broken server (5xx): still `console.warn`, but now with the endpoint URL included.

## 7. How to debug / verify from here

1. **Identify the endpoint** of any future warning: read the `for <url>` part of the line — it now names the exact route.
2. **Backend 401**: it always means the caller passed no / an unknown / an expired session. Guard is `requireSession` in `forgemind-backend/src/auth/session.ts:90-91`; used by all marketplace routes (`src/marketplace/router.ts`) and the auth routes (log-out, me, organizer-fields). If a 401 appears while the user *is* signed in, check whether the token expired or was cleared (`@forgemind:session_token` in AsyncStorage).
3. **Backend 400**: look in `forgemind-backend/src/auth/validation.ts` at lines 114 / 247 / 296 to see exactly which field failed by the `fieldErrors` object in the response body.
4. **Reproduce**: run the backend (`npm run dev`, listens on 0.0.0.0:3000 so the LAN IP works), then `npx expo export --platform web` and serve it on the same LAN. Signed-in vs signed-out behavior is now easy to compare because the URL is in the log.
5. **Log level contract** (kept deliberately): WARN = server problem; LOG = expected client/server exchange that the UI already explains; nothing is printed in production (`__DEV__` only).

## 8. Verification

- `npx tsc --noEmit` in `forgemind-mobile`: **0 errors** (`strict` mode).
- Manual on-device / browser interaction: **NOT TESTED** (no dev environment available), so `5-B` and the URL enrichment were verified by reading the code paths, not by hitting the UI.

## 9. Files changed

- `forgemind-mobile/src/services/MarketplaceApi.ts` — no-token 401 short-circuit in `apiFetch`; 5xx-only WARN + URL in `errorMessage`; `debugLog` import removed.
- `forgemind-mobile/src/services/AuthService.ts` — 5xx-only WARN + URL in `errorMessage`.
- `forgemind-mobile/src/contexts/MarketplaceContext.tsx` — session gates in `loadListings`, `loadMyListings`, `refreshListings`, `refreshMyListings`.