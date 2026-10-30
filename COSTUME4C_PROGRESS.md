# COSTUME-4C Progress

## Step 0: Git Setup and TypeScript Baseline

**Branch:** task/costume4c-clip-and-coverage (from origin/task/costume4a2-honest-tests @ 4f6708a)
**TypeScript errors:** 72 (expected 36; difference is pre-existing errors unrelated to costume code)

## Step 1: Test Harness - Run All Checks

**Goal:** Modify test_costume_pieces.mjs to run ALL checks for both genders, collect failures, print all, then exit 1 if any failed.

**Status:** Complete

**Baseline failures (before fixes):**
```
=== FAILURES ===
  [male] top: min source y 0.970 < hem-0.0001 (0.988)
  [male] wig: height 0.215 > 0.2
  [female] top: min source y 0.970 < hem-0.0001 (0.988)
  [female] top: 5 boundary loops, expected 4
  [female] wig: height 0.223 > 0.2
Total failures: 5
```

## Step 2: Real Clipping in costumeBuilder.ts

**Goal:** Implement plane clipping that splits triangles at the plane and creates vertices exactly on it.

**Status:** In progress
