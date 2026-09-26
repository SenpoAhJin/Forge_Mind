# Sprint 0 Step 3-4 Testing Guide
## React Three Fiber 3D Preview

**Date:** September 16, 2026  
**What to test:** 3D rendering without Unity, body morphing proof-of-concept

---

## ✅ What's Been Done

### Files Created
1. **`src/components/Preview3D.tsx`**
   - Core 3D component using react-three-fiber
   - Two modes: Test Cubes (animated) and Body Preview (morphing)
   - Interactive camera controls (OrbitControls)
   - Proper lighting setup

2. **`src/screens/Preview3DTestScreen.tsx`**
   - Test interface with body morphing slider
   - Mode toggle (cubes vs body)
   - Instructions and checklist
   - Technical info display

3. **`SPRINT_0_ALTERNATIVE.md`**
   - Complete rationale for React Three Fiber vs Unity
   - Technology stack comparison
   - Learning curve analysis
   - Risk mitigation strategies

4. **Navigation Integration**
   - Added to ProfileStackNavigator
   - Button in ProfileScreen: "🚀 3D Preview Test (Sprint 0)"

---

## 🧪 How to Test

### Prerequisites
✅ Dev server running: `npx expo start` (already started)
✅ Web browser ready OR Expo Go app installed on phone

### Test 1: Web Preview

1. **Start if not running:**
   ```powershell
   cd forgemind-mobile
   npx expo start
   ```

2. **Open in browser:**
   - Press `w` in terminal to open web preview
   - OR go to: http://localhost:8081

3. **Navigate to test screen:**
   - Login (use any mock account)
   - Go to Profile tab (bottom navigation)
   - Scroll down to "🚀 3D Preview Test (Sprint 0)"
   - Tap the button

4. **What to verify:**
   - [ ] Screen loads without errors
   - [ ] 3D scene renders (you should see a simple body figure)
   - [ ] Can drag to orbit camera around body
   - [ ] Can scroll/pinch to zoom in/out
   - [ ] Slider changes body size (watch torso/legs scale)
   - [ ] "Show Test Cubes" button works (toggles to 3 rotating colored cubes)
   - [ ] "Reset" button centers slider at 0.5
   - [ ] No console errors (open DevTools F12 to check)

5. **Performance check:**
   - Open Chrome DevTools (F12)
   - Go to Performance tab
   - Record for 5 seconds while moving camera
   - Check FPS (should be close to 60fps)

### Test 2: Real Device (Expo Go)

1. **Install Expo Go:**
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Connect to dev server:**
   - Make sure phone and computer on same WiFi
   - In terminal running expo, you'll see a QR code
   - Open Expo Go app
   - Scan QR code (Android: built-in, iOS: use Camera app first)

3. **Navigate to test screen:**
   - Login → Profile → "🚀 3D Preview Test (Sprint 0)"

4. **What to verify:**
   - [ ] App loads on device
   - [ ] 3D scene renders (same body figure)
   - [ ] Touch drag orbits camera smoothly
   - [ ] Pinch zoom works
   - [ ] Slider responds to touch
   - [ ] Body morphs as slider moves
   - [ ] No crashes or error screens
   - [ ] Smooth rendering (no lag/stuttering)

5. **Performance check:**
   - Move camera around for 30 seconds
   - Check if rendering stays smooth
   - Note any lag when morphing body
   - Check if battery drains quickly (shouldn't)

---

## 📊 What to Report

### Web Preview Results
```
✅ Renders correctly: YES / NO
✅ Camera controls work: YES / NO  
✅ Body morphing works: YES / NO
✅ FPS (DevTools): ___ fps
✅ Console errors: NONE / [list errors]
✅ Load time: ___ seconds
```

### Real Device Results
```
Device: [e.g., "Samsung Galaxy S21", "iPhone 13"]
OS: [e.g., "Android 13", "iOS 16"]

✅ Renders correctly: YES / NO
✅ Touch controls work: YES / NO
✅ Body morphing works: YES / NO
✅ Smooth 60fps: YES / NO / LAGGY
✅ Crashes: YES / NO
✅ Load time: ___ seconds
```

---

## 🎯 Success Criteria (Sprint 0 Step 3-4)

### PASS if:
- ✅ 3D content renders on web preview without errors
- ✅ 3D content renders on real device in Expo Go
- ✅ Camera controls work (orbit/zoom)
- ✅ Body morphs smoothly with slider
- ✅ Rendering stays smooth (near 60fps)
- ✅ No native code required (works in Expo Go)

### FAIL if:
- ❌ Blank screen or error on web preview
- ❌ Doesn't work on real device
- ❌ Camera controls unresponsive
- ❌ Body morphing doesn't work
- ❌ Rendering is laggy (<30fps)
- ❌ Crashes or requires native code

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '@react-three/fiber'"
**Solution:** Dependencies already installed. Try:
```powershell
cd forgemind-mobile
npm install
```

### Issue: Black/blank screen in 3D area
**Possible causes:**
1. Camera positioned wrong → check Console for three.js warnings
2. Lights not working → check if scene is pitch black
3. Meshes not rendering → toggle "Show Test Cubes" to see if cubes render

**Debug:**
```javascript
// Open browser console, check for errors starting with:
// - "THREE.WebGLRenderer"
// - "react-three-fiber"
```

### Issue: Lag/stuttering on device
**Expected on:**
- Very old devices (5+ years old)
- Devices with weak GPU

**Not expected on:**
- Modern phones (2020+)
- Mid-range phones

**If lagging on modern device:**
- Reduce geometry complexity (future optimization)
- Simplify lighting (future optimization)

### Issue: Can't find 3D test button in Profile
**Solution:**
- Make sure you're logged in
- Go to Profile tab (bottom navigation)
- Scroll down past "Diagnostics & Reset Data"
- Should see "🚀 3D Preview Test (Sprint 0)" below it

---

## 📱 Testing Checklist

### Pre-Test
- [ ] Dev server running (`npx expo start`)
- [ ] Web browser ready OR Expo Go installed
- [ ] Phone and computer on same WiFi (for device testing)

### Web Testing
- [ ] Navigate to test screen
- [ ] 3D scene renders
- [ ] Test cubes mode works
- [ ] Body preview mode works
- [ ] Camera orbit (drag)
- [ ] Camera zoom (scroll/pinch)
- [ ] Slider morphs body
- [ ] No console errors
- [ ] Check FPS in DevTools

### Device Testing
- [ ] Scan QR code in Expo Go
- [ ] App loads successfully
- [ ] Navigate to test screen
- [ ] 3D scene renders on device
- [ ] Touch drag orbits camera
- [ ] Pinch zoom works
- [ ] Slider morphs body
- [ ] Smooth rendering (no lag)
- [ ] No crashes

### Documentation
- [ ] Screenshot web preview showing body
- [ ] Screenshot device showing body
- [ ] Note FPS and load times
- [ ] Document any errors
- [ ] Fill out results template above

---

## 🚀 Next Steps After Testing

### If Tests PASS:
1. Document results in CHANGELOG_V2.md
2. Tag: `git tag v0.6-step4-tested`
3. Proceed to Step 5: Garment Layering Test
4. Begin work on Sprint 1 (3D Character Preview System)

### If Tests FAIL:
1. Document specific failures
2. Debug based on error messages
3. Consider fallback options:
   - Simplify geometry
   - Reduce lighting complexity
   - Static 2D sprites as backup
4. Reassess: continue react-three-fiber OR pivot to Unity

---

## 📖 Related Documents

- **SPRINT_0_ALTERNATIVE.md** — Full rationale for React Three Fiber approach
- **CHANGELOG_V2.md** — Sprint 0 detailed changelog
- **SPRINT_PLAN.md** — Original Sprint plan (Unity WebGL approach)

---

## 💡 Tips for Testing

1. **Test both modes:**
   - Test Cubes mode proves basic rendering + animation works
   - Body Preview mode proves morphing concept works

2. **Use slider extremes:**
   - Test at 0.0 (slim)
   - Test at 1.0 (plus-size)
   - Test at 0.5 (average)
   - Morph should be smooth, not jumpy

3. **Camera testing:**
   - Orbit completely around body (360°)
   - Zoom in very close
   - Zoom out far
   - Camera should never glitch or invert

4. **Performance matters:**
   - If it lags on modern hardware, it's a problem
   - If it's smooth on modern hardware, older devices are future optimization

5. **Document everything:**
   - Screenshots help future debugging
   - Specific error messages are more useful than "it doesn't work"
   - Device model/OS version matters for compatibility testing

---

## ⏱️ Time Estimates

- **Web testing:** 10-15 minutes
- **Device testing:** 15-20 minutes (including Expo Go setup)
- **Documentation:** 10 minutes
- **Total:** ~35-45 minutes

---

**Ready to test? Start with web preview (easiest), then move to device testing.**
