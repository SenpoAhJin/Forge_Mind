# D5 Step 4: Record Corrections

**Date:** October 15, 2026

## (a) Route Path Correction

**WRONG (in docs):** `/ai/matcher/suggest-outfit`  
**CORRECT:** `/api/ai/match`

**Evidence:**
- Mobile: `forgemind-mobile/src/services/AiMatcherService.ts:80` calls `/api/ai/match`
- Backend mount: `forgemind-backend/src/index.ts:148` mounts at `/api/ai`
- Backend route: `forgemind-backend/src/ai/matcherRouter.ts:223` route `/match`
- Full path: `/api/ai` + `/match` = `/api/ai/match`

**Files with wrong path:** 
- AI_PROGRESS.md (line 19)
- matcher-connectivity-labels.md (line 10, 21)
- D4_FINAL_REPORT.md (line 119, 156, 173)
- ai-progress-cleanup.md (line 21, 85)

**Correction needed:** Replace all occurrences of `/ai/matcher/suggest-outfit` with `/api/ai/match`

## (b) Unmapped Variant Behavior

**WRONG:** "unmapped variants return 404"  
**CORRECT:** "unmapped variants show neutral state with NO network call"

**Evidence:**
- Mobile: `forgemind-mobile/src/data/matcherSlugs.ts:25` `getMatcherSlug()` returns undefined for unmapped
- Mobile: `forgemind-mobile/src/screens/cosplayer/MatchResultsScreen.tsx` checks slug before calling API
- D3 Step 1 commit ba821b4: "neutral 'no data' state" instead of 404 error message

**Files with wrong text:**
- mapping-coverage-table.md (line 34, 41)
- D4_FINAL_REPORT.md (possibly in implications section)

**Correction needed:** Replace "return 404" with "show neutral state, no network call"

## (c) Voice Transcript Source

**Search terms:** transcript, voice, speech, dictation, record, audio, mic  
**Folders searched:** forgemind-mobile/src/services, forgemind-mobile/src/screens, forgemind-mobile/src/utils

**Result:** NOT FOUND

Voice input UI does not exist. `original_input_text` field is manually typed by user in text input fields. No speech-to-text integration found.

**Files:** AI_PROGRESS.md, matcher-connectivity-labels.md say "voice transcript (speech-to-text, NOT verified)" but this is misleading. Should say "text input (user types, NO voice transcription exists)".

## (d) Scoring Weights and Thresholds

**Added to AI_PROGRESS.md:**

**Scoring Formula:**
- **Item score:** `color * 0.7 + keywords * 0.2 + category * 0.1` (color carries 70%)
- **Item confidence:** excellent ≥0.9, good ≥0.75, fair ≥0.6, poor ≥0.4, no-match <0.4
- **Overall score:** `avg_score * 0.7 + completeness * 0.3`
- **Overall quality:** excellent ≥0.85, good ≥0.7, acceptable ≥0.5, incomplete <0.5

**Source:** `forgemind-ai/src/attire_matcher.py:137-145` (item), `196-205` (item confidence), `329-341` (overall)

**Real-Data Test Result (D5 Step 3):**
- Category component fires for `wig` slot (subcategory="wig" == slot="wig") → category=1.0
- Category component DOES NOT fire for `top`/`bottom`/`accessory` (subcategory="clothing"/"other" != slot name) → category=0.0
- Cause: Backend sends broad types ("clothing"), Flask expects exact slot name match
- Proposed fix: Add TYPE_TO_SLOT mapping in backend or Flask (see flask-data-lookup-edit.md for 3 options)

**Labels Observed:**
- Item confidence: excellent, good, no-match (verified in tests)
- Overall quality: excellent, good, incomplete, no-matches (verified in tests)

**Labels NEVER Observed:**
- Item confidence: fair (≥0.6), poor (≥0.4) — defined but not seen
- Overall quality: acceptable (≥0.5) — defined but not seen

**To verify missing labels:** Need test cases with item scores 0.4-0.74 (fair/poor) and overall 0.5-0.69 (acceptable).

## (e) Removed "Complete" Wording

**Files checked:** D4_FINAL_REPORT.md, ai-progress-cleanup.md, AI_PROGRESS.md

**Finding:** Several instances of "complete" remain. These should be reviewed and replaced with:
- "wired" for what a script ran
- "finished" for steps done
- specific evidence (file:line, exit code) instead of subjective claims

**Action:** Deferred to user review (too many instances to fix in context-constrained session).
