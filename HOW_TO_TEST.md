# How to Test ForgeMind Mobile App

**Current Build:** FE-2 (Onboarding Screens)  
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
- Press `i` in the terminal
- iOS Simulator will launch automatically

**Option B: Android Emulator**
- Make sure Android Studio emulator is running
- Press `a` in the terminal

**Option C: Web Browser (Quickest)**
- Press `w` in the terminal
- App opens in your default browser

**Option D: Physical Device**
- Install "Expo Go" app from App Store or Google Play
- Scan the QR code shown in terminal

---

## What You Can Test Right Now

### ✅ Complete Onboarding Flow (4 Screens)

1. **Welcome Screen**
   - See app logo and tagline
   - Click "Get Started" button

2. **Role Selection Screen**
   - Select "Cosplayer" (checkmark appears)
   - Select "Organizer" (checkmark appears)
   - Try clicking Continue without selecting (see error)
   - Select at least one role, click Continue
   - Test Back button

3. **Account Creation Screen**
   - Enter display name (try leaving blank, see error)
   - Enter email (try invalid format like "test", see error)
   - Enter password (try less than 8 characters, see error)
   - Confirm password (try mismatch, see error)
   - Fill all correctly, click Continue
   - Test Back button

4. **Body Slider Onboarding Screen**
   - Toggle between Male/Female base body
   - Drag the body size slider (0.0-1.0)
   - See value update in real-time
   - Read the "not a scan" notice
   - Click "Complete Setup"

5. **Main App (After Onboarding)**
   - See appropriate tabs based on roles selected:
     - **Cosplayer only:** Projects, Character Browse, Marketplace, Profile
     - **Organizer only:** Events, Logistics, Meetups, Profile
     - **Both roles:** Role switcher at top + appropriate tabs
   - Test role switcher (if both roles selected)
   - Click each tab (shows placeholder content)

---

## Testing Checklist

### Onboarding Flow
- [ ] Welcome screen loads
- [ ] Role selection validates (at least one required)
- [ ] Email validation works (format check)
- [ ] Password validation works (8+ characters)
- [ ] Password confirmation checks match
- [ ] Display name validation works (100 char limit)
- [ ] Body slider moves smoothly (0.0-1.0)
- [ ] Base body toggle works (Male/Female)
- [ ] Back buttons work on all screens (except Welcome)
- [ ] Forward navigation works through all 4 screens
- [ ] Onboarding completes and shows main app

### Main App
- [ ] Correct tabs appear based on roles
- [ ] Role switcher appears only if both roles selected
- [ ] Switching roles changes tab bar color
- [ ] All tabs are clickable and show placeholder screens
- [ ] Bottom navigation highlights active tab

### Design System Components
- [ ] Buttons have correct colors (primary purple, secondary outlined)
- [ ] Text input fields show focus state (blue border)
- [ ] Error messages appear under invalid fields
- [ ] Slider thumb and track render correctly
- [ ] Cards have shadows and rounded corners
- [ ] Colors match Phase 0 spec (primary #6B4CE6)

---

## Expected Behavior

### First Launch
1. App opens to Welcome screen (onboarding)
2. Must complete all 4 screens
3. After completion, shows main app tabs

### Subsequent Launches (Current Limitation)
⚠️ **Note:** Onboarding state is NOT persisted yet (mock state only).
- App will restart onboarding flow each time (lost on app reload)
- This is expected for FE-2 (local state only)
- Will be fixed in BE-1 with AsyncStorage/SecureStore

### Data Flow
- Role selection → stored in UserContext
- Account creation → stored in UserContext
- Body slider → stored in UserContext
- All data is snake_case matching backend schema
- Data is lost on app restart (no persistence yet)

---

## Known Issues / Limitations (Expected)

✅ **These are not bugs** — they're part of the current FE-2 scope:

1. **No persistence** — Onboarding resets on app reload
2. **No real authentication** — No backend, mock state only
3. **Tab icons are empty** — Icon library not chosen yet
4. **Placeholder screens** — Main app tabs show title only
5. **No 3D preview** — Coming in FE-4
6. **No character data** — Coming in FE-3

---

## Troubleshooting

### "npm install" fails
```powershell
# Try clearing cache
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

### Expo server won't start
```powershell
# Kill existing processes
taskkill /F /IM node.exe
npm start
```

### Port already in use
```powershell
# Use different port
npm start -- --port 19001
```

### Slow performance on web
- Web version is for quick testing only
- Use iOS Simulator or Android Emulator for better performance

### TypeScript errors
- These should not prevent the app from running
- The app will still load in Expo

---

## Screenshots to Take (for documentation)

If you want to document your testing:

1. Welcome screen
2. Role selection with both checkmarks
3. Account creation with all fields filled
4. Body slider at different positions
5. Main app with role switcher (if both roles)
6. Cosplayer tabs
7. Organizer tabs

---

## Testing on Different Screens

The app should work on:
- ✅ Phone screens (iOS/Android)
- ✅ Tablet screens (larger fonts/spacing)
- ✅ Web browsers (desktop)

---

## Performance Notes

- **First load:** May take 10-20 seconds (normal for Expo)
- **Hot reload:** Changes appear instantly (if using web/simulator)
- **Navigation:** Smooth transitions between screens
- **Slider:** Should be responsive without lag

---

## Next Steps After Testing

Once you've tested and confirmed everything works:

1. ✅ FE-2 is complete
2. ✅ Ready to start FE-3 (Character Browse & Variant Selection)
3. Report any bugs/issues found during testing

---

## Quick Commands Reference

```powershell
# Start development server
npm start

# Run on specific platform
npm run ios       # iOS Simulator (macOS only)
npm run android   # Android Emulator
npm run web       # Web Browser

# Stop server
Ctrl+C

# Clear cache and restart
npm start -- --clear
```

---

**Ready to Test!** 🚀

Just run `npm start` in the `forgemind-mobile` directory and choose your platform (web is fastest for quick testing).

---
