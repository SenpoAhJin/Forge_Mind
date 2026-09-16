# ForgeMind Web Testing Guide - Mobile Frame Preview

**Date:** Wed, Sept 16, 2026

## Overview

Testing now happens on laptop via browser using a mobile/phone-frame preview instead of physical Android phone through Expo Go. This approach:
- Pulls code straight from running dev server (no stale build issues)
- Uses browser dev tools' device emulation (built-in mobile frames)
- Faster iteration without phone sync delays

---

## Quick Start

### 1. Start Dev Server with Clean Cache
```bash
npx expo start -c
```

### 2. Open in Browser
Press `w` in the terminal, or navigate to:
```
http://localhost:8081
```

### 3. Enable Mobile Device Emulation

**Chrome/Edge DevTools:**
1. Open DevTools: `F12` or `Ctrl+Shift+I`
2. Click "Toggle device toolbar" icon (phone/tablet icon) or press `Ctrl+Shift+M`
3. Select device from dropdown:
   - iPhone 14 Pro (393 x 852)
   - iPhone 15 Pro (393 x 852)
   - Samsung Galaxy S20 Ultra (412 x 915)
   - Pixel 7 (412 x 915)
4. Mobile frame with notch/bezel automatically displayed

**Firefox DevTools:**
1. Open DevTools: `F12`
2. Click "Responsive Design Mode" icon or press `Ctrl+Shift+M`
3. Select device preset from dropdown

---

## Device Presets Available

### iPhone Models
- iPhone SE (375 x 667) - Home button
- iPhone 12/13 Pro (390 x 844) - Notch
- iPhone 14 Pro (393 x 852) - Dynamic Island
- iPhone 15 Pro (393 x 852) - Dynamic Island

### Android Models
- Pixel 5 (393 x 851)
- Pixel 7 (412 x 915)
- Samsung Galaxy S20 Ultra (412 x 915)
- Samsung Galaxy S21 (360 x 800)

### Tablets
- iPad Mini (768 x 1024)
- iPad Pro 11" (834 x 1194)
- iPad Pro 12.9" (1024 x 1366)

---

## Testing Workflow

### Daily Testing Routine
```bash
# 1. Start server with clean cache
npx expo start -c

# 2. Press 'w' for web
# (or open http://localhost:8081 manually)

# 3. Enable device emulation in browser DevTools
# Ctrl+Shift+M (Chrome/Edge/Firefox)

# 4. Select device (e.g., iPhone 14 Pro)

# 5. Test features, interact with UI

# 6. Check console for errors/logs
```

### Switching Devices
1. DevTools → Device toolbar dropdown
2. Select different device
3. Page automatically resizes to new dimensions
4. Test responsive behavior

### Orientation Testing
- DevTools → Rotate icon
- Switches between portrait and landscape
- Tests layout adaptation

---

## Advantages Over Expo Go (Physical Phone)

| Aspect | Browser (Laptop) | Expo Go (Phone) |
|--------|------------------|-----------------|
| **Code freshness** | Always latest from dev server | Can have stale builds |
| **Reload speed** | Instant (`Ctrl+R`) | Several seconds |
| **Debugging** | Full Chrome DevTools | Limited |
| **Network inspector** | Built-in | Requires proxy |
| **Console logs** | Clearly visible | Must check terminal |
| **Device switching** | Click dropdown | Need multiple phones |
| **Screenshots** | Built-in DevTools | Phone screenshot tools |

---

## Testing Checklist (FE-4.5.3)

### ✅ Date Picker (CreateProjectScreen)
1. Navigate to Projects tab
2. Tap "+" to create new project
3. Select character/variant
4. On Create Project screen:
   - [ ] Tap "Start date" button
   - [ ] Native date picker opens
   - [ ] Select date, picker closes
   - [ ] Date displays in YYYY-MM-DD format
   - [ ] Tap "Target completion date"
   - [ ] Native date picker opens
   - [ ] Try selecting date before start date (should be disabled)

### ✅ Chip Row Overflow (CharacterBrowseScreen)
1. Navigate to Characters tab
2. View media type filter chips
   - [ ] All chips visible (All/Anime/Manga/Game/Original)
   - [ ] Scroll horizontally
   - [ ] "Original" chip fully visible (not cut off)
   - [ ] Proper padding on right side

### ✅ Gear Icon Investigation
1. Check top-right corner of screens:
   - [ ] Login screen
   - [ ] Profile screen
   - [ ] Characters screen
2. **Expected result:** NO gear icon in web view
   - If NO gear icon → Confirms it's Expo Go overlay (not app code)
   - If gear icon appears → Would indicate app code issue (unlikely)

---

## Browser DevTools Keyboard Shortcuts

### Chrome/Edge
| Action | Shortcut |
|--------|----------|
| Open DevTools | `F12` or `Ctrl+Shift+I` |
| Toggle device toolbar | `Ctrl+Shift+M` |
| Reload app | `Ctrl+R` |
| Hard reload (clear cache) | `Ctrl+Shift+R` |
| Open console | `Ctrl+Shift+J` |
| Inspect element | `Ctrl+Shift+C` |

### Firefox
| Action | Shortcut |
|--------|----------|
| Open DevTools | `F12` |
| Responsive Design Mode | `Ctrl+Shift+M` |
| Reload app | `Ctrl+R` |
| Hard reload | `Ctrl+F5` |

---

## Debugging in Web View

### View Console Logs
1. Open DevTools
2. Click "Console" tab
3. See all `console.log()` output
4. Filter by:
   - `[AuthService DEBUG]` - Authentication logs
   - `LOG` - React Native logs
   - `ERROR` - Error messages

### Network Tab
1. Click "Network" tab in DevTools
2. See all API requests (when backend exists)
3. Filter by XHR/Fetch
4. Inspect request/response headers and body

### React Developer Tools
1. Install React DevTools browser extension
2. "⚛️ Components" tab appears in DevTools
3. Inspect component tree
4. View props and state

### Performance Profiling
1. DevTools → "Performance" tab
2. Click record
3. Interact with app
4. Stop recording
5. Analyze rendering performance

---

## Common Issues & Solutions

### App Won't Load in Browser
**Issue:** Blank screen or "Cannot connect to Metro"

**Solutions:**
1. Check terminal - is Metro running?
2. Try hard reload: `Ctrl+Shift+R`
3. Clear cache and restart:
   ```bash
   npx expo start -c
   ```
4. Check URL is `http://localhost:8081` (not HTTPS)

### Styles Look Different Than Phone
**Issue:** Layout differences between web and native

**Solutions:**
1. This is expected - web uses react-native-web
2. Some components render slightly differently
3. Focus on functionality, not pixel-perfect match
4. Major layout issues indicate real bugs

### Date Picker Doesn't Open
**Issue:** Native date picker not appearing

**Solutions:**
1. Web uses HTML5 `<input type="date">` instead of native picker
2. Appears as inline date selector (not modal)
3. Still validates dates and prevents invalid selections
4. This is normal web behavior

### Touch Events Not Working
**Issue:** Taps/swipes don't work in DevTools

**Solutions:**
1. Ensure device toolbar is enabled (`Ctrl+Shift+M`)
2. Use mouse to simulate touch
3. Some gestures may not work in web (e.g., shake to reload)

---

## Mobile Frame Appearance

### What You Should See:

**With Device Emulation Enabled:**
```
┌────────────────────────────────┐
│    [Device: iPhone 14 Pro]     │  ← Device selector
│                                │
│  ┌──────────────────────────┐ │
│  │      [Status Bar]        │ │  ← Phone status bar
│  │  9:41   🔋  📶  📡       │ │
│  ├──────────────────────────┤ │
│  │                          │ │
│  │   ForgeMind App Content  │ │  ← Your app
│  │                          │ │
│  │                          │ │
│  │                          │ │
│  └──────────────────────────┘ │
│                                │
│  [Orientation] [Rotate] [...]  │  ← DevTools controls
└────────────────────────────────┘
```

**Without Device Emulation:**
- Full-width browser window
- No mobile frame/bezel
- Responsive but not device-specific

---

## Testing FE-4.5.3 Changes

### Expected Observations:

1. **Date Picker:**
   - ✅ Buttons with calendar icons
   - ✅ Formatted dates displayed (YYYY-MM-DD)
   - ✅ Web: Inline date selector (HTML5 input)
   - ✅ No manual text input

2. **Chip Row:**
   - ✅ All chips visible including "Original"
   - ✅ Horizontal scroll works smoothly
   - ✅ Proper spacing on right edge

3. **Gear Icon:**
   - ✅ Should NOT appear in web view
   - ✅ Confirms it's Expo Go overlay
   - ✅ Not ForgeMind app code

---

## Report Template

After testing, report back with:

```markdown
## Web Testing Report

**Date:** [Date]
**Commit:** [Commit hash]
**Browser:** Chrome/Edge/Firefox
**Device Emulation:** iPhone 14 Pro / Pixel 7 / etc.

### Date Picker
- [ ] Visible on CreateProjectScreen
- [ ] Calendar icons present
- [ ] Buttons open date selector
- [ ] Dates format correctly (YYYY-MM-DD)

### Chip Row
- [ ] All chips accessible
- [ ] "Original" chip fully visible
- [ ] Horizontal scroll works

### Gear Icon
- [ ] DOES NOT appear in web view
- [ ] Confirms Expo Go overlay theory

### Additional Notes:
[Any other observations]
```

---

## Switching Back to Phone Testing (If Needed)

If you need to test on physical phone again:

1. Keep dev server running
2. Open Expo Go app on phone
3. Scan QR code from terminal
4. Both web and phone can run simultaneously

---

## Next Steps

1. Open browser DevTools (`Ctrl+Shift+M`)
2. Select device (e.g., iPhone 14 Pro)
3. Navigate through app
4. Verify FE-4.5.3 changes are present
5. Confirm gear icon absence in web view

---

**Server Running:** http://localhost:8081  
**Device Emulation:** Browser DevTools → `Ctrl+Shift+M`  
**Ready for Testing!** 🚀
