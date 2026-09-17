# How to Test ForgeMind Mobile App

**Last Updated:** Sept 16, 2026  
**Current Build:** FE-4.5.3 (Persisted Auth + Date Picker + Web Testing)  
**Status:** ✅ Ready to test

---

## ⚠️ IMPORTANT: You Must Be in the Right Folder!

**The app is inside `forgemind-mobile` folder, NOT the root folder!**

### Common Error:
```
npm error path C:\Users\...\CosForge_System - Copy\package.json
npm error enoent Could not read package.json
```

**Solution:** You're in the wrong folder. Navigate to `forgemind-mobile` first!

---

## Quick Start (3 Steps)

### 1. Navigate to the App Folder ⚠️
```powershell
# From CosForge_System - Copy folder:
cd forgemind-mobile

# Verify you're in the right place (should show package.json):
dir package.json
```

### 2. Install Dependencies (First Time Only)
```powershell
npm install
```

### 3. Start the Development Server
```powershell
npm start
```

Or use the shortcut for web testing:
```powershell
npm run web
```

This will open Expo DevTools in your browser and show a QR code.

### 4. Choose Your Testing Method

**Option A: Web Browser (✅ RECOMMENDED for this session)**
- Press `w` in the terminal OR just open http://localhost:8081
- App opens with **phone frame** (device bezel, notch, rounded corners)
- Use Chrome DevTools (`F12` or `Ctrl+Shift+I`) for debugging
- **This is what we've been working on today!**

**Option B: Physical Device (Expo Go)**
- Install "Expo Go" app from Play Store / App Store
- Scan the QR code in the terminal
- Note: Phone and web use **separate storage** (accounts don't sync)

**Option C: Android Emulator**
- Make sure Android Studio emulator is running
- Press `a` in the terminal

**Option D: iOS Simulator (macOS only)**
- Press `i` in the terminal — iOS Simulator launches automatically

> **Note:** Web and physical devices use separate AsyncStorage. Accounts and
> owned items logged on web will NOT appear in Expo Go on a phone (and vice versa).
> This is expected behavior in mock mode.

---

## 🧪 What to Test Today (Sept 16, 2026)

### 1. Phone Frame (Web Only)
- [ ] Open http://localhost:8081 in browser
- [ ] You should see the app inside a **phone-shaped frame** with:
  - Dark rounded bezel (border around the edges)
  - Notch/Dynamic Island at the top
  - Home indicator bar at the bottom
- [ ] Screenshot: Does it look like a real phone?

### 2. Logout Button
- [ ] Login with any account
- [ ] Go to Profile tab
- [ ] Scroll to bottom
- [ ] Click **"Log Out"** button
- [ ] Should work now (was broken earlier today)

### 3. Storage Context Test
- [ ] In web browser, register NEW account:
  - Email: `webtest@test.com`
  - Password: `testpass123`
  - Name: Whatever you want
  - Role: Cosplayer
- [ ] Complete registration
- [ ] Click "Log Out"
- [ ] Try logging in with `webtest@test.com` / `testpass123`
- [ ] **Should work!** This proves storage is fine

### 4. Gear Icon Check
- [ ] Look at Login screen (top-right corner)
- [ ] In **web browser**: Should be NO gear icon
- [ ] In **Expo Go on phone**: Gear icon appears (it's Expo Go's overlay)
- [ ] This confirms gear icon is NOT part of our app

### 5. Date Picker (FE-4.5.3)
- [ ] After login, go to Projects tab (Home)
- [ ] Tap **"Start New Project"** or **"+"**
- [ ] Scroll to date fields
- [ ] Should see **calendar icon buttons** next to dates
- [ ] Tap button → native date picker opens
- [ ] Select a date → appears in the field

### 6. Chip Row Fix (FE-4.5.3)
- [ ] Go to Characters tab
- [ ] Look at media filter chips: All / Anime / Manga / Game / Original
- [ ] Scroll horizontally to the right
- [ ] **"Original" chip should be fully visible** (not cut off)
- [ ] Should have space to scroll past the last chip

---

## Regression Check (Basic Auth)

Before detailed testing, confirm auth still works:

1. [ ] Register a new account (any email/password)
2. [ ] Complete onboarding
3. [ ] Log out from Profile
4. [ ] Log back in with same credentials
5. [ ] Should work without errors

---

## Known Issues / Limitations (Expected)

1. **Web vs. Phone Storage Separate** — Accounts registered on web won't appear in Expo Go on your phone (and vice versa). This is expected React Native behavior. Each platform has its own AsyncStorage.
2. **Phone Frame Only on Web** — The phone bezel/notch frame only appears when running in browser. Expo Go and native builds don't show it.
3. **Mock AI** — Photo categorization and voice transcription are mocked, not real (waiting for backend)
4. **Marketplace placeholder** — Coming in FE-6
5. **Organizer screens placeholders** — Coming in FE-7

---

## Common Problems & Solutions

### Error: "Could not read package.json"
**Problem:** You're in the wrong folder (root instead of forgemind-mobile)

**Solution:**
```powershell
cd forgemind-mobile
npm start
```

### Error: "Port 8081 already in use"
**Problem:** Previous dev server still running

**Solution:**
```powershell
# Kill all Node processes:
taskkill /F /IM node.exe

# Or change the port:
npm start -- --port 19001
```

### Stale/Cached Build (weird errors after code changes)
**Solution:**
```powershell
npm start -- --clear
```

### "npm install" fails
**Solution:**
```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Web bundle won't reload
**Solution:**
- Press `Ctrl+R` in the browser to reload
- Or press `r` in the terminal to reload all platforms

---

## Quick Commands Reference

```powershell
# Navigate to app folder (ALWAYS do this first!)
cd forgemind-mobile

# Start dev server
npm start

# Start web only (fastest for testing today's changes)
npm run web

# Clear cache and restart
npm start -- --clear

# Check if you're in the right folder
dir package.json   # Should show the file
```

---

## Testing Priority (Today's Session)

**High Priority:**
1. ✅ Phone frame visible in web browser
2. ✅ Logout button works
3. ✅ Storage test: Register webtest@test.com in web, then login

**Medium Priority:**
4. ✅ Gear icon absent in web (present in Expo Go)
5. ✅ Date picker buttons on Create Project screen
6. ✅ "Original" chip fully visible on Characters

**Low Priority:**
- General navigation
- Profile data display
- Character search

---

**Ready to Test!** 🚀

**Remember:** 
1. **Navigate to `forgemind-mobile` folder first!**
2. Run `npm start` or `npm run web`
3. Open http://localhost:8081 in browser
4. Test the 6 items in the "What to Test Today" section

**Server URL:** http://localhost:8081  
**Test Account:** ahjin@gmail.com / potanginamo123 (or create new one)