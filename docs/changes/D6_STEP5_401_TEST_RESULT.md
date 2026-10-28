# D6 Step 5: 401 Auth Path Test Result

**Date:** October 15, 2026  
**Task:** Test 401 unauthorized path for matcher endpoint

## Test Setup

**Script:** `forgemind-mobile/scripts/test_401_auth.ts`  
**Target:** `POST http://localhost:3000/api/ai/match`  
**Method:** Send request WITHOUT session cookie  
**Expected:** 401 Unauthorized (from `requireSession` middleware)

## Result

**Status:** ❌ **UNTESTABLE** (route returns 404, not 401)

**Evidence:**
```
Response Status: 404 Not Found
Response Body: {"error":"not_found","message":"No such endpoint"}
```

## Investigation

1. ✅ Backend server running on port 3000 (health endpoint responds: `{"status":"ok","db":"ok"}`)
2. ✅ Router mounted in `src/index.ts:148`: `app.use('/api/ai', matcherRouter);`
3. ✅ Route defined in `src/ai/matcherRouter.ts:230`: `matcherRouter.post('/match', ...)`
4. ✅ TypeScript compiled successfully (exit 0)
5. ✅ Compiled JS exists: `dist/ai/matcherRouter.js` with `exports.default = matcherRouter`
6. ✅ Import in `dist/index.js`: `app.use('/api/ai', matcherRouter_1.default);`
7. ❌ Route not accessible: GET/POST to `/api/ai/match` returns 404

## Root Cause

**Unknown.** Code inspection shows correct setup:
- Router exports as default
- Index imports as default
- Mount path `/api/ai` + route `/match` = `/api/ai/match`
- Health endpoint works, so server is running
- But matcher route returns 404

**Possible causes:**
1. Runtime import issue (default export/import mismatch in CommonJS)
2. Router initialization error (no logs visible in minimized window)
3. Middleware chain issue (requireSession blocks before route matching)
4. Build artifact stale (npm start may not use latest dist/)

## Why NOT Testable

Cannot test 401 path because route doesn't exist (404). The 401 check requires:
1. Route matches (✅ POST `/api/ai/match`)
2. Middleware runs (`requireSession`)
3. No session → 401

Step 1 fails, so Step 2-3 never execute.

## Recommendation

**FOR USER:**
1. Start backend manually in visible terminal: `cd forgemind-backend ; npm start`
2. Check startup logs for errors (matcherRouter initialization, import failures)
3. Test health: `curl http://localhost:3000/health`
4. Test matcher: `curl -X POST http://localhost:3000/api/ai/match -H "Content-Type: application/json" -d "{}"`
5. If 404: check server logs, verify router loaded
6. If 401: auth path works ✅

**Alternative Test:**
- Mount router in isolation (no DB, no other routes)
- Send request without session
- Verify 401 status

This requires modifying backend code (not authorized per D6 constraints: "mobile docs/scripts only").

## Files Created

- `forgemind-mobile/scripts/test_401_auth.ts` (401 test script)
- `forgemind-mobile/docs/changes/D6_STEP5_401_TEST_RESULT.md` (this file)


---

# E1 Step 7: Resolution (October 16, 2026)

## Investigation Summary

Followed systematic checklist from D6 Step 5 recommendations:

### 1. Process & Build Check
**Action:** Stopped all processes, rebuilt, restarted backend.

```bash
cd forgemind-backend
npm run build  # Exit 0 - compiled successfully
npm start      # Started on port 3000
```

**Result:** Server started successfully with logs:
```
[chat-filter] Base terms: 25 (19 EN, 6 TL), curated loaded: 0
forgemind-backend listening on 0.0.0.0:3000 (development)
database: OK
```

### 2. Endpoint Tests

**Health check:**
```bash
curl http://localhost:3000/health
```
Response: `200 OK {"status":"ok","db":"ok"}` ✓

**Matcher endpoint (no session):**
```bash
curl -i -X POST http://localhost:3000/api/ai/match -H "Content-Type: application/json" -d "{}"
```
Response: `401 Unauthorized {"error":"invalid_session","message":"Missing, unknown, or expired session"}` ✓

### 3. Route Registration Verification

Confirmed in source code:
- `src/index.ts:148`: `app.use('/api/ai', matcherRouter);` ✓
- `src/ai/matcherRouter.ts:230`: `matcherRouter.post('/match', async ...)` ✓
- `src/ai/matcherRouter.ts:311`: `export default matcherRouter;` ✓
- Catch-all 404 handler is AFTER matcher mount ✓

## Root Cause

**STALE BUILD OR NO RUNNING SERVER.**

The original D6 Step 5 test encountered 404 because either:
1. The backend server was not running, OR
2. The `dist/` folder had stale compiled JS (not reflecting latest source)

After `npm run build` + `npm start`, the route works correctly and returns **401** as expected.

## Resolution

✅ **RESOLVED**: Matcher route `/api/ai/match` now returns 401 Unauthorized when called without a session.

The route registration is correct, the middleware order is correct, and the auth path works as designed. The D6 404 was an environmental issue (stale build/stopped server), not a code issue.

## Updated Test Result

**Script:** `curl -i -X POST http://localhost:3000/api/ai/match -H "Content-Type: application/json" -d "{}"`  
**Expected:** 401 Unauthorized  
**Actual:** 401 Unauthorized ✓  
**Status:** ✅ **PASSED**

## Commit

- Repo: `forgemind-backend`
- Branch: `feature/chat-curated-terms`
- No code changes needed (issue was environmental, not code)
- Resolution documented in this file

