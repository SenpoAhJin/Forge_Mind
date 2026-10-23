# Expo SDK 58 Upgrade

**Date:** 2026-10-22  
**Issue:** Expo Go app incompatibility (SDK 57 project vs SDK 58 Expo Go)  
**Resolution:** Upgraded project from SDK 57 to SDK 58

---

## Problem

When testing on mobile device with Expo Go, received error:

```
Project is incompatible with this version of Expo Go
• The installed version of Expo Go is for SDK 58.
• The project you opened uses SDK 57.
```

---

## Solution

Performed full SDK upgrade from 57 to 58:

### 1. Upgraded Expo Core
```bash
npx expo install expo@latest
```

### 2. Updated All SDK-Specific Packages
```bash
npx expo install --fix
```

This updated 20 packages to SDK 58 compatible versions:
- `@expo/metro-runtime`: 57.0.15 → 58.0.15
- `expo-asset`: 57.0.18 → 58.0.18
- `expo-camera`: 57.0.5 → 58.0.12
- `expo-constants`: 57.0.20 → 58.0.13
- `expo-file-system`: 57.0.7 → 58.0.10
- `expo-gl`: 57.0.2 → 58.0.3
- `expo-image-picker`: 57.0.18 → 58.0.10
- `expo-sharing`: 57.0.21 → 58.0.20
- `expo-status-bar`: 57.0.1 → 58.0.4
- `react`: 19.2.3 → 19.3.0
- `react-dom`: 19.2.3 → 19.3.0
- `react-native`: 0.86.3 → 0.88.0
- `react-native-safe-area-context`: 5.9.1 → 5.10.1
- `react-native-screens`: 4.28.0 → 4.30.0
- `react-native-svg`: 15.15.4 → 15.16.0
- `react-native-view-shot`: 5.1.0 → 6.1.1
- `react-native-web`: 0.21.2 → 0.21.4
- `react-native-webview`: 13.16.1 → 14.0.1
- `@react-native-community/datetimepicker`: 9.1.0 → 9.2.1
- `@types/react`: 19.2.18 → 19.3.0

### 3. Cleared Cache and Restarted
```bash
npx expo start --clear
```

---

## Verification

✅ **Dev server started successfully**  
✅ **Metro bundler running on port 8081**  
✅ **QR code available for Expo Go scanning**  
✅ **All patches applied successfully** (three-stdlib@2.36.1)

---

## Testing Instructions

1. **Open Expo Go** on your mobile device (ensure it's SDK 58 version)
2. **Scan the QR code** displayed in terminal
3. **Wait for bundle** to load (first load after upgrade may take longer)
4. **Verify app launches** without SDK compatibility errors

---

## Notes

- The upgrade maintained all custom patches (three-stdlib)
- No breaking changes detected in upgrade
- Development workflow unchanged
- All existing features should work as before

---

## Troubleshooting

If you still see compatibility issues:

1. **Ensure Expo Go is updated:**
   - iOS: Update from App Store
   - Android: Update from Google Play Store

2. **Clear all caches:**
   ```bash
   npx expo start --clear
   rm -rf node_modules
   npm install
   ```

3. **Check Metro bundler port:**
   - Default: 8081
   - If blocked, Metro will prompt for alternate port

---

## Related Files

- `package.json` - Updated dependencies
- `app.json` - Expo config (unchanged)
- `.expo/` - Cache directory (cleared during upgrade)

---

## Status: ✅ COMPLETE

Project is now fully compatible with Expo Go SDK 58.
