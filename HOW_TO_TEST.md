# How to Test ForgeMind Mobile App

**Current Build:** FE-5 (Owned-Item Logging)  
**Status:** ✅ Ready to test

---

## Quick Start (3 Steps)

### 1. Install Dependencies (if not done yet)
```powershell
cd forgemind-mobile
npm install
```

### 2. Start the Development Server
```powershell
npm start
```

This will open Expo DevTools in your browser and show a QR code.

### 3. Choose Your Testing Method

**Option A: iOS Simulator (macOS only)**
- Press `i` in the terminal — iOS Simulator launches automatically

**Option B: Android Emulator**
- Make sure Android Studio emulator is running, press `a` in the terminal

**Option C: Web Browser (Recommended — rewrapping via PhoneFrame)**
- Press `w` in the terminal — app opens in your default browser inside a phone shell

**Option D: Physical Device (Expo Go)**
- Install "Expo Go" and scan the QR code in the terminal

> **Note:** Web and physical devices use separate AsyncStorage. Accounts and
> owned items logged on web will NOT appear in Expo Go on a phone (and vice versa).
> This is expected behavior in mock mode.

---

## Regression Check (Run First)

Before new-feature testing, confirm auth still works:

1. Log out from Profile (if logged in)
2. Register a new account
3. Log out
4. Log back in with that account

---

## FE-5 — Owned-Item Logging Test

1. Log in, then open the **"My Items"** tab (label may show "My Items").
2. You should see 3 seeded demo items. Verify:
   - [ ] Items list with entry-method tag (photo/text/voice), condition, status dot
   - [ ] Filter chips: All / Free / Committed, plus type and color filters
   - [ ] Strong "Clear filters" appears only when a filter is active
3. Tap **"Log an Owned Item"** → Entry Method screen shows 3 options.

### Photo Entry
- [ ] Tap **Take Photo** → tap the dashed box → pick an image
- [ ] Mock "Categorizing photo…" spinner appears, then a result card (type/color/style)
- [ ] Continue to Confirmation

### Text Entry
- [ ] Go back, tap **Type Description** → type e.g. "black wig spiky anime style"
- [ ] Toggle language **English ↔ Taglish** (placeholder text changes)
- [ ] See keyword-extracted type/color in the confirmation screen

### Voice Entry
- [ ] Go back, tap **Voice Input** → tap the mic
- [ ] Red pulsing ring + timer appear; tap again to stop
- [ ] "Transcribing…" then a mocked transcript appears
- [ ] Continue to Confirmation

### Confirmation Screen (all methods)
- [ ] Type / color / style are editable (chips + text inputs)
- [ ] Flexibility tag chips (restyle-willing / dye-willing / as-is-only)
- [ ] Condition slider 1-5
- [ ] Acquired date opens native date picker
- [ ] Acquisition cost (₱) and Notes fields
- [ ] Save → lands you on the **Item Detail** screen for the new item

### Dashboard & Detail
- [ ] New item appears in the dashboard with correct entry tag
- [ ] Filters narrow the list (status, type, color)
- [ ] Tap item → detail shows all fields + condition history
- [ ] **Edit** → change color/condition → Save → detail reflects change, condition history grows
- [ ] **Commit to Project** (only when free) → picks a project → status becomes "Committed"
- [ ] Release (make free) works
- [ ] **Delete** → confirm → item is removed

### Persistence
- [ ] Refresh the browser page → owned items + session survive (AsyncStorage)

---

## Known Issues / Limitations (Expected)

1. **Mock AI** — photo categorization and voice transcription are mocked, not real (BE-1)
2. **No persistence across web/device** — separate AsyncStorage (expected in mock mode)
3. **Marketplace placeholder** — FE-6
4. **Organizer screens placeholders** — FE-7
5. **System fonts** — Inter font loading deferred

---

## Troubleshooting

### "npm install" fails
```powershell
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

### Expo server won't start / port in use
```powershell
taskkill /F /IM node.exe
npm start -- --port 19001
```

### Stale Metro bundle (erratic behavior after code changes)
```powershell
npm start -- --clear
```

---

## Quick Commands Reference

```powershell
npm start               # Start development server
npm run web             # Web Browser (recommended)
npm run android         # Android emulator
npm run ios             # iOS Simulator (macOS only)
npm start -- --clear    # Clear cache & restart
```

---

**Ready to Test!** 🚀

Run `npm start` (or `npm run web`) in `forgemind-mobile` and work through the FE-5 checklist above.