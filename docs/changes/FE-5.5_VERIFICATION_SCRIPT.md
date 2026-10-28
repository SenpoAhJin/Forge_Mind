# FE-5.5 PART 3 — RAW DATA VERIFICATION SCRIPT

**CRITICAL:** This script must be followed EXACTLY, with console output pasted at each step.

**Server:** http://localhost:8081  
**Browser Console:** Open DevTools (F12) → Console tab

---

## STEP 0: Clean Slate

**In Browser Console:**
```javascript
await DebugLogger.clearAllStorage()
```

**Expected Output:**
```
═══════════════════════════════════════
ALL STORAGE CLEARED
═══════════════════════════════════════
```

**Action:** Refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

## STEP 1: Register New Account

**In App:**
1. Should see "Welcome" screen
2. Click "Create Account"
3. **VERIFY ON SCREEN:** ONLY "Cosplayer" card visible (auto-selected with checkmark)
4. **VERIFY ON SCREEN:** NO "Event Organizer" card anywhere
5. Click "Continue"
6. Fill in account details:
   - Email: `verifytest@test.com`
   - Display Name: `Verify Test`
   - Password: `password123`
7. Click "Create Account"
8. Complete body slider (any value)
9. Click "Continue"

**In Browser Console IMMEDIATELY after registration:**
```javascript
await DebugLogger.logAccountByEmail('verifytest@test.com')
```

**PASTE THE RAW OUTPUT HERE:**
```
[USER WILL PASTE]
```

**Expected Fields to Verify:**
- `email`: "verifytest@test.com"
- `display_name`: "Verify Test"
- `is_cosplayer`: true
- `is_organizer`: false
- `organizer_role`: null OR undefined (NOT 'head', NOT 'staff')
- `verification_status`: "pending" or null
- `is_holder_verified`: false

**STOP:** If organizer_role is anything other than null/undefined, THE WORKFLOW FAILED. Report exactly what you see.

---

## STEP 2: Submit Access Request

**In App:**
1. Navigate to Profile tab
2. Scroll to "Test Mode" section
3. Click "Organizer (Head)" button (this simulates is_organizer=true for testing)
4. Scroll back up - should now see "Organizer Access" card
5. Click "Request Access" button
6. On Request Access screen, enter justification:
   ```
   I have been organizing cosplay events for the past 5 years at local conventions in Manila. I want to create official events on ForgeMind to help our community grow and provide better resources for cosplayers. I have experience managing logistics, coordinating volunteers, and handling event budgets for conventions with 500+ attendees.
   ```
7. Character count should show "290 / 100 characters minimum"
8. Click "Submit Request"
9. Wait for success alert
10. Dismiss alert

**In Browser Console IMMEDIATELY after submission:**
```javascript
await DebugLogger.logAccessRequestByUser('verifytest@test.com')
```

**PASTE THE RAW OUTPUT HERE:**
```
[USER WILL PASTE]
```

**Expected Fields to Verify:**
- `request_id`: (should exist, format: "req-[timestamp]-[hash]")
- `user_id`: "verifytest@test.com"
- `justification`: (the full text entered above)
- `status`: "pending" (EXACTLY "pending", not "approved")
- `reviewed_by_holder_id`: null
- `reviewed_at`: null
- `submitted_at`: (should be a date/timestamp)

**STOP:** If status is NOT "pending", THE WORKFLOW FAILED. Report exactly what you see.

---

## STEP 3: Switch to Holder Account

**In App:**
1. Navigate to Profile tab
2. Scroll to "Test Mode" section
3. Click "Verified Holder" button
4. Verify "Marketplace Verification" card shows "Verified" status
5. Should see button: "Review Organizer Requests"

**In Browser Console:**
```javascript
await DebugLogger.logActiveSession()
```

**PASTE THE RAW OUTPUT HERE:**
```
[USER WILL PASTE]
```

**Expected Fields to Verify:**
- `is_holder_verified`: true
- `verification_status`: "verified"

---

## STEP 4: Approve Request

**In App:**
1. Click "Review Organizer Requests" button
2. Should see one pending request card:
   - Email: verifytest@test.com
   - Full justification text visible
   - Two buttons: Approve (green) / Reject (red)
3. Click "Approve" button
4. Alert: "Approve verifytest@test.com as a Head Organizer?"
5. Click "Approve" in alert
6. Wait for success alert: "Request approved successfully"
7. Dismiss alert
8. Request card should disappear
9. Empty state should show: "No pending requests at this time"

**In Browser Console IMMEDIATELY after approval:**
```javascript
await DebugLogger.logAccessRequestByUser('verifytest@test.com')
```

**PASTE THE RAW OUTPUT HERE (Request Object):**
```
[USER WILL PASTE]
```

**Expected Fields to Verify:**
- `request_id`: (same as before)
- `user_id`: "verifytest@test.com"
- `status`: "approved" (CHANGED FROM "pending")
- `reviewed_by_holder_id`: (should be the holder's email)
- `reviewed_at`: (should be a date/timestamp, NOT null anymore)
- `submitted_at`: (same as before)

**Then IMMEDIATELY run:**
```javascript
await DebugLogger.logAccountByEmail('verifytest@test.com')
```

**PASTE THE RAW OUTPUT HERE (Account Object):**
```
[USER WILL PASTE]
```

**Expected Fields to Verify:**
- `email`: "verifytest@test.com"
- `is_cosplayer`: true
- `is_organizer`: true (should still be true from Test Mode)
- `organizer_role`: "head" (CHANGED FROM null - THIS IS THE KEY FIELD)

**STOP:** If organizer_role is NOT "head", THE WORKFLOW FAILED. Report exactly what you see.

---

## STEP 5: Verify Requester UI Updates

**In App:**
1. Navigate to Profile tab
2. Scroll to "Test Mode" section
3. Click "Organizer (Head)" button again to ensure we're viewing as the requester
   (This simulates switching accounts - in reality you'd log out/log in)
4. Navigate back to Profile

**Verify on Profile Screen:**
- Badge row shows: "Cosplayer" badge + "Head Organizer" badge (with star icon)
- "Organizer Access" card shows:
  - Status: "Head Organizer" (green/success color)
  - Message: "You have access to create and manage events."
  - Button: "View Details"

5. Click "View Details" button

**Verify on Request Details Screen:**
- Title: "Organizer Access Request"
- Status badge: "APPROVED" (green)
- Checkmark-circle icon (green)
- Message: "Congratulations! Your request has been approved..."
- Submitted date shown
- Reviewed date shown (NEW - wasn't there before approval)
- Full justification text displayed in read-only card

**In Browser Console (final verification):**
```javascript
await DebugLogger.logAllAccessRequests()
```

**PASTE THE RAW OUTPUT HERE:**
```
[USER WILL PASTE]
```

**Expected:**
- Array with one request
- That request has status="approved"

---

## SUMMARY CHECKLIST

At the end of this verification, confirm:

- [ ] Registration created account with organizer_role=null
- [ ] Request submission created OrganizerAccessRequest with status="pending"
- [ ] Approval changed request status to "approved"
- [ ] Approval set reviewed_by_holder_id and reviewed_at
- [ ] Approval updated account organizer_role to "head"
- [ ] ProfileScreen UI reflects "Head Organizer" status
- [ ] Request details screen shows "APPROVED" with reviewed date

---

## ERROR REPORTING

If ANY step fails or produces unexpected output:

1. **DO NOT** continue to next step
2. **PASTE** the exact console output showing the failure
3. **SCREENSHOT** the UI if relevant
4. **DESCRIBE** what was expected vs. what actually happened
5. **STOP** - do not attempt to fix it yourself or reframe it as working

---

**Verification Date:** _________  
**Verified By:** _________  
**Browser:** _________  
**All Steps Passed:** [ ] YES  [ ] NO (attach failure details)
