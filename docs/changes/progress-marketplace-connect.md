# TASK CONNECT-MARKETPLACE: Shared Backend Progress

## Status: Complete (steps 3a, 3b, 4, 5, 6, 7, 8, 9 done; step 11 commits ready)

## Objective
Make the Expo web build (localhost:8081) and the phone build (LAN
192.168.254.168:3000) reach the SAME backend and database, so every device
shows the identical marketplace feed; always use the reachable base URL; never
log sensitive values or listing text; never stage the pre-existing dirty files;
no manual device testing (record as NOT TESTED).

## State taken
- Backend: `forgemind-backend` at HEAD, dev server `npm run dev` on 0.0.0.0:3000.
- Mobile: `forgemind-mobile` (Expo SDK 57).
- DB: `forgemind_dev`. Postgres via psql `-w -h 127.0.0.1 -U forgemind_app`.

## Completed

### Step 3a: ONE base URL resolver, shared timeouts — DONE
- `src/config/apiBaseUrl.ts` (new): pure function `resolveApiBaseUrl(options)`
  with dependency injection; validates `host:port` only (rejects `http(s)://`,
  paths, trailing slash, empty host, bad port); recognises `localhost`,
  `127.0.0.1`, `::1`, RFC1918 LAN, `EXPO_PUBLIC_API_URL` override.
- `src/config/api.ts`: re-exports `API_BASE_URL`, `API_BASE_URL_SOURCE`,
  `IS_API_LAN`, `authUrl`, `parseHost`, `isLoopbackHost`,
  `HEALTH_PING_TIMEOUT_MS` (4000) and `REQUEST_TIMEOUT_MS` (10000).
- tsx mock verify `%TEMP%\opencode\verify_api_base.ts`: 4/4 (native hostUri,
  web localhost, web LAN, EXPO_PUBLIC_API_URL) — host:port only.

### Step 3b: CORS allows the Expo web origins — DONE
- `forgemind-backend/src/index.ts` `isPrivateLanHost` now also accepts
  `127.0.0.1` (localhost already allowed). Preflight checks while dev server
  was up: localhost:8081 allowed, 127.0.0.1:8081 allowed (was refused),
  192.168.254.168:8081 allowed, evil.example refused (404, no ACAO). 4/4.
- NOTE: src/index.ts is a pre-existing dirty file; the CORS edit stays
  UNSTAGED and is reported to the user verbatim.

### Step 4: Quiet offline handling, platform-correct reachability UI — DONE
- `src/services/http.ts` (new): `fetchWithTimeout` (shared AbortController
  timeout) + `isNetworkError`.
- `src/services/serverStatus.ts` (new): `markReachable/markUnreachable/
  isServerReachable/subscribeServerStatus`.
- `src/utils/debugLog.ts`: added throttled `logApiIssue` (console.log only in
  __DEV__).
- `src/components/ServerStatusBanner.tsx` (new) mounted in App.tsx.
- AuthService: `fetchWithTimeout`, `REQUEST_TIMEOUT_MS`, platform-split
  `transportErrorMessage` (web: "Can't reach the server. Check that the
  backend is running." / native: adds "and that your phone and PC are on the
  same Wi-Fi."), network catch guards via `logApiIssue`.
- MarketplaceApi, UserService.refreshCurrentUser: `fetchWithTimeout`.
- UserContext: 401-first (logout), then `isNetworkError` -> keep cached user +
  quiet `logApiIssue` + 30 s retry (status subscription + web visibility/
  online), else console.error. MarketplaceContext console.error guarded.
- ConfirmationModal gained `icon` prop; error modals in ListingDetailScreen and
  OfferDetailScreen are OK-only (`confirmStyle="destructive"` +
  `cancelText=""`), cancel path removed.

### Step 5: Offline cache v2 + auto-refresh + relative "updated" time — DONE
- marketplaceMapping: `parseCachedCache/parseCachedSavedAt/parseCachedListings`
  support the v2 envelope `{version:2, savedAt, items}`.
- MarketplaceContext: v2 cache key `@forgemind:marketplace_cache_v2`; old keys
  (`@forgemind:marketplace_listings_cache`, `@forgemind:marketplace_listings`)
  read once + cleared behind `@forgemind:marketplace_migrated`; `/mine` cache
  is per-email `@forgemind:marketplace_mine_v2_<email>` with stale-key
  clearing; only the last successful fetch may write the cache.
- Auto-refresh: focus, app active, server unreachable->reachable, every 30 s,
  and web visibilitychange/online.
- `lastUpdatedAt` exposed from context; MarketplaceScreen offline note shows
  "Updated <relative time>" via new `formatRelativeTime`.

### Step 6: Shared-backend verification script — DONE
- `forgemind-backend/scripts/verify_shared_listings.ps1` (new):
  /health web+LAN, CORS for the three Expo origins and refusal for a foreign
  origin, creates a throwaway verified seller, proves web base and LAN base see
  the IDENTICAL listing set including the newly created listing, proves the
  browse + /mine feeds hide every shared demo seed listing, then removes its
  own account. Result: 17/17 PASS.
- `verify_marketplace.ps1` (pre-existing dirty script) seed-related checks
  updated to the step-7 reality and pass: "B feed carries no shared demo seed
  listings", "the seeded 6 listings are still present" (seed rows only),
  "no test account was left behind". Script self-clean now safe around real
  user content (e.g. rebelynn@gmail.com rows are legitimate and untouched).
  The script remains UNSTAGED.
- Cleaned DB residue left by scratch probes from this task; DB restored to
  6 seed + 2 real user rows, 0 @forge.test accounts.

### Step 7: Seed listings hidden from the browse feed — DONE
- `src/marketplace/listings.ts`: `SHARED_SEED_SELLER_IDS` (the three fixed demo
  sellers). The seed listing UUIDs cannot be the filter (the DB was seeded by
  an older scheme), so the stable seller ids are.
- `listingsRouter.ts`: browse + `/mine` carry
  `NOT (l.seller_user_id = ANY($n::uuid[]))`.
- Verified by direct SQL probe (visible = the 2 real user rows, all 6 seeds
  hidden) and by the two PS scripts above. Backend tsc exit 0.

### Step 8: Reachability sweep — DONE
- grep `console.error|warn` in the reachability path files (AuthService,
  UserService, MarketplaceApi, UserContext, MarketplaceContext): every network
  catch is `if (isNetworkError(e)) logApiIssue(...) else console.error(...)`;
  401 handled first in UserContext.refreshUser. 0 ungated network console.error.
- Mobile tsc exit 0; backend tsc exit 0.

### Step 9: Push gate — DONE
- `npx expo export --platform web --output-dir %TEMP%\expo-check` exit 0
  (folder deleted after).
- Backend `npm run build` exit 0.
- grep `console.(log|warn|error)` mentioning payout|token|password|secret|
  Authorization: mobile 0; backend 6 hits, all descriptive-only (no value
  printed), e.g. seed.ts "(password never printed)".
- Nothing pushed yet.

## NOT TESTED (manual)
- Phone (Metro/Expo Go) against http://192.168.254.168:3000 with the PC
  firewall rule in place (only a suggested admin command, never modified by
  this task).
- Visual banner / offline note behaviour while the backend is stopped.

## Pre-existing failures NOT in this task's scope
- `verify_marketplace.ps1` moderation + strikes sections fail: the blocked-
  inputs fixture at `%TEMP%\opencode\blocked_inputs.json` holds 7 objects while
  the script expects exactly 3, cascading into the blocked-listing and appeal
  checks; the strike-section checks describe responses the current backend
  does not produce. These fail in the same way with the step-7 filter either
  applied or not; they are independent of this task.

## Files changed
- Mobile (step 3a): src/config/apiBaseUrl.ts (new), src/config/api.ts.
- Mobile (step 4): src/services/http.ts (new), src/services/serverStatus.ts
  (new), src/utils/debugLog.ts, src/components/ServerStatusBanner.tsx (new),
  src/App.tsx, src/services/AuthService.ts, src/services/MarketplaceApi.ts,
  src/services/UserService.ts, src/contexts/UserContext.tsx,
  src/components/ConfirmationModal.tsx, src/screens/cosplayer/
  ListingDetailScreen.tsx, src/screens/cosplayer/OfferDetailScreen.tsx.
- Mobile (step 5): src/contexts/MarketplaceContext.tsx,
  src/utils/marketplaceMapping.ts, src/utils/dateHelpers.ts,
  src/screens/cosplayer/MarketplaceScreen.tsx.
- Backend (step 7): src/marketplace/listings.ts, src/marketplace/
  listingsRouter.ts.
- Backend (step 6): scripts/verify_shared_listings.ps1 (new, committed),
  scripts/verify_marketplace.ps1 (edited, stays UNSTAGED).

## Commits planned (step 11)
- Mobile: 1) config base URL + timeouts; 2) reachability log Service + UI +
  platform error text; 3) cache v2 + refresh + date helpers; 4) this progress
  doc + CHANGELOG.md.
- Backend: a) seed seller filter; b) verify_shared_listings.ps1 + CHANGELOG.md.
- NEVER staged: forge-mind .gitignore, src/auth/publicUser.ts, src/index.ts,
  migrations 011-013, and every pre-existing untracked file in both repos.

## Scratch probes
- Deleted: backend/scripts/tmp-verify-seed-ids.ts, tmp-probe-owners.ts,
  tmp-probe-uuid.ts, tmp-probe-filter.ts.
- Deleted after this doc: %TEMP%\opencode\verify_api_base.ts.